import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// ============================================
// TYPES
// ============================================

export type ImportStatus = 'pending' | 'reviewing' | 'completed' | 'cancelled' | 'failed' | 'expired';

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
  error_message: string | null;
  created_at: string;
  processed_at: string | null;
  expires_at: string | null;
  created_by: string | null;
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
  isEmpty: boolean;
  isExpired: boolean;
}

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
    console.warn('Failed to save pending import ID to localStorage:', e);
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
    console.warn('Failed to get pending import ID from localStorage:', e);
    return null;
  }
}

export function clearPendingImportId(): void {
  try {
    localStorage.removeItem(PENDING_IMPORT_KEY);
  } catch (e) {
    console.warn('Failed to clear pending import ID from localStorage:', e);
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
        .in('status', ['pending', 'reviewing'])
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
 * Hook to get a specific import batch with its items
 */
export function useImportBatch(importId: string | null) {
  const { family } = useAuth();
  const familyId = family?.id;

  const batchQuery = useQuery({
    queryKey: ['import-batch', importId],
    queryFn: async () => {
      if (!importId || !familyId) return null;

      const { data, error } = await supabase
        .from('imports')
        .select('*')
        .eq('id', importId)
        .eq('family_id', familyId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null; // Not found
        throw error;
      }
      return data as ImportBatch;
    },
    enabled: !!importId && !!familyId,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const itemsQuery = useQuery({
    queryKey: ['import-items', importId],
    queryFn: async () => {
      if (!importId) return [];

      const { data, error } = await supabase
        .from('import_pending_transactions')
        .select('*')
        .eq('import_id', importId)
        .order('date', { ascending: false });

      if (error) throw error;
      return data as ImportItem[];
    },
    enabled: !!importId,
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const batch = batchQuery.data ?? null;
  const items = itemsQuery.data ?? [];
  const isLoading = batchQuery.isLoading || itemsQuery.isLoading;
  const isError = batchQuery.isError || itemsQuery.isError;
  const error = batchQuery.error || itemsQuery.error;
  
  const isExpired = batch?.status === 'expired' || 
    (batch?.expires_at && new Date(batch.expires_at) < new Date());
  const isEmpty = !isLoading && !isError && items.length === 0 && batch !== null;

  return {
    batch,
    items,
    isLoading,
    isError,
    error: error as Error | null,
    isEmpty,
    isExpired,
    refetch: () => {
      batchQuery.refetch();
      itemsQuery.refetch();
    },
  };
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
      toast.success(`${data.count} transações importadas com sucesso!`);
    },
    onError: (error) => {
      console.error('Error confirming import:', error);
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
      console.error('Error cancelling import:', error);
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
    onSuccess: (_, { id }) => {
      // Get the import_id from cache if possible
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
