import { Badge } from "@/components/ui/badge";
import { 
  ExpenseNature, 
  getExpenseNatureBadge, 
  getExpenseNatureColor,
  getExpenseNatureLabel
} from "@/lib/expenseNature";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Lock, Activity, Sparkles, HelpCircle } from "lucide-react";

interface ExpenseNatureBadgeProps {
  nature: ExpenseNature;
  source?: 'USER' | 'SYSTEM_RULE' | 'AI_INFERENCE';
  confidence?: number;
  showTooltip?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

const sourceLabels = {
  USER: 'Definido por você',
  SYSTEM_RULE: 'Classificação automática',
  AI_INFERENCE: 'Inferido por padrão',
};

const sourceIcons = {
  USER: Lock,
  SYSTEM_RULE: Activity,
  AI_INFERENCE: Sparkles,
};

export function ExpenseNatureBadge({
  nature,
  source,
  confidence,
  showTooltip = true,
  size = 'sm',
  className,
}: ExpenseNatureBadgeProps) {
  const label = getExpenseNatureBadge(nature);
  const colorClass = getExpenseNatureColor(nature);
  const SourceIcon = source ? sourceIcons[source] : HelpCircle;
  
  const badge = (
    <Badge 
      variant="secondary"
      className={cn(
        colorClass,
        size === 'sm' ? 'text-[10px] px-1.5 py-0' : 'text-xs px-2 py-0.5',
        'font-medium inline-flex items-center gap-1',
        className
      )}
    >
      {source && <SourceIcon className={size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'} />}
      {label}
    </Badge>
  );
  
  if (!showTooltip) return badge;
  
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {badge}
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs">
        <div className="space-y-1">
          <p className="font-medium">{getExpenseNatureLabel(nature)}</p>
          {source && (
            <p className="text-xs text-muted-foreground">
              {sourceLabels[source]}
              {confidence && ` (${Math.round(confidence * 100)}% confiança)`}
            </p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
