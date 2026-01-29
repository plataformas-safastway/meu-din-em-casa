import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AccountingRegime, DEFAULT_ACCOUNTING_REGIME } from "@/types/accountingRegime";
import { toast } from "sonner";

/**
 * Hook to manage the family's accounting regime
 */
export function useAccountingRegime() {
  const { family } = useAuth();
  const queryClient = useQueryClient();

  const { data: regime, isLoading } = useQuery({
    queryKey: ['accounting-regime', family?.id],
    queryFn: async (): Promise<AccountingRegime> => {
      if (!family?.id) return DEFAULT_ACCOUNTING_REGIME;

      const { data, error } = await supabase
        .from('families')
        .select('accounting_regime')
        .eq('id', family.id)
        .single();

      if (error) {
        console.error('Error fetching accounting regime:', error);
        return DEFAULT_ACCOUNTING_REGIME;
      }

      return (data?.accounting_regime as AccountingRegime) || DEFAULT_ACCOUNTING_REGIME;
    },
    enabled: !!family?.id,
  });

  const updateRegimeMutation = useMutation({
    mutationFn: async (newRegime: AccountingRegime) => {
      if (!family?.id) throw new Error('Família não encontrada');

      const { error } = await supabase
        .from('families')
        .update({ accounting_regime: newRegime })
        .eq('id', family.id);

      if (error) throw error;
      return newRegime;
    },
    onSuccess: (newRegime) => {
      queryClient.invalidateQueries({ queryKey: ['accounting-regime', family?.id] });
      // Also invalidate budget-related queries to reflect the new calculation
      queryClient.invalidateQueries({ queryKey: ['budget'] });
      queryClient.invalidateQueries({ queryKey: ['home-summary'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      
      const regimeLabel = newRegime === 'cash_basis' ? 'Fluxo de Caixa' : 'Competência';
      toast.success(`Regime alterado para ${regimeLabel}`);
    },
    onError: (error) => {
      console.error('Error updating accounting regime:', error);
      toast.error('Erro ao alterar regime contábil');
    },
  });

  return {
    regime: regime || DEFAULT_ACCOUNTING_REGIME,
    isLoading,
    updateRegime: updateRegimeMutation.mutate,
    isUpdating: updateRegimeMutation.isPending,
  };
}
