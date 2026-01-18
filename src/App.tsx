import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useUserRole, useHasAnyAdmin } from "@/hooks/useUserRole";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { TermosPage } from "./pages/TermosPage";
import { PrivacidadePage } from "./pages/PrivacidadePage";
import { QAReportPage } from "./pages/QAReportPage";
import { AdminDashboard, AdminSetupPage } from "./pages/admin";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function LoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, family, loading } = useAuth();
  
  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (!family) return <Navigate to="/signup" replace />;
  
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, family, loading } = useAuth();
  const { data: role, isLoading: roleLoading } = useUserRole();
  
  if (loading || roleLoading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  if (!family) return <Navigate to="/signup" replace />;
  
  // Check if user has admin or CS role
  if (role !== 'admin' && role !== 'cs') {
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
      
      {/* Admin routes */}
      <Route path="/admin/setup" element={<ProtectedRoute><AdminSetupPage /></ProtectedRoute>} />
      <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      <Route path="/admin/*" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
      
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
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
