import { useState } from "react";
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
  Server,
  Key,
  Flag,
  Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useUserRole";
import { useFinancialAccess } from "@/hooks/useFinancialAccess";
import { useSupportAccess } from "@/hooks/useSupportAccess";
import { useCSAccess } from "@/hooks/useCSAccess";
import { useTechAccess } from "@/hooks/useTechAccess";
import { AdminUsersPage } from "./AdminUsersPage";
import { AdminEbooksPage } from "./AdminEbooksPage";
import { AdminMetricsPage } from "./AdminMetricsPage";
import { AdminOpenFinancePage } from "./AdminOpenFinancePage";
import {
  FinancialOverviewPage,
  FinancialUsersPage,
  FinancialPaymentsPage,
  FinancialInvoicesPage,
  FinancialReportsPage,
  FinancialAuditPage
} from "./finance";
import {
  SupportErrorsPage,
  SupportUsersPage,
  SupportAuditPage,
} from "./support";
import {
  CSOverviewPage,
  CSUsersListPage,
  CSAuditPage,
} from "./cs";
import {
  TechHealthPage,
  TechLogsPage,
  TechIntegrationsPage,
  TechApiKeysPage,
  TechFeatureFlagsPage,
  TechAuditPage,
} from "./tech";

type AdminTab = "overview" | "users" | "ebooks" | "metrics" | "openfinance" | "settings" 
  | "fin-overview" | "fin-users" | "fin-payments" | "fin-invoices" | "fin-reports" | "fin-audit"
  | "sup-errors" | "sup-users" | "sup-audit"
  | "cs-overview" | "cs-users" | "cs-audit"
  | "tech-health" | "tech-logs" | "tech-integrations" | "tech-keys" | "tech-flags" | "tech-audit";

export function AdminDashboard() {
  const navigate = useNavigate();
  const { user, familyMember, signOut } = useAuth();
  const { role, isAdmin, isCS } = useIsAdmin();
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");

  const { data: hasFinancialAccess } = useFinancialAccess();
  const { data: hasSupportAccess } = useSupportAccess();
  const { data: hasCSAccess } = useCSAccess();
  const { data: hasTechAccess } = useTechAccess();
  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const menuItems = [
    { id: "overview" as AdminTab, label: "Visão Geral", icon: Home },
    { id: "users" as AdminTab, label: "Usuários", icon: Users },
    { id: "ebooks" as AdminTab, label: "eBooks", icon: BookOpen },
    { id: "metrics" as AdminTab, label: "Métricas", icon: BarChart3 },
    { id: "openfinance" as AdminTab, label: "Open Finance", icon: Building2 },
    ...(isAdmin ? [{ id: "settings" as AdminTab, label: "Configurações", icon: Settings }] : []),
  ];

  // Financial module menu - only for users with financial access
  const financialMenuItems = hasFinancialAccess ? [
    { id: "fin-overview" as AdminTab, label: "Visão Financeira", icon: DollarSign },
    { id: "fin-users" as AdminTab, label: "Gestão Usuários", icon: UserCog },
    { id: "fin-payments" as AdminTab, label: "Cobranças", icon: Receipt },
    { id: "fin-invoices" as AdminTab, label: "Notas Fiscais", icon: FileText },
    { id: "fin-reports" as AdminTab, label: "Relatórios", icon: FileSpreadsheet },
    { id: "fin-audit" as AdminTab, label: "Auditoria", icon: ClipboardList },
  ] : [];

  // Support module menu - only for users with support access
  const supportMenuItems = hasSupportAccess ? [
    { id: "sup-errors" as AdminTab, label: "Painel de Erros", icon: AlertTriangle },
    { id: "sup-users" as AdminTab, label: "Usuários", icon: Headphones },
    { id: "sup-audit" as AdminTab, label: "Auditoria Suporte", icon: ClipboardList },
  ] : [];

  // CS module menu - only for users with CS access
  const csMenuItems = hasCSAccess ? [
    { id: "cs-overview" as AdminTab, label: "Visão CS", icon: Heart },
    { id: "cs-users" as AdminTab, label: "Base de Usuários", icon: Users },
    { id: "cs-audit" as AdminTab, label: "Auditoria CS", icon: ClipboardList },
  ] : [];

  // Tech module menu - only for users with tech access
  const techMenuItems = hasTechAccess ? [
    { id: "tech-health" as AdminTab, label: "Saúde do Sistema", icon: Activity },
    { id: "tech-logs" as AdminTab, label: "Logs", icon: FileText },
    { id: "tech-integrations" as AdminTab, label: "Integrações", icon: Server },
    { id: "tech-keys" as AdminTab, label: "Chaves API", icon: Key },
    { id: "tech-flags" as AdminTab, label: "Feature Flags", icon: Flag },
    { id: "tech-audit" as AdminTab, label: "Auditoria Tech", icon: ClipboardList },
  ] : [];

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
      default:
        return <AdminOverview onNavigate={setActiveTab} hasFinancialAccess={!!hasFinancialAccess} hasSupportAccess={!!hasSupportAccess} hasCSAccess={!!hasCSAccess} hasTechAccess={!!hasTechAccess} />;
    }
  };

  return (
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

        <nav className="flex-1 p-4 space-y-1">
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
          {financialMenuItems.length > 0 && (
            <>
              <div className="pt-4 pb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase px-3">Financeiro</p>
              </div>
              {financialMenuItems.map((item) => {
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
          )}
          {supportMenuItems.length > 0 && (
            <>
              <div className="pt-4 pb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase px-3">Suporte</p>
              </div>
              {supportMenuItems.map((item) => {
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
          )}
          {csMenuItems.length > 0 && (
            <>
              <div className="pt-4 pb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase px-3">Customer Success</p>
              </div>
              {csMenuItems.map((item) => {
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
          )}
          {techMenuItems.length > 0 && (
            <>
              <div className="pt-4 pb-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase px-3">Tecnologia</p>
              </div>
              {techMenuItems.map((item) => {
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
          )}
        </nav>

        <div className="p-4 border-t border-border space-y-2">
          <div className="px-3 py-2">
            <p className="text-sm font-medium truncate">{familyMember?.display_name}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          </div>
          
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-2"
            onClick={() => navigate("/app")}
          >
            <Home className="w-4 h-4" />
            Ir para App
          </Button>
          
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
  );
}

function AdminOverview({ onNavigate, hasFinancialAccess, hasSupportAccess, hasCSAccess, hasTechAccess }: { onNavigate: (tab: AdminTab) => void; hasFinancialAccess: boolean; hasSupportAccess: boolean; hasCSAccess: boolean; hasTechAccess: boolean }) {
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
    ...(hasFinancialAccess ? [
      { label: "Financeiro", icon: DollarSign, action: () => onNavigate("fin-overview") },
    ] : []),
    ...(hasSupportAccess ? [
      { label: "Suporte", icon: Headphones, action: () => onNavigate("sup-errors") },
    ] : []),
    ...(hasCSAccess ? [
      { label: "Customer Success", icon: Heart, action: () => onNavigate("cs-overview") },
    ] : []),
    ...(hasTechAccess ? [
      { label: "Tecnologia", icon: Cpu, action: () => onNavigate("tech-health") },
    ] : []),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Painel Administrativo</h2>
        <p className="text-muted-foreground">Bem-vindo ao painel de administração</p>
      </div>

      {/* Stats Grid */}
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

      {/* Quick Actions */}
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
        <CardContent className="p-8 text-center text-muted-foreground">
          <Settings className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Configurações em desenvolvimento</p>
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
