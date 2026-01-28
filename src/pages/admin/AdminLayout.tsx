/**
 * AdminLayout - Layout wrapper for admin dashboard with sidebar navigation
 * Uses React Router v6 <Outlet /> for rendering child routes
 */
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
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
  Building2,
  DollarSign,
  Receipt,
  FileSpreadsheet,
  ClipboardList,
  AlertTriangle,
  Headphones,
  Heart,
  Cpu,
  Activity,
  Scale,
  Vault,
  Plug,
  Mail,
  CreditCard,
  Key,
  Flag,
  Bug,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/hooks/useUserRole";
import { useUserAccessProfile } from "@/hooks/useUserAccessProfile";
import { useMustChangePassword } from "@/hooks/useMasterUserSetup";
import { useCanAccessAppFromDashboard } from "@/hooks/useAppAuthorization";
import { ForcePasswordChangeModal } from "@/components/auth/ForcePasswordChangeModal";
import { AppAccessDeniedModal } from "@/components/admin/AppAccessDeniedModal";
import { cn } from "@/lib/utils";
import { logLifecycle } from "@/lib/lifecycleTracer";

type MenuItem = {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

export function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const { role, isAdmin } = useIsAdmin();
  const { data: accessProfile } = useUserAccessProfile();
  const { data: mustChangePassword, refetch: refetchPasswordCheck } = useMustChangePassword();
  
  // CRITICAL: Check if user can access the App before allowing navigation
  const { canAccess: canAccessApp, reason: appAccessReason, isLoading: appAccessLoading } = useCanAccessAppFromDashboard();
  const [showAppAccessDenied, setShowAppAccessDenied] = useState(false);

  // Lifecycle tracing
  useEffect(() => {
    logLifecycle('MOUNT', 'AdminLayout');
    return () => logLifecycle('UNMOUNT', 'AdminLayout');
  }, []);

  // Extract access flags
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
  
  // Handle "Voltar ao App" with authorization check
  const handleNavigateToApp = () => {
    if (appAccessLoading) return;
    
    if (!canAccessApp) {
      // Show modal explaining why access is denied
      setShowAppAccessDenied(true);
      return;
    }
    
    // User has full access, navigate to App
    navigate("/app");
  };

  // Main menu items
  const mainMenuItems: MenuItem[] = [
    { path: "/admin", label: "Visão Geral", icon: Home },
    { path: "/admin/users", label: "Usuários", icon: Users },
    { path: "/admin/ebooks", label: "eBooks", icon: BookOpen },
    { path: "/admin/metrics", label: "Métricas", icon: BarChart3 },
    ...(isAdmin ? [{ path: "/admin/settings", label: "Configurações", icon: Settings }] : []),
  ];

  // Financial module menu
  const financialMenuItems: MenuItem[] = hasFinancialAccess ? [
    { path: "/admin/finance", label: "Visão Financeira", icon: DollarSign },
    { path: "/admin/finance/users", label: "Gestão Usuários", icon: UserCog },
    { path: "/admin/finance/payments", label: "Cobranças", icon: Receipt },
    { path: "/admin/finance/invoices", label: "Notas Fiscais", icon: FileText },
    { path: "/admin/finance/reports", label: "Relatórios", icon: FileSpreadsheet },
    { path: "/admin/finance/audit", label: "Auditoria", icon: ClipboardList },
  ] : [];

  // Support module menu
  const supportMenuItems: MenuItem[] = hasSupportAccess ? [
    { path: "/admin/support/errors", label: "Painel de Erros", icon: AlertTriangle },
    { path: "/admin/support/users", label: "Usuários", icon: Headphones },
    { path: "/admin/support/audit", label: "Auditoria Suporte", icon: ClipboardList },
  ] : [];

  // CS module menu
  const csMenuItems: MenuItem[] = hasCSAccess ? [
    { path: "/admin/cs", label: "Visão CS", icon: Heart },
    { path: "/admin/cs/users", label: "Base de Usuários", icon: Users },
    { path: "/admin/cs/health", label: "Saúde da Base", icon: Activity },
    { path: "/admin/cs/automation", label: "Automação + IA", icon: Cpu },
    { path: "/admin/cs/lgpd", label: "Solicitações LGPD", icon: Shield },
    { path: "/admin/cs/audit", label: "Auditoria CS", icon: ClipboardList },
  ] : [];

  // Executive reports menu
  const executiveMenuItems: MenuItem[] = hasExecutiveAccess ? [
    { path: "/admin/executive", label: "Relatórios Executivos", icon: BarChart3 },
  ] : [];

  // Tech module menu
  const techMenuItems: MenuItem[] = hasTechAccess ? [
    { path: "/admin/tech/health", label: "Saúde do Sistema", icon: Activity },
    { path: "/admin/tech/logs", label: "Logs", icon: FileText },
    { path: "/admin/tech/observability", label: "Observabilidade", icon: Bug },
    { path: "/admin/tech/flags", label: "Feature Flags", icon: Flag },
    { path: "/admin/tech/audit", label: "Auditoria Tech", icon: ClipboardList },
  ] : [];

  // LGPD & Privacy module menu
  const lgpdMenuItems: MenuItem[] = hasLegalAccess ? [
    { path: "/admin/lgpd", label: "Visão Geral", icon: Shield },
    { path: "/admin/lgpd/dsar", label: "Solicitações DSAR", icon: FileText },
    { path: "/admin/lgpd/vault", label: "Cofre Legal", icon: Vault },
    { path: "/admin/lgpd/breakglass", label: "Acesso Excepcional", icon: Scale },
    { path: "/admin/lgpd/audit", label: "Auditoria", icon: ClipboardList },
  ] : [];

  // Integrations menu
  const integrationsMenuItems: MenuItem[] = (isAdmin || hasTechAccess) ? [
    { path: "/admin/integrations", label: "Visão Geral", icon: Plug },
    { path: "/admin/integrations/openfinance", label: "Open Finance", icon: Building2 },
    { path: "/admin/integrations/acquirer", label: "Adquirentes", icon: CreditCard },
    { path: "/admin/integrations/resend", label: "Resend", icon: Mail },
    { path: "/admin/integrations/enotas", label: "eNotas", icon: FileText },
    { path: "/admin/integrations/keys", label: "Chaves API", icon: Key },
  ] : [];

  // Render menu section helper
  const renderMenuSection = (title: string, items: MenuItem[]) => {
    if (items.length === 0) return null;
    return (
      <>
        <div className="pt-4 pb-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase px-3">{title}</p>
        </div>
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = item.path === "/admin" 
            ? location.pathname === "/admin"
            : location.pathname.startsWith(item.path);
          
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
            >
              <Icon className="w-4 h-4" />
              {item.label}
            </NavLink>
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
      
      {/* Modal when user cannot access App */}
      <AppAccessDeniedModal
        open={showAppAccessDenied}
        onClose={() => setShowAppAccessDenied(false)}
        reason={appAccessReason}
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
            {mainMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.path === "/admin" 
                ? location.pathname === "/admin"
                : location.pathname.startsWith(item.path);
              
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </NavLink>
              );
            })}

            {/* Modular sections */}
            {renderMenuSection("FINANCEIRO", financialMenuItems)}
            {renderMenuSection("SUPORTE", supportMenuItems)}
            {renderMenuSection("CUSTOMER SUCCESS", csMenuItems)}
            {renderMenuSection("EXECUTIVO", executiveMenuItems)}
            {renderMenuSection("INTEGRAÇÕES", integrationsMenuItems)}
            {renderMenuSection("TECNOLOGIA", techMenuItems)}
            {renderMenuSection("LGPD & PRIVACIDADE", lgpdMenuItems)}
          </nav>

          {/* Bottom actions */}
          <div className="p-4 border-t border-border space-y-2">
            <Button
              variant="ghost"
              className="w-full justify-start gap-2"
              onClick={handleNavigateToApp}
              disabled={appAccessLoading}
            >
              <Home className="w-4 h-4" />
              Voltar ao App
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
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </>
  );
}
