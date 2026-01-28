import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, AlertTriangle, TrendingUp, Clock, Check, Loader2, CreditCard, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { useCategorizationQuality, useTransactionBasedSuggestion } from "@/hooks/useBudgetVersions";
import { BudgetVersionWizard } from "./BudgetVersionWizard";
import { BudgetVersionPreview } from "./BudgetVersionPreview";
import type { OnboardingData } from "@/data/budgetModes";
import { format, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

interface TransactionsBasedWizardProps {
  onComplete: (items: Array<{
    category_id: string;
    subcategory_id?: string | null;
    suggested_amount: number;
    confidence?: number | null;
    rationale?: string | null;
  }>, effectiveMonth: string, inputSnapshot: Record<string, unknown>) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

type WizardStep = "period" | "quality-check" | "onboarding" | "preview";

export function TransactionsBasedWizard({ 
  onComplete, 
  onCancel,
  isLoading = false 
}: TransactionsBasedWizardProps) {
  const [step, setStep] = useState<WizardStep>("period");
  const [periodDays, setPeriodDays] = useState(90);
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const [effectiveMonth, setEffectiveMonth] = useState(format(addMonths(new Date(), 1), "yyyy-MM"));
  const [generatedItems, setGeneratedItems] = useState<Array<{
    category_id: string;
    subcategory_id?: string | null;
    suggested_amount: number;
    confidence?: number | null;
    rationale?: string | null;
  }>>([]);

  const { data: quality, isLoading: qualityLoading } = useCategorizationQuality(periodDays);
  const { data: suggestion, isLoading: suggestionLoading } = useTransactionBasedSuggestion(periodDays);

  const periodOptions = [
    { days: 30, label: "30 dias" },
    { days: 60, label: "60 dias" },
    { days: 90, label: "90 dias (recomendado)" },
    { days: 180, label: "180 dias" },
  ];

  const handlePeriodSelect = (days: number) => {
    setPeriodDays(days);
  };

  const handleProceedFromPeriod = () => {
    setStep("quality-check");
  };

  const handleProceedFromQuality = () => {
    if (quality?.isEligible) {
      setStep("onboarding");
    }
  };

  const handleOnboardingComplete = (data: OnboardingData, month: string) => {
    setOnboardingData(data);
    setEffectiveMonth(month);
    
    // Combine transaction-based suggestions with onboarding adjustments
    if (suggestion?.suggestions) {
      const adjustedItems = suggestion.suggestions.map((s) => ({
        category_id: s.category_id,
        subcategory_id: null,
        suggested_amount: s.suggested_amount,
        confidence: s.confidence,
        rationale: s.rationale,
      }));
      setGeneratedItems(adjustedItems);
    }
    
    setStep("preview");
  };

  const handleConfirm = () => {
    const inputSnapshot = {
      source: "transactions_based",
      periodDays,
      onboardingData,
      transactionCount: suggestion?.transactionCount,
      categoriesGenerated: generatedItems.length,
      generatedAt: new Date().toISOString(),
    };
    
    onComplete(generatedItems, effectiveMonth, inputSnapshot);
  };

  return (
    <div className="min-h-full flex flex-col">
      {/* Cash-basis microcopy */}
      <Alert className="mx-6 mt-4 bg-muted/50 border-muted">
        <Info className="h-4 w-4" />
        <AlertDescription className="text-xs">
          <strong>Regime de caixa:</strong> contamos no mês em que o dinheiro sai/entra. 
          Compras no cartão entram no mês do pagamento da fatura.
        </AlertDescription>
      </Alert>

      <AnimatePresence mode="wait">
        {/* Step 1: Period Selection */}
        {step === "period" && (
          <motion.div
            key="period"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 p-6 space-y-6"
          >
            <header className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={onCancel}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold">Orçamento Baseado em Gastos</h1>
                <p className="text-sm text-muted-foreground">
                  Vamos usar seus dados reais como base
                </p>
              </div>
            </header>

            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <Clock className="w-8 h-8 text-primary" />
                  <div>
                    <p className="font-medium">Período de análise</p>
                    <p className="text-sm text-muted-foreground">
                      Quanto maior o período, mais precisa a sugestão
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {periodOptions.map((option) => (
                    <button
                      key={option.days}
                      onClick={() => handlePeriodSelect(option.days)}
                      className={cn(
                        "w-full p-3 rounded-lg border text-left transition-all",
                        periodDays === option.days
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{option.label}</span>
                        {periodDays === option.days && (
                          <Check className="w-4 h-4 text-primary" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Button onClick={handleProceedFromPeriod} className="w-full gap-2">
              Continuar
              <ArrowRight className="w-4 h-4" />
            </Button>
          </motion.div>
        )}

        {/* Step 2: Quality Check */}
        {step === "quality-check" && (
          <motion.div
            key="quality"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 p-6 space-y-6"
          >
            <header className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => setStep("period")}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold">Verificando dados</h1>
                <p className="text-sm text-muted-foreground">
                  Analisando suas transações categorizadas
                </p>
              </div>
            </header>

            {qualityLoading || suggestionLoading ? (
              <Card>
                <CardContent className="p-6 flex flex-col items-center gap-4">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-muted-foreground">Analisando transações...</p>
                </CardContent>
              </Card>
            ) : quality ? (
              <>
                <Card className={cn(
                  quality.isEligible ? "bg-success/5 border-success/20" : "bg-warning/5 border-warning/20"
                )}>
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-center gap-3">
                      {quality.isEligible ? (
                        <TrendingUp className="w-8 h-8 text-success" />
                      ) : (
                        <AlertTriangle className="w-8 h-8 text-warning" />
                      )}
                      <div>
                        <p className="font-medium">
                          {quality.isEligible ? "Dados suficientes!" : "Categorização insuficiente"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {quality.categorized} de {quality.total} transações categorizadas
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Categorização</span>
                        <span className={quality.isEligible ? "text-success" : "text-warning"}>
                          {quality.percentage.toFixed(1)}%
                        </span>
                      </div>
                      <Progress 
                        value={quality.percentage} 
                        className={cn(
                          "h-2",
                          quality.isEligible ? "[&>div]:bg-success" : "[&>div]:bg-warning"
                        )}
                      />
                      <p className="text-xs text-muted-foreground">
                        Mínimo recomendado: 80%
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {!quality.isEligible && (
                  <Card className="bg-muted/50">
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">
                        Para gerar um orçamento preciso, você precisa categorizar mais transações. 
                        Acesse o <strong>Extrato</strong> e categorize as despesas pendentes.
                      </p>
                      <Button 
                        variant="outline" 
                        className="w-full mt-4"
                        onClick={onCancel}
                      >
                        Ir para o Extrato
                      </Button>
                    </CardContent>
                  </Card>
                )}

                {quality.isEligible && suggestion && (
                  <>
                    {/* Warning about pending credit card purchases */}
                    {suggestion.hasPendingCreditPurchases && (
                      <Alert className="bg-warning/10 border-warning/30">
                        <CreditCard className="h-4 w-4 text-warning" />
                        <AlertDescription className="text-sm">
                          <strong>Atenção:</strong> Você tem {suggestion.pendingCreditCount} compra(s) no cartão 
                          sem pagamento de fatura registrado. Seu orçamento é em regime de caixa — 
                          precisamos dos pagamentos de fatura para refletir o desembolso real.
                        </AlertDescription>
                      </Alert>
                    )}
                    
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm text-muted-foreground">Total analisado</span>
                          <span className="font-semibold">
                            {formatCurrency(
                              suggestion.suggestions.reduce((sum, s) => sum + s.suggested_amount, 0)
                            )}/mês
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Mediana mensal dos últimos {periodDays} dias em {suggestion.suggestions.length} categorias (regime de caixa)
                        </p>
                      </CardContent>
                    </Card>
                  </>
                )}

                {quality.isEligible && (
                  <Button onClick={handleProceedFromQuality} className="w-full gap-2">
                    Continuar com diagnóstico
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                )}
              </>
            ) : null}
          </motion.div>
        )}

        {/* Step 3: Onboarding Questions */}
        {step === "onboarding" && (
          <BudgetVersionWizard
            onComplete={handleOnboardingComplete}
            onCancel={() => setStep("quality-check")}
            isLoading={isLoading}
          />
        )}

        {/* Step 4: Preview */}
        {step === "preview" && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 p-6"
          >
            <BudgetVersionPreview
              items={generatedItems}
              effectiveMonth={effectiveMonth}
              sourceType="transactions_based"
              onConfirm={handleConfirm}
              onBack={() => setStep("onboarding")}
              isLoading={isLoading}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
