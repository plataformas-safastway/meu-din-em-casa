import { useState } from "react";
import { ArrowLeft, TrendingUp, TrendingDown, AlertTriangle, Calendar, CreditCard, Repeat, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCashflowForecast, useMonthlyCashflow } from "@/hooks/useCashflow";
import { useInstallments } from "@/hooks/useInstallments";
import { getCategoryById } from "@/data/categories";
import { formatCurrency } from "@/lib/formatters";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine } from "recharts";
import { Loader2 } from "lucide-react";

interface CashflowPageProps {
  onBack: () => void;
}

export function CashflowPage({ onBack }: CashflowPageProps) {
  const [horizon, setHorizon] = useState<"30" | "60" | "90">("30");
  const { data: forecast, isLoading: loadingForecast } = useCashflowForecast(parseInt(horizon));
  const { data: monthlyData, isLoading: loadingMonthly } = useMonthlyCashflow(3);
  const { data: installments, isLoading: loadingInstallments } = useInstallments();

  // Find danger zones
  const dangerDays = forecast?.filter((d) => d.alertLevel === "danger") || [];
  const warningDays = forecast?.filter((d) => d.alertLevel === "warning") || [];
  const hasDanger = dangerDays.length > 0;
  const hasWarning = warningDays.length > 0;

  // Get upcoming events
  const upcomingEvents = forecast
    ?.flatMap((d) => d.events.map((e) => ({ ...e, date: d.date })))
    .slice(0, 10) || [];

  // Prepare chart data
  const chartData = forecast?.map((d) => ({
    date: new Date(d.date).getDate().toString(),
    saldo: d.cumulativeBalance,
    alertLevel: d.alertLevel,
  })) || [];

  const isLoading = loadingForecast || loadingMonthly || loadingInstallments;

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
            <h1 className="text-lg font-semibold">Fluxo de Caixa Projetado</h1>
          </div>
        </div>
      </header>

      <main className="container px-4 py-4 space-y-6">
        {/* Alert Banner */}
        {hasDanger && (
          <Card className="border-destructive/50 bg-destructive/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">Atenção: Projeção de saldo negativo</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Pelo fluxo projetado, pode faltar recursos em {dangerDays.length} dia(s) nos próximos {horizon} dias, 
                    considerando despesas habituais + parcelas do cartão.
                  </p>
                  <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                    <p>💡 Sugestões:</p>
                    <ul className="list-disc list-inside space-y-1 ml-2">
                      <li>Revisar metas das categorias mais altas</li>
                      <li>Adiar gastos eventuais</li>
                      <li>Renegociar parcelas ou ajustar recorrências</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {hasWarning && !hasDanger && (
          <Card className="border-warning/50 bg-warning/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-warning mt-0.5" />
                <div>
                  <p className="font-medium text-foreground">Saldo próximo do limite</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Em alguns dias o saldo projetado ficará baixo. Fiquem atentos às despesas.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Horizon Selector */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Horizonte:</span>
          <Select value={horizon} onValueChange={(v: "30" | "60" | "90") => setHorizon(v)}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30">30 dias</SelectItem>
              <SelectItem value="60">60 dias</SelectItem>
              <SelectItem value="90">90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Balance Projection Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Projeção do Saldo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10 }}
                    interval="preserveStartEnd"
                  />
                  <YAxis 
                    tick={{ fontSize: 10 }} 
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={(label) => `Dia ${label}`}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <ReferenceLine y={0} stroke="hsl(var(--destructive))" strokeDasharray="3 3" />
                  <Area
                    type="monotone"
                    dataKey="saldo"
                    name="Saldo"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorBalance)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Linha vermelha = saldo zero
            </p>
          </CardContent>
        </Card>

        {/* Monthly Summary */}
        {monthlyData && monthlyData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Resumo por Mês</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {monthlyData.map((m, i) => (
                  <div 
                    key={i} 
                    className={`p-3 rounded-lg border ${
                      m.alertLevel === "danger" ? "border-destructive/30 bg-destructive/5" :
                      m.alertLevel === "warning" ? "border-warning/30 bg-warning/5" :
                      "border-border/30"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{m.month}</span>
                      <span className={`font-bold ${m.balance >= 0 ? "text-success" : "text-destructive"}`}>
                        {formatCurrency(m.balance)}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                      <div>
                        <span className="block text-success">+{formatCurrency(m.income)}</span>
                        <span>Receitas</span>
                      </div>
                      <div>
                        <span className="block text-destructive">-{formatCurrency(m.expenses)}</span>
                        <span>Despesas</span>
                      </div>
                      <div>
                        <span className="block text-destructive">-{formatCurrency(m.installments)}</span>
                        <span>Parcelas</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active Installments */}
        {installments && installments.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Parcelas Ativas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {installments.slice(0, 5).map((inst) => {
                  const category = getCategoryById(inst.category_id);
                  return (
                    <div key={inst.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
                      <span className="text-xl">{category?.icon || "💳"}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{inst.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {inst.installments_total} parcelas • {formatCurrency(inst.installment_value)}/mês
                        </p>
                      </div>
                      <span className="text-sm font-medium">{formatCurrency(inst.installment_value)}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Upcoming Events */}
        {upcomingEvents.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Repeat className="w-4 h-4" />
                Próximos Eventos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {upcomingEvents.map((event, i) => {
                  const category = getCategoryById(event.category || "");
                  return (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <span className="w-16 text-muted-foreground">
                        {new Date(event.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
                      </span>
                      <span className="text-lg">{category?.icon || (event.type === "income" ? "💰" : "💳")}</span>
                      <span className="flex-1 truncate">{event.description}</span>
                      <span className={`font-medium ${event.type === "income" ? "text-success" : "text-destructive"}`}>
                        {event.type === "income" ? "+" : "-"}{formatCurrency(event.amount)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Help Tooltip */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">
              <strong>Como calculamos:</strong> Somamos todas as receitas e despesas recorrentes cadastradas, 
              mais as parcelas de cartão a vencer, para projetar o saldo futuro. Cadastre suas recorrências 
              para uma projeção mais precisa.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
