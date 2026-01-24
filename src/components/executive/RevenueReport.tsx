import { useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  ComposedChart,
  Line,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Download, FileSpreadsheet, DollarSign, AlertTriangle, TrendingUp } from 'lucide-react';
import { useRevenueMetrics } from '@/hooks/useExecutiveReports';
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

const PLAN_COLORS = {
  premium: 'hsl(var(--chart-1))',
  familiar: 'hsl(var(--chart-2))',
  basico: 'hsl(var(--chart-3))',
  unknown: 'hsl(var(--muted))',
};

const PLAN_LABELS: Record<string, string> = {
  premium: 'Premium',
  familiar: 'Familiar',
  basico: 'Básico',
  unknown: 'Outros',
};

export function RevenueReport({ months = 12 }: Props) {
  const { data: revenueData, isLoading } = useRevenueMetrics(months);
  const { exportToCSV, exportToXLSX } = useReportExport();

  const chartConfig = {
    mrr: { label: 'MRR', color: 'hsl(var(--chart-1))' },
    gross_revenue: { label: 'Receita Bruta', color: 'hsl(var(--chart-2))' },
    overdue: { label: 'Inadimplência', color: 'hsl(var(--destructive))' },
  };

  const formattedData = useMemo(() => {
    return revenueData?.map(item => ({
      ...item,
      monthLabel: format(new Date(item.month), 'MMM/yy', { locale: ptBR }),
      monthFull: format(new Date(item.month), 'MMMM yyyy', { locale: ptBR }),
    })) ?? [];
  }, [revenueData]);

  // Calculate plan distribution from latest month
  const planDistribution = useMemo(() => {
    if (!formattedData.length) return [];
    
    const latestPlans = formattedData[formattedData.length - 1]?.plans ?? {};
    const total = Object.values(latestPlans).reduce((a, b) => a + (b as number), 0);
    
    return Object.entries(latestPlans).map(([plan, count]) => ({
      name: PLAN_LABELS[plan] ?? plan,
      value: count as number,
      percentage: total > 0 ? ((count as number) / total * 100).toFixed(1) : '0',
      color: PLAN_COLORS[plan as keyof typeof PLAN_COLORS] ?? PLAN_COLORS.unknown,
    }));
  }, [formattedData]);

  const handleExport = (format: 'csv' | 'xlsx') => {
    const options = {
      reportType: 'revenue',
      title: 'Relatorio_Receita_OIK',
      data: formattedData.map(d => ({
        mes: d.monthFull,
        mrr: d.mrr,
        receita_bruta: d.gross_revenue,
        inadimplencia: d.overdue,
        planos: JSON.stringify(d.plans),
      })),
    };

    if (format === 'csv') exportToCSV(options);
    else exportToXLSX(options);
  };

  // Calculate stats
  const stats = useMemo(() => {
    if (!formattedData.length) return { currentMrr: 0, totalRevenue: 0, totalOverdue: 0, overdueRate: 0 };
    
    const currentMrr = formattedData[formattedData.length - 1]?.mrr ?? 0;
    const totalRevenue = formattedData.reduce((a, d) => a + d.gross_revenue, 0);
    const totalOverdue = formattedData.reduce((a, d) => a + d.overdue, 0);
    const overdueRate = totalRevenue > 0 ? (totalOverdue / totalRevenue) * 100 : 0;

    return { currentMrr, totalRevenue, totalOverdue, overdueRate };
  }, [formattedData]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            Relatório de Receita
          </h2>
          <p className="text-sm text-muted-foreground">Análise financeira consolidada</p>
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
            <CardTitle className="text-sm font-medium text-muted-foreground">MRR Atual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{formatCurrency(stats.currentMrr)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Receita Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">No período</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Inadimplência
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{formatCurrency(stats.totalOverdue)}</div>
            <Badge variant={stats.overdueRate < 5 ? 'default' : 'destructive'}>
              {stats.overdueRate.toFixed(1)}% do total
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ticket Médio</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(
                planDistribution.reduce((a, p) => a + p.value, 0) > 0
                  ? stats.currentMrr / planDistribution.reduce((a, p) => a + p.value, 0)
                  : 0
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Evolução da Receita</CardTitle>
          <CardDescription>MRR, receita bruta e inadimplência</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={formattedData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="monthLabel" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip content={<ChartTooltipContent />} />
                <Legend />
                <Bar 
                  dataKey="gross_revenue" 
                  name="Receita Bruta"
                  fill="hsl(var(--chart-2))" 
                  radius={[4, 4, 0, 0]}
                  opacity={0.8}
                />
                <Bar 
                  dataKey="overdue" 
                  name="Inadimplência"
                  fill="hsl(var(--destructive))" 
                  radius={[4, 4, 0, 0]}
                  opacity={0.6}
                />
                <Line 
                  type="monotone"
                  dataKey="mrr" 
                  name="MRR"
                  stroke="hsl(var(--chart-1))" 
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--chart-1))', r: 4 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plan Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Plano</CardTitle>
            <CardDescription>Assinantes ativos por tipo de plano</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              <ChartContainer config={{}} className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={planDistribution}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      dataKey="value"
                      label={({ name, percentage }) => `${name}: ${percentage}%`}
                    >
                      {planDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
            <div className="flex justify-center gap-4 mt-4">
              {planDistribution.map((plan) => (
                <div key={plan.name} className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: plan.color }}
                  />
                  <span className="text-sm">{plan.name}: {plan.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Monthly Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Detalhamento Mensal</CardTitle>
            <CardDescription>Últimos meses</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mês</TableHead>
                  <TableHead className="text-right">MRR</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                  <TableHead className="text-right">Inad.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formattedData.slice(-6).reverse().map((row) => (
                  <TableRow key={row.month}>
                    <TableCell className="font-medium">{row.monthLabel}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.mrr)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(row.gross_revenue)}</TableCell>
                    <TableCell className="text-right text-destructive">
                      {formatCurrency(row.overdue)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
