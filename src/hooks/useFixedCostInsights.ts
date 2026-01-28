import { useMemo } from 'react';
import { useFixedCostComparison, useFixedCostRatio } from './useExpenseNature';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { formatCurrency } from '@/lib/formatters';
import { Insight } from '@/types/finance';

interface FixedCostInsight extends Insight {
  fixedCostData?: {
    currentAmount: number;
    previousAmount: number;
    difference: number;
    percentageChange: number;
    ratio?: number;
  };
}

/**
 * Generate insights about fixed costs changes
 */
export function useFixedCostInsights(monthRef?: string): {
  insights: FixedCostInsight[];
  isLoading: boolean;
} {
  const targetMonth = monthRef || format(new Date(), 'yyyy-MM');
  const { data: comparison, isLoading: loadingComparison } = useFixedCostComparison(targetMonth);
  const { data: ratioData, isLoading: loadingRatio } = useFixedCostRatio(targetMonth);
  
  const isLoading = loadingComparison || loadingRatio;
  
  const insights = useMemo(() => {
    const result: FixedCostInsight[] = [];
    
    if (!comparison) return result;
    
    const { direction, difference, percentageChange, topChanges, currentAmount, previousAmount } = comparison;
    
    // Main insight about change direction
    if (direction === 'increase' && Math.abs(percentageChange) >= 5) {
      const topIncreases = topChanges
        .filter(c => c.difference > 0)
        .slice(0, 3);
      
      const responsibleText = topIncreases.length > 0
        ? `\n\nPrincipais responsáveis:\n${topIncreases.map(c => 
            `• ${c.categoryName} (+${formatCurrency(c.difference)})`
          ).join('\n')}`
        : '';
      
      result.push({
        id: 'fixed-cost-increase',
        type: 'warning',
        title: 'Custo fixo aumentou',
        message: `Seu custo fixo estrutural aumentou ${formatCurrency(Math.abs(difference))} (${Math.abs(percentageChange).toFixed(0)}%) este mês.${responsibleText}`,
        priority: 1,
        fixedCostData: {
          currentAmount,
          previousAmount,
          difference,
          percentageChange,
          ratio: ratioData?.ratio,
        },
      });
    } else if (direction === 'decrease' && Math.abs(percentageChange) >= 5) {
      const topDecreases = topChanges
        .filter(c => c.difference < 0)
        .slice(0, 3);
      
      const responsibleText = topDecreases.length > 0
        ? `\n\nPrincipais reduções:\n${topDecreases.map(c => 
            `• ${c.categoryName} (${formatCurrency(c.difference)})`
          ).join('\n')}`
        : '';
      
      result.push({
        id: 'fixed-cost-decrease',
        type: 'success',
        title: 'Custo fixo reduziu! 🎉',
        message: `Parabéns! Seu custo fixo estrutural diminuiu ${formatCurrency(Math.abs(difference))} (${Math.abs(percentageChange).toFixed(0)}%) este mês.${responsibleText}`,
        priority: 3,
        fixedCostData: {
          currentAmount,
          previousAmount,
          difference,
          percentageChange,
          ratio: ratioData?.ratio,
        },
      });
    } else if (direction === 'stable') {
      result.push({
        id: 'fixed-cost-stable',
        type: 'info',
        title: 'Custo fixo estável',
        message: `Seu custo fixo estrutural permaneceu estável em ${formatCurrency(currentAmount)} este mês.`,
        priority: 4,
        fixedCostData: {
          currentAmount,
          previousAmount,
          difference: 0,
          percentageChange: 0,
          ratio: ratioData?.ratio,
        },
      });
    }
    
    // Insight about fixed cost ratio (% of income)
    if (ratioData && ratioData.incomeAmount > 0) {
      if (ratioData.ratio > 70) {
        result.push({
          id: 'fixed-cost-ratio-high',
          type: 'warning',
          title: 'Comprometimento alto',
          message: `${ratioData.ratio.toFixed(0)}% da sua renda está comprometida com custos fixos. Isso reduz muito sua flexibilidade financeira.`,
          priority: 1,
        });
      } else if (ratioData.ratio > 50) {
        result.push({
          id: 'fixed-cost-ratio-medium',
          type: 'tip',
          title: 'Atenção ao custo fixo',
          message: `${ratioData.ratio.toFixed(0)}% da sua renda está comprometida com custos fixos. Idealmente, mantenha abaixo de 50%.`,
          priority: 2,
        });
      } else if (ratioData.ratio <= 40 && currentAmount > 0) {
        result.push({
          id: 'fixed-cost-ratio-good',
          type: 'success',
          title: 'Boa estrutura de custos',
          message: `Apenas ${ratioData.ratio.toFixed(0)}% da sua renda está em custos fixos. Isso dá mais flexibilidade para investir e realizar objetivos.`,
          priority: 4,
        });
      }
    }
    
    return result.sort((a, b) => a.priority - b.priority);
  }, [comparison, ratioData]);
  
  return { insights, isLoading };
}

/**
 * Get a summary of fixed costs for display
 */
export function useFixedCostSummary(monthRef?: string) {
  const targetMonth = monthRef || format(new Date(), 'yyyy-MM');
  const { data: comparison, currentData, isLoading } = useFixedCostComparison(targetMonth);
  const { data: ratioData } = useFixedCostRatio(targetMonth);
  
  return {
    currentMonth: targetMonth,
    totalFixed: currentData?.totalFixedAmount || 0,
    categoryBreakdown: currentData?.categoryBreakdown || [],
    transactionCount: currentData?.transactionCount || 0,
    comparison,
    ratio: ratioData?.ratio || 0,
    riskLevel: ratioData?.riskLevel || 'low',
    isLoading,
  };
}
