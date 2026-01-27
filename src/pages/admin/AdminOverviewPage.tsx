/**
 * AdminOverviewPage - Main overview page for admin dashboard
 */
import { useNavigate } from "react-router-dom";
import { 
  Users, 
  BarChart3, 
  BookOpen, 
  Shield,
  DollarSign,
  Heart,
  Activity,
  Plug,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useUserAccessProfile } from "@/hooks/useUserAccessProfile";
import { useIsAdmin } from "@/hooks/useUserRole";

export function AdminOverviewPage() {
  const navigate = useNavigate();
  const { isAdmin } = useIsAdmin();
  const { data: accessProfile } = useUserAccessProfile();

  const hasFinancialAccess = accessProfile?.has_financial_access ?? false;
  const hasSupportAccess = accessProfile?.has_support_access ?? false;
  const hasCSAccess = accessProfile?.has_cs_access ?? false;
  const hasTechAccess = accessProfile?.has_tech_access ?? false;
  const hasExecutiveAccess = accessProfile?.has_executive_access ?? false;
  const hasLegalAccess = accessProfile?.has_legal_access ?? false;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Dashboard Administrativo</h2>
        <p className="text-muted-foreground">
          Gerencie usuários, conteúdo e configurações da plataforma
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate("/admin/users")}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Usuários</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">Gerenciar usuários</p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate("/admin/ebooks")}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">eBooks</CardTitle>
            <BookOpen className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">Conteúdo educacional</p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => navigate("/admin/metrics")}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Métricas</CardTitle>
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">Análises da plataforma</p>
          </CardContent>
        </Card>

        {(isAdmin || hasTechAccess) && (
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate("/admin/integrations")}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Integrações</CardTitle>
              <Plug className="w-4 h-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground">Serviços conectados</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Module Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {hasFinancialAccess && (
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate("/admin/finance")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Módulo Financeiro
              </CardTitle>
              <CardDescription>
                Cobranças, notas fiscais e relatórios financeiros
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {hasCSAccess && (
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate("/admin/cs")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5" />
                Customer Success
              </CardTitle>
              <CardDescription>
                Saúde da base, automação e engajamento
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {hasTechAccess && (
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate("/admin/tech/health")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Tecnologia
              </CardTitle>
              <CardDescription>
                Saúde do sistema, logs e feature flags
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {hasLegalAccess && (
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate("/admin/lgpd")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                LGPD & Privacidade
              </CardTitle>
              <CardDescription>
                Solicitações DSAR, cofre legal e auditoria
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {hasExecutiveAccess && (
          <Card 
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => navigate("/admin/executive")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Relatórios Executivos
              </CardTitle>
              <CardDescription>
                Visão consolidada para diretoria
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    </div>
  );
}
