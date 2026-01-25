/**
 * Suggestion Badge Component
 * 
 * Displays a discrete badge indicating that a category/subcategory
 * was auto-suggested by the system.
 */

import { Sparkles, History, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export interface SuggestionBadgeProps {
  source: 'history' | 'descriptor' | 'none';
  confidence: number;
  matchCount?: number;
  className?: string;
}

export function SuggestionBadge({ 
  source, 
  confidence, 
  matchCount,
  className 
}: SuggestionBadgeProps) {
  if (source === 'none') return null;
  
  const Icon = source === 'history' ? History : BookOpen;
  
  const tooltipContent = source === 'history'
    ? `Sugestão baseada em ${matchCount || 'suas'} transações anteriores similares`
    : 'Sugestão baseada no padrão do descritor bancário';
  
  // Color based on confidence
  const badgeClass = confidence >= 0.8
    ? 'bg-primary/10 text-primary border-primary/20'
    : confidence >= 0.5
    ? 'bg-muted text-muted-foreground border-border'
    : 'bg-muted/50 text-muted-foreground/70 border-border/50';
  
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span 
            className={cn(
              "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium border",
              badgeClass,
              className
            )}
          >
            <Sparkles className="w-3 h-3" />
            Sugestão
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          <div className="flex items-center gap-1.5">
            <Icon className="w-3.5 h-3.5" />
            {tooltipContent}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Inline suggestion indicator for form fields
 */
export function SuggestionIndicator({
  source,
  confidence,
  onAccept,
  onReject,
  className,
}: {
  source: 'history' | 'descriptor' | 'none';
  confidence: number;
  onAccept?: () => void;
  onReject?: () => void;
  className?: string;
}) {
  if (source === 'none') return null;
  
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <SuggestionBadge source={source} confidence={confidence} />
      {onAccept && onReject && (
        <div className="flex items-center gap-1 text-xs">
          <button
            type="button"
            onClick={onAccept}
            className="text-primary hover:underline"
          >
            Aceitar
          </button>
          <span className="text-muted-foreground">·</span>
          <button
            type="button"
            onClick={onReject}
            className="text-muted-foreground hover:text-foreground hover:underline"
          >
            Alterar
          </button>
        </div>
      )}
    </div>
  );
}
