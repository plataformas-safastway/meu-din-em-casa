import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook to check if current user has Legal/DPO access
 * Only LEGAL and ADMIN_MASTER roles have access
 */
export function useLegalAccess() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['legal-access', user?.id],
    queryFn: async (): Promise<boolean> => {
      if (!user) return false;

      const { data, error } = await supabase.rpc('has_legal_access', {
        _user_id: user.id
      });

      if (error) {
        console.error('[useLegalAccess] Error checking legal access:', error);
        return false;
      }

      return !!data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to check if user has admin_master role
 */
export function useAdminMasterAccess() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['admin-master-access', user?.id],
    queryFn: async (): Promise<boolean> => {
      if (!user) return false;

      const { data, error } = await supabase.rpc('is_admin_master', {
        _user_id: user.id
      });

      if (error) {
        console.error('[useAdminMasterAccess] Error checking admin_master access:', error);
        return false;
      }

      return !!data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}
