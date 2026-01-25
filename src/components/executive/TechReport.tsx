import { useMemo } from 'react';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Download, 
  FileSpreadsheet, 
  Server, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap,
  Activity,
  Cpu,
  HardDrive,
  Wifi
} from 'lucide-react';
import { useProductStabilityReport } from '@/hooks/useExecutiveReports';
import { useReportExport } from '@/hooks/useReportExport';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Props {
  months?: number;
}

export function TechReport({ months = 6 }: Props) {
  const { data: report, isLoading } = useProductStabilityReport();
  const { exportToCSV, exportToXLSX } = useReportExport();

  // Mock performance data (would come from real monitoring)
  const performanceData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => ({
      date: format(subDays(new Date(), 6 - i), 'dd/MM'),
      latency: Math.round(100 + Math.random() * 50),
      errors: Math.round(Math.random() * 5),
      requests: Math.round(1000 + Math.random() * 500),
    }));
  }, []);

  // Edge function status (simulated)
  const edgeFunctions = useMemo(() => [
    { name: 'import-process', status: 'healthy', avgTime: 2340, calls: 1250 },
    { name: 'home-summary', status: 'healthy', avgTime: 180, calls: 8500 },
    { name: 'generate-projection', status: 'healthy', avgTime: 890, calls: 3200 },
    { name: 'pluggy-sync', status: 'warning', avgTime: 4500, calls: 450 },
    { name: 'cs-ai-analyze', status: 'healthy', avgTime: 1200, calls: 890 },
  ], []);

  const chartConfig = {
    latency: { label: 'Latência (ms)', color: 'hsl(var(--chart-1))' },
    errors: { label: 'Erros', color: 'hsl(var(--destructive))' },
    requests: { label: 'Requisições', color: 'hsl(var(--primary))' },
  };

  const handleExport = (format: 'csv' | 'xlsx') => {
    if (!report) return;
    
    const options = {
      reportType: 'tech',
      title: 'Relatorio_Tecnologia_OIK',
      data: {
        uptime: '99.9%',
        latencia_media_ms: performanceData.reduce((a, d) => a + d.latency, 0) / performanceData.length,
        erros_7d: performanceData.reduce((a, d) => a + d.errors, 0),
        taxa_sucesso_import: report.errors.import_success_rate,
        openfinance_ativas: report.integrations.openfinance.active,
        openfinance_erro: report.integrations.openfinance.error,
      },
    };

    if (format === 'csv') exportToCSV(options);
    else exportToXLSX(options);
  };

  const overallHealth = useMemo(() => {
    if (!report) return 100;
    const importHealth = report.errors.import_success_rate;
    const openFinanceHealth = report.integrations.openfinance.total > 0
      ? (report.integrations.openfinance.active / report.integrations.openfinance.total) * 100
      : 100;
    return Math.round((importHealth * 0.6 + openFinanceHealth * 0.4));
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
            <Server className="h-5 w-5 text-primary" />
            Relatório de Tecnologia
          </h2>
          <p className="text-sm text-muted-foreground">Performance, erros e status das integrações</p>
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
              Saúde Geral
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{overallHealth}%</div>
            <Progress value={overallHealth} className="h-2 mt-2" />
            <Badge variant={overallHealth >= 95 ? 'default' : overallHealth >= 80 ? 'secondary' : 'destructive'} className="mt-2">
              {overallHealth >= 95 ? 'Excelente' : overallHealth >= 80 ? 'Bom' : 'Atenção'}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Cpu className="h-4 w-4" />
              Uptime
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">99.9%</div>
            <p className="text-xs text-muted-foreground">Últimos 30 dias</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Latência Média
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(performanceData.reduce((a, d) => a + d.latency, 0) / performanceData.length)}ms
            </div>
            <p className="text-xs text-muted-foreground">P95: ~180ms</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Erros (7d)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {performanceData.reduce((a, d) => a + d.errors, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {report?.errors.import_errors_30d ?? 0} falhas de import (30d)
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Latency Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Latência por Dia</CardTitle>
            <CardDescription>Últimos 7 dias (ms)</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Line 
                    type="monotone"
                    dataKey="latency" 
                    name="Latência (ms)"
                    stroke="hsl(var(--chart-1))" 
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--chart-1))' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Requests & Errors Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Requisições vs Erros</CardTitle>
            <CardDescription>Últimos 7 dias</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Bar 
                    dataKey="requests" 
                    name="Requisições"
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                    opacity={0.7}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Edge Functions Status */}
      <Card>
        <CardHeader>
          <CardTitle>Edge Functions</CardTitle>
          <CardDescription>Status e performance das funções backend</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Função</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Tempo Médio</TableHead>
                <TableHead className="text-right">Chamadas (30d)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {edgeFunctions.map((fn) => (
                <TableRow key={fn.name}>
                  <TableCell className="font-mono text-sm">{fn.name}</TableCell>
                  <TableCell>
                    {fn.status === 'healthy' ? (
                      <Badge variant="default" className="bg-emerald-500">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Saudável
                      </Badge>
                    ) : (
                      <Badge variant="secondary">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Atenção
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {fn.avgTime >= 1000 ? `${(fn.avgTime / 1000).toFixed(1)}s` : `${fn.avgTime}ms`}
                  </TableCell>
                  <TableCell className="text-right">
                    {fn.calls.toLocaleString('pt-BR')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Integrations Status */}
      <Card>
        <CardHeader>
          <CardTitle>Status das Integrações</CardTitle>
          <CardDescription>Conexões externas e APIs</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Wifi className="h-5 w-5 text-primary" />
                  <span className="font-medium">Open Finance (Pluggy)</span>
                </div>
                {(report?.integrations.openfinance.error ?? 0) === 0 ? (
                  <Badge variant="default" className="bg-emerald-500">Operacional</Badge>
                ) : (
                  <Badge variant="destructive">Problemas</Badge>
                )}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Conexões totais</span>
                  <span className="font-medium">{report?.integrations.openfinance.total ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ativas</span>
                  <span className="text-emerald-600 font-medium">{report?.integrations.openfinance.active ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Com erro</span>
                  <span className="text-destructive font-medium">{report?.integrations.openfinance.error ?? 0}</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-5 w-5 text-primary" />
                  <span className="font-medium">Importação de Extratos</span>
                </div>
                {(report?.errors.import_success_rate ?? 100) >= 95 ? (
                  <Badge variant="default" className="bg-emerald-500">Operacional</Badge>
                ) : (
                  <Badge variant="secondary">Atenção</Badge>
                )}
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Taxa de sucesso</span>
                  <span className="font-medium">{report?.errors.import_success_rate ?? 100}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Erros (30d)</span>
                  <span className="text-destructive font-medium">{report?.errors.import_errors_30d ?? 0}</span>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg border bg-card">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  <span className="font-medium">Lovable Cloud</span>
                </div>
                <Badge variant="default" className="bg-emerald-500">Operacional</Badge>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Uptime</span>
                  <span className="font-medium">99.9%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Região</span>
                  <span className="font-medium">AWS us-east-1</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
