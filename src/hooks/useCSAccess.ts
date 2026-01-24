import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook to check if current user has Customer Success access
 * Only ADMIN_MASTER and CUSTOMER_SUCCESS roles have access
 */
export function useCSAccess() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['cs-access', user?.id],
    queryFn: async (): Promise<boolean> => {
      if (!user) return false;

      const { data, error } = await supabase.rpc('has_cs_access', {
        _user_id: user.id
      });

      if (error) {
        console.error('[useCSAccess] Error checking CS access:', error);
        return false;
      }

      return !!data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
