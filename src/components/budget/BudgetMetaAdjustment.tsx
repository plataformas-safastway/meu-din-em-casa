/**
 * Budget Meta Adjustment Component
 * 
 * Implements the core OIK budget adjustment flow:
 * - Categories with sliders for adjustment
 * - IF (Independência Financeira) as the balance center
 * - Zero-sum logic: increases consume IF, decreases add to IF
 * - Blocks increases when IF = 0
 */

import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, 
  Check, 
  Info, 
  AlertTriangle, 
  Loader2,
  Lock,
  ChevronDown,
  ChevronUp,
  Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatters";
import { getCategoryById } from "@/data/categories";
import { toast } from "sonner";

export interface BudgetCategoryItem {
  prefixCode: string;
  prefixName: string;
  categoryId: string;
  percentage: number;
  amount: number;
  isEdited: boolean;
  subcategories?: SubcategoryBudget[];
}

export interface SubcategoryBudget {
  id: string;
  name: string;
  amount: number;
  percentage: number; // Percentage of category total
}

interface BudgetMetaAdjustmentProps {
  items: BudgetCategoryItem[];
  monthlyIncome: number;
  onItemsChange: (items: BudgetCategoryItem[]) => void;
  onConfirm: () => void;
  onBack: () => void;
  isLoading?: boolean;
  mode?: "accept" | "adjust";
  readOnly?: boolean;
}

export function BudgetMetaAdjustment({
  items,
  monthlyIncome,
  onItemsChange,
  onConfirm,
  onBack,
  isLoading = false,
  mode = "adjust",
  readOnly = false,
}: BudgetMetaAdjustmentProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [ifBlockedMessage, setIfBlockedMessage] = useState<string | null>(null);

  // Find IF (Independência Financeira) item - the balance center
  const ifItem = useMemo(() => items.find(b => b.prefixCode === 'IF'), [items]);
  const ifIndex = useMemo(() => items.findIndex(b => b.prefixCode === 'IF'), [items]);

  // Calculate totals
  const totalPercentage = useMemo(() => 
    items.reduce((sum, b) => sum + b.percentage, 0), 
    [items]
  );
  
  const totalAmount = useMemo(() => 
    items.reduce((sum, b) => sum + b.amount, 0), 
    [items]
  );

  // Check if IF is at zero (blocks increases)
  const isIfZero = useMemo(() => (ifItem?.percentage || 0) <= 0.1, [ifItem]);

  // Handle category percentage adjustment
  const handlePercentageChange = useCallback((prefixCode: string, newPercentage: number) => {
    if (readOnly) return;
    if (prefixCode === 'IF') return; // IF is the buffer, can't be directly edited

    const currentItem = items.find(b => b.prefixCode === prefixCode);
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
    const newItems = items.map(b => {
      if (b.prefixCode === prefixCode) {
        return {
          ...b,
          percentage: newPercentage,
          amount: Math.round(monthlyIncome * (newPercentage / 100)),
          isEdited: true,
        };
      }
      if (b.prefixCode === 'IF') {
        return {
          ...b,
          percentage: newIfPercentage,
          amount: Math.round(monthlyIncome * (newIfPercentage / 100)),
        };
      }
      return b;
    });

    onItemsChange(newItems);
  }, [items, ifItem, monthlyIncome, onItemsChange, readOnly]);

  // Handle subcategory amount change
  const handleSubcategoryChange = useCallback((
    categoryPrefixCode: string,
    subcategoryId: string,
    newAmount: number
  ) => {
    if (readOnly) return;

    const categoryItem = items.find(b => b.prefixCode === categoryPrefixCode);
    if (!categoryItem?.subcategories) return;

    const currentSubcategory = categoryItem.subcategories.find(s => s.id === subcategoryId);
    if (!currentSubcategory) return;

    const delta = newAmount - currentSubcategory.amount;
    const subcategoryTotal = categoryItem.subcategories.reduce((sum, s) => sum + s.amount, 0);
    const newSubcategoryTotal = subcategoryTotal + delta;

    // Check if new total exceeds category budget
    if (newSubcategoryTotal > categoryItem.amount) {
      // Calculate how much IF would need to compensate
      const categoryIncrease = newSubcategoryTotal - categoryItem.amount;
      const categoryIncreasePercentage = (categoryIncrease / monthlyIncome) * 100;
      const newIfPercentage = (ifItem?.percentage || 0) - categoryIncreasePercentage;

      if (newIfPercentage < 0) {
        toast.error(
          "Soma das subcategorias excede o orçamento da categoria. Reduza outras subcategorias ou categorias para liberar IF.",
          { duration: 5000 }
        );
        return;
      }

      // Update category total and IF
      const newItems = items.map(b => {
        if (b.prefixCode === categoryPrefixCode) {
          return {
            ...b,
            amount: newSubcategoryTotal,
            percentage: (newSubcategoryTotal / monthlyIncome) * 100,
            isEdited: true,
            subcategories: b.subcategories?.map(s => 
              s.id === subcategoryId 
                ? { ...s, amount: newAmount, percentage: (newAmount / newSubcategoryTotal) * 100 }
                : { ...s, percentage: (s.amount / newSubcategoryTotal) * 100 }
            ),
          };
        }
        if (b.prefixCode === 'IF') {
          return {
            ...b,
            percentage: newIfPercentage,
            amount: Math.round(monthlyIncome * (newIfPercentage / 100)),
          };
        }
        return b;
      });

      onItemsChange(newItems);
    } else {
      // Just update the subcategory
      const newItems = items.map(b => {
        if (b.prefixCode === categoryPrefixCode && b.subcategories) {
          const newSubcategories = b.subcategories.map(s => 
            s.id === subcategoryId 
              ? { ...s, amount: newAmount, percentage: (newAmount / categoryItem.amount) * 100 }
              : s
          );
          return {
            ...b,
            subcategories: newSubcategories,
            isEdited: true,
          };
        }
        return b;
      });

      onItemsChange(newItems);
    }
  }, [items, ifItem, monthlyIncome, onItemsChange, readOnly]);

  // Validate budget before confirm
  const handleConfirm = useCallback(() => {
    // Validate sum ≈ 100%
    if (Math.abs(totalPercentage - 100) > 0.5) {
      toast.error("A soma das categorias deve ser 100%");
      return;
    }

    // Validate IF is not negative
    if ((ifItem?.percentage || 0) < 0) {
      toast.error("O saldo IF não pode ser negativo");
      return;
    }

    onConfirm();
  }, [totalPercentage, ifItem, onConfirm]);

  // Calculate max slider value for each category (current + available IF)
  const getMaxPercentage = useCallback((prefixCode: string) => {
    const currentItem = items.find(b => b.prefixCode === prefixCode);
    if (!currentItem || !ifItem) return 50;
    return Math.min(50, currentItem.percentage + ifItem.percentage);
  }, [items, ifItem]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="p-4 flex items-center gap-3 border-b sticky top-0 bg-background/95 backdrop-blur z-10">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <h1 className="font-semibold">
            {mode === "accept" ? "Seu Orçamento Meta" : "Ajustar Orçamento"}
          </h1>
          <p className="text-xs text-muted-foreground">
            {mode === "accept" 
              ? "Revise e aceite ou ajuste seu plano" 
              : "Ajuste as categorias arrastando os sliders"}
          </p>
        </div>
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

      {/* Summary Bar */}
      <div className="px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Renda base</p>
            <p className="text-lg font-bold">{formatCurrency(monthlyIncome)}</p>
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
              (ifItem?.percentage || 0) <= 0 && "[&>div]:bg-destructive"
            )}
          />
          <p className="text-xs text-muted-foreground text-center mt-1">
            Reserva disponível: {(ifItem?.percentage || 0).toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Info Card */}
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

      {/* Budget List */}
      <main className="flex-1 overflow-y-auto p-4 space-y-3">
        <TooltipProvider>
          {items.map((item, index) => {
            const category = getCategoryById(item.categoryId);
            const isIF = item.prefixCode === 'IF';
            const isExpanded = expandedCategory === item.prefixCode;
            const hasSubcategories = item.subcategories && item.subcategories.length > 0;
            const subcategoryTotal = item.subcategories?.reduce((sum, s) => sum + s.amount, 0) || 0;
            const subcategoryMismatch = hasSubcategories && Math.abs(subcategoryTotal - item.amount) > 1;
            
            return (
              <motion.div
                key={item.prefixCode}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.02 }}
              >
                <Card className={cn(
                  "overflow-hidden transition-all",
                  isIF && "bg-primary/5 border-primary/30",
                  item.isEdited && !isIF && "border-warning/50",
                  subcategoryMismatch && "border-destructive/50"
                )}>
                  <CardContent className="p-4 space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{category?.icon || '📦'}</span>
                        <div>
                          <div className="flex items-center gap-1">
                            <p className="font-medium text-sm">{item.prefixName}</p>
                            {item.isEdited && !isIF && (
                              <Badge variant="outline" className="text-xs px-1.5 py-0 text-warning border-warning/50">
                                Editado
                              </Badge>
                            )}
                          </div>
                          {isIF && (
                            <Badge variant="outline" className="text-xs mt-0.5 border-primary/50 text-primary">
                              Saldo do plano
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(item.amount)}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.percentage.toFixed(1)}%
                        </p>
                      </div>
                    </div>

                    {/* Slider (except for IF) */}
                    {!isIF && !readOnly && (
                      <div className="pt-2">
                        <Slider
                          value={[item.percentage]}
                          onValueChange={([val]) => handlePercentageChange(item.prefixCode, val)}
                          min={0}
                          max={getMaxPercentage(item.prefixCode)}
                          step={0.5}
                          className="w-full"
                          disabled={readOnly}
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>0%</span>
                          <span>{getMaxPercentage(item.prefixCode).toFixed(0)}%</span>
                        </div>
                      </div>
                    )}

                    {/* IF indicator bar */}
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
                            <AlertTriangle className="w-3 h-3" />
                            Aumento de despesas bloqueado
                          </p>
                        )}
                      </div>
                    )}

                    {/* Subcategories expansion */}
                    {hasSubcategories && !isIF && (
                      <Collapsible 
                        open={isExpanded} 
                        onOpenChange={() => setExpandedCategory(isExpanded ? null : item.prefixCode)}
                      >
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="w-full justify-between">
                            <span className="text-xs text-muted-foreground">
                              {item.subcategories!.length} subcategorias
                              {subcategoryMismatch && (
                                <Badge variant="destructive" className="ml-2 text-xs">
                                  Ajuste necessário
                                </Badge>
                              )}
                            </span>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="pt-2 space-y-2">
                          <Separator />
                          {item.subcategories!.map(sub => (
                            <div key={sub.id} className="flex items-center justify-between px-2 py-1">
                              <span className="text-sm">{sub.name}</span>
                              <span className="text-sm font-medium">
                                {formatCurrency(sub.amount)}
                              </span>
                            </div>
                          ))}
                          {subcategoryMismatch && (
                            <Alert variant="destructive" className="mt-2">
                              <AlertTriangle className="w-4 h-4" />
                              <AlertDescription className="text-xs">
                                Soma ({formatCurrency(subcategoryTotal)}) ≠ Categoria ({formatCurrency(item.amount)})
                              </AlertDescription>
                            </Alert>
                          )}
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </TooltipProvider>
      </main>

      {/* Footer */}
      <div className="p-4 border-t bg-background/95 backdrop-blur sticky bottom-0">
        <Button 
          onClick={handleConfirm} 
          className="w-full h-12 gap-2" 
          size="lg"
          disabled={isLoading || Math.abs(totalPercentage - 100) > 0.5}
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              <Check className="w-4 h-4" />
              {mode === "accept" ? "Aceitar orçamento" : "Confirmar ajustes"}
            </>
          )}
        </Button>
        
        <p className="text-xs text-center text-muted-foreground mt-2">
          O orçamento é seu guia. Você pode ajustá-lo a qualquer momento.
        </p>
      </div>
    </div>
  );
}
