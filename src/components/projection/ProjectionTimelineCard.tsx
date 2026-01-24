import { AlertTriangle, TrendingUp, TrendingDown, ChevronRight } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface MonthProjectionSummary {
  month: string;
  monthLabel: string;
  incomeProjected: number;
  expenseProjected: number;
  balanceProjected: number;
  creditCardInstallments: number;
}

interface ProjectionTimelineCardProps {
  projections: MonthProjectionSummary[];
  selectedIndex: number;
  onSelectMonth: (index: number) => void;
}

export function ProjectionTimelineCard({
  projections,
  selectedIndex,
  onSelectMonth,
}: ProjectionTimelineCardProps) {
  return (
    <div className="overflow-x-auto pb-2 -mx-4 px-4">
      <div className="flex gap-3" style={{ minWidth: "max-content" }}>
        {projections.map((proj, idx) => {
          const isSelected = idx === selectedIndex;
          const isNegative = proj.balanceProjected < 0;
          const installmentRatio = proj.incomeProjected > 0 
            ? proj.creditCardInstallments / proj.incomeProjected 
            : 0;
          const hasWarning = isNegative || installmentRatio > 0.3;

          return (
            <motion.button
              key={proj.month}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.05 }}
              onClick={() => onSelectMonth(idx)}
              className={cn(
                "w-28 p-3 rounded-xl border transition-all text-left flex-shrink-0",
                isSelected 
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20" 
                  : "border-border hover:border-primary/50",
                hasWarning && !isSelected && "border-warning/50 bg-warning/5"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-xs">{proj.monthLabel}</span>
                {hasWarning && (
                  <AlertTriangle className="w-3 h-3 text-warning" />
                )}
              </div>
              
              <div className={cn(
                "text-base font-bold",
                isNegative ? "text-destructive" : "text-success"
              )}>
                {formatCurrency(proj.balanceProjected)}
              </div>
              
              <div className="flex items-center gap-1 mt-1">
                {proj.balanceProjected >= 0 ? (
                  <TrendingUp className="w-3 h-3 text-success" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-destructive" />
                )}
                <span className="text-[10px] text-muted-foreground">
                  Saldo projetado
                </span>
              </div>

              {isSelected && (
                <motion.div
                  layoutId="selection-indicator"
                  className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-primary rounded-full"
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
