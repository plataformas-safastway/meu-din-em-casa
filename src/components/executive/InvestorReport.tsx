import { useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Download, 
  FileSpreadsheet, 
  FileText,
  TrendingUp,
  Users,
  DollarSign,
  Target,
  ArrowUpRight
} from 'lucide-react';
import { 
  useExecutiveMetrics,
  useGrowthMetrics,
  useRevenueMetrics 
} from '@/hooks/useExecutiveReports';
import { useReportExport } from '@/hooks/useReportExport';
import { ChartContainer, ChartTooltipContent } from '@/components/ui/chart';

interface Props {
  periodStart: Date;
  periodEnd: Date;
}

export function InvestorReport({ periodStart, periodEnd }: Props) {
  const { data: metrics, isLoading: metricsLoading } = useExecutiveMetrics(periodStart, periodEnd);
  const { data: growthData, isLoading: growthLoading } = useGrowthMetrics(12);
  const { data: revenueData, isLoading: revenueLoading } = useRevenueMetrics(12);
  const { exportToXLSX, exportToPDF } = useReportExport();

  const chartConfig = {
    users: { label: 'Usuários', color: 'hsl(var(--primary))' },
    mrr: { label: 'MRR', color: 'hsl(var(--chart-1))' },
  };

  const isLoading = metricsLoading || growthLoading || revenueLoading;

  const formattedGrowthData = useMemo(() => {
    return growthData?.map(item => ({
      ...item,
      monthLabel: format(new Date(item.month), 'MMM/yy', { locale: ptBR }),
      cumulativeUsers: 0, // Will calculate below
    })) ?? [];
  }, [growthData]);

  // Calculate cumulative users
  const cumulativeData = useMemo(() => {
    let total = 0;
    return formattedGrowthData.map(item => {
      total += item.new_users;
      return { ...item, cumulativeUsers: total };
    });
  }, [formattedGrowthData]);

  const formattedRevenueData = useMemo(() => {
    return revenueData?.map(item => ({
      ...item,
      monthLabel: format(new Date(item.month), 'MMM/yy', { locale: ptBR }),
    })) ?? [];
  }, [revenueData]);

  const handleExport = (format: 'xlsx' | 'pdf') => {
    const exportData = {
      resumo: {
        periodo: `${format === 'xlsx' ? periodStart.toISOString() : ''} a ${format === 'xlsx' ? periodEnd.toISOString() : ''}`,
        mrr_atual: metrics?.revenue?.mrr ?? 0,
        crescimento_mrr: metrics?.revenue?.mrr_growth ?? 0,
        usuarios_totais: metrics?.users?.total ?? 0,
        usuarios_ativos: metrics?.users?.active ?? 0,
        taxa_ativacao_media: growthData?.length 
          ? (growthData.reduce((a, d) => a + d.activation_rate, 0) / growthData.length).toFixed(1)
          : 0,
        churn_rate: metrics?.engagement?.churn_rate ?? 0,
      },
    };

    const options = {
      reportType: 'investor',
      title: 'OIK_Relatorio_Investidor',
      data: exportData,
      periodStart,
      periodEnd,
    };

    if (format === 'xlsx') exportToXLSX(options);
    else exportToPDF(options);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[600px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Relatório para Investidores
          </h2>
          <p className="text-sm text-muted-foreground">
            Visão executiva do negócio - Período: {format(periodStart, 'MMM/yyyy', { locale: ptBR })} a {format(periodEnd, 'MMM/yyyy', { locale: ptBR })}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport('xlsx')}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Excel
          </Button>
          <Button size="sm" onClick={() => handleExport('pdf')}>
            <Download className="h-4 w-4 mr-2" />
            PDF / Imprimir
          </Button>
        </div>
      </div>

      {/* Executive Summary Card - Printable */}
      <Card className="print:shadow-none print:border-0">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">OIK Finanças</CardTitle>
              <CardDescription>Plataforma de gestão financeira pessoal e familiar</CardDescription>
            </div>
            <Badge variant="outline" className="text-lg px-4 py-2">
              {format(new Date(), 'MMMM yyyy', { locale: ptBR })}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-primary/5 rounded-lg">
              <DollarSign className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-3xl font-bold text-primary">
                {formatCurrency(metrics?.revenue?.mrr ?? 0)}
              </p>
              <p className="text-sm text-muted-foreground">MRR</p>
              <div className="flex items-center justify-center gap-1 text-emerald-600 text-sm mt-1">
                <ArrowUpRight className="h-3 w-3" />
                {(metrics?.revenue?.mrr_growth ?? 0).toFixed(1)}%
              </div>
            </div>

            <div className="text-center p-4 bg-primary/5 rounded-lg">
              <Users className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-3xl font-bold">
                {metrics?.users?.total ?? 0}
              </p>
              <p className="text-sm text-muted-foreground">Usuários</p>
              <div className="flex items-center justify-center gap-1 text-emerald-600 text-sm mt-1">
                <ArrowUpRight className="h-3 w-3" />
                {(metrics?.users?.growth_rate ?? 0).toFixed(1)}%
              </div>
            </div>

            <div className="text-center p-4 bg-primary/5 rounded-lg">
              <Target className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-3xl font-bold">
                {growthData?.length 
                  ? (growthData.reduce((a, d) => a + d.activation_rate, 0) / growthData.length).toFixed(0)
                  : 0}%
              </p>
              <p className="text-sm text-muted-foreground">Taxa Ativação</p>
            </div>

            <div className="text-center p-4 bg-primary/5 rounded-lg">
              <TrendingUp className="h-6 w-6 mx-auto mb-2 text-primary" />
              <p className="text-3xl font-bold">
                {(metrics?.engagement?.churn_rate ?? 0).toFixed(1)}%
              </p>
              <p className="text-sm text-muted-foreground">Churn Rate</p>
            </div>
          </div>

          <Separator />

          {/* Growth Chart */}
          <div>
            <h3 className="font-semibold mb-4">Evolução da Base de Usuários</h3>
            <ChartContainer config={chartConfig} className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cumulativeData}>
                  <defs>
                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
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
                    dataKey="cumulativeUsers" 
                    name="Usuários Acumulados"
                    stroke="hsl(var(--primary))" 
                    fillOpacity={1}
                    fill="url(#colorUsers)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>

          {/* Revenue Chart */}
          <div>
            <h3 className="font-semibold mb-4">Evolução do MRR</h3>
            <ChartContainer config={chartConfig} className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={formattedRevenueData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="monthLabel" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip content={<ChartTooltipContent />} />
                  <Line 
                    type="monotone"
                    dataKey="mrr" 
                    name="MRR"
                    stroke="hsl(var(--chart-1))" 
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--chart-1))', r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </div>

          <Separator />

          {/* Narrative */}
          <div className="space-y-3">
            <h3 className="font-semibold">Destaques do Período</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5">•</span>
                <span>
                  Crescimento de <strong>{(metrics?.users?.growth_rate ?? 0).toFixed(1)}%</strong> na base de usuários,
                  atingindo <strong>{metrics?.users?.total ?? 0}</strong> cadastros.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5">•</span>
                <span>
                  MRR atingiu <strong>{formatCurrency(metrics?.revenue?.mrr ?? 0)}</strong>,
                  com crescimento de <strong>{(metrics?.revenue?.mrr_growth ?? 0).toFixed(1)}%</strong>.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5">•</span>
                <span>
                  Taxa de ativação média de <strong>
                    {growthData?.length 
                      ? (growthData.reduce((a, d) => a + d.activation_rate, 0) / growthData.length).toFixed(0)
                      : 0}%
                  </strong>, demonstrando boa conversão de cadastros em usuários ativos.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-500 mt-0.5">•</span>
                <span>
                  Churn rate mantido em <strong>{(metrics?.engagement?.churn_rate ?? 0).toFixed(1)}%</strong>,
                  {(metrics?.engagement?.churn_rate ?? 0) < 5 
                    ? ' abaixo da média de mercado para SaaS.'
                    : ' com oportunidades de melhoria na retenção.'
                  }
                </span>
              </li>
            </ul>
          </div>

          <div className="text-xs text-muted-foreground pt-4 border-t">
            <p>
              ⚠️ Relatório gerado automaticamente em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}.
              Dados agregados conforme LGPD. Informações sensíveis foram omitidas.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
