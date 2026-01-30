import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Sparkles, AlertCircle, Check, Loader2, Info, HelpCircle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatters";
import { 
  getBandById, 
  getSubBandById,
  BASE_PERCENTAGES,
  PREFIX_CONFIG,
  type PrefixConfig,
  calculateFixedFinancialExpenses,
} from "@/data/budgetTemplates";
import { 
  type OnboardingData,
  applyModeAdjustments,
  redistributeInactivePercentages,
  NON_MONTHLY_PLANNING_LEVELS,
  getBudgetModeById,
} from "@/data/budgetModes";
import { getCategoryById } from "@/data/categories";
import { toast } from "sonner";

interface BudgetProposalScreenProps {
  data: OnboardingData;
  onBack: () => void;
  onConfirm: (budgets: BudgetItem[]) => void;
  onGenerateAI?: () => void;
  isGeneratingAI?: boolean;
}

export interface BudgetItem {
  prefixCode: string;
  prefixName: string;
  categoryId: string;
  percentage: number;
  amount: number;
  isEdited: boolean;
}

export function BudgetProposalScreen({ 
  data, 
  onBack, 
  onConfirm, 
  onGenerateAI,
  isGeneratingAI 
}: BudgetProposalScreenProps) {
  const [budgets, setBudgets] = useState<BudgetItem[]>([]);
  const [editingPrefix, setEditingPrefix] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ifBlockedMessage, setIfBlockedMessage] = useState<string | null>(null);

  // Calculate base budget from onboarding data
  useEffect(() => {
    const band = getBandById(data.incomeBandId);
    if (!band) return;

    // Get base percentages for this income band
    const basePercents = BASE_PERCENTAGES[data.incomeBandId] 
      ? { ...BASE_PERCENTAGES[data.incomeBandId] }
      : { ...BASE_PERCENTAGES['band_8k_15k'] };

    // Apply budget mode adjustments
    let adjustedPercents = applyModeAdjustments(basePercents, data.budgetMode);

    // Track inactive categories
    const inactiveCategories: string[] = [];
    if (!data.hasPets) inactiveCategories.push('PET');
    if (!data.hasDependents) inactiveCategories.push('F');

    // Redistribute inactive percentages
    if (inactiveCategories.length > 0) {
      adjustedPercents = redistributeInactivePercentages(
        adjustedPercents, 
        inactiveCategories, 
        data.budgetMode
      );
    }

    // Apply non-monthly planning adjustment (increase E - provisions if needed)
    const planningLevel = NON_MONTHLY_PLANNING_LEVELS.find(l => l.id === data.nonMonthlyPlanningLevel);
    if (planningLevel && planningLevel.adjustE > 0) {
      // Increase E (provisions) and decrease IF proportionally
      const eAdjust = planningLevel.adjustE;
      adjustedPercents['E'] = (adjustedPercents['E'] || 0) + eAdjust;
      adjustedPercents['IF'] = Math.max(0.01, (adjustedPercents['IF'] || 0) - eAdjust);
      
      // Re-normalize
      const total = Object.values(adjustedPercents).reduce((a, b) => a + b, 0);
      Object.keys(adjustedPercents).forEach(k => {
        adjustedPercents[k] = adjustedPercents[k] / total;
      });
    }

    // Get budgetable prefixes
    const budgetablePrefixes = PREFIX_CONFIG.filter(p => {
      if (!p.isBudgetable) return false;
      if (p.conditionalOn === 'has_pets' && !data.hasPets) return false;
      if (p.conditionalOn === 'has_dependents' && !data.hasDependents) return false;
      return true;
    });

    // ========== FIXED FINANCIAL EXPENSES LOGIC ==========
    // For questionnaire-based budgets, DF (Despesas Financeiras) uses a FIXED value
    // instead of a percentage of income. This represents real average banking costs.
    const fixedDFAmount = calculateFixedFinancialExpenses(data.incomeBandId);
    const fixedDFPercentage = (fixedDFAmount / data.incomeAnchorValue) * 100;
    
    // Calculate the difference from the percentage-based DF
    const originalDFPercentage = (adjustedPercents['DF'] || 0) * 100;
    const dfPercentageDifference = originalDFPercentage - fixedDFPercentage;
    
    // Reallocate the difference to IF (Independência Financeira)
    // This ensures the total remains at 100%
    if (dfPercentageDifference > 0) {
      adjustedPercents['DF'] = fixedDFPercentage / 100;
      adjustedPercents['IF'] = (adjustedPercents['IF'] || 0) + (dfPercentageDifference / 100);
    } else {
      // If fixed value is higher than percentage, just use fixed value
      // (rare case for very low income bands)
      adjustedPercents['DF'] = fixedDFPercentage / 100;
    }

    // Re-normalize after DF adjustment to ensure sum = 100%
    const totalAfterDF = Object.values(adjustedPercents).reduce((a, b) => a + b, 0);
    if (Math.abs(totalAfterDF - 1) > 0.001) {
      Object.keys(adjustedPercents).forEach(k => {
        adjustedPercents[k] = adjustedPercents[k] / totalAfterDF;
      });
    }

    // Create budget items
    const items: BudgetItem[] = budgetablePrefixes
      .filter(p => adjustedPercents[p.code] !== undefined && adjustedPercents[p.code] > 0)
      .map(prefix => ({
        prefixCode: prefix.code,
        prefixName: prefix.name,
        categoryId: prefix.categoryId,
        percentage: adjustedPercents[prefix.code] * 100,
        amount: Math.round(data.incomeAnchorValue * adjustedPercents[prefix.code]),
        isEdited: false,
      }));

    setBudgets(items);
  }, [data]);

  // Calculate totals
  const totalPercentage = useMemo(() => 
    budgets.reduce((sum, b) => sum + b.percentage, 0), 
    [budgets]
  );
  
  const totalAmount = useMemo(() => 
    budgets.reduce((sum, b) => sum + b.amount, 0), 
    [budgets]
  );

  // Get IF (reserve/investments) item for balancing
  const ifItem = budgets.find(b => b.prefixCode === 'IF');
  const ifIndex = budgets.findIndex(b => b.prefixCode === 'IF');

  // Handle percentage adjustment with IF zero-sum logic
  const handlePercentageChange = useCallback((prefixCode: string, newPercentage: number) => {
    if (prefixCode === 'IF') return; // IF is the buffer, can't be directly edited

    const currentItem = budgets.find(b => b.prefixCode === prefixCode);
    if (!currentItem || !ifItem) return;

    const delta = newPercentage - currentItem.percentage;
    const newIfPercentage = ifItem.percentage - delta;

    // Block if trying to increase and IF would go negative
    if (newIfPercentage < 0) {
      setIfBlockedMessage(
        "Para aumentar despesas, reduza outras categorias ou aumente sua renda."
      );
      setTimeout(() => setIfBlockedMessage(null), 4000);
      return;
    }

    // Clear any block message
    setIfBlockedMessage(null);

    // Update both values
    setBudgets(prev => prev.map(b => {
      if (b.prefixCode === prefixCode) {
        return {
          ...b,
          percentage: newPercentage,
          amount: Math.round(data.incomeAnchorValue * (newPercentage / 100)),
          isEdited: true,
        };
      }
      if (b.prefixCode === 'IF') {
        return {
          ...b,
          percentage: newIfPercentage,
          amount: Math.round(data.incomeAnchorValue * (newIfPercentage / 100)),
        };
      }
      return b;
    }));
  }, [budgets, ifItem, data.incomeAnchorValue]);

  // Calculate max slider value for each category (current + available IF)
  const getMaxPercentage = useCallback((prefixCode: string) => {
    const currentItem = budgets.find(b => b.prefixCode === prefixCode);
    if (!currentItem || !ifItem) return 50;
    return Math.min(50, currentItem.percentage + ifItem.percentage);
  }, [budgets, ifItem]);

  // Handle confirm
  const handleConfirm = async () => {
    // Validate sum = 100%
    if (Math.abs(totalPercentage - 100) > 0.5) {
      toast.error("A soma das categorias deve ser 100%");
      return;
    }

    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 500));
    onConfirm(budgets);
  };

  const mode = getBudgetModeById(data.budgetMode);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-4 flex items-center gap-3 border-b">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="font-semibold">Orçamento Sugerido</h1>
          <p className="text-xs text-muted-foreground">
            Modo: {mode?.label} {mode?.icon}
          </p>
        </div>
        {onGenerateAI && (
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onGenerateAI}
            disabled={isGeneratingAI}
            className="gap-2"
          >
            {isGeneratingAI ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Gerar por AI
          </Button>
        )}
      </header>

      {/* IF Blocked Alert */}
      <AnimatePresence>
        {ifBlockedMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="px-4 pt-3"
          >
            <Alert variant="destructive">
              <Lock className="w-4 h-4" />
              <AlertDescription className="text-sm">
                {ifBlockedMessage}
              </AlertDescription>
            </Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info card */}
      <div className="px-4 py-3">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-3 flex gap-2">
            <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              O <strong>(+/-) IF</strong> é seu saldo de equilíbrio. Aumentar uma categoria consome IF; 
              reduzir libera IF. <strong>Você nunca pode gastar mais do que ganha.</strong>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Summary Bar */}
      <div className="px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Renda base</p>
            <p className="text-lg font-bold">{formatCurrency(data.incomeAnchorValue)}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Alocado</p>
            <p className={cn(
              "text-lg font-bold",
              Math.abs(totalPercentage - 100) < 0.5 ? "text-success" : "text-destructive"
            )}>
              {totalPercentage.toFixed(1)}%
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">(+/-) IF</p>
            <p className={cn(
              "text-lg font-bold",
              (ifItem?.percentage || 0) > 5 ? "text-primary" : 
              (ifItem?.percentage || 0) > 0 ? "text-warning" : "text-destructive"
            )}>
              {formatCurrency(ifItem?.amount || 0)}
            </p>
          </div>
        </div>
        
        {/* IF Progress indicator */}
        <div className="mt-2">
          <Progress 
            value={(ifItem?.percentage || 0) * 10} 
            className={cn(
              "h-1.5",
              (ifItem?.percentage || 0) <= 0 && "[&>div]:bg-destructive",
              (ifItem?.percentage || 0) > 0 && (ifItem?.percentage || 0) < 3 && "[&>div]:bg-warning"
            )}
          />
          <p className="text-xs text-muted-foreground text-center mt-1">
            Reserva disponível: {(ifItem?.percentage || 0).toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Budget list */}
      <main className="flex-1 overflow-y-auto p-4 space-y-3">
        <TooltipProvider>
          {budgets.map((item, index) => {
            const category = getCategoryById(item.categoryId);
            const isIF = item.prefixCode === 'IF';
            const isDF = item.prefixCode === 'DF';
            
            return (
              <motion.div
                key={item.prefixCode}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card className={cn(
                  "overflow-hidden transition-all",
                  editingPrefix === item.prefixCode && "ring-2 ring-primary",
                  isIF && "bg-primary/5 border-primary/30"
                )}>
                  <CardContent className="p-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{category?.icon || '📦'}</span>
                        <div>
                          <div className="flex items-center gap-1">
                            <p className="font-medium text-sm">{item.prefixName}</p>
                            {isDF && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <HelpCircle className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-[250px]">
                                  <p className="text-xs">
                                    Este valor é uma estimativa média de custos bancários (manutenção de conta, anuidade de cartão) e pode ser ajustado.
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                          {isIF && (
                            <Badge variant="outline" className="text-xs mt-0.5">
                              Saldo do plano
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(item.amount)}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.percentage.toFixed(1)}%
                          {item.isEdited && <span className="text-primary ml-1">✎</span>}
                        </p>
                      </div>
                    </div>

                  {/* Slider (except for IF) */}
                  {!isIF && (
                    <div className="pt-2">
                      <Slider
                        value={[item.percentage]}
                        onValueChange={([val]) => handlePercentageChange(item.prefixCode, val)}
                        min={0}
                        max={getMaxPercentage(item.prefixCode)}
                        step={0.5}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>0%</span>
                        <span>{getMaxPercentage(item.prefixCode).toFixed(0)}%</span>
                      </div>
                    </div>
                  )}
                  
                  {/* IF progress bar */}
                  {isIF && (
                    <div className="pt-2">
                      <Progress 
                        value={item.percentage * 5} 
                        className={cn(
                          "h-3",
                          item.percentage <= 0 && "[&>div]:bg-destructive",
                          item.percentage > 0 && item.percentage <= 5 && "[&>div]:bg-warning"
                        )}
                      />
                      {item.percentage <= 0 && (
                        <p className="text-xs text-destructive mt-1 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Aumento de despesas bloqueado
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
        </TooltipProvider>
      </main>

      {/* Footer */}
      <div className="p-4 border-t bg-background/95 backdrop-blur">
        <Button 
          onClick={handleConfirm} 
          className="w-full h-12 gap-2" 
          size="lg"
          disabled={isSubmitting || Math.abs(totalPercentage - 100) > 0.5}
        >
          {isSubmitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Check className="w-4 h-4" />
              Confirmar orçamento
            </>
          )}
        </Button>
        
        <p className="text-xs text-center text-muted-foreground mt-2">
          As sugestões são educativas e podem ser ajustadas a qualquer momento.
        </p>
      </div>
    </div>
  );
}
