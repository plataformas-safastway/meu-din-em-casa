/**
 * useAppAuthorization - Hook to check if user has consumer access to the App
 * 
 * CRITICAL SECURITY: Authentication is NOT authorization.
 * This hook verifies the user has:
 * 1. A valid family_member record (consumer access)
 * 2. Completed onboarding (onboarding_status = 'completed')
 * 
 * Without both, access to /app routes MUST be blocked.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type OnboardingStatus = 'not_started' | 'in_progress' | 'completed';

export interface AppAuthorizationState {
  /** User is authenticated (has session) */
  isAuthenticated: boolean;
  /** User has a family_member record (consumer profile) */
  hasConsumerProfile: boolean;
  /** User has completed the onboarding wizard */
  hasCompletedOnboarding: boolean;
  /** User has full access to the App (both conditions met) */
  hasAppAccess: boolean;
  /** The current onboarding status */
  onboardingStatus: OnboardingStatus | null;
  /** Loading state */
  isLoading: boolean;
  /** Family ID if user has one */
  familyId: string | null;
}

export function useAppAuthorization(): AppAuthorizationState {
  const { user, family, familyMember, loading: authLoading } = useAuth();

  // Query to get onboarding status
  const { data: onboardingData, isLoading: onboardingLoading } = useQuery({
    queryKey: ['app-authorization-onboarding', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('user_onboarding')
        .select('status')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('[useAppAuthorization] Error fetching onboarding:', error);
        return null;
      }

      return data;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const isAuthenticated = !!user;
  const hasConsumerProfile = !!familyMember && !!family;
  const onboardingStatus = (onboardingData?.status as OnboardingStatus) ?? null;
  const hasCompletedOnboarding = onboardingStatus === 'completed';
  const isLoading = authLoading || onboardingLoading;

  // Full App access requires:
  // 1. Being authenticated
  // 2. Having a consumer profile (family_member)
  // 3. Having completed onboarding
  const hasAppAccess = isAuthenticated && hasConsumerProfile && hasCompletedOnboarding;

  return {
    isAuthenticated,
    hasConsumerProfile,
    hasCompletedOnboarding,
    hasAppAccess,
    onboardingStatus,
    isLoading,
    familyId: family?.id ?? null,
  };
}

/**
 * Check if user can access the App from Dashboard context
 * Used by "Voltar ao App" button
 */
export type AppAccessDeniedReason = 'no_consumer_profile' | 'onboarding_incomplete' | null;

export function useCanAccessAppFromDashboard() {
  const auth = useAppAuthorization();
  
  const reason: AppAccessDeniedReason = !auth.hasConsumerProfile 
    ? 'no_consumer_profile' 
    : !auth.hasCompletedOnboarding 
      ? 'onboarding_incomplete' 
      : null;
  
  return {
    canAccess: auth.hasAppAccess,
    hasConsumerProfile: auth.hasConsumerProfile,
    hasCompletedOnboarding: auth.hasCompletedOnboarding,
    isLoading: auth.isLoading,
    reason,
  };
}
