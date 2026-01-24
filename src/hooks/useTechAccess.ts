import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook to check if current user has Tech access
 * Only ADMIN_MASTER and TECNOLOGIA roles have access
 */
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
        console.error('[useTechAccess] Error checking tech access:', error);
        return false;
      }

      return !!data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}
