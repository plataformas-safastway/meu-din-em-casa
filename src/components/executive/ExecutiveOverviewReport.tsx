import { useMemo } from 'react';
import { format } from 'date-fns';
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
  Legend
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { useGrowthMetrics, useRevenueMetrics } from '@/hooks/useExecutiveReports';
import { useReportExport } from '@/hooks/useReportExport';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';

interface Props {
  periodStart: Date;
  periodEnd: Date;
  periodMonths: number;
}

export function ExecutiveOverviewReport({ periodStart, periodEnd, periodMonths }: Props) {
  const { data: growthData, isLoading: growthLoading } = useGrowthMetrics(periodMonths * 2);
  const { data: revenueData, isLoading: revenueLoading } = useRevenueMetrics(periodMonths * 2);
  const { exportToCSV, exportToXLSX, exportToPDF } = useReportExport();

  const chartConfig = {
    new_users: { label: 'Novos Usuários', color: 'hsl(var(--primary))' },
    activated_users: { label: 'Usuários Ativados', color: 'hsl(var(--chart-2))' },
    mrr: { label: 'MRR', color: 'hsl(var(--chart-1))' },
    gross_revenue: { label: 'Receita Bruta', color: 'hsl(var(--chart-3))' },
  };

  const formattedGrowthData = useMemo(() => {
    return growthData?.map(item => ({
      ...item,
      monthLabel: format(new Date(item.month), 'MMM/yy', { locale: ptBR }),
    })) ?? [];
  }, [growthData]);

  const formattedRevenueData = useMemo(() => {
    return revenueData?.map(item => ({
      ...item,
      monthLabel: format(new Date(item.month), 'MMM/yy', { locale: ptBR }),
    })) ?? [];
  }, [revenueData]);

  const handleExport = (format: 'csv' | 'xlsx' | 'pdf') => {
    const combinedData = formattedGrowthData.map((g, i) => ({
      mes: g.monthLabel,
      novos_usuarios: g.new_users,
      usuarios_ativados: g.activated_users,
      taxa_ativacao: `${g.activation_rate}%`,
      mrr: formattedRevenueData[i]?.mrr ?? 0,
      receita_bruta: formattedRevenueData[i]?.gross_revenue ?? 0,
      inadimplencia: formattedRevenueData[i]?.overdue ?? 0,
    }));

    const options = {
      reportType: 'overview',
      title: 'Relatorio_Executivo_OIK',
      data: combinedData,
      periodStart,
      periodEnd,
    };

    if (format === 'csv') exportToCSV(options);
    else if (format === 'xlsx') exportToXLSX(options);
    else exportToPDF(options);
  };

  const isLoading = growthLoading || revenueLoading;

  return (
    <div className="space-y-6">
      {/* Export Actions */}
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
          <Download className="h-4 w-4 mr-2" />
          CSV
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleExport('xlsx')}>
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Excel
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleExport('pdf')}>
          <FileText className="h-4 w-4 mr-2" />
          PDF
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Growth Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Evolução de Usuários</CardTitle>
            <CardDescription>Novos usuários vs ativados por mês</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px]" />
            ) : (
              <ChartContainer config={chartConfig} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={formattedGrowthData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="monthLabel" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Bar 
                      dataKey="new_users" 
                      name="Novos Usuários"
                      fill="hsl(var(--primary))" 
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar 
                      dataKey="activated_users" 
                      name="Ativados"
                      fill="hsl(var(--chart-2))" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Evolução da Receita</CardTitle>
            <CardDescription>MRR e receita bruta por mês</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[300px]" />
            ) : (
              <ChartContainer config={chartConfig} className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={formattedRevenueData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="monthLabel" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip content={<ChartTooltipContent />} />
                    <Legend />
                    <Line 
                      type="monotone"
                      dataKey="mrr" 
                      name="MRR"
                      stroke="hsl(var(--chart-1))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--chart-1))' }}
                    />
                    <Line 
                      type="monotone"
                      dataKey="gross_revenue" 
                      name="Receita Bruta"
                      stroke="hsl(var(--chart-3))" 
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--chart-3))' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Key Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Insights Rápidos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Taxa de Ativação Média</p>
              <p className="text-2xl font-bold">
                {formattedGrowthData.length > 0
                  ? (formattedGrowthData.reduce((acc, d) => acc + d.activation_rate, 0) / formattedGrowthData.length).toFixed(1)
                  : 0
                }%
              </p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Crescimento Total Usuários</p>
              <p className="text-2xl font-bold">
                {formattedGrowthData.reduce((acc, d) => acc + d.new_users, 0)}
              </p>
            </div>
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">MRR Atual</p>
              <p className="text-2xl font-bold">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                  formattedRevenueData[formattedRevenueData.length - 1]?.mrr ?? 0
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
