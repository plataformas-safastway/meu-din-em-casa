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

export function usePendingImports() {
  const { family } = useAuth();
  const familyId = family?.id;

  return useQuery({
    queryKey: ['imports', familyId, 'pending'],
    queryFn: async () => {
      if (!familyId) return [];

      const { data, error } = await supabase
        .from('imports')
        .select('*')
        .eq('family_id', familyId)
        .in('status', ['processing', 'review_needed'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Import[];
    },
    enabled: !!familyId,
  });
}

export function useDeleteImport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (importId: string) => {
      // First delete all transactions from this import
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

export function useRevertImport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (importId: string) => {
      // Delete all transactions from this import
      const { error: txError } = await supabase
        .from('transactions')
        .delete()
        .eq('import_id', importId);

      if (txError) throw txError;

      // Update import status to reverted
      const { error } = await supabase
        .from('imports')
        .update({ 
          status: 'reverted',
          transactions_count: 0,
          processed_at: new Date().toISOString(),
        })
        .eq('id', importId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imports'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });
      toast.success("Importação revertida com sucesso");
    },
    onError: (error) => {
      console.error('Error reverting import:', error);
      toast.error("Erro ao reverter importação");
    },
  });
}
