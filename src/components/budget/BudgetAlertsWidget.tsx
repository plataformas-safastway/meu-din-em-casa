import { AlertTriangle, CheckCircle, Target, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useBudgetAlerts, BudgetAlert } from "@/hooks/useBudgets";
import { getCategoryById } from "@/data/categories";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface BudgetAlertsWidgetProps {
  month?: number;
  year?: number;
  onViewAll?: () => void;
  /** CTA: Adjust budget for a category */
  onAdjustBudget?: (categoryId?: string) => void;
  limit?: number;
}

function BudgetAlertItem({ alert }: { alert: BudgetAlert }) {
  const category = getCategoryById(alert.budget.category_id);
  
  const statusConfig = {
    exceeded: {
      color: "text-destructive",
      bgColor: "bg-destructive/10",
      borderColor: "border-destructive/30",
      icon: AlertTriangle,
      label: "Excedido",
    },
    warning: {
      color: "text-warning",
      bgColor: "bg-warning/10",
      borderColor: "border-warning/30",
      icon: AlertTriangle,
      label: "Atenção",
    },
    ok: {
      color: "text-success",
      bgColor: "bg-success/10",
      borderColor: "border-success/30",
      icon: CheckCircle,
      label: "OK",
    },
  };

  const config = statusConfig[alert.status];
  const Icon = config.icon;
  const progressValue = Math.min(alert.percentage, 100);

  return (
    <div className={cn(
      "p-3 rounded-xl border transition-all",
      config.borderColor,
      config.bgColor
    )}>
      <div className="flex items-start gap-3">
        <span className="text-xl">{category?.icon || "📦"}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <p className="font-medium text-sm truncate">
              {category?.name || alert.budget.category_id}
            </p>
            <div className="flex items-center gap-1">
              <Icon className={cn("w-3 h-3", config.color)} />
              <span className={cn("text-xs font-bold", config.color)}>
                {alert.percentage.toFixed(0)}%
              </span>
            </div>
          </div>
          
          <Progress 
            value={progressValue} 
            className={cn(
              "h-1.5 mb-1.5",
              alert.status === "exceeded" && "[&>div]:bg-destructive",
              alert.status === "warning" && "[&>div]:bg-warning"
            )} 
          />
          
          <p className="text-xs text-muted-foreground">
            {formatCurrency(alert.spent)} de {formatCurrency(alert.budget.monthly_limit)}
            {alert.status !== "exceeded" && alert.remaining > 0 && (
              <span className="text-success font-medium">
                {" "}• Restam {formatCurrency(alert.remaining)}
              </span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

export function BudgetAlertsWidget({ 
  month, 
  year, 
  onViewAll,
  onAdjustBudget,
  limit = 3 
}: BudgetAlertsWidgetProps) {
  const { data: alerts = [], isLoading } = useBudgetAlerts(month, year);

  if (isLoading) {
    return (
      <Card className="border-dashed animate-pulse">
        <CardContent className="p-4">
          <div className="h-20 bg-muted rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  // Sort: exceeded first, then warning, then ok
  const sortedAlerts = [...alerts].sort((a, b) => {
    const order = { exceeded: 0, warning: 1, ok: 2 };
    return order[a.status] - order[b.status];
  });

  // Show exceeded and warning first, limit total
  const criticalAlerts = sortedAlerts.filter(a => a.status === "exceeded" || a.status === "warning");
  const displayAlerts = criticalAlerts.length > 0 
    ? criticalAlerts.slice(0, limit)
    : sortedAlerts.slice(0, limit);

  if (alerts.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="p-4 text-center">
          <Target className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Nenhuma meta de orçamento definida
          </p>
          {onViewAll && (
            <Button variant="link" size="sm" onClick={onViewAll} className="mt-2">
              Definir metas
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  const exceededCount = alerts.filter(a => a.status === "exceeded").length;
  const warningCount = alerts.filter(a => a.status === "warning").length;

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">Orçamento</h3>
          </div>
          
          <div className="flex items-center gap-2">
            {exceededCount > 0 && (
              <span className="text-xs bg-destructive/20 text-destructive px-2 py-0.5 rounded-full font-medium">
                {exceededCount} excedido{exceededCount > 1 ? "s" : ""}
              </span>
            )}
            {warningCount > 0 && (
              <span className="text-xs bg-warning/20 text-warning px-2 py-0.5 rounded-full font-medium">
                {warningCount} alerta{warningCount > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-2">
          {displayAlerts.map((alert) => (
            <BudgetAlertItem key={alert.budget.id} alert={alert} />
          ))}
        </div>

        {alerts.length > limit && onViewAll && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onViewAll}
            className="w-full text-xs"
          >
            Ver todos ({alerts.length})
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
