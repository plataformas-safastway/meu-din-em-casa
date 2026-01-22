import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useEffect, useCallback } from "react";

// ============================================
// TYPES
// ============================================

export type ImportStatus = 'pending' | 'processing' | 'reviewing' | 'completed' | 'cancelled' | 'failed' | 'expired';

export interface ImportBatch {
  id: string;
  family_id: string;
  file_name: string;
  file_type: string;
  import_type: string;
  source_id: string;
  invoice_month: string | null;
  status: ImportStatus;
  transactions_count: number | null;
  error_code?: string | null;
  error_message: string | null;
  created_at: string;
  processed_at: string | null;
  expires_at: string | null;
  created_by: string | null;
  detected_bank: string | null;
  detected_document_type: string | null;
}

export interface ImportItem {
  id: string;
  import_id: string;
  family_id: string;
  date: string;
  original_date: string | null;
  amount: number;
  type: 'income' | 'expense';
  description: string | null;
  category_id: string;
  subcategory_id: string | null;
  suggested_category_id: string | null;
  is_duplicate: boolean;
  duplicate_transaction_id: string | null;
  confidence_score: number | null;
  needs_review: boolean;
  raw_data: unknown;
  created_at: string;
}

export interface ImportFlowState {
  batch: ImportBatch | null;
  items: ImportItem[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  errorCode: string | null;
  isEmpty: boolean;
  isExpired: boolean;
  isProcessing: boolean;
  isFailed: boolean;
  isReviewing: boolean;
  summary: {
    total: number;
    validCount: number;
    duplicateCount: number;
    needsReviewCount: number;
    totalIncome: number;
    totalExpense: number;
  };
}

// ============================================
// ERROR CODES
// ============================================

export const IMPORT_ERROR_CODES = {
  NOT_FOUND: 'IMPORT-001',
  EXPIRED: 'IMPORT-002',
  FAILED: 'IMPORT-003',
  EMPTY: 'IMPORT-004',
  NETWORK: 'IMPORT-005',
  UNAUTHORIZED: 'IMPORT-006',
  PROCESSING_TIMEOUT: 'IMPORT-007',
} as const;

// ============================================
// LOCAL STORAGE HELPERS
// ============================================

const PENDING_IMPORT_KEY = 'oik_pending_import_id';

export function savePendingImportId(importId: string): void {
  try {
    localStorage.setItem(PENDING_IMPORT_KEY, JSON.stringify({
      importId,
      savedAt: new Date().toISOString(),
    }));
  } catch (e) {
    console.warn('[OIK Import] Failed to save pending import ID:', e);
  }
}

export function getPendingImportId(): string | null {
  try {
    const stored = localStorage.getItem(PENDING_IMPORT_KEY);
    if (!stored) return null;
    
    const { importId, savedAt } = JSON.parse(stored);
    
    // Check if it's expired (24 hours)
    const savedDate = new Date(savedAt);
    const now = new Date();
    const hoursDiff = (now.getTime() - savedDate.getTime()) / (1000 * 60 * 60);
    
    if (hoursDiff > 24) {
      clearPendingImportId();
      return null;
    }
    
    return importId;
  } catch (e) {
    console.warn('[OIK Import] Failed to get pending import ID:', e);
    return null;
  }
}

export function clearPendingImportId(): void {
  try {
    localStorage.removeItem(PENDING_IMPORT_KEY);
  } catch (e) {
    console.warn('[OIK Import] Failed to clear pending import ID:', e);
  }
}

// ============================================
// HOOKS
// ============================================

/**
 * Hook to get all pending/reviewing imports for the current family
 */
export function usePendingImports() {
  const { family } = useAuth();
  const familyId = family?.id;

  return useQuery({
    queryKey: ['pending-imports', familyId],
    queryFn: async () => {
      if (!familyId) return [];

      const { data, error } = await supabase
        .from('imports')
        .select('*')
        .eq('family_id', familyId)
        .in('status', ['pending', 'processing', 'reviewing'])
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as ImportBatch[];
    },
    enabled: !!familyId,
    staleTime: 0, // Always refetch
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
}

/**
 * Hook to get a specific import batch with its items - 100% backend-driven
 * Never depends on local state, always refetchable
 */
export function useImportBatch(importId: string | null) {
  const { family } = useAuth();
  const familyId = family?.id;

  const reviewQuery = useQuery({
    queryKey: ['import-review', importId, familyId],
    queryFn: async () => {
      if (!importId || !familyId) {
        console.log('[OIK Import] No importId or familyId, returning null review');
        return null as null | { batch: ImportBatch | null; items: ImportItem[]; summary: any };
      }

      const { data, error } = await supabase.functions.invoke('import-review', {
        body: { import_id: importId },
      });

      if (error) {
        console.error('[OIK Import] import-review function error:', error);
        throw error;
      }

      const payload = (data ?? null) as any;
      const batch = (payload?.batch ?? null) as ImportBatch | null;
      const items = (payload?.items ?? []) as ImportItem[];
      const summary = payload?.summary ?? null;

      // Logs sem dados sensíveis
      console.log('[OIK Import][ReviewPayload]', {
        importBatchId: importId,
        status: batch?.status ?? null,
        itemsCount: items.length,
      });

      return { batch, items, summary };
    },
    enabled: !!importId && !!familyId,
    staleTime: 0,
    gcTime: 5000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const batch = reviewQuery.data?.batch ?? null;
  const items = reviewQuery.data?.items ?? [];
  const serverSummary = reviewQuery.data?.summary ?? null;
  const isLoading = reviewQuery.isLoading;
  const isError = reviewQuery.isError;
  const error = reviewQuery.error;
  
  // Determine status-based states
  const isExpired = batch?.status === 'expired' || 
    (batch?.expires_at && new Date(batch.expires_at) < new Date());
  const isProcessing = batch?.status === 'pending' || batch?.status === 'processing';
  const isFailed = batch?.status === 'failed';
  const isReviewing = batch?.status === 'reviewing';
  const isEmpty = !isLoading && !isError && items.length === 0 && batch !== null && 
    (batch.status === 'reviewing' || batch.status === 'completed');

  // Calculate summary
  const summary = {
    total: serverSummary?.total ?? items.length,
    validCount: items.filter(i => !i.is_duplicate && !i.needs_review).length,
    duplicateCount: serverSummary?.duplicateCount ?? items.filter(i => i.is_duplicate).length,
    needsReviewCount: serverSummary?.needsReviewCount ?? items.filter(i => i.needs_review && !i.is_duplicate).length,
    totalIncome: serverSummary?.totalIncome ?? items.filter(i => i.type === 'income').reduce((sum, i) => sum + i.amount, 0),
    totalExpense: serverSummary?.totalExpense ?? items.filter(i => i.type === 'expense').reduce((sum, i) => sum + i.amount, 0),
  };

  // Generate error code
  let errorCode: string | null = null;
  const backendErrorCode = (batch as any)?.error_code ?? null;
  if (backendErrorCode) {
    errorCode = backendErrorCode;
  }
  if (!batch && !isLoading && importId) {
    errorCode = IMPORT_ERROR_CODES.NOT_FOUND;
  } else if (isExpired) {
    errorCode = IMPORT_ERROR_CODES.EXPIRED;
  } else if (isFailed) {
    errorCode = IMPORT_ERROR_CODES.FAILED;
  } else if (isEmpty) {
    errorCode = IMPORT_ERROR_CODES.EMPTY;
  } else if (isError) {
    errorCode = IMPORT_ERROR_CODES.NETWORK;
  }

  const refetch = useCallback(() => {
    console.log('[OIK Import] Manual refetch triggered');
    reviewQuery.refetch();
  }, [reviewQuery]);

  return {
    batch,
    items,
    isLoading,
    isError,
    error: error as Error | null,
    errorCode,
    isEmpty,
    isExpired,
    isProcessing,
    isFailed,
    isReviewing,
    summary,
    refetch,
  };
}

/**
 * Hook for auto-polling when import is processing
 */
export function useImportPolling(
  importId: string | null, 
  isProcessing: boolean, 
  refetch: () => void
) {
  useEffect(() => {
    if (!importId || !isProcessing) return;

    console.log('[OIK Import] Starting polling for processing import');

    let pollCount = 0;
    const maxPolls = 30; // 30 polls = ~1 minute at 2s intervals
    
    const interval = setInterval(() => {
      pollCount++;
      console.log(`[OIK Import] Poll ${pollCount}/${maxPolls}`);
      refetch();
      
      if (pollCount >= maxPolls) {
        console.log('[OIK Import] Max polls reached, stopping');
        clearInterval(interval);
      }
    }, 2000); // Poll every 2 seconds initially

    return () => {
      console.log('[OIK Import] Stopping polling');
      clearInterval(interval);
    };
  }, [importId, isProcessing, refetch]);
}

/**
 * Hook to update import status
 */
export function useUpdateImportStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      importId, 
      status 
    }: { 
      importId: string; 
      status: ImportStatus;
    }) => {
      const { error } = await supabase
        .from('imports')
        .update({ 
          status,
          processed_at: ['completed', 'cancelled', 'failed'].includes(status) 
            ? new Date().toISOString() 
            : null,
        })
        .eq('id', importId);

      if (error) throw error;
    },
    onSuccess: (_, { importId }) => {
      queryClient.invalidateQueries({ queryKey: ['import-batch', importId] });
      queryClient.invalidateQueries({ queryKey: ['pending-imports'] });
      queryClient.invalidateQueries({ queryKey: ['imports'] });
    },
  });
}

/**
 * Hook to retry a failed/expired import (reprocess)
 */
export function useRetryImport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (importId: string) => {
      console.log(`[OIK Import] Retrying import: ${importId}`);
      
      // Reset status to processing
      const { error } = await supabase
        .from('imports')
        .update({ 
          status: 'processing',
          error_message: null,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24h from now
        })
        .eq('id', importId);

      if (error) throw error;
      
      // Note: In a full implementation, you'd call the import-process edge function here
      // For now, we just reset the status
      
      return { success: true };
    },
    onSuccess: (_, importId) => {
      queryClient.invalidateQueries({ queryKey: ['import-batch', importId] });
      queryClient.invalidateQueries({ queryKey: ['import-items', importId] });
      queryClient.invalidateQueries({ queryKey: ['pending-imports'] });
      toast.info("Reprocessando importação...");
    },
    onError: (error) => {
      console.error('[OIK Import] Error retrying import:', error);
      toast.error("Erro ao reprocessar importação");
    },
  });
}

/**
 * Hook to confirm import and create real transactions
 */
export function useConfirmImportBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      importId, 
      selectedIds,
      categoryUpdates 
    }: { 
      importId: string; 
      selectedIds: string[];
      categoryUpdates?: Record<string, { categoryId: string; subcategoryId: string | null }>;
    }) => {
      console.log(`[OIK Import] Confirming import: ${importId} with ${selectedIds.length} items`);
      
      // Get pending transactions to confirm
      const { data: pendingTx, error: fetchError } = await supabase
        .from('import_pending_transactions')
        .select('*')
        .eq('import_id', importId)
        .in('id', selectedIds);

      if (fetchError) throw fetchError;
      if (!pendingTx || pendingTx.length === 0) {
        throw new Error('Nenhuma transação selecionada');
      }

      // Get import info for source
      const { data: importData, error: importError } = await supabase
        .from('imports')
        .select('source_id, import_type, invoice_month, family_id')
        .eq('id', importId)
        .single();

      if (importError) throw importError;

      // Insert confirmed transactions
      const transactionsToInsert = pendingTx.map(pt => {
        const categoryUpdate = categoryUpdates?.[pt.id];
        return {
          family_id: pt.family_id,
          date: pt.date,
          original_date: pt.original_date,
          amount: pt.amount,
          type: pt.type as 'income' | 'expense',
          description: pt.description,
          category_id: categoryUpdate?.categoryId || pt.category_id,
          subcategory_id: categoryUpdate?.subcategoryId || pt.subcategory_id,
          payment_method: (importData.import_type === 'credit_card' ? 'credit' : 'debit') as 'credit' | 'debit',
          bank_account_id: importData.import_type === 'bank_statement' ? importData.source_id : null,
          credit_card_id: importData.import_type === 'credit_card' ? importData.source_id : null,
          import_id: importId,
          source: 'IMPORT',
          review_status: 'CONFIRMED',
        };
      });

      const { error: insertError } = await supabase
        .from('transactions')
        .insert(transactionsToInsert);

      if (insertError) throw insertError;

      // Learn category rules from user corrections
      if (categoryUpdates) {
        const rulesToUpsert = pendingTx
          .filter(pt => {
            const update = categoryUpdates[pt.id];
            return update && pt.description && 
              (update.categoryId !== pt.suggested_category_id);
          })
          .map(pt => {
            const update = categoryUpdates[pt.id]!;
            const keyword = (pt.description || '')
              .toLowerCase()
              .replace(/\s+/g, ' ')
              .trim()
              .substring(0, 100);
            
            return {
              family_id: importData.family_id,
              keyword,
              category_id: update.categoryId,
              subcategory_id: update.subcategoryId,
            };
          })
          .filter(r => r.keyword.length > 2);

        if (rulesToUpsert.length > 0) {
          for (const rule of rulesToUpsert) {
            await supabase
              .from('import_category_rules')
              .upsert(rule, { onConflict: 'family_id,keyword' });
          }
        }
      }

      // Delete all pending transactions for this import
      await supabase
        .from('import_pending_transactions')
        .delete()
        .eq('import_id', importId);

      // Update import status
      await supabase
        .from('imports')
        .update({
          status: 'completed',
          transactions_count: selectedIds.length,
          processed_at: new Date().toISOString(),
        })
        .eq('id', importId);

      // Clear local storage
      clearPendingImportId();

      console.log(`[OIK Import] Confirmed ${selectedIds.length} transactions`);
      return { count: selectedIds.length };
    },
    onSuccess: (data) => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['imports'] });
      queryClient.invalidateQueries({ queryKey: ['pending-imports'] });
      queryClient.invalidateQueries({ queryKey: ['import-batch'] });
      queryClient.invalidateQueries({ queryKey: ['import-items'] });
      queryClient.invalidateQueries({ queryKey: ['pending-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
      queryClient.invalidateQueries({ queryKey: ['home-summary'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['projection'] });
      toast.success(`${data.count} transações importadas com sucesso!`);
    },
    onError: (error) => {
      console.error('[OIK Import] Error confirming import:', error);
      toast.error("Erro ao confirmar importação");
    },
  });
}

/**
 * Hook to cancel an import
 */
export function useCancelImportBatch() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (importId: string) => {
      console.log(`[OIK Import] Cancelling import: ${importId}`);
      
      // Delete all pending transactions
      await supabase
        .from('import_pending_transactions')
        .delete()
        .eq('import_id', importId);

      // Update import status
      await supabase
        .from('imports')
        .update({
          status: 'cancelled',
          transactions_count: 0,
          processed_at: new Date().toISOString(),
        })
        .eq('id', importId);

      // Clear local storage
      clearPendingImportId();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imports'] });
      queryClient.invalidateQueries({ queryKey: ['pending-imports'] });
      queryClient.invalidateQueries({ queryKey: ['import-batch'] });
      queryClient.invalidateQueries({ queryKey: ['import-items'] });
      queryClient.invalidateQueries({ queryKey: ['pending-transactions'] });
      toast.info("Importação cancelada");
    },
    onError: (error) => {
      console.error('[OIK Import] Error cancelling import:', error);
      toast.error("Erro ao cancelar importação");
    },
  });
}

/**
 * Hook to update a pending transaction's category
 */
export function useUpdateImportItem() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      id, 
      categoryId, 
      subcategoryId 
    }: { 
      id: string; 
      categoryId: string; 
      subcategoryId: string | null;
    }) => {
      const { error } = await supabase
        .from('import_pending_transactions')
        .update({ 
          category_id: categoryId,
          subcategory_id: subcategoryId,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-items'] });
      queryClient.invalidateQueries({ queryKey: ['pending-transactions'] });
    },
  });
}

/**
 * Hook to delete pending transactions
 */
export function useDeleteImportItems() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('import_pending_transactions')
        .delete()
        .in('id', ids);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-items'] });
      queryClient.invalidateQueries({ queryKey: ['pending-transactions'] });
      toast.success("Transações removidas");
    },
  });
}
