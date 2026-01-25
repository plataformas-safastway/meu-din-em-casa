import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UserAccess {
  hasAppAccess: boolean;
  hasDashboardAccess: boolean;
  dashboardRole: string | null;
}

export function useUserAccess() {
  const { user, family } = useAuth();

  return useQuery({
    queryKey: ['user-access', user?.id],
    queryFn: async (): Promise<UserAccess> => {
      if (!user) {
        return {
          hasAppAccess: false,
          hasDashboardAccess: false,
          dashboardRole: null,
        };
      }

      // Check if user has dashboard access (admin roles)
      const { data: roleData } = await supabase.rpc('get_user_role', {
        _user_id: user.id
      });

      const dashboardRoles = ['admin', 'admin_master', 'cs', 'customer_success', 'financeiro', 'tecnologia', 'suporte', 'diretoria', 'gestao_estrategica'];
      const hasDashboardAccess = roleData ? dashboardRoles.includes(roleData) : false;

      // User has app access if they belong to a family
      const hasAppAccess = !!family;

      return {
        hasAppAccess,
        hasDashboardAccess,
        dashboardRole: roleData || null,
      };
    },
    enabled: !!user,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
}

export function useShouldShowContextSelector() {
  const { data: access, isLoading } = useUserAccess();
  
  // Show selector only if user has BOTH app and dashboard access
  const shouldShow = !isLoading && access?.hasAppAccess && access?.hasDashboardAccess;
  
  return {
    shouldShow: !!shouldShow,
    isLoading,
    access,
  };
}
