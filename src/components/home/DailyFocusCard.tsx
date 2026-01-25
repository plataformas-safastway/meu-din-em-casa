import { memo, useMemo } from "react";
import { Lightbulb, CreditCard, Target, TrendingUp, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { BestCardSuggestion } from "@/hooks/useHomeSummary";
import { Insight } from "@/types/finance";

interface DailyFocusCardProps {
  insights: Insight[];
  bestCardSuggestion: BestCardSuggestion | null;
  goalsNearCompletion?: { title: string; progress: number }[];
  budgetAlerts?: { category: string; usedPercent: number }[];
}

interface FocusItem {
  id: string;
  icon: typeof Lightbulb;
  iconColor: string;
  bgColor: string;
  borderColor: string;
  message: string;
  priority: number;
}

export const DailyFocusCard = memo(function DailyFocusCard({
  insights,
  bestCardSuggestion,
  goalsNearCompletion = [],
  budgetAlerts = [],
}: DailyFocusCardProps) {
  // Determine single most important focus item
  const focusItem = useMemo((): FocusItem | null => {
    const items: FocusItem[] = [];

    // Priority 1: Budget alerts over 80%
    const highBudgetAlert = budgetAlerts.find(b => b.usedPercent >= 80);
    if (highBudgetAlert) {
      items.push({
        id: "budget-alert",
        icon: TrendingUp,
        iconColor: "text-warning",
        bgColor: "bg-warning/10",
        borderColor: "border-l-warning",
        message: `A categoria ${highBudgetAlert.category} já passou de ${highBudgetAlert.usedPercent.toFixed(0)}% do orçamento.`,
        priority: 1,
      });
    }

    // Priority 2: Best card suggestion
    if (bestCardSuggestion) {
      items.push({
        id: "best-card",
        icon: CreditCard,
        iconColor: "text-info",
        bgColor: "bg-info/10",
        borderColor: "border-l-info",
        message: `Hoje, o melhor cartão para usar é o ${bestCardSuggestion.title}.`,
        priority: 2,
      });
    }

    // Priority 3: Goals near completion
    const nearGoal = goalsNearCompletion.find(g => g.progress >= 80 && g.progress < 100);
    if (nearGoal) {
      items.push({
        id: "goal-near",
        icon: Target,
        iconColor: "text-success",
        bgColor: "bg-success/10",
        borderColor: "border-l-success",
        message: `O objetivo "${nearGoal.title}" está ${nearGoal.progress.toFixed(0)}% completo. Falta pouco!`,
        priority: 3,
      });
    }

    // Priority 4: First insight (if any)
    if (insights.length > 0) {
      const topInsight = insights[0];
      const insightConfig = {
        warning: { icon: TrendingUp, color: "text-warning", bg: "bg-warning/10", border: "border-l-warning" },
        success: { icon: CheckCircle2, color: "text-success", bg: "bg-success/10", border: "border-l-success" },
        tip: { icon: Lightbulb, color: "text-info", bg: "bg-info/10", border: "border-l-info" },
        info: { icon: Lightbulb, color: "text-muted-foreground", bg: "bg-muted", border: "border-l-muted-foreground" },
      };
      const cfg = insightConfig[topInsight.type] || insightConfig.info;
      
      items.push({
        id: topInsight.id,
        icon: cfg.icon,
        iconColor: cfg.color,
        bgColor: cfg.bg,
        borderColor: cfg.border,
        message: topInsight.message,
        priority: 4,
      });
    }

    // Sort by priority and return the first one
    items.sort((a, b) => a.priority - b.priority);
    return items[0] || null;
  }, [insights, bestCardSuggestion, goalsNearCompletion, budgetAlerts]);

  // If no focus item, show "all good" message
  if (!focusItem) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="rounded-2xl border-l-4 border-l-success bg-success/10 p-4"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-success/20">
            <CheckCircle2 className="w-5 h-5 text-success" />
          </div>
          <p className="text-sm text-foreground font-medium">
            Nenhuma ação necessária hoje. Está tudo sob controle.
          </p>
        </div>
      </motion.div>
    );
  }

  const Icon = focusItem.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className={cn(
        "rounded-2xl border-l-4 p-4",
        focusItem.bgColor,
        focusItem.borderColor
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn("p-2 rounded-xl", focusItem.bgColor.replace("/10", "/20"))}>
          <Icon className={cn("w-5 h-5", focusItem.iconColor)} />
        </div>
        <div className="flex-1">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide mb-1">
            Foco do dia
          </p>
          <p className="text-sm text-foreground leading-relaxed">
            {focusItem.message}
          </p>
        </div>
      </div>
    </motion.div>
  );
});
