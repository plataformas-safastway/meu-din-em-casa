import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface UserFamily {
  family_id: string;
  family_name: string;
  member_role: string;
  members_count: number;
  last_active_at: string | null;
  is_owner: boolean;
}

export function useUserFamilies() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-families', user?.id],
    queryFn: async (): Promise<UserFamily[]> => {
      if (!user) return [];

      const { data, error } = await supabase.rpc('get_user_families', {
        _user_id: user.id
      });

      if (error) {
        console.error('Error fetching user families:', error);
        return [];
      }

      return (data as UserFamily[]) || [];
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useSwitchFamily() {
  const queryClient = useQueryClient();
  const { user, refreshFamily } = useAuth();

  return useMutation({
    mutationFn: async (toFamilyId: string) => {
      if (!user) throw new Error('User not authenticated');

      const { data, error } = await supabase.rpc('switch_active_family', {
        _user_id: user.id,
        _to_family_id: toFamilyId
      });

      if (error) {
        console.error('Error switching family:', error);
        throw error;
      }

      return data;
    },
    onSuccess: async () => {
      // Invalidate all family-related queries
      await queryClient.invalidateQueries({ queryKey: ['user-families'] });
      
      // Refresh the auth context family data
      await refreshFamily();

      // Invalidate all data queries that depend on family
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['bank-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      queryClient.invalidateQueries({ queryKey: ['imports'] });
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      queryClient.invalidateQueries({ queryKey: ['home-summary'] });
      queryClient.invalidateQueries({ queryKey: ['cashflow'] });
      queryClient.invalidateQueries({ queryKey: ['projection'] });
      queryClient.invalidateQueries({ queryKey: ['category-rules'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-reports'] });
      queryClient.invalidateQueries({ queryKey: ['insights'] });
      queryClient.invalidateQueries({ queryKey: ['family-activities'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });

      toast.success('Família alterada com sucesso');
    },
    onError: (error) => {
      console.error('Error in switch family mutation:', error);
      toast.error('Erro ao trocar de família');
    }
  });
}

export function useHasMultipleFamilies() {
  const { data: families, isLoading } = useUserFamilies();
  
  return {
    hasMultipleFamilies: (families?.length ?? 0) > 1,
    familiesCount: families?.length ?? 0,
    isLoading,
  };
}
