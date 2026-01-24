import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, Minus, ChevronRight, Target, Info } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { getCategoryById } from "@/data/categories";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface BudgetComparison {
  categoryId: string;
  budgeted: number;
  spent: number;
  percentage: number;
  difference: number;
}

interface BudgetComparisonCardProps {
  comparisons: BudgetComparison[];
  onViewDetails?: () => void;
  limit?: number;
}

function ComparisonRow({ comparison, index }: { comparison: BudgetComparison; index: number }) {
  const category = getCategoryById(comparison.categoryId);
  const isOver = comparison.difference < 0;
  const isUnder = comparison.difference > 0;
  const percentage = Math.min(comparison.percentage, 100);

  // Status based on percentage
  let status: "ok" | "warning" | "exceeded" = "ok";
  if (comparison.percentage >= 100) status = "exceeded";
  else if (comparison.percentage >= 80) status = "warning";

  const statusColors = {
    ok: { text: "text-success", bar: "" },
    warning: { text: "text-warning", bar: "[&>div]:bg-warning" },
    exceeded: { text: "text-destructive", bar: "[&>div]:bg-destructive" },
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="p-3 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
    >
      <div className="flex items-start gap-3">
        <span className="text-xl">{category?.icon || "📦"}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <p className="font-medium text-sm truncate">
              {category?.name || comparison.categoryId}
            </p>
            <div className="flex items-center gap-1">
              {isOver && <TrendingDown className="w-3 h-3 text-destructive" />}
              {isUnder && comparison.percentage > 0 && <TrendingUp className="w-3 h-3 text-success" />}
              <span className={cn(
                "text-xs font-bold",
                statusColors[status].text
              )}>
                {comparison.percentage.toFixed(0)}%
              </span>
            </div>
          </div>
          
          <Progress 
            value={percentage} 
            className={cn("h-1.5 mb-2", statusColors[status].bar)} 
          />
          
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {formatCurrency(comparison.spent)} de {formatCurrency(comparison.budgeted)}
            </span>
            <span className={cn(
              "font-medium",
              isOver ? "text-destructive" : "text-success"
            )}>
              {isOver ? "−" : "+"}{formatCurrency(Math.abs(comparison.difference))}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function BudgetComparisonCard({ 
  comparisons, 
  onViewDetails,
  limit = 5 
}: BudgetComparisonCardProps) {
  if (comparisons.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-6 text-center">
          <Target className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <h3 className="font-semibold mb-1">Sem orçamento definido</h3>
          <p className="text-sm text-muted-foreground mb-3">
            Defina metas de orçamento para comparar previsto × realizado
          </p>
          {onViewDetails && (
            <Button variant="outline" size="sm" onClick={onViewDetails}>
              Definir orçamento
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  // Sort by percentage (highest first)
  const sorted = [...comparisons].sort((a, b) => b.percentage - a.percentage);
  const displayed = sorted.slice(0, limit);
  
  const totalBudgeted = comparisons.reduce((sum, c) => sum + c.budgeted, 0);
  const totalSpent = comparisons.reduce((sum, c) => sum + c.spent, 0);
  const totalPercentage = totalBudgeted > 0 ? (totalSpent / totalBudgeted) * 100 : 0;
  const exceeded = comparisons.filter(c => c.percentage >= 100).length;
  const warning = comparisons.filter(c => c.percentage >= 80 && c.percentage < 100).length;

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Previsto × Realizado
          </CardTitle>
          <Tooltip>
            <TooltipTrigger>
              <Info className="w-4 h-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-xs">
                Orçamento é uma referência, não um limite rígido. Use para 
                entender padrões e fazer escolhas conscientes.
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Total do mês</span>
            <div className="flex items-center gap-2">
              {exceeded > 0 && (
                <span className="text-xs bg-destructive/20 text-destructive px-2 py-0.5 rounded-full font-medium">
                  {exceeded} excedido{exceeded > 1 ? "s" : ""}
                </span>
              )}
              {warning > 0 && (
                <span className="text-xs bg-warning/20 text-warning px-2 py-0.5 rounded-full font-medium">
                  {warning} alerta{warning > 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Orçado</p>
              <p className="font-bold">{formatCurrency(totalBudgeted)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Realizado</p>
              <p className={cn(
                "font-bold",
                totalSpent > totalBudgeted ? "text-destructive" : "text-success"
              )}>
                {formatCurrency(totalSpent)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Uso</p>
              <p className={cn(
                "font-bold",
                totalPercentage > 100 ? "text-destructive" : 
                totalPercentage > 80 ? "text-warning" : "text-success"
              )}>
                {totalPercentage.toFixed(0)}%
              </p>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="space-y-2">
          {displayed.map((comparison, idx) => (
            <ComparisonRow key={comparison.categoryId} comparison={comparison} index={idx} />
          ))}
        </div>

        {comparisons.length > limit && onViewDetails && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onViewDetails}
            className="w-full text-xs"
          >
            Ver todos ({comparisons.length})
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
