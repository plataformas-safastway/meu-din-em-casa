import { Lightbulb, TrendingUp, AlertTriangle, Info, ChevronRight } from "lucide-react";
import { Insight } from "@/types/finance";
import { cn } from "@/lib/utils";

interface InsightCardProps {
  insight: Insight;
}

const insightConfig = {
  tip: {
    icon: Lightbulb,
    bgColor: "bg-info/10",
    borderColor: "border-l-info",
    iconColor: "text-info",
  },
  success: {
    icon: TrendingUp,
    bgColor: "bg-success/10",
    borderColor: "border-l-success",
    iconColor: "text-success",
  },
  warning: {
    icon: AlertTriangle,
    bgColor: "bg-warning/10",
    borderColor: "border-l-warning",
    iconColor: "text-warning",
  },
  info: {
    icon: Info,
    bgColor: "bg-muted",
    borderColor: "border-l-muted-foreground",
    iconColor: "text-muted-foreground",
  },
};

export function InsightCard({ insight }: InsightCardProps) {
  const config = insightConfig[insight.type];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "rounded-xl border-l-4 p-4 animate-slide-up",
        config.bgColor,
        config.borderColor
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn("mt-0.5", config.iconColor)}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 space-y-1">
          <h4 className="font-semibold text-foreground text-sm">
            {insight.title}
          </h4>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {insight.message}
          </p>
        </div>
        <button className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

interface InsightListProps {
  insights: Insight[];
  onViewAll?: () => void;
  onInsightClick?: (insightId: string) => void;
}

export function InsightList({ insights, onViewAll, onInsightClick }: InsightListProps) {
  const sortedInsights = [...insights].sort((a, b) => a.priority - b.priority);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Insights da Família</h3>
        {onViewAll && (
          <button 
            onClick={onViewAll}
            className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
          >
            Ver todos
          </button>
        )}
      </div>
      <div className="space-y-3">
        {sortedInsights.slice(0, 3).map((insight, index) => (
          <div 
            key={insight.id} 
            style={{ animationDelay: `${index * 100}ms` }}
            onClick={() => onInsightClick?.(insight.id)}
            className={onInsightClick ? "cursor-pointer" : ""}
          >
            <InsightCard insight={insight} />
          </div>
        ))}
      </div>
    </div>
  );
}
