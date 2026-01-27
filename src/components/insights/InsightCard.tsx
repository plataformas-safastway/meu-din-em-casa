import { Lightbulb, TrendingUp, AlertTriangle, CheckCircle2, Info, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ContextualInsight } from "@/hooks/useInsightsHub";
import { getCategoryById } from "@/data/categories";
import { cn } from "@/lib/utils";

interface InsightCardProps {
  insight: ContextualInsight;
  onClick?: () => void;
}

const insightConfig = {
  warning: {
    icon: AlertTriangle,
    bgColor: "bg-warning/10",
    borderColor: "border-l-warning",
    iconColor: "text-warning",
    badgeVariant: "destructive" as const,
  },
  success: {
    icon: CheckCircle2,
    bgColor: "bg-success/10",
    borderColor: "border-l-success",
    iconColor: "text-success",
    badgeVariant: "default" as const,
  },
  tip: {
    icon: Lightbulb,
    bgColor: "bg-info/10",
    borderColor: "border-l-info",
    iconColor: "text-info",
    badgeVariant: "secondary" as const,
  },
  info: {
    icon: Info,
    bgColor: "bg-muted",
    borderColor: "border-l-muted-foreground",
    iconColor: "text-muted-foreground",
    badgeVariant: "outline" as const,
  },
};

export function InsightCard({ insight, onClick }: InsightCardProps) {
  const config = insightConfig[insight.type];
  const Icon = config.icon;
  const category = insight.category ? getCategoryById(insight.category) : null;

  return (
    <Card
      className={cn(
        "border-l-4 transition-all duration-200 cursor-pointer hover:shadow-md",
        config.bgColor,
        config.borderColor,
        onClick && "hover:scale-[1.01]"
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn("mt-0.5 shrink-0", config.iconColor)}>
            <Icon className="w-5 h-5" />
          </div>
          
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h4 className="font-semibold text-foreground text-sm leading-tight">
                {insight.title}
              </h4>
              {insight.percentage !== undefined && (
                <Badge variant={config.badgeVariant} className="shrink-0 text-xs">
                  {insight.percentage > 0 ? "+" : ""}
                  {insight.percentage.toFixed(0)}%
                </Badge>
              )}
            </div>
            
            <p className="text-sm text-muted-foreground leading-relaxed">
              {insight.description}
            </p>
            
            {insight.reason && (
              <p className="text-xs text-muted-foreground/80 italic">
                💡 {insight.reason}
              </p>
            )}

            {category && (
              <div className="flex items-center gap-2 mt-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <span className="text-xs text-muted-foreground">
                  {category.name}
                </span>
              </div>
            )}

            {insight.amount !== undefined && (
              <div className="text-sm font-medium text-foreground">
                {insight.amount.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </div>
            )}
          </div>

          {insight.actionUrl && (
            <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
          )}
        </div>

        {insight.actionLabel && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <span className="text-sm font-medium text-primary">
              {insight.actionLabel} →
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
