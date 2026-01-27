import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider, focusManager } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useUserRole, useHasAnyAdmin } from "@/hooks/useUserRole";
import { ScreenLoader } from "@/components/ui/money-loader";
import { useAppLifecycle } from "@/hooks/useAppLifecycle";
import { useStableAuth } from "@/hooks/useStableAuth";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { STALE_TIMES, GC_TIMES } from "@/lib/queryConfig";
import { clearExpiredDrafts } from "@/hooks/useDraftPersistence";
import { installNavigationAudit } from "@/lib/navigationAudit";
import { setAuthDebugSnapshot } from "@/lib/devDiagnostics";
import { installRouteResumeGuard, tryInitialRouteRestore } from "@/lib/routeResumeGuard";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { TermosPage } from "./pages/TermosPage";
import { PrivacidadePage } from "./pages/PrivacidadePage";
import { QAReportPage } from "./pages/QAReportPage";
import { AdminDashboard, AdminSetupPage } from "./pages/admin";
import { ImportUploadPage } from "./pages/import/ImportUploadPage";
import { ImportReviewPage } from "./pages/import/ImportReviewPage";
import { SpreadsheetImportPage } from "./pages/import/SpreadsheetImportPage";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import { SelectContextPage } from "./pages/SelectContextPage";
import { SelectFamilyPage } from "./pages/SelectFamilyPage";
import { InviteAcceptPage } from "./pages/InviteAcceptPage";
import { OnboardingFlowPage } from "./pages/OnboardingFlowPage";
import { useEffect, useRef } from "react";

// Clear expired drafts on app init
clearExpiredDrafts();

// Install redirect diagnostics as early as possible (before any React render)
installNavigationAudit();

// If we booted at '/' unexpectedly after a tab discard/resume, restore immediately
tryInitialRouteRestore();

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

function LoadingSpinner() {
  return <ScreenLoader label="Carregando..." />
}

/**
 * AuthGate - Bootstrap guard that prevents routing until auth is fully resolved
 * This prevents the "flash" of signup/onboarding screens during login
 * 
 * CRITICAL: Uses useStableAuth to handle tab-switch transitions gracefully
 */
function AuthGate({ children }: { children: React.ReactNode }) {
  const { isLoading, isAuthTransition, session, user, bootstrapStatus, profileStatus, shouldRedirectToLogin } = useStableAuth();
  const location = useLocation();
  const lastRouteRef = useRef<string | null>(null);

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
  
  // Log transition state for debugging
  useEffect(() => {
    if (isAuthTransition) {
      console.log('[AuthGate] In auth transition - holding render');
    }
  }, [isAuthTransition]);

  // Router-level route change logging (closest thing to routeChangeStart/Complete)
  useEffect(() => {
    const current = `${location.pathname}${location.search ?? ""}${location.hash ?? ""}`;
    const prev = lastRouteRef.current;
    lastRouteRef.current = current;

    if (prev && prev !== current) {
      console.log("[Router] Route changed", { from: prev, to: current });
    }

    // CRITICAL: if we ever land on '/', capture a trace immediately
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
  
  // Wait until auth is fully stable (not loading AND not in transition)
  if (isLoading) {
    return <ScreenLoader label="Carregando..." />;
  }
  
  return <>{children}</>;
}

function ProtectedRoute({
  children,
  requireFamily = true,
}: {
  children: React.ReactNode;
  requireFamily?: boolean;
}) {
  const { user, family, profileStatus, shouldRedirectToLogin, isAuthTransition, session, bootstrapStatus } = useStableAuth();
  const location = useLocation();

  const next = encodeURIComponent(`${location.pathname}${location.search ?? ""}`);

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
    });
  }, [location.pathname, isAuthTransition, shouldRedirectToLogin, session, user, profileStatus, bootstrapStatus]);

  // CRITICAL: Never redirect during auth transition (tab switch, token refresh)
  if (isAuthTransition) {
    console.log('[ProtectedRoute] In transition - showing loader, NOT redirecting');
    return <LoadingSpinner />;
  }

  // Only redirect when we're CERTAIN there's no session
  if (shouldRedirectToLogin) {
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
        to={`/login?next=${next}`}
        replace
        state={{ from: { pathname: location.pathname, search: location.search } }}
      />
    );
  }
  
  // Profile still loading - show loader (shouldn't happen often due to AuthGate)
  if (profileStatus === 'loading' || profileStatus === 'unknown') {
    return <LoadingSpinner />;
  }
  
  // Need family but don't have one - redirect to signup
  if (requireFamily && !family && user) {
    return <Navigate to="/signup" replace state={{ from: { pathname: location.pathname, search: location.search } }} />;
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

  // CRITICAL: Never redirect during auth transition
  if (isAuthTransition) {
    console.log('[AdminRoute] In transition - showing loader, NOT redirecting');
    return <LoadingSpinner />;
  }

  // Still loading role
  if (roleLoading || profileStatus === 'loading') {
    return <LoadingSpinner />;
  }
  
  // Only redirect when we're CERTAIN there's no session
  if (shouldRedirectToLogin) {
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
        to={`/login?next=${next}`}
        replace
        state={{ from: { pathname: location.pathname, search: location.search } }}
      />
    );
  }

  // Admin users (admin, cs, admin_master) don't need a family - they access dashboard directly
  const isAdminRole = role === "admin" || role === "cs" || role === "admin_master";
  
  if (!isAdminRole && user) {
    console.log('[AdminRoute] User is not admin, redirecting to /app');
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, family, profileStatus, isAuthTransition } = useStableAuth();
  const { data: role, isLoading: roleLoading } = useUserRole();
  const { isLoading: checkingAdmin } = useHasAnyAdmin();
  
  // CRITICAL: Never redirect during auth transition
  if (isAuthTransition) {
    return <LoadingSpinner />;
  }
  
  // Still loading - don't render anything (AuthGate handles this)
  if (roleLoading || checkingAdmin || profileStatus === 'loading') {
    return <LoadingSpinner />;
  }
  
  // Admin users go directly to dashboard (no family required)
  const isAdminRole = role === 'admin' || role === 'cs' || role === 'admin_master';
  
  if (user && isAdminRole) {
    return <Navigate to="/admin" replace />;
  }
  
  // User with family - go to app
  if (user && family) {
    return <Navigate to="/app" replace />;
  }
  
  // User without family but not admin - will be handled by signup flow
  // Don't redirect here to avoid flash - let them stay on public route
  // The signup page will handle the redirect properly
  
  return <>{children}</>;
}

// Component to handle app lifecycle events
function AppLifecycleHandler({ children }: { children: React.ReactNode }) {
  useAppLifecycle();

  // One-time install: logs stack traces if URL flips to '/' unexpectedly.
  useEffect(() => {
    // Idempotent; already installed at module init, but safe to call again.
    installNavigationAudit();

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
        <Route path="/onboarding" element={<ProtectedRoute requireFamily={false}><OnboardingFlowPage /></ProtectedRoute>} />
        <Route path="/select-context" element={<ProtectedRoute requireFamily={false}><SelectContextPage /></ProtectedRoute>} />
        <Route path="/select-family" element={<ProtectedRoute requireFamily={false}><SelectFamilyPage /></ProtectedRoute>} />
        <Route path="/termos" element={<TermosPage />} />
        <Route path="/privacidade" element={<PrivacidadePage />} />
        <Route path="/qa-report" element={<QAReportPage />} />
        <Route path="/invite" element={<InviteAcceptPage />} />
        
        {/* User app routes */}
        <Route path="/app" element={<ProtectedRoute><Index /></ProtectedRoute>} />
        <Route path="/app/import" element={<ProtectedRoute><ImportUploadPage /></ProtectedRoute>} />
        <Route path="/app/import/spreadsheet" element={<ProtectedRoute><SpreadsheetImportPage /></ProtectedRoute>} />
        <Route
          path="/app/import/:importId/review"
          element={
            <ProtectedRoute>
              <ErrorBoundary logContext={{ page: "import-review" }}>
                <ImportReviewPage />
              </ErrorBoundary>
            </ProtectedRoute>
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
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />
        <Route
          path="/admin/*"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />
        
        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthGate>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppLifecycleHandler>
            <AppRoutes />
            <InstallPrompt />
          </AppLifecycleHandler>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
