import { useState } from "react";
import { 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown, 
  CreditCard, 
  Calendar,
  Lightbulb,
  AlertTriangle,
  ChevronRight,
  Sparkles,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MoneyLoader } from "@/components/ui/money-loader";
import { useProjection, MonthProjection } from "@/hooks/useProjection";
import { useDebouncedLoading } from "@/hooks/useLoading";
import { getCategoryById } from "@/data/categories";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface ProjectionPageProps {
  onBack: () => void;
}

function MonthCard({ 
  projection, 
  isSelected,
  onClick 
}: { 
  projection: MonthProjection; 
  isSelected: boolean;
  onClick: () => void;
}) {
  const isNegative = projection.balanceProjected < 0;
  const hasWarning = projection.balanceProjected < 0 || projection.creditCardInstallments > projection.incomeProjected * 0.3;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full p-4 rounded-xl border transition-all text-left",
        isSelected 
          ? "border-primary bg-primary/5 ring-2 ring-primary/20" 
          : "border-border hover:border-primary/50",
        hasWarning && !isSelected && "border-warning/50 bg-warning/5"
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold text-sm">{projection.monthLabel}</span>
        {hasWarning && <AlertTriangle className="w-4 h-4 text-warning" />}
      </div>
      
      <div className={cn(
        "text-xl font-bold",
        isNegative ? "text-destructive" : "text-success"
      )}>
        {formatCurrency(projection.balanceProjected)}
      </div>
      
      <div className="text-xs text-muted-foreground mt-1">
        Saldo projetado
      </div>
    </button>
  );
}

function ProjectionDetail({ projection }: { projection: MonthProjection }) {
  const incomeRatio = projection.incomeProjected > 0 
    ? (projection.expenseProjected / projection.incomeProjected) * 100 
    : 100;

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="bg-success/10 border-success/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-success" />
              <span className="text-xs text-muted-foreground">Receitas</span>
            </div>
            <p className="text-lg font-bold text-success">
              {formatCurrency(projection.incomeProjected)}
            </p>
            {projection.recurringIncome > 0 && (
              <p className="text-xs text-muted-foreground">
                {formatCurrency(projection.recurringIncome)} fixo
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-destructive/10 border-destructive/30">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="w-4 h-4 text-destructive" />
              <span className="text-xs text-muted-foreground">Despesas</span>
            </div>
            <p className="text-lg font-bold text-destructive">
              {formatCurrency(projection.expenseProjected)}
            </p>
            {projection.recurringExpense > 0 && (
              <p className="text-xs text-muted-foreground">
                {formatCurrency(projection.recurringExpense)} fixo
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Credit Card Installments */}
      {projection.creditCardInstallments > 0 && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-medium">Parcelas do Cartão</p>
                  <p className="text-xs text-muted-foreground">
                    Compromisso fixo do mês
                  </p>
                </div>
              </div>
              <p className="text-lg font-bold">
                {formatCurrency(projection.creditCardInstallments)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Gastos vs Receita</span>
            <span className={cn(
              "font-medium",
              incomeRatio > 100 ? "text-destructive" : 
              incomeRatio > 80 ? "text-warning" : "text-success"
            )}>
              {incomeRatio.toFixed(0)}%
            </span>
          </div>
          <Progress 
            value={Math.min(incomeRatio, 100)} 
            className={cn(
              "h-2",
              incomeRatio > 100 && "[&>div]:bg-destructive",
              incomeRatio > 80 && incomeRatio <= 100 && "[&>div]:bg-warning"
            )}
          />
        </CardContent>
      </Card>

      {/* Drivers */}
      {projection.drivers.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Por que esse valor?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {projection.drivers.map((driver, idx) => {
              const category = driver.category ? getCategoryById(driver.category) : null;
              return (
                <div 
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{category?.icon || "📋"}</span>
                    <div>
                      <p className="text-sm font-medium">{driver.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {driver.type === "INSTALLMENT" ? "Parcela" : 
                         driver.type === "RECURRING" ? "Recorrente" : "Média"}
                      </p>
                    </div>
                  </div>
                  <span className="font-medium">
                    {formatCurrency(driver.amount)}
                  </span>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export function ProjectionPage({ onBack }: ProjectionPageProps) {
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(0);
  const { data, isLoading, error, refetch, isFetching } = useProjection(6, true);
  
  const showLoading = useDebouncedLoading(isLoading, { delay: 300 });

  if (showLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <MoneyLoader label="Calculando projeções..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Button variant="ghost" onClick={onBack} className="mb-4">
          <ArrowLeft className="w-5 h-5 mr-2" />
          Voltar
        </Button>
        <Card className="border-destructive/30">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto text-destructive mb-4" />
            <p className="text-destructive font-medium">Erro ao carregar projeções</p>
            <p className="text-sm text-muted-foreground mt-2">
              {error instanceof Error ? error.message : "Tente novamente mais tarde"}
            </p>
            <Button onClick={() => refetch()} className="mt-4">
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const projections = data?.projections || [];
  const aiTips = data?.aiTips;
  const selectedMonth = projections[selectedMonthIndex];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="container px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={onBack}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-lg font-semibold">Projeção Financeira</h1>
                <p className="text-xs text-muted-foreground">
                  Próximos {projections.length} meses
                </p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={cn("w-5 h-5", isFetching && "animate-spin")} />
            </Button>
          </div>
        </div>
      </header>

      <main className="container px-4 py-4 space-y-6">
        {/* Month Timeline */}
        <div className="overflow-x-auto pb-2 -mx-4 px-4">
          <div className="flex gap-3" style={{ minWidth: "max-content" }}>
            {projections.map((proj, idx) => (
              <div key={proj.month} className="w-32 flex-shrink-0">
                <MonthCard
                  projection={proj}
                  isSelected={idx === selectedMonthIndex}
                  onClick={() => setSelectedMonthIndex(idx)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Selected Month Detail */}
        {selectedMonth && (
          <Tabs defaultValue="detail" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="detail">Detalhes</TabsTrigger>
              <TabsTrigger value="tips" className="flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Dicas IA
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="detail" className="mt-4">
              <ProjectionDetail projection={selectedMonth} />
            </TabsContent>
            
            <TabsContent value="tips" className="mt-4 space-y-4">
              {aiTips ? (
                <>
                  {/* Alert if exists */}
                  {aiTips.alert && (
                    <Card className="border-warning/50 bg-warning/10">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium text-warning">Atenção</p>
                            <p className="text-sm mt-1">{aiTips.alert}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Tips */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Lightbulb className="w-4 h-4 text-primary" />
                        Dicas para sua família
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {aiTips.tips.map((tip, idx) => (
                        <div 
                          key={idx}
                          className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                        >
                          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-primary">{idx + 1}</span>
                          </div>
                          <p className="text-sm">{tip}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Recommendation */}
                  {aiTips.recommendation && (
                    <Card className="border-primary/30 bg-primary/5">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <Sparkles className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium text-primary">Recomendação</p>
                            <p className="text-sm mt-1">{aiTips.recommendation}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="p-6 text-center">
                    <Sparkles className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Dicas de IA não disponíveis no momento
                    </p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* Empty State */}
        {projections.length === 0 && !isLoading && (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center">
              <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">Sem dados para projeção</h3>
              <p className="text-sm text-muted-foreground">
                Adicione transações recorrentes ou parcelas para ver projeções futuras.
              </p>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
