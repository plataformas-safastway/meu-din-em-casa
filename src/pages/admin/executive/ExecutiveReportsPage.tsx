import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Activity, 
  Shield,
  FileText,
  Download,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
  useExecutiveAccess,
  useExecutiveMetrics,
  useLogReportAccess
} from '@/hooks/useExecutiveReports';
import { ExecutiveOverviewReport } from '@/components/executive/ExecutiveOverviewReport';
import { GrowthReport } from '@/components/executive/GrowthReport';
import { RevenueReport } from '@/components/executive/RevenueReport';
import { EngagementReport } from '@/components/executive/EngagementReport';
import { ProductReport } from '@/components/executive/ProductReport';
import { InvestorReport } from '@/components/executive/InvestorReport';
import { ReportAuditLog } from '@/components/executive/ReportAuditLog';
import { TechReport } from '@/components/executive/TechReport';
import { CSReport } from '@/components/executive/CSReport';

export default function ExecutiveReportsPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [periodMonths, setPeriodMonths] = useState('1');
  
  const periodEnd = endOfMonth(new Date());
  const periodStart = startOfMonth(subMonths(new Date(), parseInt(periodMonths) - 1));

  const { data: hasAccess, isLoading: accessLoading } = useExecutiveAccess();
  const { data: metrics, isLoading: metricsLoading, refetch } = useExecutiveMetrics(periodStart, periodEnd);
  const logAccess = useLogReportAccess();

  // Log view access on tab change
  useEffect(() => {
    if (hasAccess) {
      logAccess.mutate({
        reportType: activeTab,
        action: 'view',
        periodStart,
        periodEnd,
      });
    }
  }, [activeTab, hasAccess]);

  if (accessLoading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div className="p-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <Shield className="h-5 w-5" />
              Acesso Negado
            </CardTitle>
            <CardDescription>
              Você não tem permissão para acessar os Relatórios Executivos.
              <br />
              Este módulo é restrito para perfis: ADMIN_MASTER, DIRETORIA, GESTÃO ESTRATÉGICA.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatPercent = (value: number) => {
    const prefix = value > 0 ? '+' : '';
    return `${prefix}${value.toFixed(1)}%`;
  };

  return (
    <div className="p-6 space-y-6 print:p-0">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Relatórios Executivos
          </h1>
          <p className="text-muted-foreground">
            Visão estratégica consolidada do OIK
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Select value={periodMonths} onValueChange={setPeriodMonths}>
            <SelectTrigger className="w-40">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Último mês</SelectItem>
              <SelectItem value="3">Últimos 3 meses</SelectItem>
              <SelectItem value="6">Últimos 6 meses</SelectItem>
              <SelectItem value="12">Último ano</SelectItem>
            </SelectContent>
          </Select>

          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              MRR
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatCurrency(metrics?.revenue?.mrr ?? 0)}
                </div>
                <div className={`text-xs flex items-center gap-1 ${
                  (metrics?.revenue?.mrr_growth ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600'
                }`}>
                  {(metrics?.revenue?.mrr_growth ?? 0) >= 0 ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {formatPercent(metrics?.revenue?.mrr_growth ?? 0)} vs anterior
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Usuários Totais
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {metrics?.users?.total ?? 0}
                </div>
                <div className={`text-xs flex items-center gap-1 ${
                  (metrics?.users?.growth_rate ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600'
                }`}>
                  {(metrics?.users?.growth_rate ?? 0) >= 0 ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {formatPercent(metrics?.users?.growth_rate ?? 0)} crescimento
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Usuários Ativos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {metrics?.users?.active ?? 0}
                </div>
                <div className="text-xs text-muted-foreground">
                  {metrics?.users?.total 
                    ? `${((metrics.users.active / metrics.users.total) * 100).toFixed(0)}% do total`
                    : '-'
                  }
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Churn
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {(metrics?.engagement?.churn_rate ?? 0).toFixed(1)}%
                </div>
                <Badge 
                  variant={(metrics?.engagement?.churn_rate ?? 0) < 5 ? 'default' : 'destructive'}
                  className="text-xs"
                >
                  {(metrics?.engagement?.churn_rate ?? 0) < 5 ? 'Saudável' : 'Atenção'}
                </Badge>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Secondary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 print:grid-cols-4">
        <Card className="bg-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              ARR
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <Skeleton className="h-6 w-20" />
            ) : (
              <div className="text-lg font-semibold">
                {formatCurrency((metrics?.revenue?.mrr ?? 0) * 12)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ticket Médio
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <Skeleton className="h-6 w-20" />
            ) : (
              <div className="text-lg font-semibold">
                {formatCurrency(metrics?.revenue?.average_ticket ?? (metrics?.users?.active ? (metrics?.revenue?.mrr ?? 0) / metrics.users.active : 0))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taxa Ativação
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <Skeleton className="h-6 w-20" />
            ) : (
              <div className="text-lg font-semibold">
                {(metrics?.engagement?.activation_rate ?? 0).toFixed(0)}%
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-muted/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Taxa Retenção
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metricsLoading ? (
              <Skeleton className="h-6 w-20" />
            ) : (
              <div className="text-lg font-semibold">
                {(100 - (metrics?.engagement?.churn_rate ?? 0)).toFixed(1)}%
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different reports */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="print:hidden">
        <TabsList className="grid grid-cols-4 md:grid-cols-9 gap-1">
          <TabsTrigger value="overview" className="text-xs">
            <BarChart3 className="h-3 w-3 mr-1" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="growth" className="text-xs">
            <TrendingUp className="h-3 w-3 mr-1" />
            Crescimento
          </TabsTrigger>
          <TabsTrigger value="revenue" className="text-xs">
            <DollarSign className="h-3 w-3 mr-1" />
            Receita
          </TabsTrigger>
          <TabsTrigger value="cs" className="text-xs">
            <Activity className="h-3 w-3 mr-1" />
            CS
          </TabsTrigger>
          <TabsTrigger value="engagement" className="text-xs">
            <Users className="h-3 w-3 mr-1" />
            Engajamento
          </TabsTrigger>
          <TabsTrigger value="tech" className="text-xs">
            <Shield className="h-3 w-3 mr-1" />
            Tecnologia
          </TabsTrigger>
          <TabsTrigger value="product" className="text-xs">
            <FileText className="h-3 w-3 mr-1" />
            Produto
          </TabsTrigger>
          <TabsTrigger value="investor" className="text-xs">
            <FileText className="h-3 w-3 mr-1" />
            Investidor
          </TabsTrigger>
          <TabsTrigger value="audit" className="text-xs">
            <Download className="h-3 w-3 mr-1" />
            Auditoria
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <ExecutiveOverviewReport 
            periodStart={periodStart} 
            periodEnd={periodEnd}
            periodMonths={parseInt(periodMonths)}
          />
        </TabsContent>

        <TabsContent value="growth" className="mt-6">
          <GrowthReport months={parseInt(periodMonths) * 2} />
        </TabsContent>

        <TabsContent value="revenue" className="mt-6">
          <RevenueReport months={parseInt(periodMonths) * 2} />
        </TabsContent>

        <TabsContent value="cs" className="mt-6">
          <CSReport />
        </TabsContent>

        <TabsContent value="engagement" className="mt-6">
          <EngagementReport />
        </TabsContent>

        <TabsContent value="tech" className="mt-6">
          <TechReport months={parseInt(periodMonths) * 2} />
        </TabsContent>

        <TabsContent value="product" className="mt-6">
          <ProductReport />
        </TabsContent>

        <TabsContent value="investor" className="mt-6">
          <InvestorReport 
            periodStart={periodStart} 
            periodEnd={periodEnd}
          />
        </TabsContent>

        <TabsContent value="audit" className="mt-6">
          <ReportAuditLog />
        </TabsContent>
      </Tabs>

      {/* LGPD Notice */}
      <Card className="bg-muted/50 print:hidden">
        <CardContent className="py-3">
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <Shield className="h-3 w-3" />
            Dados agregados conforme LGPD. Nenhuma informação pessoal identificável é exibida.
            Todos os acessos e exportações são registrados para auditoria.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
