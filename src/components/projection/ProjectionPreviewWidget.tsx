import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, TrendingDown, ChevronRight, AlertTriangle, Sparkles } from "lucide-react";
import { useMonthProjectionSummary } from "@/hooks/useProjection";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface ProjectionPreviewWidgetProps {
  onViewAll?: () => void;
}

export function ProjectionPreviewWidget({ onViewAll }: ProjectionPreviewWidgetProps) {
  const { data: nextMonth, isLoading, error } = useMonthProjectionSummary(1);

  if (isLoading) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-4">
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !nextMonth) {
    return null; // Silently hide if no projection data
  }

  const isNegative = nextMonth.balanceProjected < 0;
  const installmentRatio = nextMonth.incomeProjected > 0 
    ? nextMonth.creditCardInstallments / nextMonth.incomeProjected 
    : 0;
  const hasWarning = isNegative || installmentRatio > 0.3;

  return (
    <Card className={cn(
      "overflow-hidden",
      hasWarning ? "border-warning/30 bg-warning/5" : "border-primary/20"
    )}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Próximo Mês: {nextMonth.monthLabel}
          </div>
          {hasWarning && (
            <AlertTriangle className="w-4 h-4 text-warning" />
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-0.5">Receita</p>
            <p className="text-sm font-semibold text-success">
              {formatCurrency(nextMonth.incomeProjected)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-0.5">Despesas</p>
            <p className="text-sm font-semibold text-destructive">
              {formatCurrency(nextMonth.expenseProjected)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground mb-0.5">Saldo</p>
            <div className="flex items-center justify-center gap-1">
              {isNegative ? (
                <TrendingDown className="w-3 h-3 text-destructive" />
              ) : (
                <TrendingUp className="w-3 h-3 text-success" />
              )}
              <p className={cn(
                "text-sm font-bold",
                isNegative ? "text-destructive" : "text-success"
              )}>
                {formatCurrency(nextMonth.balanceProjected)}
              </p>
            </div>
          </div>
        </div>

        {nextMonth.creditCardInstallments > 0 && (
          <div className="text-xs text-muted-foreground text-center mb-3">
            Inclui {formatCurrency(nextMonth.creditCardInstallments)} em parcelas de cartão
          </div>
        )}

        {onViewAll && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onViewAll}
            className="w-full text-xs"
          >
            Ver projeção completa
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
