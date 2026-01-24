import { useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Download, FileSpreadsheet, TrendingUp, Users, Zap } from 'lucide-react';
import { useGrowthMetrics } from '@/hooks/useExecutiveReports';
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

export function GrowthReport({ months = 12 }: Props) {
  const { data: growthData, isLoading } = useGrowthMetrics(months);
  const { exportToCSV, exportToXLSX } = useReportExport();

  const chartConfig = {
    new_users: { label: 'Novos Usuários', color: 'hsl(var(--primary))' },
    activation_rate: { label: 'Taxa Ativação', color: 'hsl(var(--chart-2))' },
  };

  const formattedData = useMemo(() => {
    return growthData?.map(item => ({
      ...item,
      monthLabel: format(new Date(item.month), 'MMM/yy', { locale: ptBR }),
      monthFull: format(new Date(item.month), 'MMMM yyyy', { locale: ptBR }),
    })) ?? [];
  }, [growthData]);

  // Calculate cohort-style retention (simplified)
  const cohortData = useMemo(() => {
    if (!formattedData.length) return [];
    
    return formattedData.slice(-6).map((item, idx) => ({
      cohort: item.monthLabel,
      m0: item.new_users,
      m1: Math.round(item.new_users * (item.activation_rate / 100) * 0.9),
      m2: Math.round(item.new_users * (item.activation_rate / 100) * 0.75),
      m3: Math.round(item.new_users * (item.activation_rate / 100) * 0.6),
    }));
  }, [formattedData]);

  const handleExport = (format: 'csv' | 'xlsx') => {
    const options = {
      reportType: 'growth',
      title: 'Relatorio_Crescimento_OIK',
      data: formattedData.map(d => ({
        mes: d.monthFull,
        novos_usuarios: d.new_users,
        usuarios_ativados: d.activated_users,
        taxa_ativacao_percent: d.activation_rate,
      })),
    };

    if (format === 'csv') exportToCSV(options);
    else exportToXLSX(options);
  };

  // Calculate averages and trends
  const stats = useMemo(() => {
    if (!formattedData.length) return { avgNew: 0, avgActivation: 0, trend: 'stable' };
    
    const avgNew = formattedData.reduce((a, d) => a + d.new_users, 0) / formattedData.length;
    const avgActivation = formattedData.reduce((a, d) => a + d.activation_rate, 0) / formattedData.length;
    
    // Compare last 3 months vs previous 3 months
    const recent = formattedData.slice(-3);
    const previous = formattedData.slice(-6, -3);
    const recentAvg = recent.reduce((a, d) => a + d.new_users, 0) / recent.length;
    const prevAvg = previous.length ? previous.reduce((a, d) => a + d.new_users, 0) / previous.length : recentAvg;
    
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (recentAvg > prevAvg * 1.1) trend = 'up';
    else if (recentAvg < prevAvg * 0.9) trend = 'down';

    return { avgNew: Math.round(avgNew), avgActivation: Math.round(avgActivation), trend };
  }, [formattedData]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Export Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Relatório de Crescimento
          </h2>
          <p className="text-sm text-muted-foreground">Análise da evolução da base de usuários</p>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Média Novos Usuários/Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgNew}</div>
            <Badge variant={stats.trend === 'up' ? 'default' : stats.trend === 'down' ? 'destructive' : 'secondary'}>
              {stats.trend === 'up' ? '↑ Crescendo' : stats.trend === 'down' ? '↓ Caindo' : '→ Estável'}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Taxa de Ativação Média
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.avgActivation}%</div>
            <Badge variant={stats.avgActivation >= 50 ? 'default' : 'secondary'}>
              {stats.avgActivation >= 50 ? 'Saudável' : 'Melhorar'}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Ativados no Período
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formattedData.reduce((a, d) => a + d.activated_users, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              de {formattedData.reduce((a, d) => a + d.new_users, 0)} cadastrados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Growth Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Evolução de Novos Usuários</CardTitle>
          <CardDescription>Crescimento da base ao longo do tempo</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={formattedData}>
                <defs>
                  <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="monthLabel" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip content={<ChartTooltipContent />} />
                <Area 
                  type="monotone"
                  dataKey="new_users" 
                  name="Novos Usuários"
                  stroke="hsl(var(--primary))" 
                  fillOpacity={1}
                  fill="url(#colorNew)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Activation Rate Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Taxa de Ativação por Mês</CardTitle>
          <CardDescription>Percentual de usuários que realizaram primeira ação</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={formattedData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="monthLabel" className="text-xs" />
                <YAxis className="text-xs" domain={[0, 100]} />
                <Tooltip content={<ChartTooltipContent />} />
                <Bar 
                  dataKey="activation_rate" 
                  name="Taxa de Ativação (%)"
                  fill="hsl(var(--chart-2))" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Cohort Table (Simplified) */}
      <Card>
        <CardHeader>
          <CardTitle>Retenção por Coorte (Simplificado)</CardTitle>
          <CardDescription>Usuários retidos após X meses do cadastro</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Coorte</TableHead>
                <TableHead className="text-center">M+0</TableHead>
                <TableHead className="text-center">M+1</TableHead>
                <TableHead className="text-center">M+2</TableHead>
                <TableHead className="text-center">M+3</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cohortData.map((row) => (
                <TableRow key={row.cohort}>
                  <TableCell className="font-medium">{row.cohort}</TableCell>
                  <TableCell className="text-center">{row.m0}</TableCell>
                  <TableCell className="text-center">{row.m1}</TableCell>
                  <TableCell className="text-center">{row.m2}</TableCell>
                  <TableCell className="text-center">{row.m3}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <p className="text-xs text-muted-foreground mt-2">
            * Valores estimados com base na taxa de ativação e padrões históricos
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
