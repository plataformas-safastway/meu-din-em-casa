import { useState, lazy, Suspense } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Users, 
  BarChart3, 
  BookOpen, 
  Settings, 
  LogOut,
  Home,
  Shield,
  UserCog,
  FileText,
  TrendingUp,
  Building2,
  DollarSign,
  Receipt,
  FileSpreadsheet,
  ClipboardList,
  Lock,
  AlertTriangle,
  Headphones,
  Heart,
  Cpu,
  Flag,
  Activity,
  Scale,
  Vault,
  UserPlus,
  Plug,
  Mail,
  CreditCard,
  Key,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useUserRole";
import { useUserAccess } from "@/hooks/useUserAccess";
import { useUserAccessProfile } from "@/hooks/useUserAccessProfile";
import { useMustChangePassword } from "@/hooks/useMasterUserSetup";
import { ForcePasswordChangeModal } from "@/components/auth/ForcePasswordChangeModal";
import { CreateMasterUserSheet } from "@/components/admin/CreateMasterUserSheet";
import { type IntegrationProvider } from "@/hooks/useIntegrationsConfig";

// Lazy load all admin sub-pages for better initial bundle size
const AdminUsersPage = lazy(() => import("./AdminUsersPage").then(m => ({ default: m.AdminUsersPage })));
const AdminEbooksPage = lazy(() => import("./AdminEbooksPage").then(m => ({ default: m.AdminEbooksPage })));
const AdminMetricsPage = lazy(() => import("./AdminMetricsPage").then(m => ({ default: m.AdminMetricsPage })));
const AdminOpenFinancePage = lazy(() => import("./AdminOpenFinancePage").then(m => ({ default: m.AdminOpenFinancePage })));

// Financial module - lazy loaded
const FinancialOverviewPage = lazy(() => import("./finance/FinancialOverviewPage").then(m => ({ default: m.FinancialOverviewPage })));
const FinancialUsersPage = lazy(() => import("./finance/FinancialUsersPage").then(m => ({ default: m.FinancialUsersPage })));
const FinancialPaymentsPage = lazy(() => import("./finance/FinancialPaymentsPage").then(m => ({ default: m.FinancialPaymentsPage })));
const FinancialInvoicesPage = lazy(() => import("./finance/FinancialInvoicesPage").then(m => ({ default: m.FinancialInvoicesPage })));
const FinancialReportsPage = lazy(() => import("./finance/FinancialReportsPage").then(m => ({ default: m.FinancialReportsPage })));
const FinancialAuditPage = lazy(() => import("./finance/FinancialAuditPage").then(m => ({ default: m.FinancialAuditPage })));

// Support module - lazy loaded
const SupportErrorsPage = lazy(() => import("./support/SupportErrorsPage").then(m => ({ default: m.SupportErrorsPage })));
const SupportUsersPage = lazy(() => import("./support/SupportUsersPage").then(m => ({ default: m.SupportUsersPage })));
const SupportAuditPage = lazy(() => import("./support/SupportAuditPage").then(m => ({ default: m.SupportAuditPage })));

// CS module - lazy loaded
const CSOverviewPage = lazy(() => import("./cs/CSOverviewPage").then(m => ({ default: m.CSOverviewPage })));
const CSUsersListPage = lazy(() => import("./cs/CSUsersListPage").then(m => ({ default: m.CSUsersListPage })));
const CSHealthPage = lazy(() => import("./cs/CSHealthPage").then(m => ({ default: m.CSHealthPage })));
const CSAutomationPage = lazy(() => import("./cs/CSAutomationPage").then(m => ({ default: m.CSAutomationPage })));
const CSAuditPage = lazy(() => import("./cs/CSAuditPage").then(m => ({ default: m.CSAuditPage })));
const LGPDRequestsPage = lazy(() => import("./cs/LGPDRequestsPage").then(m => ({ default: m.LGPDRequestsPage })));

// Tech module - lazy loaded
const TechHealthPage = lazy(() => import("./tech/TechHealthPage").then(m => ({ default: m.TechHealthPage })));
const TechLogsPage = lazy(() => import("./tech/TechLogsPage").then(m => ({ default: m.TechLogsPage })));
const TechApiKeysPage = lazy(() => import("./tech/TechApiKeysPage").then(m => ({ default: m.TechApiKeysPage })));
const TechFeatureFlagsPage = lazy(() => import("./tech/TechFeatureFlagsPage").then(m => ({ default: m.TechFeatureFlagsPage })));
const TechAuditPage = lazy(() => import("./tech/TechAuditPage").then(m => ({ default: m.TechAuditPage })));
const TechIntegrationsPage = lazy(() => import("./tech/TechIntegrationsPage").then(m => ({ default: m.TechIntegrationsPage })));

// LGPD module - lazy loaded
const LGPDOverviewPage = lazy(() => import("./lgpd/LGPDOverviewPage").then(m => ({ default: m.LGPDOverviewPage })));
const LegalVaultPage = lazy(() => import("./lgpd/LegalVaultPage").then(m => ({ default: m.LegalVaultPage })));
const BreakglassApprovalsPage = lazy(() => import("./lgpd/BreakglassApprovalsPage").then(m => ({ default: m.BreakglassApprovalsPage })));
const LGPDAuditPage = lazy(() => import("./lgpd/LGPDAuditPage").then(m => ({ default: m.LGPDAuditPage })));

// Integrations module - lazy loaded
const IntegrationsOverviewPage = lazy(() => import("./integrations/IntegrationsOverviewPage").then(m => ({ default: m.IntegrationsOverviewPage })));
const IntegrationOpenFinancePage = lazy(() => import("./integrations/IntegrationOpenFinancePage").then(m => ({ default: m.IntegrationOpenFinancePage })));
const IntegrationAcquirerPage = lazy(() => import("./integrations/IntegrationAcquirerPage").then(m => ({ default: m.IntegrationAcquirerPage })));
const IntegrationResendPage = lazy(() => import("./integrations/IntegrationResendPage").then(m => ({ default: m.IntegrationResendPage })));
const IntegrationEnotasPage = lazy(() => import("./integrations/IntegrationEnotasPage").then(m => ({ default: m.IntegrationEnotasPage })));

// Executive reports - lazy loaded
const ExecutiveReportsPage = lazy(() => import("./executive/ExecutiveReportsPage"));

type AdminTab = "overview" | "users" | "ebooks" | "metrics" | "openfinance" | "settings"
  | "fin-overview" | "fin-users" | "fin-payments" | "fin-invoices" | "fin-reports" | "fin-audit"
  | "sup-errors" | "sup-users" | "sup-audit"
  | "cs-overview" | "cs-users" | "cs-automation" | "cs-health" | "cs-audit" | "cs-lgpd"
  | "tech-health" | "tech-logs" | "tech-integrations" | "tech-keys" | "tech-flags" | "tech-audit"
  | "lgpd-overview" | "lgpd-dsar" | "lgpd-vault" | "lgpd-breakglass" | "lgpd-audit"
  | "exec-reports"
  | "int-overview" | "int-openfinance" | "int-acquirer" | "int-resend" | "int-enotas";

// Loading fallback for lazy loaded pages
function PageLoader() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
    </div>
  );
}

export function AdminDashboard() {
  const navigate = useNavigate();
  const { user, familyMember, signOut } = useAuth();
  const { role, isAdmin, isCS } = useIsAdmin();
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");

  // Use consolidated access profile (1 RPC instead of 7)
  const { data: accessProfile, isLoading: accessLoading } = useUserAccessProfile();
  const { data: userAccess } = useUserAccess();
  const { data: mustChangePassword, refetch: refetchPasswordCheck } = useMustChangePassword();

  // Extract access flags from consolidated profile
  const hasFinancialAccess = accessProfile?.has_financial_access ?? false;
  const hasSupportAccess = accessProfile?.has_support_access ?? false;
  const hasCSAccess = accessProfile?.has_cs_access ?? false;
  const hasTechAccess = accessProfile?.has_tech_access ?? false;
  const hasExecutiveAccess = accessProfile?.has_executive_access ?? false;
  const hasLegalAccess = accessProfile?.has_legal_access ?? false;

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const menuItems = [
    { id: "overview" as AdminTab, label: "Visão Geral", icon: Home },
    { id: "users" as AdminTab, label: "Usuários", icon: Users },
    { id: "ebooks" as AdminTab, label: "eBooks", icon: BookOpen },
    { id: "metrics" as AdminTab, label: "Métricas", icon: BarChart3 },
    ...(isAdmin ? [{ id: "settings" as AdminTab, label: "Configurações", icon: Settings }] : []),
  ];

  // Financial module menu
  const financialMenuItems = hasFinancialAccess ? [
    { id: "fin-overview" as AdminTab, label: "Visão Financeira", icon: DollarSign },
    { id: "fin-users" as AdminTab, label: "Gestão Usuários", icon: UserCog },
    { id: "fin-payments" as AdminTab, label: "Cobranças", icon: Receipt },
    { id: "fin-invoices" as AdminTab, label: "Notas Fiscais", icon: FileText },
    { id: "fin-reports" as AdminTab, label: "Relatórios", icon: FileSpreadsheet },
    { id: "fin-audit" as AdminTab, label: "Auditoria", icon: ClipboardList },
  ] : [];

  // Support module menu
  const supportMenuItems = hasSupportAccess ? [
    { id: "sup-errors" as AdminTab, label: "Painel de Erros", icon: AlertTriangle },
    { id: "sup-users" as AdminTab, label: "Usuários", icon: Headphones },
    { id: "sup-audit" as AdminTab, label: "Auditoria Suporte", icon: ClipboardList },
  ] : [];

  // CS module menu
  const csMenuItems = hasCSAccess ? [
    { id: "cs-overview" as AdminTab, label: "Visão CS", icon: Heart },
    { id: "cs-users" as AdminTab, label: "Base de Usuários", icon: Users },
    { id: "cs-health" as AdminTab, label: "Saúde da Base", icon: Activity },
    { id: "cs-automation" as AdminTab, label: "Automação + IA", icon: Cpu },
    { id: "cs-lgpd" as AdminTab, label: "Solicitações LGPD", icon: Shield },
    { id: "cs-audit" as AdminTab, label: "Auditoria CS", icon: ClipboardList },
  ] : [];

  // Executive reports menu
  const executiveMenuItems = hasExecutiveAccess ? [
    { id: "exec-reports" as AdminTab, label: "Relatórios Executivos", icon: BarChart3 },
  ] : [];

  // Tech module menu
  const techMenuItems = hasTechAccess ? [
    { id: "tech-health" as AdminTab, label: "Saúde do Sistema", icon: Activity },
    { id: "tech-logs" as AdminTab, label: "Logs", icon: FileText },
    { id: "tech-flags" as AdminTab, label: "Feature Flags", icon: Flag },
    { id: "tech-audit" as AdminTab, label: "Auditoria Tech", icon: ClipboardList },
  ] : [];

  // LGPD & Privacy module menu
  const lgpdMenuItems = hasLegalAccess ? [
    { id: "lgpd-overview" as AdminTab, label: "Visão Geral", icon: Shield },
    { id: "lgpd-dsar" as AdminTab, label: "Solicitações DSAR", icon: FileText },
    { id: "lgpd-vault" as AdminTab, label: "Cofre Legal", icon: Vault },
    { id: "lgpd-breakglass" as AdminTab, label: "Acesso Excepcional", icon: Scale },
    { id: "lgpd-audit" as AdminTab, label: "Auditoria", icon: ClipboardList },
  ] : [];

  // Integrations menu
  const integrationsMenuItems = (isAdmin || hasTechAccess) ? [
    { id: "int-overview" as AdminTab, label: "Visão Geral", icon: Plug },
    { id: "int-openfinance" as AdminTab, label: "Open Finance", icon: Building2 },
    { id: "int-acquirer" as AdminTab, label: "Adquirentes", icon: CreditCard },
    { id: "int-resend" as AdminTab, label: "Resend", icon: Mail },
    { id: "int-enotas" as AdminTab, label: "eNotas", icon: FileText },
    { id: "tech-keys" as AdminTab, label: "Chaves API", icon: Key },
  ] : [];

  const handleIntegrationNavigate = (provider: IntegrationProvider) => {
    switch (provider) {
      case 'OPEN_FINANCE':
        setActiveTab('int-openfinance');
        break;
      case 'ACQUIRER':
        setActiveTab('int-acquirer');
        break;
      case 'RESEND':
        setActiveTab('int-resend');
        break;
      case 'ENOTAS':
        setActiveTab('int-enotas');
        break;
    }
  };

  const renderContent = () => {
    // Check financial access for financial tabs
    if (activeTab.startsWith('fin-') && !hasFinancialAccess) {
      return <AccessDenied message="Este módulo requer perfil ADMIN_MASTER ou FINANCEIRO" />;
    }

    // Check support access for support tabs
    if (activeTab.startsWith('sup-') && !hasSupportAccess) {
      return <AccessDenied message="Este módulo requer perfil ADMIN_MASTER ou SUPORTE" />;
    }

    // Check CS access for CS tabs
    if (activeTab.startsWith('cs-') && !hasCSAccess) {
      return <AccessDenied message="Este módulo requer perfil ADMIN_MASTER ou CUSTOMER_SUCCESS" />;
    }

    // Check Tech access for Tech tabs
    if (activeTab.startsWith('tech-') && !hasTechAccess) {
      return <AccessDenied message="Este módulo requer perfil ADMIN_MASTER ou TECNOLOGIA" />;
    }

    // Check Executive access for Executive tabs
    if (activeTab.startsWith('exec-') && !hasExecutiveAccess) {
      return <AccessDenied message="Este módulo requer perfil ADMIN_MASTER, DIRETORIA ou GESTÃO ESTRATÉGICA" />;
    }

    // Check Legal access for LGPD tabs
    if (activeTab.startsWith('lgpd-') && !hasLegalAccess) {
      return <AccessDenied message="Este módulo requer perfil LEGAL ou ADMIN_MASTER" />;
    }

    // Check access for Integrations tabs
    if (activeTab.startsWith('int-') && !isAdmin && !hasTechAccess) {
      return <AccessDenied message="Este módulo requer perfil ADMIN ou TECNOLOGIA" />;
    }

    return (
      <Suspense fallback={<PageLoader />}>
        {renderPage()}
      </Suspense>
    );
  };

  const renderPage = () => {
    switch (activeTab) {
      case "users":
        return <AdminUsersPage />;
      case "ebooks":
        return <AdminEbooksPage />;
      case "metrics":
        return <AdminMetricsPage />;
      case "openfinance":
        return <AdminOpenFinancePage />;
      case "settings":
        return <AdminSettingsPlaceholder />;
      case "fin-overview":
        return <FinancialOverviewPage />;
      case "fin-users":
        return <FinancialUsersPage />;
      case "fin-payments":
        return <FinancialPaymentsPage />;
      case "fin-invoices":
        return <FinancialInvoicesPage />;
      case "fin-reports":
        return <FinancialReportsPage />;
      case "fin-audit":
        return <FinancialAuditPage />;
      case "sup-errors":
        return <SupportErrorsPage />;
      case "sup-users":
        return <SupportUsersPage />;
      case "sup-audit":
        return <SupportAuditPage />;
      case "cs-overview":
        return <CSOverviewPage />;
      case "cs-users":
        return <CSUsersListPage />;
      case "cs-health":
        return <CSHealthPage />;
      case "cs-automation":
        return <CSAutomationPage />;
      case "cs-lgpd":
        return <LGPDRequestsPage />;
      case "cs-audit":
        return <CSAuditPage />;
      case "tech-health":
        return <TechHealthPage />;
      case "tech-logs":
        return <TechLogsPage />;
      case "tech-integrations":
        return <TechIntegrationsPage />;
      case "tech-keys":
        return <TechApiKeysPage />;
      case "tech-flags":
        return <TechFeatureFlagsPage />;
      case "tech-audit":
        return <TechAuditPage />;
      case "exec-reports":
        return <ExecutiveReportsPage />;
      case "lgpd-overview":
        return <LGPDOverviewPage />;
      case "lgpd-dsar":
        return <LGPDRequestsPage />;
      case "lgpd-vault":
        return <LegalVaultPage />;
      case "lgpd-breakglass":
        return <BreakglassApprovalsPage />;
      case "lgpd-audit":
        return <LGPDAuditPage />;
      case "int-overview":
        return <IntegrationsOverviewPage onNavigate={handleIntegrationNavigate} />;
      case "int-openfinance":
        return <IntegrationOpenFinancePage />;
      case "int-acquirer":
        return <IntegrationAcquirerPage />;
      case "int-resend":
        return <IntegrationResendPage />;
      case "int-enotas":
        return <IntegrationEnotasPage />;
      default:
        return (
          <AdminOverview 
            onNavigate={setActiveTab} 
            hasFinancialAccess={hasFinancialAccess} 
            hasSupportAccess={hasSupportAccess} 
            hasCSAccess={hasCSAccess} 
            hasTechAccess={hasTechAccess} 
            hasExecutiveAccess={hasExecutiveAccess} 
            hasLegalAccess={hasLegalAccess} 
          />
        );
    }
  };

  // Render menu section helper
  const renderMenuSection = (title: string, items: typeof menuItems) => {
    if (items.length === 0) return null;
    return (
      <>
        <div className="pt-4 pb-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase px-3">{title}</p>
        </div>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                activeTab === item.id
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              }`}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </button>
          );
        })}
      </>
    );
  };

  return (
    <>
      <ForcePasswordChangeModal 
        open={!!mustChangePassword} 
        onSuccess={() => refetchPasswordCheck()}
      />

      <div className="min-h-screen bg-background flex">
        {/* Sidebar */}
        <aside className="w-64 bg-card border-r border-border flex flex-col">
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Shield className="w-8 h-8 text-primary" />
              <div>
                <h1 className="font-bold text-lg">Admin</h1>
                <p className="text-xs text-muted-foreground capitalize">{role}</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {/* Main menu items */}
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    activeTab === item.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
            
            {renderMenuSection("Financeiro", financialMenuItems)}
            {renderMenuSection("Suporte", supportMenuItems)}
            {renderMenuSection("Customer Success", csMenuItems)}
            {renderMenuSection("Tecnologia", techMenuItems)}
            {renderMenuSection("Diretoria", executiveMenuItems)}
            {renderMenuSection("Integrações", integrationsMenuItems)}
            {renderMenuSection("LGPD & Privacidade", lgpdMenuItems)}
          </nav>

          <div className="p-4 border-t border-border space-y-2">
            <div className="px-3 py-2">
              <p className="text-sm font-medium truncate">{familyMember?.display_name}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
            
            {userAccess?.hasAppAccess && (
              <Button 
                variant="ghost" 
                className="w-full justify-start gap-2"
                onClick={() => navigate("/app")}
              >
                <Home className="w-4 h-4" />
                Ir para App
              </Button>
            )}
            
            <Button 
              variant="ghost" 
              className="w-full justify-start gap-2 text-destructive hover:text-destructive"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4" />
              Sair
            </Button>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            {renderContent()}
          </div>
        </main>
      </div>
    </>
  );
}

function AdminOverview({ 
  onNavigate, 
  hasFinancialAccess, 
  hasSupportAccess, 
  hasCSAccess, 
  hasTechAccess, 
  hasExecutiveAccess, 
  hasLegalAccess 
}: { 
  onNavigate: (tab: AdminTab) => void; 
  hasFinancialAccess: boolean; 
  hasSupportAccess: boolean; 
  hasCSAccess: boolean; 
  hasTechAccess: boolean; 
  hasExecutiveAccess: boolean; 
  hasLegalAccess: boolean;
}) {
  const stats = [
    { label: "Total de Usuários", value: "—", icon: Users, color: "text-blue-500" },
    { label: "Famílias Ativas", value: "—", icon: Home, color: "text-green-500" },
    { label: "eBooks Publicados", value: "—", icon: BookOpen, color: "text-purple-500" },
    { label: "Transações este mês", value: "—", icon: TrendingUp, color: "text-orange-500" },
  ];

  const quickActions = [
    { label: "Gerenciar Usuários", icon: UserCog, action: () => onNavigate("users") },
    { label: "Gerenciar eBooks", icon: BookOpen, action: () => onNavigate("ebooks") },
    { label: "Ver Métricas", icon: BarChart3, action: () => onNavigate("metrics") },
    { label: "Open Finance", icon: Building2, action: () => onNavigate("openfinance") },
    ...(hasFinancialAccess ? [{ label: "Financeiro", icon: DollarSign, action: () => onNavigate("fin-overview") }] : []),
    ...(hasSupportAccess ? [{ label: "Suporte", icon: Headphones, action: () => onNavigate("sup-errors") }] : []),
    ...(hasCSAccess ? [{ label: "Customer Success", icon: Heart, action: () => onNavigate("cs-overview") }] : []),
    ...(hasTechAccess ? [{ label: "Tecnologia", icon: Cpu, action: () => onNavigate("tech-health") }] : []),
    ...(hasExecutiveAccess ? [{ label: "Relatórios Executivos", icon: BarChart3, action: () => onNavigate("exec-reports") }] : []),
    ...(hasLegalAccess ? [{ label: "LGPD & Privacidade", icon: Shield, action: () => onNavigate("lgpd-overview") }] : []),
    ...(hasTechAccess ? [{ label: "Integrações", icon: Plug, action: () => onNavigate("int-overview") }] : []),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Painel Administrativo</h2>
        <p className="text-muted-foreground">Bem-vindo ao painel de administração</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                  <Icon className={`w-8 h-8 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
          <CardDescription>Acesse as principais funcionalidades</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.label}
                  variant="outline"
                  className="h-24 flex-col gap-2"
                  onClick={action.action}
                >
                  <Icon className="w-6 h-6" />
                  <span className="text-xs text-center">{action.label}</span>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AdminSettingsPlaceholder() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Configurações</h2>
        <p className="text-muted-foreground">Configurações do sistema</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Usuário MASTER
          </CardTitle>
          <CardDescription>
            Crie um usuário administrativo com acesso total ao sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateMasterUserSheet 
            trigger={
              <Button className="gap-2">
                <Shield className="w-4 h-4" />
                Criar Usuário MASTER
              </Button>
            }
          />
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Mais configurações em desenvolvimento</p>
        </CardContent>
      </Card>
    </div>
  );
}

function AccessDenied({ message }: { message?: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Acesso Não Autorizado</h2>
        <p className="text-muted-foreground">Você não tem permissão para acessar este módulo</p>
      </div>
      
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          <Lock className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>{message || "Este módulo requer perfil ADMIN_MASTER ou FINANCEIRO"}</p>
        </CardContent>
      </Card>
    </div>
  );
}
