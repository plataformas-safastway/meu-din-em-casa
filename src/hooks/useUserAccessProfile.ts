import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Consolidated access profile - replaces 7 separate RPC calls with 1
 * Performance optimization: reduces N+1 queries on admin dashboard load
 */
export interface UserAccessProfile {
  role: string | null;
  has_cs_access: boolean;
  has_financial_access: boolean;
  has_tech_access: boolean;
  has_support_access: boolean;
  has_legal_access: boolean;
  has_executive_access: boolean;
  is_admin: boolean;
}

const DEFAULT_ACCESS: UserAccessProfile = {
  role: null,
  has_cs_access: false,
  has_financial_access: false,
  has_tech_access: false,
  has_support_access: false,
  has_legal_access: false,
  has_executive_access: false,
  is_admin: false,
};

export function useUserAccessProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['user-access-profile', user?.id],
    queryFn: async (): Promise<UserAccessProfile> => {
      if (!user) return DEFAULT_ACCESS;

      const { data, error } = await supabase.rpc('get_user_access_profile', {
        _user_id: user.id
      });

      if (error) {
        console.error('[useUserAccessProfile] Error:', error);
        return DEFAULT_ACCESS;
      }

      // Safely parse the JSONB response with proper type checking
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const profile = data as Record<string, unknown>;
        return {
          role: typeof profile.role === 'string' ? profile.role : null,
          has_cs_access: Boolean(profile.has_cs_access),
          has_financial_access: Boolean(profile.has_financial_access),
          has_tech_access: Boolean(profile.has_tech_access),
          has_support_access: Boolean(profile.has_support_access),
          has_legal_access: Boolean(profile.has_legal_access),
          has_executive_access: Boolean(profile.has_executive_access),
          is_admin: Boolean(profile.is_admin),
        };
      }

      return DEFAULT_ACCESS;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes - longer cache since roles rarely change
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
}

/**
 * Convenience hooks that use the consolidated profile
 * These provide backwards compatibility with existing code
 */
export function useConsolidatedCSAccess() {
  const { data, isLoading } = useUserAccessProfile();
  return { data: data?.has_cs_access ?? false, isLoading };
}

export function useConsolidatedFinancialAccess() {
  const { data, isLoading } = useUserAccessProfile();
  return { data: data?.has_financial_access ?? false, isLoading };
}

export function useConsolidatedTechAccess() {
  const { data, isLoading } = useUserAccessProfile();
  return { data: data?.has_tech_access ?? false, isLoading };
}

export function useConsolidatedSupportAccess() {
  const { data, isLoading } = useUserAccessProfile();
  return { data: data?.has_support_access ?? false, isLoading };
}

export function useConsolidatedLegalAccess() {
  const { data, isLoading } = useUserAccessProfile();
  return { data: data?.has_legal_access ?? false, isLoading };
}

export function useConsolidatedExecutiveAccess() {
  const { data, isLoading } = useUserAccessProfile();
  return { data: data?.has_executive_access ?? false, isLoading };
}
