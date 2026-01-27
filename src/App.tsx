import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useUserRole, useHasAnyAdmin } from "@/hooks/useUserRole";
import { ScreenLoader } from "@/components/ui/money-loader";
import { useAppLifecycle } from "@/hooks/useAppLifecycle";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";
import { STALE_TIMES, GC_TIMES } from "@/lib/queryConfig";
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Default stale time - data is considered fresh for this duration
      staleTime: STALE_TIMES.transactions,
      // Garbage collection time - how long to keep unused data in cache
      gcTime: GC_TIMES.default,
      // Refetch on window focus for multi-device sync
      refetchOnWindowFocus: true,
      // Refetch on reconnect for offline support
      refetchOnReconnect: true,
      // Retry failed requests
      retry: 2,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

function LoadingSpinner() {
  return <ScreenLoader label="Carregando..." />
}

/**
 * AuthGate - Bootstrap guard that prevents routing until auth is fully resolved
 * This prevents the "flash" of signup/onboarding screens during login
 */
function AuthGate({ children }: { children: React.ReactNode }) {
  const { bootstrapStatus, profileStatus } = useAuth();
  
  // Wait until bootstrap is complete (auth + profile data loaded)
  if (bootstrapStatus === 'initializing') {
    return <ScreenLoader label="Iniciando..." />;
  }
  
  // If we're still loading profile after bootstrap, show loader
  // This handles edge cases during rapid navigation
  if (profileStatus === 'loading') {
    return <ScreenLoader label="Carregando perfil..." />;
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
  const { user, family, profileStatus } = useAuth();
  const location = useLocation();

  const next = encodeURIComponent(`${location.pathname}${location.search ?? ""}`);

  // No user - redirect to login
  if (!user) {
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
  if (requireFamily && !family) {
    return <Navigate to="/signup" replace state={{ from: { pathname: location.pathname, search: location.search } }} />;
  }

  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, profileStatus } = useAuth();
  const { data: role, isLoading: roleLoading } = useUserRole();
  const location = useLocation();

  const next = encodeURIComponent(`${location.pathname}${location.search ?? ""}`);

  // Still loading role
  if (roleLoading || profileStatus === 'loading') {
    return <LoadingSpinner />;
  }
  
  // No user - redirect to login
  if (!user) {
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
  
  if (!isAdminRole) {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, family, profileStatus } = useAuth();
  const { data: role, isLoading: roleLoading } = useUserRole();
  const { isLoading: checkingAdmin } = useHasAnyAdmin();
  
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
