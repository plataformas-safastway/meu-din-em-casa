import { useState } from "react";
import { ArrowLeft, Building2, CreditCard, Lightbulb, RefreshCw, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAccountsCardsInsights } from "@/hooks/useHomeSummary";
import { useDebouncedLoading } from "@/hooks/useLoading";
import { ScreenLoader } from "@/components/ui/money-loader";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface LearnMorePageProps {
  onBack: () => void;
  initialTab?: "accounts" | "cards";
}

export function LearnMorePage({ onBack, initialTab = "accounts" }: LearnMorePageProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const { data, isLoading, refetch, isFetching } = useAccountsCardsInsights();
  const showLoading = useDebouncedLoading(isLoading, { delay: 200, minDuration: 400 });

  if (showLoading) {
    return <ScreenLoader label="Carregando detalhes..." />;
  }

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
              <h1 className="text-lg font-semibold">Contas e Cartões</h1>
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

      <main className="container px-4 py-4 space-y-4">
        {/* General AI Tip */}
        {data?.generalTip && (
          <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <Lightbulb className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-primary mb-1">Dica de IA</p>
                  <p className="text-sm text-muted-foreground">{data.generalTip}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "accounts" | "cards")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="accounts" className="gap-2">
              <Building2 className="w-4 h-4" />
              Contas ({data?.accounts?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="cards" className="gap-2">
              <CreditCard className="w-4 h-4" />
              Cartões ({data?.cards?.length || 0})
            </TabsTrigger>
          </TabsList>

          {/* Accounts Tab */}
          <TabsContent value="accounts" className="space-y-4 mt-4">
            {data?.accounts?.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <Building2 className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">Nenhuma conta cadastrada</p>
                  <p className="text-sm text-muted-foreground">Adicione suas contas em Configurações → Bancos e Cartões</p>
                </CardContent>
              </Card>
            ) : (
              data?.accounts?.map((account) => (
                <Card key={account.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                          <CardTitle className="text-base">{account.bankName}</CardTitle>
                          <p className="text-sm text-muted-foreground">{account.nickname} • {account.type === "checking" ? "Corrente" : account.type === "savings" ? "Poupança" : account.type}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={cn(
                          "text-lg font-bold",
                          account.balance < 0 && "text-destructive"
                        )}>
                          {formatCurrency(account.balance)}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-2 text-center bg-muted/50 rounded-lg p-3">
                      <div>
                        <p className="text-xs text-muted-foreground">Entradas</p>
                        <p className="text-sm font-semibold text-success">{formatCurrency(account.incomeTotal)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Saídas</p>
                        <p className="text-sm font-semibold text-destructive">{formatCurrency(account.expenseTotal)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Transações</p>
                        <p className="text-sm font-semibold">{account.transactionCount}</p>
                      </div>
                    </div>

                    {/* AI Insight */}
                    <div className="flex items-start gap-2 p-3 bg-primary/5 rounded-lg border border-primary/10">
                      <Lightbulb className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-muted-foreground">{account.insight}</p>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          {/* Cards Tab */}
          <TabsContent value="cards" className="space-y-4 mt-4">
            {data?.cards?.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <CreditCard className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">Nenhum cartão cadastrado</p>
                  <p className="text-sm text-muted-foreground">Adicione seus cartões em Configurações → Bancos e Cartões</p>
                </CardContent>
              </Card>
            ) : (
              data?.cards?.map((card) => (
                <Card key={card.id} className="overflow-hidden">
                  <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <CreditCard className="w-6 h-6" />
                        <div>
                          <p className="font-semibold">{card.name}</p>
                          <p className="text-xs text-white/70">{card.brand?.toUpperCase()}</p>
                        </div>
                      </div>
                      {card.limit && (
                        <p className="text-sm">Limite: {formatCurrency(card.limit)}</p>
                      )}
                    </div>

                    {card.limit && (
                      <div className="space-y-1">
                        <Progress 
                          value={card.usagePercent || 0} 
                          className={cn(
                            "h-2 bg-white/20",
                            (card.usagePercent || 0) > 80 && "[&>div]:bg-red-400",
                            (card.usagePercent || 0) > 50 && (card.usagePercent || 0) <= 80 && "[&>div]:bg-yellow-400",
                            (card.usagePercent || 0) <= 50 && "[&>div]:bg-green-400"
                          )} 
                        />
                        <div className="flex justify-between text-xs text-white/70">
                          <span>{(card.usagePercent || 0).toFixed(0)}% utilizado (média)</span>
                          <span>{formatCurrency(card.avgMonthlySpend)}/mês</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <CardContent className="p-4 space-y-3">
                    {/* Card Details */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Fechamento</p>
                        <p className="font-medium">Dia {card.closingDay}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Vencimento</p>
                        <p className="font-medium">Dia {card.dueDay}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Gasto (3 meses)</p>
                        <p className="font-medium">{formatCurrency(card.totalSpent3Months)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Média mensal</p>
                        <p className="font-medium">{formatCurrency(card.avgMonthlySpend)}</p>
                      </div>
                    </div>

                    {/* AI Insights */}
                    <div className="space-y-2">
                      <div className="flex items-start gap-2 p-3 bg-primary/5 rounded-lg border border-primary/10">
                        <Lightbulb className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-muted-foreground">{card.insight}</p>
                      </div>
                      <div className="flex items-start gap-2 p-3 bg-amber-500/5 rounded-lg border border-amber-500/10">
                        <TrendingUp className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-muted-foreground">{card.bestUse}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
