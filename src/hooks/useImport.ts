import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Import {
  id: string;
  family_id: string;
  file_name: string;
  file_type: string;
  import_type: string;
  source_id: string;
  invoice_month: string | null;
  status: string;
  transactions_count: number | null;
  error_message: string | null;
  storage_path: string | null;
  created_at: string;
  processed_at: string | null;
  created_by: string | null;
}

export interface PendingTransaction {
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
  raw_data: any;
  created_at: string;
}

export function useImports() {
  const { family } = useAuth();
  const familyId = family?.id;

  return useQuery({
    queryKey: ['imports', familyId],
    queryFn: async () => {
      if (!familyId) return [];

      const { data, error } = await supabase
        .from('imports')
        .select('*')
        .eq('family_id', familyId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as Import[];
    },
    enabled: !!familyId,
  });
}

export function usePendingTransactions(importId: string | null) {
  return useQuery({
    queryKey: ['pending-transactions', importId],
    queryFn: async () => {
      if (!importId) return [];

      const { data, error } = await supabase
        .from('import_pending_transactions')
        .select('*')
        .eq('import_id', importId)
        .order('date', { ascending: false });

      if (error) throw error;
      return data as PendingTransaction[];
    },
    enabled: !!importId,
  });
}

export function useDeleteImport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (importId: string) => {
      // Delete pending transactions first
      const { error: pendingError } = await supabase
        .from('import_pending_transactions')
        .delete()
        .eq('import_id', importId);

      if (pendingError) throw pendingError;

      // Delete all transactions from this import
      const { error: txError } = await supabase
        .from('transactions')
        .delete()
        .eq('import_id', importId);

      if (txError) throw txError;

      // Then delete the import record
      const { error } = await supabase
        .from('imports')
        .delete()
        .eq('id', importId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imports'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
      toast.success("Importação excluída com sucesso");
    },
    onError: (error) => {
      console.error('Error deleting import:', error);
      toast.error("Erro ao excluir importação");
    },
  });
}

export function useConfirmImport() {
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
        .select('source_id, import_type, invoice_month')
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
        const { data: familyData } = await supabase
          .from('imports')
          .select('family_id')
          .eq('id', importId)
          .single();

        if (familyData) {
          const rulesToUpsert = pendingTx
            .filter(pt => {
              const update = categoryUpdates[pt.id];
              return update && pt.description && 
                (update.categoryId !== pt.suggested_category_id);
            })
            .map(pt => {
              const update = categoryUpdates[pt.id]!;
              // Normalize keyword
              const keyword = (pt.description || '')
                .toLowerCase()
                .replace(/\s+/g, ' ')
                .trim()
                .substring(0, 100);
              
              return {
                family_id: familyData.family_id,
                keyword,
                category_id: update.categoryId,
                subcategory_id: update.subcategoryId,
              };
            })
            .filter(r => r.keyword.length > 2);

          if (rulesToUpsert.length > 0) {
            // Upsert rules
            for (const rule of rulesToUpsert) {
              await supabase
                .from('import_category_rules')
                .upsert(rule, { 
                  onConflict: 'family_id,keyword',
                })
                .select();
            }
          }
        }
      }

      // Delete all pending transactions for this import
      const { error: deleteError } = await supabase
        .from('import_pending_transactions')
        .delete()
        .eq('import_id', importId);

      if (deleteError) throw deleteError;

      // Update import status
      const { error: updateError } = await supabase
        .from('imports')
        .update({
          status: 'completed',
          transactions_count: selectedIds.length,
          processed_at: new Date().toISOString(),
        })
        .eq('id', importId);

      if (updateError) throw updateError;

      return { count: selectedIds.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['imports'] });
      queryClient.invalidateQueries({ queryKey: ['pending-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
      toast.success(`${data.count} transações importadas com sucesso!`);
    },
    onError: (error) => {
      console.error('Error confirming import:', error);
      toast.error("Erro ao confirmar importação");
    },
  });
}

export function useCancelImport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (importId: string) => {
      // Delete all pending transactions
      const { error: deleteError } = await supabase
        .from('import_pending_transactions')
        .delete()
        .eq('import_id', importId);

      if (deleteError) throw deleteError;

      // Update import status
      const { error: updateError } = await supabase
        .from('imports')
        .update({
          status: 'cancelled',
          transactions_count: 0,
          processed_at: new Date().toISOString(),
        })
        .eq('id', importId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imports'] });
      queryClient.invalidateQueries({ queryKey: ['pending-transactions'] });
      toast.info("Importação cancelada");
    },
    onError: (error) => {
      console.error('Error cancelling import:', error);
      toast.error("Erro ao cancelar importação");
    },
  });
}

export function useUpdatePendingTransaction() {
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
      queryClient.invalidateQueries({ queryKey: ['pending-transactions'] });
    },
  });
}

export function useDeletePendingTransactions() {
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
      queryClient.invalidateQueries({ queryKey: ['pending-transactions'] });
      toast.success("Transações removidas");
    },
  });
}

export function useFamilyCategoryRules() {
  const { family } = useAuth();
  const familyId = family?.id;

  return useQuery({
    queryKey: ['import-category-rules', familyId],
    queryFn: async () => {
      if (!familyId) return [];

      const { data, error } = await supabase
        .from('import_category_rules')
        .select('*')
        .eq('family_id', familyId)
        .order('match_count', { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!familyId,
  });
}
