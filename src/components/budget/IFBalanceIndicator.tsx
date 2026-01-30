/**
 * IF Balance Indicator Component
 * 
 * Visual indicator for the (+/-) IF (Independência Financeira) status
 * Used throughout the app to show current IF health
 */

import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatters";
import { Progress } from "@/components/ui/progress";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { TrendingUp, TrendingDown, AlertTriangle, Lock } from "lucide-react";

interface IFBalanceIndicatorProps {
  amount: number;
  percentage: number;
  monthlyIncome: number;
  variant?: "compact" | "detailed" | "minimal";
  showTrend?: boolean;
  previousAmount?: number;
  className?: string;
}

export function IFBalanceIndicator({
  amount,
  percentage,
  monthlyIncome,
  variant = "compact",
  showTrend = false,
  previousAmount,
  className,
}: IFBalanceIndicatorProps) {
  // Determine status
  const status = 
    percentage <= 0 ? "critical" :
    percentage < 3 ? "warning" :
    percentage < 8 ? "healthy" :
    "excellent";

  // Calculate trend
  const trend = previousAmount !== undefined 
    ? amount - previousAmount 
    : 0;

  const statusConfig = {
    critical: {
      color: "text-destructive",
      bgColor: "bg-destructive/10",
      progressClass: "[&>div]:bg-destructive",
      icon: Lock,
      label: "Bloqueado",
      message: "IF zerado. Reduza despesas para liberar margem.",
    },
    warning: {
      color: "text-warning",
      bgColor: "bg-warning/10",
      progressClass: "[&>div]:bg-warning",
      icon: AlertTriangle,
      label: "Atenção",
      message: "IF baixo. Considere reduzir gastos para ter mais folga.",
    },
    healthy: {
      color: "text-primary",
      bgColor: "bg-primary/10",
      progressClass: "",
      icon: TrendingUp,
      label: "Saudável",
      message: "Bom equilíbrio entre gastos e reserva.",
    },
    excellent: {
      color: "text-success",
      bgColor: "bg-success/10",
      progressClass: "[&>div]:bg-success",
      icon: TrendingUp,
      label: "Excelente",
      message: "Ótima margem para investimentos e imprevistos.",
    },
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  if (variant === "minimal") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium cursor-help",
              config.bgColor,
              config.color,
              className
            )}>
              <StatusIcon className="w-3 h-3" />
              <span>{formatCurrency(amount)}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[200px]">
            <p className="text-xs font-medium">{config.label}</p>
            <p className="text-xs text-muted-foreground">{config.message}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (variant === "compact") {
    return (
      <div className={cn("space-y-1", className)}>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">(+/-) IF</span>
          <div className={cn("flex items-center gap-1", config.color)}>
            <StatusIcon className="w-3 h-3" />
            <span className="text-sm font-bold">{formatCurrency(amount)}</span>
          </div>
        </div>
        <Progress 
          value={Math.min(percentage * 5, 100)} 
          className={cn("h-1.5", config.progressClass)}
        />
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">{percentage.toFixed(1)}%</span>
          {showTrend && trend !== 0 && (
            <span className={cn(
              "flex items-center gap-0.5",
              trend > 0 ? "text-success" : "text-destructive"
            )}>
              {trend > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {formatCurrency(Math.abs(trend))}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Detailed variant
  return (
    <div className={cn(
      "p-4 rounded-lg border",
      config.bgColor,
      status === "critical" && "border-destructive/30",
      status === "warning" && "border-warning/30",
      status === "healthy" && "border-primary/30",
      status === "excellent" && "border-success/30",
      className
    )}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <StatusIcon className={cn("w-5 h-5", config.color)} />
          <div>
            <p className="text-sm font-medium">(+/-) IF - Independência Financeira</p>
            <p className="text-xs text-muted-foreground">{config.label}</p>
          </div>
        </div>
        <div className="text-right">
          <p className={cn("text-xl font-bold", config.color)}>
            {formatCurrency(amount)}
          </p>
          <p className="text-xs text-muted-foreground">
            {percentage.toFixed(1)}% da renda
          </p>
        </div>
      </div>

      <Progress 
        value={Math.min(percentage * 5, 100)} 
        className={cn("h-2 mb-2", config.progressClass)}
      />

      <p className="text-xs text-muted-foreground">{config.message}</p>

      {showTrend && previousAmount !== undefined && (
        <div className={cn(
          "mt-2 pt-2 border-t flex items-center justify-between",
          status === "critical" ? "border-destructive/20" :
          status === "warning" ? "border-warning/20" :
          status === "healthy" ? "border-primary/20" :
          "border-success/20"
        )}>
          <span className="text-xs text-muted-foreground">Variação do mês</span>
          <span className={cn(
            "text-xs font-medium flex items-center gap-1",
            trend > 0 ? "text-success" : trend < 0 ? "text-destructive" : "text-muted-foreground"
          )}>
            {trend > 0 ? <TrendingUp className="w-3 h-3" /> : trend < 0 ? <TrendingDown className="w-3 h-3" /> : null}
            {trend > 0 ? "+" : ""}{formatCurrency(trend)}
          </span>
        </div>
      )}
    </div>
  );
}
