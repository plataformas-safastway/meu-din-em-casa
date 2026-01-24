import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

// Extended AppRole type to include new financial roles
export type ExtendedAppRole = 'user' | 'admin' | 'cs' | 'admin_master' | 'financeiro' | 'tecnologia';

export function useFinancialAccess() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['financial-access', user?.id],
    queryFn: async (): Promise<boolean> => {
      if (!user) return false;

      const { data, error } = await supabase.rpc('has_financial_access', {
        _user_id: user.id
      });

      if (error) {
        console.error('[useFinancialAccess] Error checking access:', error);
        return false;
      }

      return data as boolean;
    },
    enabled: !!user,
    staleTime: 1 * 60 * 1000,
  });
}

export function useTechAccess() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['tech-access', user?.id],
    queryFn: async (): Promise<boolean> => {
      if (!user) return false;

      const { data, error } = await supabase.rpc('has_tech_access', {
        _user_id: user.id
      });

      if (error) {
        console.error('[useTechAccess] Error checking access:', error);
        return false;
      }

      return data as boolean;
    },
    enabled: !!user,
    staleTime: 1 * 60 * 1000,
  });
}

export function useFinancialRole() {
  const { data: hasFinancialAccess, isLoading: financialLoading } = useFinancialAccess();
  const { data: hasTechAccess, isLoading: techLoading } = useTechAccess();

  return {
    hasFinancialAccess: hasFinancialAccess ?? false,
    hasTechAccess: hasTechAccess ?? false,
    isLoading: financialLoading || techLoading,
  };
}
