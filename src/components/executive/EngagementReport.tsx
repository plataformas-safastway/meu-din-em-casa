import { useMemo } from 'react';
import { 
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Download, 
  FileSpreadsheet, 
  Activity, 
  Users, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap
} from 'lucide-react';
import { useEngagementReport } from '@/hooks/useExecutiveReports';
import { useReportExport } from '@/hooks/useReportExport';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';

const STATUS_COLORS: Record<string, string> = {
  active: 'hsl(var(--chart-2))',
  new: 'hsl(var(--chart-1))',
  at_risk: 'hsl(var(--destructive))',
  inactive: 'hsl(var(--muted))',
  reactivated: 'hsl(var(--chart-3))',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'Ativos',
  new: 'Novos',
  at_risk: 'Em Risco',
  inactive: 'Inativos',
  reactivated: 'Reativados',
};

export function EngagementReport() {
  const { data: report, isLoading } = useEngagementReport();
  const { exportToCSV, exportToXLSX } = useReportExport();

  const statusData = useMemo(() => {
    if (!report?.user_status) return [];
    
    return Object.entries(report.user_status).map(([status, count]) => ({
      name: STATUS_LABELS[status] ?? status,
      value: count as number,
      color: STATUS_COLORS[status] ?? 'hsl(var(--muted))',
    }));
  }, [report]);

  const automationData = useMemo(() => {
    if (!report?.automation_impact) return [];
    
    const { total_executions, successful, pending } = report.automation_impact;
    const failed = total_executions - successful - pending;
    
    return [
      { name: 'Sucesso', value: successful, color: 'hsl(var(--chart-2))' },
      { name: 'Pendente', value: pending, color: 'hsl(var(--chart-1))' },
      { name: 'Falha', value: Math.max(0, failed), color: 'hsl(var(--destructive))' },
    ];
  }, [report]);

  const handleExport = (format: 'csv' | 'xlsx') => {
    if (!report) return;
    
    const options = {
      reportType: 'engagement',
      title: 'Relatorio_Engajamento_OIK',
      data: {
        score_medio_engajamento: report.average_engagement_score,
        acoes_cs_30d: report.cs_actions_30d,
        distribuicao_status: report.user_status,
        impacto_automacoes: report.automation_impact,
      },
    };

    if (format === 'csv') exportToCSV(options);
    else exportToXLSX(options);
  };

  const totalUsers = useMemo(() => {
    return statusData.reduce((a, s) => a + s.value, 0);
  }, [statusData]);

  const atRiskUsers = useMemo(() => {
    return (report?.user_status?.at_risk as number) ?? 0;
  }, [report]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-[300px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Relatório de Engajamento e CS
          </h2>
          <p className="text-sm text-muted-foreground">Saúde dos usuários e ações de Customer Success</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('xlsx')}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Excel
          </Button>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Score Engajamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report?.average_engagement_score ?? 0}</div>
            <Progress 
              value={report?.average_engagement_score ?? 0} 
              className="h-2 mt-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Usuários
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">Por status</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Em Risco
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{atRiskUsers}</div>
            <Badge variant={atRiskUsers < 10 ? 'default' : 'destructive'}>
              {totalUsers > 0 ? ((atRiskUsers / totalUsers) * 100).toFixed(1) : 0}% do total
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Ações CS (30d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{report?.cs_actions_30d ?? 0}</div>
            <p className="text-xs text-muted-foreground">Realizadas pela equipe</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Status</CardTitle>
            <CardDescription>Classificação atual dos usuários</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              <ChartContainer config={{}} className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
            <div className="flex flex-wrap justify-center gap-3 mt-4">
              {statusData.map((status) => (
                <div key={status.name} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: status.color }}
                  />
                  <span className="text-sm">{status.name}: {status.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Automation Impact */}
        <Card>
          <CardHeader>
            <CardTitle>Impacto das Automações</CardTitle>
            <CardDescription>Execuções nos últimos 30 dias</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={automationData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="name" type="category" width={80} className="text-xs" />
                  <Tooltip />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {automationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>

            <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
              <div className="text-center">
                <CheckCircle className="h-5 w-5 text-emerald-500 mx-auto mb-1" />
                <p className="text-lg font-bold">{report?.automation_impact?.successful ?? 0}</p>
                <p className="text-xs text-muted-foreground">Sucesso</p>
              </div>
              <div className="text-center">
                <Clock className="h-5 w-5 text-amber-500 mx-auto mb-1" />
                <p className="text-lg font-bold">{report?.automation_impact?.pending ?? 0}</p>
                <p className="text-xs text-muted-foreground">Pendente</p>
              </div>
              <div className="text-center">
                <AlertTriangle className="h-5 w-5 text-destructive mx-auto mb-1" />
                <p className="text-lg font-bold">
                  {Math.max(0, (report?.automation_impact?.total_executions ?? 0) - 
                    (report?.automation_impact?.successful ?? 0) - 
                    (report?.automation_impact?.pending ?? 0))}
                </p>
                <p className="text-xs text-muted-foreground">Falha</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Gargalos de Ativação</CardTitle>
          <CardDescription>Principais pontos de fricção identificados</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-amber-500/10 rounded-lg border border-amber-500/20">
              <p className="font-medium text-amber-600">Importação não concluída</p>
              <p className="text-sm text-muted-foreground mt-1">
                Usuários iniciam mas não finalizam importação de extratos
              </p>
            </div>
            <div className="p-4 bg-orange-500/10 rounded-lg border border-orange-500/20">
              <p className="font-medium text-orange-600">Sem orçamento definido</p>
              <p className="text-sm text-muted-foreground mt-1">
                Usuários ativos que não criaram nenhum orçamento
              </p>
            </div>
            <div className="p-4 bg-red-500/10 rounded-lg border border-red-500/20">
              <p className="font-medium text-red-600">Inatividade prolongada</p>
              <p className="text-sm text-muted-foreground mt-1">
                Usuários sem login há mais de 7 dias
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
