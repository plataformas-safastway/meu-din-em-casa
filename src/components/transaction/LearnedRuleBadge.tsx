/**
 * Learned Rule Badge Component
 * 
 * Displays badges indicating the source of a category suggestion:
 * - "Aprendido" for learned rules from user corrections
 * - "Sugestão" for regex/heuristic matches
 */

import { Brain, Sparkles, Users, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { LearningScope, PredictionSource } from '@/hooks/useLearnedCategorization';

export interface LearnedRuleBadgeProps {
  source: PredictionSource;
  confidence: number;
  scope?: LearningScope;
  matchCount?: number;
  fingerprintType?: 'strong' | 'weak';
  hasConflict?: boolean;
  className?: string;
}

export function LearnedRuleBadge({
  source,
  confidence,
  scope,
  matchCount,
  fingerprintType,
  hasConflict,
  className,
}: LearnedRuleBadgeProps) {
  if (source === 'fallback' || confidence === 0) return null;
  
  const isLearned = source === 'learned';
  const Icon = isLearned ? Brain : Sparkles;
  const ScopeIcon = scope === 'family' ? Users : User;
  
  // Badge styling based on source and confidence
  const getBadgeClass = () => {
    if (hasConflict) {
      return 'bg-warning/10 text-warning border-warning/20';
    }
    
    if (isLearned) {
      if (confidence >= 0.9) {
        return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
      }
      if (confidence >= 0.8) {
        return 'bg-primary/10 text-primary border-primary/20';
      }
      return 'bg-muted text-muted-foreground border-border';
    }
    
    // Regex/heuristic sources
    if (confidence >= 0.8) {
      return 'bg-primary/10 text-primary border-primary/20';
    }
    if (confidence >= 0.6) {
      return 'bg-muted text-muted-foreground border-border';
    }
    return 'bg-muted/50 text-muted-foreground/70 border-border/50';
  };
  
  const getLabel = () => {
    if (isLearned) return 'Aprendido';
    if (source === 'regex') return 'Sugestão';
    if (source === 'heuristic') return 'Inferido';
    return 'Sugestão';
  };
  
  const getTooltipContent = () => {
    if (isLearned) {
      const scopeText = scope === 'family' ? 'pela família' : 'por você';
      const countText = matchCount && matchCount > 1 
        ? `Confirmado ${matchCount} vezes ${scopeText}` 
        : `Aprendido ${scopeText}`;
      const confidenceText = `Confiança: ${Math.round(confidence * 100)}%`;
      const typeText = fingerprintType === 'strong' 
        ? 'Identificação forte' 
        : 'Identificação por padrão';
      
      return (
        <div className="space-y-1">
          <p className="font-medium">{countText}</p>
          <p className="text-xs text-muted-foreground">{typeText}</p>
          <p className="text-xs text-muted-foreground">{confidenceText}</p>
          {hasConflict && (
            <p className="text-xs text-warning">
              ⚠️ Este padrão tem categorias conflitantes
            </p>
          )}
        </div>
      );
    }
    
    if (source === 'regex') {
      return 'Sugestão baseada no padrão do descritor bancário';
    }
    
    return 'Sugestão automática';
  };
  
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium border',
              getBadgeClass(),
              className
            )}
          >
            <Icon className="w-3 h-3" />
            {getLabel()}
            {isLearned && scope && (
              <ScopeIcon className="w-2.5 h-2.5 ml-0.5 opacity-60" />
            )}
          </span>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs max-w-[200px]">
          {getTooltipContent()}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Inline component for showing "apply to future" options
 */
export interface ApplyToFutureOptionsProps {
  onApplyUser: () => void;
  onApplyFamily: () => void;
  onApplyOnce: () => void;
  isLoading?: boolean;
  className?: string;
}

export function ApplyToFutureOptions({
  onApplyUser,
  onApplyFamily,
  onApplyOnce,
  isLoading,
  className,
}: ApplyToFutureOptionsProps) {
  return (
    <div className={cn('flex flex-col gap-2 p-3 bg-muted/50 rounded-lg border', className)}>
      <p className="text-xs font-medium text-foreground">
        Aplicar esta categoria para compras futuras?
      </p>
      
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onApplyUser}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md
                     bg-primary text-primary-foreground hover:bg-primary/90
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <User className="w-3.5 h-3.5" />
          Só para mim
        </button>
        
        <button
          type="button"
          onClick={onApplyFamily}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md
                     bg-secondary text-secondary-foreground hover:bg-secondary/80
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <Users className="w-3.5 h-3.5" />
          Para a família
        </button>
        
        <button
          type="button"
          onClick={onApplyOnce}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md
                     border bg-background text-muted-foreground hover:bg-muted
                     disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Só esta vez
        </button>
      </div>
    </div>
  );
}
