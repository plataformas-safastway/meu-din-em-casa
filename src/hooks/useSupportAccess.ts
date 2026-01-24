import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export function useSupportAccess() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['support-access', user?.id],
    queryFn: async (): Promise<boolean> => {
      if (!user) return false;

      const { data, error } = await supabase.rpc('has_support_access', {
        _user_id: user.id
      });

      if (error) {
        console.error('[useSupportAccess] Error checking access:', error);
        return false;
      }

      return data as boolean;
    },
    enabled: !!user,
    staleTime: 1 * 60 * 1000,
  });
}

export function useSupportRole() {
  const { data: hasSupportAccess, isLoading } = useSupportAccess();

  return {
    hasSupportAccess: hasSupportAccess ?? false,
    isLoading,
  };
}
