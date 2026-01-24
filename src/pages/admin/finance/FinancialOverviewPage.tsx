import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  AlertTriangle,
  Activity,
  BarChart3,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useFinancialMetrics } from "@/hooks/useFinancialModule";
import { formatCurrency } from "@/lib/formatters";

export function FinancialOverviewPage() {
  const { data: metrics, isLoading, error } = useFinancialMetrics();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="flex items-center justify-center min-h-[400px] text-muted-foreground">
        <p>Erro ao carregar métricas financeiras</p>
      </div>
    );
  }

  const kpis = [
    {
      label: "MRR (Receita Recorrente)",
      value: formatCurrency(metrics.mrr),
      icon: DollarSign,
      color: "text-green-500",
      bgColor: "bg-green-500/10"
    },
    {
      label: "ARR (Anual)",
      value: formatCurrency(metrics.arr),
      icon: TrendingUp,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10"
    },
    {
      label: "Receita do Mês",
      value: formatCurrency(metrics.revenueThisMonth),
      icon: Activity,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
      change: metrics.revenueGrowth,
      changeLabel: "vs mês anterior"
    },
    {
      label: "Ticket Médio",
      value: formatCurrency(metrics.ticketMedio),
      icon: BarChart3,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10"
    },
  ];

  const userStats = [
    { label: "Total de Usuários", value: metrics.totalUsers, color: "text-foreground" },
    { label: "Ativos", value: metrics.activeUsers, color: "text-green-500" },
    { label: "Em Trial", value: metrics.trialUsers, color: "text-blue-500" },
    { label: "Inativos", value: metrics.inactiveUsers, color: "text-muted-foreground" },
    { label: "Inadimplentes", value: metrics.overdueUsers, color: "text-orange-500" },
    { label: "Cancelados", value: metrics.cancelledUsers, color: "text-red-500" },
  ];

  const healthMetrics = [
    {
      label: "Churn Mensal",
      value: `${metrics.churnRate.toFixed(1)}%`,
      status: metrics.churnRate < 5 ? "good" : metrics.churnRate < 10 ? "warning" : "bad",
      target: "< 5%"
    },
    {
      label: "Inadimplência",
      value: `${metrics.inadimplenciaRate.toFixed(1)}%`,
      status: metrics.inadimplenciaRate < 3 ? "good" : metrics.inadimplenciaRate < 8 ? "warning" : "bad",
      target: "< 3%",
      subValue: formatCurrency(metrics.inadimplenciaValue)
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Visão Geral Financeira</h2>
        <p className="text-muted-foreground">Indicadores de performance do negócio</p>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">{kpi.label}</p>
                    <p className="text-2xl font-bold">{kpi.value}</p>
                    {kpi.change !== undefined && (
                      <div className={`flex items-center gap-1 text-xs ${
                        kpi.change >= 0 ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {kpi.change >= 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                        <span>{Math.abs(kpi.change).toFixed(1)}%</span>
                        <span className="text-muted-foreground">{kpi.changeLabel}</span>
                      </div>
                    )}
                  </div>
                  <div className={`p-2 rounded-lg ${kpi.bgColor}`}>
                    <Icon className={`w-5 h-5 ${kpi.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* User Stats & Health Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Distribuição de Usuários
            </CardTitle>
            <CardDescription>Status atual das assinaturas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {userStats.map((stat) => (
                <div key={stat.label} className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                  <span className="text-sm text-muted-foreground">{stat.label}</span>
                  <span className={`text-lg font-semibold ${stat.color}`}>{stat.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Health Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Saúde do Negócio
            </CardTitle>
            <CardDescription>Indicadores críticos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {healthMetrics.map((metric) => (
              <div 
                key={metric.label} 
                className={`p-4 rounded-lg border ${
                  metric.status === 'good' 
                    ? 'border-green-500/20 bg-green-500/5' 
                    : metric.status === 'warning'
                    ? 'border-yellow-500/20 bg-yellow-500/5'
                    : 'border-red-500/20 bg-red-500/5'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-muted-foreground">{metric.label}</p>
                    <p className={`text-2xl font-bold ${
                      metric.status === 'good' 
                        ? 'text-green-500' 
                        : metric.status === 'warning'
                        ? 'text-yellow-500'
                        : 'text-red-500'
                    }`}>
                      {metric.value}
                    </p>
                    {metric.subValue && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Valor: {metric.subValue}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Meta</p>
                    <p className="text-sm font-medium">{metric.target}</p>
                  </div>
                </div>
              </div>
            ))}

            {(metrics.churnRate >= 10 || metrics.inadimplenciaRate >= 8) && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-500">Atenção Necessária</p>
                  <p className="text-xs text-muted-foreground">
                    Indicadores acima do limite aceitável. Recomenda-se ação imediata.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Revenue Comparison */}
      <Card>
        <CardHeader>
          <CardTitle>Comparativo de Receita</CardTitle>
          <CardDescription>Mês atual vs mês anterior</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground mb-1">Mês Anterior</p>
              <p className="text-2xl font-bold">{formatCurrency(metrics.revenueLastMonth)}</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-primary/10">
              <p className="text-sm text-muted-foreground mb-1">Mês Atual</p>
              <p className="text-2xl font-bold text-primary">{formatCurrency(metrics.revenueThisMonth)}</p>
            </div>
            <div className={`text-center p-4 rounded-lg ${
              metrics.revenueGrowth >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'
            }`}>
              <p className="text-sm text-muted-foreground mb-1">Crescimento</p>
              <p className={`text-2xl font-bold flex items-center justify-center gap-1 ${
                metrics.revenueGrowth >= 0 ? 'text-green-500' : 'text-red-500'
              }`}>
                {metrics.revenueGrowth >= 0 ? (
                  <TrendingUp className="w-5 h-5" />
                ) : (
                  <TrendingDown className="w-5 h-5" />
                )}
                {Math.abs(metrics.revenueGrowth).toFixed(1)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
