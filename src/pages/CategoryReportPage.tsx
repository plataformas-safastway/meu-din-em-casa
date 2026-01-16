import { useState } from "react";
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCategoryReport } from "@/hooks/useReports";
import { getCategoryById, getExpenseCategories } from "@/data/categories";
import { formatCurrency } from "@/lib/formatters";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, BarChart, Bar } from "recharts";
import { Loader2 } from "lucide-react";

interface CategoryReportPageProps {
  categoryId: string;
  onBack: () => void;
}

export function CategoryReportPage({ categoryId, onBack }: CategoryReportPageProps) {
  const [period, setPeriod] = useState<"6" | "12">("6");
  const { data: report, isLoading } = useCategoryReport(categoryId, parseInt(period));
  const category = getCategoryById(categoryId);
  const expenseCategories = getExpenseCategories();

  const [selectedCategory, setSelectedCategory] = useState(categoryId);

  const getTrendIcon = () => {
    if (!report) return null;
    switch (report.trend) {
      case "up":
        return <TrendingUp className="w-5 h-5 text-destructive" />;
      case "down":
        return <TrendingDown className="w-5 h-5 text-success" />;
      default:
        return <Minus className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getTrendText = () => {
    if (!report) return "";
    switch (report.trend) {
      case "up":
        return "Os gastos nesta categoria estão aumentando. Que tal revisar juntos onde dá para economizar?";
      case "down":
        return "Ótimo trabalho! Vocês estão conseguindo reduzir os gastos nesta categoria. Continuem assim!";
      default:
        return "Os gastos nesta categoria estão estáveis. Vocês estão mantendo o controle!";
    }
  };

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
            <h1 className="text-lg font-semibold">Análise de Categoria</h1>
          </div>
        </div>
      </header>

      <main className="container px-4 py-4 space-y-6">
        {/* Category Selector */}
        <div className="flex items-center gap-3">
          <span className="text-3xl">{category?.icon}</span>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {expenseCategories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  <span className="flex items-center gap-2">
                    <span>{cat.icon}</span>
                    <span>{cat.name}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Período:</span>
          <Select value={period} onValueChange={(v: "6" | "12") => setPeriod(v)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="6">6 meses</SelectItem>
              <SelectItem value="12">12 meses</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-1">Total no Período</p>
              <p className="text-lg font-bold">{formatCurrency(report?.total || 0)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-1">Média Mensal</p>
              <p className="text-lg font-bold">{formatCurrency(report?.average || 0)}</p>
            </CardContent>
          </Card>
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-1">Maior Mês</p>
              <p className="text-lg font-bold text-destructive">{formatCurrency(report?.max.amount || 0)}</p>
              <p className="text-xs text-muted-foreground">{report?.max.month}</p>
            </CardContent>
          </Card>
          <Card className="border-success/30 bg-success/5">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-1">Menor Mês</p>
              <p className="text-lg font-bold text-success">{formatCurrency(report?.min.amount || 0)}</p>
              <p className="text-xs text-muted-foreground">{report?.min.month}</p>
            </CardContent>
          </Card>
        </div>

        {/* Evolution Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Evolução ao Longo do Tempo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={report?.monthlyData || []}>
                  <defs>
                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={category?.color || "hsl(var(--primary))"} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={category?.color || "hsl(var(--primary))"} stopOpacity={0} />
                    </linearGradient>
                  </defs>
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
                  <Area
                    type="monotone"
                    dataKey="amount"
                    name="Gasto"
                    stroke={category?.color || "hsl(var(--primary))"}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorAmount)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Bar Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Comparativo Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={report?.monthlyData || []}>
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
                  <Bar
                    dataKey="amount"
                    name="Gasto"
                    fill={category?.color || "hsl(var(--primary))"}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Trend Analysis */}
        <Card className="border-primary/30">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              {getTrendIcon()}
              <div>
                <p className="font-medium mb-1">Análise de Tendência</p>
                <p className="text-sm text-muted-foreground">{getTrendText()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
