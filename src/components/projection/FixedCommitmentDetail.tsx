import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Lock, 
  CalendarClock, 
  CreditCard, 
  TrendingUp,
  AlertTriangle,
  HelpCircle,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { MonthProjection, ProjectionDriver } from "@/hooks/useProjection";
import { getCategoryById } from "@/data/categories";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface FixedCommitmentDetailProps {
  projection: MonthProjection;
}

export function FixedCommitmentDetail({ projection }: FixedCommitmentDetailProps) {
  const [showFixedExpenses, setShowFixedExpenses] = useState(false);
  const [showInstallments, setShowInstallments] = useState(false);

  const isCritical = projection.fixedCommitmentPercentage > 80;
  const isWarning = projection.fixedCommitmentPercentage > 60;

  return (
    <Card className={cn(
      "overflow-hidden",
      isCritical && "border-destructive/30 bg-destructive/5",
      isWarning && !isCritical && "border-warning/30 bg-warning/5"
    )}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary" />
            Comprometimento Fixo
            <Tooltip>
              <TooltipTrigger>
                <HelpCircle className="w-3.5 h-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p className="text-xs">
                  Quanto da sua renda já está comprometido com despesas inevitáveis 
                  (fixas + parcelas) antes de qualquer decisão de gasto.
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
        {/* Main commitment display */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold">
              {formatCurrency(projection.fixedCommitmentTotal)}
            </p>
            <p className="text-xs text-muted-foreground">
              de {formatCurrency(projection.incomeProjected)} projetados
            </p>
          </div>
          <div className={cn(
            "text-right px-3 py-2 rounded-lg",
            isCritical && "bg-destructive/10",
            isWarning && !isCritical && "bg-warning/10",
            !isCritical && !isWarning && "bg-success/10"
          )}>
            <p className={cn(
              "text-2xl font-bold",
              isCritical && "text-destructive",
              isWarning && !isCritical && "text-warning",
              !isCritical && !isWarning && "text-success"
            )}>
              {projection.fixedCommitmentPercentage.toFixed(0)}%
            </p>
            <p className="text-[10px] text-muted-foreground">
              da renda
            </p>
          </div>
        </div>

        {/* Progress bar with thresholds */}
        <div className="space-y-1">
          <Progress 
            value={Math.min(projection.fixedCommitmentPercentage, 100)} 
            className={cn(
              "h-3",
              isCritical && "[&>div]:bg-destructive",
              isWarning && !isCritical && "[&>div]:bg-warning"
            )}
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>0%</span>
            <span className={cn(
              projection.fixedCommitmentPercentage > 60 && "font-medium text-warning"
            )}>
              60%
            </span>
            <span className={cn(
              projection.fixedCommitmentPercentage > 80 && "font-medium text-destructive"
            )}>
              80%
            </span>
            <span>100%</span>
          </div>
        </div>

        {/* Breakdown summary */}
        <div className="grid grid-cols-2 gap-3">
          {/* Fixed Expenses */}
          <button
            onClick={() => setShowFixedExpenses(!showFixedExpenses)}
            className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              <CalendarClock className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Despesas Fixas</p>
                <p className="text-sm font-semibold">
                  {formatCurrency(projection.fixedRecurringTotal)}
                </p>
              </div>
            </div>
            {projection.fixedExpenses.length > 0 && (
              showFixedExpenses ? 
                <ChevronUp className="w-4 h-4 text-muted-foreground" /> : 
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>

          {/* Installments */}
          <button
            onClick={() => setShowInstallments(!showInstallments)}
            className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted/70 transition-colors text-left"
          >
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Parcelas</p>
                <p className="text-sm font-semibold">
                  {formatCurrency(projection.creditCardInstallments)}
                </p>
              </div>
            </div>
            {projection.installmentDetails.length > 0 && (
              showInstallments ? 
                <ChevronUp className="w-4 h-4 text-muted-foreground" /> : 
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        </div>

        {/* Fixed expenses breakdown */}
        {showFixedExpenses && projection.fixedExpenses.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-border/50">
            <p className="text-xs font-medium text-muted-foreground">
              Despesas Fixas Recorrentes
            </p>
            {projection.fixedExpenses.map((expense, idx) => {
              const category = expense.category ? getCategoryById(expense.category) : null;
              return (
                <div 
                  key={idx}
                  className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg bg-muted/30"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span>{category?.icon || "📋"}</span>
                    <span className="truncate">{expense.label}</span>
                  </div>
                  <span className="font-medium ml-2">
                    {formatCurrency(expense.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Installments breakdown */}
        {showInstallments && projection.installmentDetails.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-border/50">
            <p className="text-xs font-medium text-muted-foreground">
              Parcelas de Cartão
            </p>
            {projection.installmentDetails.map((installment, idx) => {
              const category = installment.category ? getCategoryById(installment.category) : null;
              return (
                <div 
                  key={idx}
                  className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg bg-primary/5"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span>{category?.icon || "💳"}</span>
                    <span className="truncate">{installment.label}</span>
                  </div>
                  <span className="font-medium ml-2">
                    {formatCurrency(installment.amount)}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Projected surplus */}
        <div className={cn(
          "flex items-center justify-between p-3 rounded-lg",
          projection.projectedSurplus >= 0 ? "bg-success/10" : "bg-destructive/10"
        )}>
          <div className="flex items-center gap-2">
            <TrendingUp className={cn(
              "w-4 h-4",
              projection.projectedSurplus >= 0 ? "text-success" : "text-destructive"
            )} />
            <div>
              <p className="text-xs text-muted-foreground">Sobra Projetada</p>
              <p className="text-[10px] text-muted-foreground/70">
                Limite para gastos variáveis
              </p>
            </div>
          </div>
          <p className={cn(
            "text-lg font-bold",
            projection.projectedSurplus >= 0 ? "text-success" : "text-destructive"
          )}>
            {formatCurrency(projection.projectedSurplus)}
          </p>
        </div>

        {/* Educational alerts */}
        {isCritical && (
          <div className="flex items-start gap-2 p-2 bg-destructive/10 rounded-lg border border-destructive/20">
            <AlertTriangle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              <strong>Comprometimento crítico.</strong> Mais de 80% da renda já está destinada. 
              Considere quitar parcelas ou renegociar despesas fixas.
            </p>
          </div>
        )}

        {isWarning && !isCritical && (
          <div className="flex items-start gap-2 p-2 bg-warning/10 rounded-lg border border-warning/20">
            <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground">
              <strong>Atenção ao limite.</strong> Comprometimento acima de 60%. 
              Mantenha margem para imprevistos.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
