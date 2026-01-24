import { useMemo } from 'react';
import { 
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  Legend
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Download, 
  FileSpreadsheet, 
  Shield, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Server,
  Zap
} from 'lucide-react';
import { useProductStabilityReport } from '@/hooks/useExecutiveReports';
import { useReportExport } from '@/hooks/useReportExport';
import { ChartContainer } from '@/components/ui/chart';

export function ProductReport() {
  const { data: report, isLoading } = useProductStabilityReport();
  const { exportToCSV, exportToXLSX } = useReportExport();

  const handleExport = (format: 'csv' | 'xlsx') => {
    if (!report) return;
    
    const options = {
      reportType: 'product',
      title: 'Relatorio_Produto_OIK',
      data: {
        erros_importacao_30d: report.errors.import_errors_30d,
        taxa_sucesso_importacao: report.errors.import_success_rate,
        conexoes_openfinance_total: report.integrations.openfinance.total,
        conexoes_openfinance_ativas: report.integrations.openfinance.active,
        conexoes_openfinance_erro: report.integrations.openfinance.error,
      },
    };

    if (format === 'csv') exportToCSV(options);
    else exportToXLSX(options);
  };

  const stabilityScore = useMemo(() => {
    if (!report) return 0;
    
    // Calculate a weighted stability score
    const importScore = report.errors.import_success_rate;
    const openFinanceScore = report.integrations.openfinance.total > 0
      ? (report.integrations.openfinance.active / report.integrations.openfinance.total) * 100
      : 100;
    
    return Math.round((importScore * 0.6 + openFinanceScore * 0.4));
  }, [report]);

  const stabilityData = useMemo(() => {
    return [
      {
        name: 'Estabilidade',
        value: stabilityScore,
        fill: stabilityScore >= 90 ? 'hsl(var(--chart-2))' : 
              stabilityScore >= 70 ? 'hsl(var(--chart-1))' : 
              'hsl(var(--destructive))',
      },
    ];
  }, [stabilityScore]);

  const errorTypes = useMemo(() => {
    return [
      { name: 'Importação', value: report?.errors.import_errors_30d ?? 0, color: 'hsl(var(--chart-1))' },
      { name: 'Open Finance', value: report?.integrations.openfinance.error ?? 0, color: 'hsl(var(--chart-2))' },
    ];
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
            <Shield className="h-5 w-5 text-primary" />
            Relatório de Produto e Estabilidade
          </h2>
          <p className="text-sm text-muted-foreground">Saúde técnica e performance do sistema</p>
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
              <Zap className="h-4 w-4" />
              Score Estabilidade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stabilityScore}%</div>
            <Badge variant={stabilityScore >= 90 ? 'default' : stabilityScore >= 70 ? 'secondary' : 'destructive'}>
              {stabilityScore >= 90 ? 'Excelente' : stabilityScore >= 70 ? 'Bom' : 'Atenção'}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Taxa Sucesso Import
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {report?.errors.import_success_rate ?? 100}%
            </div>
            <Progress value={report?.errors.import_success_rate ?? 100} className="h-2 mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Erros (30d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {report?.errors.import_errors_30d ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">Falhas de importação</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Server className="h-4 w-4" />
              Open Finance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {report?.integrations.openfinance.active ?? 0}/{report?.integrations.openfinance.total ?? 0}
            </div>
            <p className="text-xs text-muted-foreground">Conexões ativas</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stability Gauge */}
        <Card>
          <CardHeader>
            <CardTitle>Índice de Estabilidade</CardTitle>
            <CardDescription>Score geral do sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart 
                  cx="50%" 
                  cy="50%" 
                  innerRadius="60%" 
                  outerRadius="100%" 
                  data={stabilityData}
                  startAngle={180}
                  endAngle={0}
                >
                  <RadialBar
                    background
                    dataKey="value"
                    cornerRadius={10}
                  />
                </RadialBarChart>
              </ResponsiveContainer>
            </ChartContainer>
            <div className="text-center -mt-10">
              <p className="text-4xl font-bold">{stabilityScore}%</p>
              <p className="text-sm text-muted-foreground">Score Geral</p>
            </div>
          </CardContent>
        </Card>

        {/* Error Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Erros</CardTitle>
            <CardDescription>Por tipo nos últimos 30 dias</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{}} className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={errorTypes} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" className="text-xs" />
                  <YAxis dataKey="name" type="category" width={100} className="text-xs" />
                  <Tooltip />
                  <Bar 
                    dataKey="value" 
                    fill="hsl(var(--destructive))" 
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Integration Status */}
      <Card>
        <CardHeader>
          <CardTitle>Status das Integrações</CardTitle>
          <CardDescription>Saúde das conexões externas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Open Finance</span>
                {(report?.integrations.openfinance.error ?? 0) === 0 ? (
                  <Badge variant="default" className="bg-emerald-500">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Operacional
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <XCircle className="h-3 w-3 mr-1" />
                    Problemas
                  </Badge>
                )}
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Conexões totais</span>
                  <span>{report?.integrations.openfinance.total ?? 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Ativas</span>
                  <span className="text-emerald-600">{report?.integrations.openfinance.active ?? 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Com erro</span>
                  <span className="text-destructive">{report?.integrations.openfinance.error ?? 0}</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Importação de Extratos</span>
                {(report?.errors.import_success_rate ?? 100) >= 95 ? (
                  <Badge variant="default" className="bg-emerald-500">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Operacional
                  </Badge>
                ) : (
                  <Badge variant="secondary">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Atenção
                  </Badge>
                )}
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Taxa de sucesso</span>
                  <span>{report?.errors.import_success_rate ?? 100}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Erros (30d)</span>
                  <span className="text-destructive">{report?.errors.import_errors_30d ?? 0}</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">Infraestrutura</span>
                <Badge variant="default" className="bg-emerald-500">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Operacional
                </Badge>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Uptime</span>
                  <span>99.9%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Latência média</span>
                  <span>~120ms</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
