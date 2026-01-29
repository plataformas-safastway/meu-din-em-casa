import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Lock, 
  ChevronRight, 
  AlertTriangle, 
  TrendingUp,
  CreditCard,
  CalendarClock,
  HelpCircle
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCurrentMonthCommitment, getAlertLevelColor, getAlertLevelText } from "@/hooks/useProjection";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface FixedCommitmentCardProps {
  onViewProjections?: () => void;
  onViewDetails?: () => void;
}

export function FixedCommitmentCard({ 
  onViewProjections,
  onViewDetails 
}: FixedCommitmentCardProps) {
  const { data: summary, projection, isLoading, error } = useCurrentMonthCommitment();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (error || !summary) {
    return null; // Silently hide if no data
  }

  const alertColor = getAlertLevelColor(summary.alertLevel);
  const alertText = getAlertLevelText(summary.alertLevel);
  const isCritical = summary.alertLevel === 'critical';
  const isWarning = summary.alertLevel === 'warning';

  return (
    <Card className={cn(
      "overflow-hidden transition-all",
      isCritical && "border-destructive/50 bg-destructive/5",
      isWarning && "border-warning/50 bg-warning/5"
    )}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary" />
            Comprometimento do Mês
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">
                  O comprometimento fixo mostra quanto da sua renda já está destinado 
                  a despesas inevitáveis (fixas + parcelas) antes de qualquer decisão de gasto.
                </p>
              </TooltipContent>
            </Tooltip>
          </div>
          {(isCritical || isWarning) && (
            <AlertTriangle className={cn(
              "w-4 h-4",
              isCritical ? "text-destructive" : "text-warning"
            )} />
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Main Values */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold">
              {formatCurrency(summary.fixedCommitmentTotal)}
            </p>
            <p className="text-xs text-muted-foreground">
              de {formatCurrency(summary.incomeProjected)} projetados
            </p>
          </div>
          <div className={cn(
            "text-right px-3 py-1.5 rounded-lg",
            isCritical && "bg-destructive/10",
            isWarning && "bg-warning/10",
            !isCritical && !isWarning && "bg-success/10"
          )}>
            <p className={cn(
              "text-xl font-bold",
              isCritical && "text-destructive",
              isWarning && "text-warning",
              !isCritical && !isWarning && "text-success"
            )}>
              {summary.fixedCommitmentPercentage.toFixed(0)}%
            </p>
            <p className="text-[10px] text-muted-foreground">
              {alertText}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <Progress 
            value={Math.min(summary.fixedCommitmentPercentage, 100)} 
            className={cn(
              "h-2",
              isCritical && "[&>div]:bg-destructive",
              isWarning && "[&>div]:bg-warning"
            )}
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>0%</span>
            <span className={cn(
              summary.fixedCommitmentPercentage > 60 && "font-medium",
              summary.fixedCommitmentPercentage > 60 && summary.fixedCommitmentPercentage <= 80 && "text-warning",
              summary.fixedCommitmentPercentage > 80 && "text-destructive"
            )}>
              60%
            </span>
            <span className={cn(
              summary.fixedCommitmentPercentage > 80 && "font-medium text-destructive"
            )}>
              80%
            </span>
            <span>100%</span>
          </div>
        </div>

        {/* Breakdown */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
            <CalendarClock className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Despesas Fixas</p>
              <p className="text-sm font-semibold">
                {formatCurrency(summary.fixedRecurringTotal)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/30">
            <CreditCard className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Parcelas</p>
              <p className="text-sm font-semibold">
                {formatCurrency(summary.creditCardInstallments)}
              </p>
            </div>
          </div>
        </div>

        {/* Surplus Highlight */}
        <div className={cn(
          "flex items-center justify-between p-3 rounded-lg",
          summary.projectedSurplus >= 0 ? "bg-success/10" : "bg-destructive/10"
        )}>
          <div className="flex items-center gap-2">
            <TrendingUp className={cn(
              "w-4 h-4",
              summary.projectedSurplus >= 0 ? "text-success" : "text-destructive"
            )} />
            <div>
              <p className="text-xs text-muted-foreground">Sobra para gastos variáveis</p>
              <p className={cn(
                "text-sm font-bold",
                summary.projectedSurplus >= 0 ? "text-success" : "text-destructive"
              )}>
                {formatCurrency(summary.projectedSurplus)}
              </p>
            </div>
          </div>
        </div>

        {/* Educational Alert */}
        {isCritical && (
          <div className="flex items-start gap-2 p-2 bg-destructive/10 rounded-lg border border-destructive/20">
            <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Mais de 80% da renda comprometida. Revise parcelas e despesas fixas para ter mais folga.
            </p>
          </div>
        )}

        {isWarning && !isCritical && (
          <div className="flex items-start gap-2 p-2 bg-warning/10 rounded-lg border border-warning/20">
            <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              Comprometimento acima de 60%. Atenção para manter margem de segurança.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          {onViewProjections && (
            <Button
              variant="outline"
              size="sm"
              onClick={onViewProjections}
              className="flex-1 text-xs"
            >
              Ver Projeções
              <ChevronRight className="w-3.5 h-3.5 ml-1" />
            </Button>
          )}
          {onViewDetails && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onViewDetails}
              className="flex-1 text-xs"
            >
              Detalhar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
