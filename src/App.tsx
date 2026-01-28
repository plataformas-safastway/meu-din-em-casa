// Route Resume Guard v3 - with useNavigate for fallback restore
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, focusManager, useQuery } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole, useHasAnyAdmin } from "@/hooks/useUserRole";
import { ScreenLoader } from "@/components/ui/money-loader";
import { useAppLifecycle } from "@/hooks/useAppLifecycle";
import { useStableAuth } from "@/hooks/useStableAuth";
import { useAuthTimeout } from "@/hooks/useAuthTimeout";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { AuthTimeoutFallback } from "@/components/auth/AuthTimeoutFallback";
import { ChunkErrorBoundary } from "@/components/auth/ChunkErrorBoundary";
import { STALE_TIMES, GC_TIMES } from "@/lib/queryConfig";
import { clearExpiredDrafts } from "@/hooks/useDraftPersistence";
import { installNavigationAudit } from "@/lib/navigationAudit";
import { isNavDebugEnabled } from "@/lib/navDebug";
import { setAuthDebugSnapshot } from "@/lib/devDiagnostics";
import { 
  installRouteResumeGuard, 
  tryInitialRouteRestore, 
  isRouteRestoreInProgress,
  tryFallbackRestore,
  markRestoreCompleted
} from "@/lib/routeResumeGuard";
import { installDevNavigationInstrumentation, installDevNavigationInstrumentationV2, logNavigationAttempt } from "@/lib/devNavigationInstrumentation";
import { 
  logLifecycle, 
  isLifecycleDebugEnabled,
  INSTANCE_SIGNATURES 
} from "@/lib/lifecycleTracer";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { TermosPage } from "./pages/TermosPage";
import { PrivacidadePage } from "./pages/PrivacidadePage";
import { QAReportPage } from "./pages/QAReportPage";
import { AdminSetupPage } from "./pages/admin";
import { AdminRoutes } from "./pages/admin/AdminRoutes";
import { ImportUploadPage } from "./pages/import/ImportUploadPage";
import { ImportReviewPage } from "./pages/import/ImportReviewPage";
import { SpreadsheetImportPage } from "./pages/import/SpreadsheetImportPage";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AppAuthGate } from "@/components/auth/AppAuthGate";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { SelectContextPage } from "./pages/SelectContextPage";
import { SelectFamilyPage } from "./pages/SelectFamilyPage";
import { InviteAcceptPage } from "./pages/InviteAcceptPage";
import { OnboardingFlowPage } from "./pages/OnboardingFlowPage";
import { AppAccessBlockedPage } from "./pages/AppAccessBlockedPage";
import { useEffect, useRef, useCallback, useState } from "react";

// Auth timeout configuration (in milliseconds)
const AUTH_TIMEOUT_MS = 10000; // 10 seconds

// Clear expired drafts on app init
clearExpiredDrafts();

// Diagnostics must NOT run for real users.
// Enable explicitly with `?debugNav=1` (works in production too).
if (isNavDebugEnabled()) {
  // Install redirect diagnostics as early as possible (before any React render)
  installNavigationAudit();

  // DEV-ONLY: Install navigation instrumentation to capture stack traces
  installDevNavigationInstrumentation();
  installDevNavigationInstrumentationV2();
}

// If we booted at '/' unexpectedly after a tab discard/resume, restore immediately
tryInitialRouteRestore();

// SINGLETON: QueryClient created at module level (NOT inside component)
// This ensures it's never recreated on re-render
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Default stale time - data is considered fresh for this duration
      staleTime: STALE_TIMES.transactions,
      // Garbage collection time - how long to keep unused data in cache
      gcTime: GC_TIMES.default,
      // DISABLED: refetchOnWindowFocus causes UI reset on tab switch
      // Background sync is handled manually via useAppLifecycle with debouncing
      refetchOnWindowFocus: false,
      // Refetch on reconnect for offline support
      refetchOnReconnect: true,
      // Retry failed requests
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

// Log QueryClient signature to prove it's a singleton
if (isLifecycleDebugEnabled()) {
  console.log(
    '%c[LIFECYCLE] QueryClient created (module level)',
    'color: #aa00ff; font-weight: bold',
    { signature: INSTANCE_SIGNATURES.queryClient }
  );
}

// Custom focus manager to prevent aggressive refetching
focusManager.setEventListener((handleFocus) => {
  // Only trigger focus events after a longer delay to prevent flash
  const onFocus = () => {
    // Delay focus event to let auth stabilize
    setTimeout(() => {
      handleFocus(true);
    }, 500);
  };
  
  window.addEventListener('focus', onFocus, false);
  return () => {
    window.removeEventListener('focus', onFocus);
  };
});

function LoadingSpinner({ className }: { className?: string }) {
  return <ScreenLoader label="Carregando..." className={className} />
}

/**
 * Soft session overlay - less intrusive, doesn't block scroll
 * Only shows after delay when session verification is taking longer than expected
 */
function SoftSessionOverlay() {
  return (
    <div 
      className="fixed inset-0 z-40 bg-background/30 backdrop-blur-[2px] flex items-center justify-center pointer-events-auto animate-in fade-in duration-300"
      style={{ touchAction: 'none' }}
    >
      <div className="bg-background/90 backdrop-blur-sm rounded-lg px-6 py-4 shadow-lg flex items-center gap-3">
        <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-muted-foreground">Verificando sessão…</span>
      </div>
    </div>
  );
}

/**
 * AuthGate - Bootstrap guard that prevents routing until auth is fully resolved
 * This prevents the "flash" of signup/onboarding screens during login
 * 
 * CRITICAL: Uses useStableAuth to handle tab-switch transitions gracefully
 * NEW: Includes auth timeout failsafe to prevent infinite loading
 */
function AuthGate({ children }: { children: React.ReactNode }) {
  const { 
    session, 
    user, 
    bootstrapStatus, 
    profileStatus,
    isLoading,
    isAuthTransition,
    shouldShowSessionOverlay,
    shouldRedirectToLogin,
  } = useStableAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const lastRouteRef = useRef<string | null>(null);
  const fallbackAttemptedRef = useRef(false);

  // Auth timeout failsafe
  const handleTimeoutRetry = useCallback(() => {
    window.location.reload();
  }, []);

  const { hasTimedOut } = useAuthTimeout({
    timeoutMs: AUTH_TIMEOUT_MS,
    isLoading: isLoading || bootstrapStatus === 'initializing',
    onTimeout: () => {
      console.error('[AuthGate] Auth timeout triggered after', AUTH_TIMEOUT_MS, 'ms');
    },
  });

  // Keep an always-up-to-date snapshot for diagnostics
  setAuthDebugSnapshot({
    ts: Date.now(),
    path: `${location.pathname}${location.search ?? ""}${location.hash ?? ""}`,
    bootstrapStatus,
    profileStatus,
    isLoading,
    isAuthTransition,
    shouldRedirectToLogin,
    hasSession: !!session,
    hasUser: !!user,
  });

  // Check if we have an active session (for overlay logic)
  const hasSession = !!session || !!user;

  // Log transition state for debugging
  useEffect(() => {
    if (isAuthTransition) {
      console.log('[AuthGate] In auth transition - holding render');
    }
  }, [isAuthTransition]);

  // React-side fallback: If pre-React restore didn't work, try here
  useEffect(() => {
    if (fallbackAttemptedRef.current) return;
    if (isLoading || isAuthTransition || bootstrapStatus !== 'ready') return;
    
    const isAuthenticated = !!session && !!user;
    if (!isAuthenticated) return;
    
    const restorePath = tryFallbackRestore(location.pathname, isAuthenticated);
    if (restorePath) {
      fallbackAttemptedRef.current = true;
      console.log('[AuthGate] Fallback restore to:', restorePath);
      navigate(restorePath, { replace: true });
    } else {
      markRestoreCompleted();
    }
  }, [isLoading, isAuthTransition, bootstrapStatus, session, user, location.pathname, navigate]);

  // Router-level route change logging
  useEffect(() => {
    const current = `${location.pathname}${location.search ?? ""}${location.hash ?? ""}`;
    const prev = lastRouteRef.current;
    lastRouteRef.current = current;

    if (prev && prev !== current) {
      console.log("[Router] Route changed", { from: prev, to: current });
    }

    if (current === "/" && prev !== "/") {
      console.error("[Router] UNEXPECTED_HOME_ROUTE", {
        from: prev,
        to: current,
        isLoading,
        isAuthTransition,
        bootstrapStatus,
        profileStatus,
        hasSession: !!session,
        hasUser: !!user,
      });
      console.trace("[Router] stack");
    }
  }, [location.pathname, location.search, location.hash, isLoading, isAuthTransition, bootstrapStatus, profileStatus, session, user]);
  
  // Safety net: track stuck transitions
  const transitionStartRef = useRef<number | null>(null);
  const TRANSITION_STUCK_TIMEOUT_MS = 5000;
  
  useEffect(() => {
    if (isAuthTransition) {
      if (!transitionStartRef.current) {
        transitionStartRef.current = Date.now();
      }
      
      const checkStuck = setTimeout(() => {
        if (transitionStartRef.current && (Date.now() - transitionStartRef.current) >= TRANSITION_STUCK_TIMEOUT_MS) {
          console.error('[AuthGate] AUTH_TRANSITION_STUCK - transition active for >', TRANSITION_STUCK_TIMEOUT_MS, 'ms');
          try {
            const { captureEvent } = require('@/lib/observability');
            captureEvent({
              category: 'auth',
              name: 'AUTH_TRANSITION_STUCK',
              severity: 'error',
              message: `Auth transition stuck for more than ${TRANSITION_STUCK_TIMEOUT_MS}ms`,
              data: {
                path: location.pathname,
                hasSession,
                duration: Date.now() - (transitionStartRef.current || 0),
              },
            });
          } catch (e) {
            // Ignore import errors
          }
        }
      }, TRANSITION_STUCK_TIMEOUT_MS);
      
      return () => clearTimeout(checkStuck);
    } else {
      transitionStartRef.current = null;
    }
  }, [isAuthTransition, hasSession, location.pathname]);

  // Route state preservation logging
  useEffect(() => {
    if (isLifecycleDebugEnabled()) {
      console.log('[AuthGate] State:', {
        path: location.pathname,
        bootstrapStatus,
        profileStatus,
        isLoading,
        isAuthTransition,
        hasSession,
        shouldShowSessionOverlay,
      });
    }
  }, [location.pathname, isLoading, isAuthTransition, bootstrapStatus, profileStatus, session, user, shouldShowSessionOverlay, hasSession]);

  return (
    <>
      {children}
      {hasTimedOut ? (
        <div className="fixed inset-0 z-50 pointer-events-auto touch-none overscroll-contain">
          <AuthTimeoutFallback
            onRetry={handleTimeoutRetry}
            timeoutSeconds={Math.ceil(AUTH_TIMEOUT_MS / 1000)}
          />
        </div>
      ) : hasSession && shouldShowSessionOverlay ? (
        <SoftSessionOverlay />
      ) : null}
    </>
  );
}

function ProtectedRoute({
  children,
  requireFamily = true,
  requireOnboardingComplete = true,
}: {
  children: React.ReactNode;
  requireFamily?: boolean;
  requireOnboardingComplete?: boolean;
}) {
  const { user, family, profileStatus, shouldRedirectToLogin, isAuthTransition, session, bootstrapStatus } = useStableAuth();
  const location = useLocation();
  
  // Check onboarding status for App routes
  const { data: onboardingData, isLoading: onboardingLoading } = useQuery({
    queryKey: ['protected-route-onboarding', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('user_onboarding')
        .select('status')
        .eq('user_id', user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id && requireOnboardingComplete && requireFamily,
    staleTime: 1000 * 60 * 5,
  });

  const next = encodeURIComponent(`${location.pathname}${location.search ?? ""}`);
  const onboardingStatus = onboardingData?.status;
  const isOnboardingComplete = onboardingStatus === 'completed';

  // DEBUG: Log all state on every render
  useEffect(() => {
    console.log('[ProtectedRoute] State:', {
      path: location.pathname,
      isAuthTransition,
      shouldRedirectToLogin,
      hasSession: !!session,
      hasUser: !!user,
      profileStatus,
      bootstrapStatus,
      onboardingStatus,
    });
  }, [location.pathname, isAuthTransition, shouldRedirectToLogin, session, user, profileStatus, bootstrapStatus, onboardingStatus]);

  // CRITICAL: Never redirect during auth transition (tab switch, token refresh)
  // Also never redirect during route restoration
  // IMPORTANT: Do NOT replace the current route with a loader. Keep children mounted.
  if (isAuthTransition || isRouteRestoreInProgress()) {
    console.log('[ProtectedRoute] In transition/restore - keeping children mounted');
    return <>{children}</>;
  }

  // Only redirect when we're CERTAIN there's no session
  if (shouldRedirectToLogin) {
    const targetPath = `/login?next=${next}`;
    logNavigationAttempt('ProtectedRoute:Navigate', targetPath, {
      currentPath: location.pathname,
      isAuthTransition,
      user: !!user,
      session: !!session,
      profileStatus,
      bootstrapStatus,
    });
    console.error('[ProtectedRoute] REDIRECT TO LOGIN TRIGGERED', { 
      currentPath: location.pathname, 
      isAuthTransition,
      user: !!user,
      session: !!session,
      profileStatus,
      bootstrapStatus,
    });
    console.trace();
    return (
      <Navigate
        to={targetPath}
        replace
        state={{ from: { pathname: location.pathname, search: location.search } }}
      />
    );
  }
  
  // Profile or onboarding still loading - keep children mounted + overlay
  if (profileStatus === 'loading' || profileStatus === 'unknown' || (requireOnboardingComplete && onboardingLoading)) {
    return (
      <>
        {children}
        <SoftSessionOverlay />
      </>
    );
  }
  
  // Need family but don't have one - redirect to signup
  if (requireFamily && !family && user) {
    return <Navigate to="/signup" replace state={{ from: { pathname: location.pathname, search: location.search } }} />;
  }
  
  // CRITICAL AUTHORIZATION CHECK: User has family but onboarding not complete
  // This blocks access to /app routes until onboarding is finished
  if (requireFamily && requireOnboardingComplete && family && user && !isOnboardingComplete) {
    console.log('[ProtectedRoute] Onboarding incomplete - redirecting to /onboarding');
    return <Navigate to="/onboarding" replace state={{ from: { pathname: location.pathname, search: location.search } }} />;
  }

  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, profileStatus, shouldRedirectToLogin, isAuthTransition, session, bootstrapStatus } = useStableAuth();
  const { data: role, isLoading: roleLoading } = useUserRole();
  const location = useLocation();

  // Keep snapshot enriched with role when available
  setAuthDebugSnapshot({
    ts: Date.now(),
    path: `${location.pathname}${location.search ?? ""}${location.hash ?? ""}`,
    bootstrapStatus,
    profileStatus,
    isLoading: roleLoading || profileStatus === 'loading',
    isAuthTransition,
    shouldRedirectToLogin,
    hasSession: !!session,
    hasUser: !!user,
    role: role ?? null,
  });

  const next = encodeURIComponent(`${location.pathname}${location.search ?? ""}`);

  // DEBUG: Log all state on every render
  useEffect(() => {
    console.log('[AdminRoute] State:', {
      path: location.pathname,
      isAuthTransition,
      shouldRedirectToLogin,
      hasSession: !!session,
      hasUser: !!user,
      profileStatus,
      bootstrapStatus,
      role,
      roleLoading,
    });
  }, [location.pathname, isAuthTransition, shouldRedirectToLogin, session, user, profileStatus, bootstrapStatus, role, roleLoading]);

  // CRITICAL: Never redirect during auth transition or route restoration
  // IMPORTANT: Do NOT replace the current route with a loader. Keep children mounted.
  if (isAuthTransition || isRouteRestoreInProgress()) {
    console.log('[AdminRoute] In transition/restore - keeping children mounted');
    return <>{children}</>;
  }
  
  // Only redirect when we're CERTAIN there's no session
  if (shouldRedirectToLogin) {
    const targetPath = `/login?next=${next}`;
    logNavigationAttempt('AdminRoute:Navigate', targetPath, {
      currentPath: location.pathname,
      isAuthTransition,
      user: !!user,
      session: !!session,
      profileStatus,
      bootstrapStatus,
    });
    console.error('[AdminRoute] REDIRECT TO LOGIN TRIGGERED', {
      currentPath: location.pathname,
      isAuthTransition,
      user: !!user,
      session: !!session,
      profileStatus,
      bootstrapStatus,
    });
    console.trace();
    return (
      <Navigate
        to={targetPath}
        replace
        state={{ from: { pathname: location.pathname, search: location.search } }}
      />
    );
  }

  // Still loading role/profile - keep children mounted + overlay
  if (roleLoading || profileStatus === 'loading') {
    return (
      <>
        {children}
        <SoftSessionOverlay />
      </>
    );
  }

  // Admin users (admin, cs, admin_master) don't need a family - they access dashboard directly
  const isAdminRole = role === "admin" || role === "cs" || role === "admin_master";
  
  if (!isAdminRole && user) {
    logNavigationAttempt('AdminRoute:NotAdmin', '/app', { role, user: !!user });
    console.log('[AdminRoute] User is not admin, redirecting to /app');
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, family, profileStatus, isAuthTransition, session } = useStableAuth();
  const { data: role, isLoading: roleLoading } = useUserRole();
  const { isLoading: checkingAdmin } = useHasAnyAdmin();
  const location = useLocation();
  
  // CRITICAL: Never redirect during auth transition or route restoration
  // IMPORTANT: Do NOT replace the current screen with a loader. Keep children mounted.
  if (isAuthTransition || isRouteRestoreInProgress()) {
    return <>{children}</>;
  }
  
  // IMPORTANT: Do NOT block the public/login UI when user is logged out.
  // After logout, profileStatus can remain 'unknown' and would otherwise cause an infinite spinner.
  const shouldBlockForAuthChecks = !!user && (
    roleLoading ||
    checkingAdmin ||
    profileStatus === 'loading' ||
    profileStatus === 'unknown'
  );

  if (shouldBlockForAuthChecks) {
    return (
      <>
        {children}
        <SoftSessionOverlay />
      </>
    );
  }
  
  // Admin users go directly to dashboard (no family required)
  const isAdminRole = role === 'admin' || role === 'cs' || role === 'admin_master';
  
  if (user && isAdminRole) {
    logNavigationAttempt('PublicRoute:AdminRedirect', '/admin', { role, user: !!user });
    return <Navigate to="/admin" replace />;
  }
  
  // User with family - go to app (AppAuthGate will validate properly)
  if (user && family) {
    logNavigationAttempt('PublicRoute:UserWithFamily', '/app', { user: !!user, family: !!family });
    return <Navigate to="/app" replace />;
  }
  
  // User logged in but without family AND not an admin
  // Redirect to signup ONLY for non-admin users
  // CRITICAL: Admin/master users without family should NOT be redirected to /signup
  // They should stay on public routes or go to /admin
  if (user && !family && !isAdminRole && location.pathname !== '/signup' && location.pathname !== '/onboarding') {
    logNavigationAttempt('PublicRoute:UserWithoutFamily', '/signup', { user: !!user, family: !!family, isAdminRole });
    return <Navigate to="/signup" replace />;
  }
  
  return <>{children}</>;
}

// Component to handle app lifecycle events
function AppLifecycleHandler({ children }: { children: React.ReactNode }) {
  useAppLifecycle();

  // One-time install: logs stack traces if URL flips to '/' unexpectedly.
  useEffect(() => {
    // Idempotent; install only when debugNav=1.
    if (isNavDebugEnabled()) {
      installNavigationAudit();
    }

    // Install route resume guard (fix: prevent unexpected '/' on tab return)
    installRouteResumeGuard();

    // App mount/unmount diagnostics to detect real reload vs remount
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    console.log('[App] Mounted', {
      path: `${window.location.pathname}${window.location.search ?? ''}${window.location.hash ?? ''}`,
      navType: nav?.type,
    });

    return () => {
      console.log('[App] Unmounted');
    };
  }, []);

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <AuthGate>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/onboarding" element={<ProtectedRoute requireFamily={false} requireOnboardingComplete={false}><OnboardingFlowPage /></ProtectedRoute>} />
        <Route path="/select-context" element={<ProtectedRoute requireFamily={false} requireOnboardingComplete={false}><SelectContextPage /></ProtectedRoute>} />
        <Route path="/select-family" element={<ProtectedRoute requireFamily={false} requireOnboardingComplete={false}><SelectFamilyPage /></ProtectedRoute>} />
        <Route path="/termos" element={<TermosPage />} />
        <Route path="/privacidade" element={<PrivacidadePage />} />
        <Route path="/qa-report" element={<QAReportPage />} />
        <Route path="/invite" element={<InviteAcceptPage />} />
        
        {/* App access blocked - for admin users without consumer profile */}
        <Route path="/app-access-blocked" element={<AppAccessBlockedPage />} />
        
        {/* User app routes - AppAuthGate is the SINGLE SOURCE OF TRUTH for App authorization */}
        <Route path="/app" element={<AppAuthGate><Index /></AppAuthGate>} />
        <Route path="/app/import" element={<AppAuthGate><ImportUploadPage /></AppAuthGate>} />
        <Route path="/app/import/spreadsheet" element={<AppAuthGate><SpreadsheetImportPage /></AppAuthGate>} />
        <Route
          path="/app/import/:importId/review"
          element={
            <AppAuthGate>
              <ErrorBoundary logContext={{ page: "import-review" }}>
                <ImportReviewPage />
              </ErrorBoundary>
            </AppAuthGate>
          }
        />
        
        {/* Admin routes */}
        <Route
          path="/admin/setup"
          element={
            <ProtectedRoute requireFamily={false}>
              <AdminSetupPage />
            </ProtectedRoute>
          }
        />
        {/* Admin routes - using nested routes with real URLs */}
        <Route
          path="/admin/*"
          element={
            <AdminRoute>
              <AdminRoutes />
            </AdminRoute>
          }
        />
        
        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthGate>
  );
}

// Wrapper components with lifecycle tracing
function TracedQueryClientProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    logLifecycle('MOUNT', 'QueryClientProvider', INSTANCE_SIGNATURES.queryClient);
    return () => logLifecycle('UNMOUNT', 'QueryClientProvider', INSTANCE_SIGNATURES.queryClient);
  }, []);
  
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

function TracedBrowserRouter({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    logLifecycle('MOUNT', 'BrowserRouter', INSTANCE_SIGNATURES.router);
    return () => logLifecycle('UNMOUNT', 'BrowserRouter', INSTANCE_SIGNATURES.router);
  }, []);
  
  return <BrowserRouter>{children}</BrowserRouter>;
}

function TracedAuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    logLifecycle('MOUNT', 'AuthProvider');
    return () => logLifecycle('UNMOUNT', 'AuthProvider');
  }, []);
  
  return <AuthProvider>{children}</AuthProvider>;
}

function TracedApp({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    logLifecycle('MOUNT', 'App', INSTANCE_SIGNATURES.app);
    return () => logLifecycle('UNMOUNT', 'App', INSTANCE_SIGNATURES.app);
  }, []);
  
  return <>{children}</>;
}

const App = () => (
  <TracedApp>
    <TracedQueryClientProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <ChunkErrorBoundary>
          <TracedBrowserRouter>
            <TracedAuthProvider>
              <AppLifecycleHandler>
                <AppRoutes />
                <InstallPrompt />
              </AppLifecycleHandler>
            </TracedAuthProvider>
          </TracedBrowserRouter>
        </ChunkErrorBoundary>
      </TooltipProvider>
    </TracedQueryClientProvider>
  </TracedApp>
);

export default App;
