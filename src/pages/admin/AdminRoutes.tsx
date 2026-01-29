/**
 * Admin Routes Configuration
 * All admin sub-routes with lazy loading
 */
import { lazy, Suspense } from "react";
import { Routes, Route, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { AdminLayout } from "./AdminLayout";
import { AdminOverviewPage } from "./AdminOverviewPage";
import { type IntegrationProvider } from "@/hooks/useIntegrationsConfig";

// Lazy load all admin sub-pages for better initial bundle size
const AdminUsersPage = lazy(() => import("./AdminUsersPage").then(m => ({ default: m.AdminUsersPage })));
const AdminEbooksPage = lazy(() => import("./AdminEbooksPage").then(m => ({ default: m.AdminEbooksPage })));
const AdminMetricsPage = lazy(() => import("./AdminMetricsPage").then(m => ({ default: m.AdminMetricsPage })));
const AdminOpenFinancePage = lazy(() => import("./AdminOpenFinancePage").then(m => ({ default: m.AdminOpenFinancePage })));

// Financial module
const FinancialOverviewPage = lazy(() => import("./finance/FinancialOverviewPage").then(m => ({ default: m.FinancialOverviewPage })));
const FinancialUsersPage = lazy(() => import("./finance/FinancialUsersPage").then(m => ({ default: m.FinancialUsersPage })));
const FinancialPaymentsPage = lazy(() => import("./finance/FinancialPaymentsPage").then(m => ({ default: m.FinancialPaymentsPage })));
const FinancialInvoicesPage = lazy(() => import("./finance/FinancialInvoicesPage").then(m => ({ default: m.FinancialInvoicesPage })));
const FinancialReportsPage = lazy(() => import("./finance/FinancialReportsPage").then(m => ({ default: m.FinancialReportsPage })));
const FinancialAuditPage = lazy(() => import("./finance/FinancialAuditPage").then(m => ({ default: m.FinancialAuditPage })));

// Support module
const SupportErrorsPage = lazy(() => import("./support/SupportErrorsPage").then(m => ({ default: m.SupportErrorsPage })));
const SupportUsersPage = lazy(() => import("./support/SupportUsersPage").then(m => ({ default: m.SupportUsersPage })));
const AdminFAQPage = lazy(() => import("./support/AdminFAQPage").then(m => ({ default: m.AdminFAQPage })));
const SupportAuditPage = lazy(() => import("./support/SupportAuditPage").then(m => ({ default: m.SupportAuditPage })));

// CS module
const CSOverviewPage = lazy(() => import("./cs/CSOverviewPage").then(m => ({ default: m.CSOverviewPage })));
const CSUsersListPage = lazy(() => import("./cs/CSUsersListPage").then(m => ({ default: m.CSUsersListPage })));
const CSHealthPage = lazy(() => import("./cs/CSHealthPage").then(m => ({ default: m.CSHealthPage })));
const CSAutomationPage = lazy(() => import("./cs/CSAutomationPage").then(m => ({ default: m.CSAutomationPage })));
const CSAuditPage = lazy(() => import("./cs/CSAuditPage").then(m => ({ default: m.CSAuditPage })));
const LGPDRequestsPage = lazy(() => import("./cs/LGPDRequestsPage").then(m => ({ default: m.LGPDRequestsPage })));

// Tech module
const TechHealthPage = lazy(() => import("./tech/TechHealthPage").then(m => ({ default: m.TechHealthPage })));
const TechLogsPage = lazy(() => import("./tech/TechLogsPage").then(m => ({ default: m.TechLogsPage })));
const TechApiKeysPage = lazy(() => import("./tech/TechApiKeysPage").then(m => ({ default: m.TechApiKeysPage })));
const TechFeatureFlagsPage = lazy(() => import("./tech/TechFeatureFlagsPage").then(m => ({ default: m.TechFeatureFlagsPage })));
const TechAuditPage = lazy(() => import("./tech/TechAuditPage").then(m => ({ default: m.TechAuditPage })));
const TechObservabilityPage = lazy(() => import("./tech/TechObservabilityPage").then(m => ({ default: m.TechObservabilityPage })));

// LGPD module
const LGPDOverviewPage = lazy(() => import("./lgpd/LGPDOverviewPage").then(m => ({ default: m.LGPDOverviewPage })));
const LegalVaultPage = lazy(() => import("./lgpd/LegalVaultPage").then(m => ({ default: m.LegalVaultPage })));
const BreakglassApprovalsPage = lazy(() => import("./lgpd/BreakglassApprovalsPage").then(m => ({ default: m.BreakglassApprovalsPage })));
const LGPDAuditPage = lazy(() => import("./lgpd/LGPDAuditPage").then(m => ({ default: m.LGPDAuditPage })));
const DpoTicketsPage = lazy(() => import("./lgpd/DpoTicketsPage").then(m => ({ default: m.DpoTicketsPage })));

// Integrations module
const IntegrationsOverviewPage = lazy(() => import("./integrations/IntegrationsOverviewPage").then(m => ({ default: m.IntegrationsOverviewPage })));
const IntegrationOpenFinancePage = lazy(() => import("./integrations/IntegrationOpenFinancePage").then(m => ({ default: m.IntegrationOpenFinancePage })));
const IntegrationAcquirerPage = lazy(() => import("./integrations/IntegrationAcquirerPage").then(m => ({ default: m.IntegrationAcquirerPage })));
const IntegrationResendPage = lazy(() => import("./integrations/IntegrationResendPage").then(m => ({ default: m.IntegrationResendPage })));
const IntegrationEnotasPage = lazy(() => import("./integrations/IntegrationEnotasPage").then(m => ({ default: m.IntegrationEnotasPage })));
const IntegrationGoogleDrivePage = lazy(() => import("./integrations/IntegrationGoogleDrivePage").then(m => ({ default: m.IntegrationGoogleDrivePage })));
const IntegrationOneDrivePage = lazy(() => import("./integrations/IntegrationOneDrivePage").then(m => ({ default: m.IntegrationOneDrivePage })));
const IntegrationLovableAIPage = lazy(() => import("./integrations/IntegrationLovableAIPage").then(m => ({ default: m.IntegrationLovableAIPage })));
const IntegrationOpenStreetMapPage = lazy(() => import("./integrations/IntegrationOpenStreetMapPage").then(m => ({ default: m.IntegrationOpenStreetMapPage })));

// OIK AI module
const OikAIPage = lazy(() => import("./OikAIPage"));

// Profile page
const AdminProfilePage = lazy(() => import("./AdminProfilePage").then(m => ({ default: m.AdminProfilePage })));

// Executive reports
const ExecutiveReportsPage = lazy(() => import("./executive/ExecutiveReportsPage"));

// Loading fallback
function PageLoader() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );
}

// Wrapper for lazy components
function LazyPage({ Component }: { Component: React.LazyExoticComponent<React.ComponentType<any>> }) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Component />
    </Suspense>
  );
}

// Wrapper for IntegrationsOverviewPage (has onNavigate prop)
function IntegrationsOverviewWrapper() {
  const navigate = useNavigate();
  
  const handleNavigate = (provider: IntegrationProvider) => {
    const routes: Record<IntegrationProvider, string> = {
      OPEN_FINANCE: "/admin/integrations/openfinance",
      ACQUIRER: "/admin/integrations/acquirer",
      RESEND: "/admin/integrations/resend",
      ENOTAS: "/admin/integrations/enotas",
      GOOGLE_DRIVE: "/admin/integrations/googledrive",
      ONEDRIVE: "/admin/integrations/onedrive",
      LOVABLE_AI: "/admin/integrations/lovable-ai",
      OPENSTREETMAP: "/admin/integrations/openstreetmap",
    };
    navigate(routes[provider] || "/admin/integrations");
  };

  return (
    <Suspense fallback={<PageLoader />}>
      <IntegrationsOverviewPage onNavigate={handleNavigate} />
    </Suspense>
  );
}

/**
 * AdminRoutes - Nested routes for admin dashboard
 * Used inside AdminLayout with <Outlet />
 */
export function AdminRoutes() {
  return (
    <Routes>
      <Route element={<AdminLayout />}>
        {/* Main routes */}
        <Route index element={<AdminOverviewPage />} />
        <Route path="users" element={<LazyPage Component={AdminUsersPage} />} />
        <Route path="ebooks" element={<LazyPage Component={AdminEbooksPage} />} />
        <Route path="metrics" element={<LazyPage Component={AdminMetricsPage} />} />
        <Route path="profile" element={<LazyPage Component={AdminProfilePage} />} />
        <Route path="openfinance" element={<LazyPage Component={AdminOpenFinancePage} />} />
        <Route path="settings" element={<div className="text-muted-foreground">Configurações em desenvolvimento...</div>} />

        {/* Financial module */}
        <Route path="finance" element={<LazyPage Component={FinancialOverviewPage} />} />
        <Route path="finance/users" element={<LazyPage Component={FinancialUsersPage} />} />
        <Route path="finance/payments" element={<LazyPage Component={FinancialPaymentsPage} />} />
        <Route path="finance/invoices" element={<LazyPage Component={FinancialInvoicesPage} />} />
        <Route path="finance/reports" element={<LazyPage Component={FinancialReportsPage} />} />
        <Route path="finance/audit" element={<LazyPage Component={FinancialAuditPage} />} />

        {/* Support module */}
        <Route path="support/errors" element={<LazyPage Component={SupportErrorsPage} />} />
        <Route path="support/users" element={<LazyPage Component={SupportUsersPage} />} />
        <Route path="support/faq" element={<LazyPage Component={AdminFAQPage} />} />
        <Route path="support/audit" element={<LazyPage Component={SupportAuditPage} />} />

        {/* CS module */}
        <Route path="cs" element={<LazyPage Component={CSOverviewPage} />} />
        <Route path="cs/users" element={<LazyPage Component={CSUsersListPage} />} />
        <Route path="cs/health" element={<LazyPage Component={CSHealthPage} />} />
        <Route path="cs/automation" element={<LazyPage Component={CSAutomationPage} />} />
        <Route path="cs/lgpd" element={<LazyPage Component={LGPDRequestsPage} />} />
        <Route path="cs/audit" element={<LazyPage Component={CSAuditPage} />} />

        {/* Tech module */}
        <Route path="tech/health" element={<LazyPage Component={TechHealthPage} />} />
        <Route path="tech/logs" element={<LazyPage Component={TechLogsPage} />} />
        <Route path="tech/observability" element={<LazyPage Component={TechObservabilityPage} />} />
        <Route path="tech/flags" element={<LazyPage Component={TechFeatureFlagsPage} />} />
        <Route path="tech/audit" element={<LazyPage Component={TechAuditPage} />} />

        {/* LGPD module */}
        <Route path="lgpd" element={<LazyPage Component={LGPDOverviewPage} />} />
        <Route path="lgpd/tickets" element={<LazyPage Component={DpoTicketsPage} />} />
        <Route path="lgpd/dsar" element={<LazyPage Component={LGPDRequestsPage} />} />
        <Route path="lgpd/vault" element={<LazyPage Component={LegalVaultPage} />} />
        <Route path="lgpd/breakglass" element={<LazyPage Component={BreakglassApprovalsPage} />} />
        <Route path="lgpd/audit" element={<LazyPage Component={LGPDAuditPage} />} />

        {/* Integrations module */}
        <Route path="integrations" element={<IntegrationsOverviewWrapper />} />
        <Route path="integrations/openfinance" element={<LazyPage Component={IntegrationOpenFinancePage} />} />
        <Route path="integrations/acquirer" element={<LazyPage Component={IntegrationAcquirerPage} />} />
        <Route path="integrations/resend" element={<LazyPage Component={IntegrationResendPage} />} />
        <Route path="integrations/enotas" element={<LazyPage Component={IntegrationEnotasPage} />} />
        <Route path="integrations/googledrive" element={<LazyPage Component={IntegrationGoogleDrivePage} />} />
        <Route path="integrations/onedrive" element={<LazyPage Component={IntegrationOneDrivePage} />} />
        <Route path="integrations/lovable-ai" element={<LazyPage Component={IntegrationLovableAIPage} />} />
        <Route path="integrations/openstreetmap" element={<LazyPage Component={IntegrationOpenStreetMapPage} />} />
        <Route path="integrations/keys" element={<LazyPage Component={TechApiKeysPage} />} />

        {/* OIK AI module */}
        <Route path="oik-ai" element={<LazyPage Component={OikAIPage} />} />
        <Route path="oik-ai/conversations" element={<LazyPage Component={OikAIPage} />} />
        <Route path="oik-ai/analytics" element={<LazyPage Component={OikAIPage} />} />
        <Route path="oik-ai/feedback" element={<LazyPage Component={OikAIPage} />} />
        <Route path="oik-ai/config" element={<LazyPage Component={OikAIPage} />} />

        {/* Executive module */}
        <Route path="executive" element={<LazyPage Component={ExecutiveReportsPage} />} />

        {/* Fallback for unknown admin routes */}
        <Route path="*" element={<AdminOverviewPage />} />
      </Route>
    </Routes>
  );
}
