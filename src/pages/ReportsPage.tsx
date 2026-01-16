import { useState } from "react";
import { ArrowLeft, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, PieChart, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFinanceSummary } from "@/hooks/useTransactions";
import { useMonthlyReport, useCategoriesComparison } from "@/hooks/useReports";
import { getCategoryById } from "@/data/categories";
import { formatCurrency } from "@/lib/formatters";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart as RechartsPie, Pie, Cell, LineChart, Line, Legend } from "recharts";
import { Loader2 } from "lucide-react";

interface ReportsPageProps {
  onBack: () => void;
  onCategoryReport?: (categoryId: string) => void;
}

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(199 89% 48%)",
  "hsl(340 75% 55%)",
  "hsl(280 65% 60%)",
];

export function ReportsPage({ onBack, onCategoryReport }: ReportsPageProps) {
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [period, setPeriod] = useState<"3" | "6" | "12">("6");

  const { data: summary, isLoading: loadingSummary } = useFinanceSummary(selectedMonth, selectedYear);
  const { data: monthlyData, isLoading: loadingMonthly } = useMonthlyReport(parseInt(period));
  const { data: categoryData, isLoading: loadingCategories } = useCategoriesComparison(selectedMonth, selectedYear);

  const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  // Calculate variation vs previous month
  const currentMonthIndex = monthlyData?.findIndex(
    (m) => m.month === monthNames[selectedMonth].slice(0, 3)
  ) ?? -1;
  const prevMonthData = currentMonthIndex > 0 ? monthlyData?.[currentMonthIndex - 1] : null;
  const variation = prevMonthData && prevMonthData.expenses > 0
    ? ((summary?.expenses || 0) - prevMonthData.expenses) / prevMonthData.expenses * 100
    : 0;

  // Prepare pie chart data
  const pieData = categoryData?.slice(0, 8).map((c, i) => {
    const category = getCategoryById(c.categoryId);
    return {
      name: category?.name || c.categoryId,
      value: c.amount,
      color: category?.color || COLORS[i % COLORS.length],
      icon: category?.icon || "📦",
    };
  }) || [];

  const isLoading = loadingSummary || loadingMonthly || loadingCategories;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="container px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-semibold">Relatório Mensal</h1>
          </div>
        </div>
      </header>

      <main className="container px-4 py-4 space-y-6">
        {/* Month Navigation */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="text-center">
            <h2 className="text-xl font-bold">{monthNames[selectedMonth]}</h2>
            <p className="text-sm text-muted-foreground">{selectedYear}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={handleNextMonth}>
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="border-success/30 bg-success/5">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-1">Receitas</p>
              <p className="text-lg font-bold text-success">{formatCurrency(summary?.income || 0)}</p>
            </CardContent>
          </Card>
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-1">Despesas</p>
              <p className="text-lg font-bold text-destructive">{formatCurrency(summary?.expenses || 0)}</p>
            </CardContent>
          </Card>
          <Card className={`${(summary?.balance || 0) >= 0 ? "border-primary/30 bg-primary/5" : "border-destructive/30 bg-destructive/5"}`}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-1">Resultado</p>
              <p className={`text-lg font-bold ${(summary?.balance || 0) >= 0 ? "text-primary" : "text-destructive"}`}>
                {formatCurrency(summary?.balance || 0)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-1">vs Mês Anterior</p>
              <div className="flex items-center gap-1">
                {variation > 0 ? (
                  <TrendingUp className="w-4 h-4 text-destructive" />
                ) : variation < 0 ? (
                  <TrendingDown className="w-4 h-4 text-success" />
                ) : null}
                <p className={`text-lg font-bold ${variation > 0 ? "text-destructive" : variation < 0 ? "text-success" : "text-muted-foreground"}`}>
                  {variation === 0 ? "-" : `${variation > 0 ? "+" : ""}${variation.toFixed(1)}%`}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Período:</span>
          <Select value={period} onValueChange={(v: "3" | "6" | "12") => setPeriod(v)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 meses</SelectItem>
              <SelectItem value="6">6 meses</SelectItem>
              <SelectItem value="12">12 meses</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Monthly Evolution Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Receita x Despesa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    labelStyle={{ color: "hsl(var(--foreground))" }}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="income" name="Receitas" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" name="Despesas" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Balance Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Tendência do Resultado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="balance"
                    name="Resultado"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Pie Chart by Category */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <PieChart className="w-4 h-4" />
              Despesas por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        contentStyle={{
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px",
                        }}
                      />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {pieData.map((item, i) => (
                    <button
                      key={i}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
                      onClick={() => {
                        const cat = categoryData?.find(c => getCategoryById(c.categoryId)?.name === item.name);
                        if (cat && onCategoryReport) {
                          onCategoryReport(cat.categoryId);
                        }
                      }}
                    >
                      <span className="text-lg">{item.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(item.value)}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma despesa registrada neste mês.
              </p>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
