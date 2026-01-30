/**
 * AppAuthGate - Fonte ÚNICA de verdade para autorização do App (consumer)
 * 
 * REGRAS DE AUTORIZAÇÃO (nesta ordem):
 * 1. Sessão autenticada existe?
 * 2. Existe consumer profile (family_member) vinculado ao auth_id?
 * 3. onboarding_status === "completed"?
 * 
 * ESTADOS:
 * - loading: mostra overlay SEM desmontar children
 * - blocked: redireciona para /app-access-blocked (sem consumer profile)
 * - onboarding: redireciona para /onboarding (consumer existe mas onboarding incompleto)
 * - allowed: renderiza children normalmente
 * 
 * REGRA CRÍTICA:
 * - Admin/Master SEM consumer profile → NUNCA redireciona para /signup
 * - Sempre bloqueia e redireciona para /app-access-blocked
 * 
 * TIMEOUT BEHAVIOR (v2):
 * - Overlay não desmonta children
 * - Após 10s, mostra CTAs de recuperação (soft mode)
 * - NUNCA redireciona automaticamente por timeout
 */

import { ReactNode, useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAppAuthorization } from "@/hooks/useAppAuthorization";
import { useStableAuth } from "@/hooks/useStableAuth";
import { isRouteRestoreInProgress } from "@/lib/routeResumeGuard";
import { SessionOverlayWithTimeout } from "./SessionOverlayWithTimeout";

interface AppAuthGateProps {
  children: ReactNode;
  /** If true, also requires onboarding to be complete. Default: true */
  requireOnboardingComplete?: boolean;
}

export function AppAuthGate({ 
  children, 
  requireOnboardingComplete = true 
}: AppAuthGateProps) {
  const location = useLocation();
  const { isAuthTransition, shouldRedirectToLogin, bootstrapStatus } = useStableAuth();
  const {
    isAuthenticated,
    hasConsumerProfile,
    hasCompletedOnboarding,
    hasAppAccess,
    isLoading,
    onboardingStatus,
    familyId,
  } = useAppAuthorization();

  // Debug logging
  useEffect(() => {
    console.log('[AppAuthGate] State:', {
      path: location.pathname,
      isLoading,
      isAuthTransition,
      isAuthenticated,
      hasConsumerProfile,
      hasCompletedOnboarding,
      onboardingStatus,
      hasAppAccess,
      requireOnboardingComplete,
      familyId,
    });
  }, [
    location.pathname,
    isLoading,
    isAuthTransition,
    isAuthenticated,
    hasConsumerProfile,
    hasCompletedOnboarding,
    onboardingStatus,
    hasAppAccess,
    requireOnboardingComplete,
    familyId,
  ]);

  // RULE 1: Never redirect during auth transition or route restoration
  // Keep children mounted to preserve form state
  if (isAuthTransition || isRouteRestoreInProgress()) {
    console.log('[AppAuthGate] In transition/restore - keeping children mounted');
    return <>{children}</>;
  }

  // RULE 2: If not authenticated at all, redirect to login
  if (shouldRedirectToLogin) {
    const next = encodeURIComponent(`${location.pathname}${location.search ?? ""}`);
    console.log('[AppAuthGate] Not authenticated - redirecting to login');
    return (
      <Navigate 
        to={`/login?next=${next}`} 
        replace 
        state={{ from: { pathname: location.pathname, search: location.search } }}
      />
    );
  }

  // RULE 3: Loading state - show overlay with timeout but keep children mounted
  // Uses SessionOverlayWithTimeout for non-blocking timeout handling
  if (isLoading || bootstrapStatus === 'initializing') {
    return (
      <SessionOverlayWithTimeout 
        isLoading={true}
        timeoutMs={10000}
        showDashboardReturn={false}
      >
        {children}
      </SessionOverlayWithTimeout>
    );
  }

  // RULE 4: CRITICAL - User is authenticated but has NO consumer profile
  // This is the core fix: admin/master users without family_member record
  // MUST be blocked from /app/* and NEVER redirected to /signup
  if (isAuthenticated && !hasConsumerProfile) {
    console.log('[AppAuthGate] BLOCKED: Authenticated but no consumer profile');
    return <Navigate to="/app-access-blocked" replace />;
  }

  // RULE 5: User has consumer profile but onboarding is not complete
  // Only enforce if requireOnboardingComplete is true
  if (requireOnboardingComplete && hasConsumerProfile && !hasCompletedOnboarding) {
    console.log('[AppAuthGate] Onboarding incomplete - redirecting to /onboarding');
    return (
      <Navigate 
        to="/onboarding" 
        replace 
        state={{ from: { pathname: location.pathname, search: location.search } }}
      />
    );
  }

  // RULE 6: All checks passed - render children
  console.log('[AppAuthGate] Access ALLOWED');
  return <>{children}</>;
}

export default AppAuthGate;
