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

function ProtectedRoute({
  children,
  requireFamily = true,
}: {
  children: React.ReactNode;
  requireFamily?: boolean;
}) {
  const { user, family, loading } = useAuth();
  const location = useLocation();

  const next = encodeURIComponent(`${location.pathname}${location.search ?? ""}`);

  if (loading) return <LoadingSpinner />;
  if (!user)
    return (
      <Navigate
        to={`/login?next=${next}`}
        replace
        state={{ from: { pathname: location.pathname, search: location.search } }}
      />
    );
  if (requireFamily && !family)
    return <Navigate to="/signup" replace state={{ from: { pathname: location.pathname, search: location.search } }} />;

  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, family, loading } = useAuth();
  const { data: role, isLoading: roleLoading } = useUserRole();
  const location = useLocation();

  const next = encodeURIComponent(`${location.pathname}${location.search ?? ""}`);

  if (loading || roleLoading) return <LoadingSpinner />;
  if (!user)
    return (
      <Navigate
        to={`/login?next=${next}`}
        replace
        state={{ from: { pathname: location.pathname, search: location.search } }}
      />
    );
  if (!family)
    return <Navigate to="/signup" replace state={{ from: { pathname: location.pathname, search: location.search } }} />;

  // Check if user has admin or CS role
  if (role !== "admin" && role !== "cs") {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, family, loading } = useAuth();
  const { data: role, isLoading: roleLoading } = useUserRole();
  const { data: hasAdmin, isLoading: checkingAdmin } = useHasAnyAdmin();
  
  if (loading || roleLoading || checkingAdmin) return <LoadingSpinner />;
  
  if (user && family) {
    // If admin/CS, redirect to admin dashboard
    if (role === 'admin' || role === 'cs') {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/app" replace />;
  }
  
  return <>{children}</>;
}

// Component to handle app lifecycle events
function AppLifecycleHandler({ children }: { children: React.ReactNode }) {
  useAppLifecycle();
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/termos" element={<TermosPage />} />
      <Route path="/privacidade" element={<PrivacidadePage />} />
      <Route path="/qa-report" element={<QAReportPage />} />
      
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
