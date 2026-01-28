import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { 
  ExpenseNature, 
  ExpenseNatureResult,
  ExpenseNatureOverride,
  MonthlyFixedCost,
  CategoryFixedBreakdown,
  FixedCostChange,
  CategoryChange
} from "@/lib/expenseNature/types";
import { 
  classifyExpenseNature, 
  ClassificationInput,
  TransactionHistory 
} from "@/lib/expenseNature/classifier";
import { getCategoryById, getSubcategoryName } from "@/data/categories";
import { format, subMonths, parseISO } from "date-fns";
import { toast } from "sonner";

/**
 * Fetch expense nature overrides for the family
 */
export function useExpenseNatureOverrides() {
  const { family } = useAuth();
  
  return useQuery({
    queryKey: ['expense-nature-overrides', family?.id],
    queryFn: async () => {
      if (!family?.id) return [];
      
      const { data, error } = await supabase
        .from('expense_nature_overrides')
        .select('*')
        .eq('family_id', family.id);
      
      if (error) throw error;
      
      return (data || []).map(row => ({
        id: row.id,
        familyId: row.family_id,
        categoryId: row.category_id,
        subcategoryId: row.subcategory_id,
        merchantKey: row.merchant_key,
        expenseNature: row.expense_nature as ExpenseNature,
        createdBy: row.created_by,
        createdAt: row.created_at,
      })) as ExpenseNatureOverride[];
    },
    enabled: !!family?.id,
  });
}

/**
 * Build override map from overrides array
 */
function buildOverrideMap(overrides: ExpenseNatureOverride[]): Map<string, ExpenseNature> {
  const map = new Map<string, ExpenseNature>();
  
  for (const override of overrides) {
    const parts = [override.categoryId || ''];
    if (override.subcategoryId) parts.push(override.subcategoryId);
    if (override.merchantKey) parts.push(override.merchantKey);
    const key = parts.filter(Boolean).join('::');
    map.set(key, override.expenseNature);
  }
  
  return map;
}

/**
 * Classify a single transaction's expense nature
 */
export function useClassifyExpenseNature() {
  const { data: overrides } = useExpenseNatureOverrides();
  const overrideMap = overrides ? buildOverrideMap(overrides) : new Map();
  
  return (input: ClassificationInput): ExpenseNatureResult => {
    return classifyExpenseNature(input, overrideMap);
  };
}

/**
 * Save an expense nature override (user correction)
 */
export function useSaveExpenseNatureOverride() {
  const queryClient = useQueryClient();
  const { family } = useAuth();
  
  return useMutation({
    mutationFn: async ({
      categoryId,
      subcategoryId,
      merchantKey,
      expenseNature,
    }: {
      categoryId?: string;
      subcategoryId?: string;
      merchantKey?: string;
      expenseNature: ExpenseNature;
    }) => {
      if (!family?.id) throw new Error('No family selected');
      
      const { data: { user } } = await supabase.auth.getUser();
      
      // Upsert the override
      const { error } = await supabase
        .from('expense_nature_overrides')
        .upsert({
          family_id: family.id,
          category_id: categoryId,
          subcategory_id: subcategoryId,
          merchant_key: merchantKey,
          expense_nature: expenseNature,
          created_by: user?.id,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'family_id,category_id,subcategory_id',
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expense-nature-overrides'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-fixed-costs'] });
      toast.success('Classificação salva com sucesso');
    },
    onError: (error) => {
      console.error('Error saving override:', error);
      toast.error('Erro ao salvar classificação');
    },
  });
}

/**
 * Update transaction expense nature directly
 */
export function useUpdateTransactionNature() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({
      transactionId,
      expenseNature,
      expenseNatureSource,
    }: {
      transactionId: string;
      expenseNature: ExpenseNature;
      expenseNatureSource: 'USER' | 'SYSTEM_RULE' | 'AI_INFERENCE';
    }) => {
      const { error } = await supabase
        .from('transactions')
        .update({
          expense_nature: expenseNature,
          expense_nature_source: expenseNatureSource,
        })
        .eq('id', transactionId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-fixed-costs'] });
    },
  });
}

/**
 * Calculate monthly fixed costs for a specific month
 */
export function useMonthlyFixedCosts(monthRef?: string) {
  const { family } = useAuth();
  const targetMonth = monthRef || format(new Date(), 'yyyy-MM');
  
  return useQuery({
    queryKey: ['monthly-fixed-costs', family?.id, targetMonth],
    queryFn: async () => {
      if (!family?.id) return null;
      
      // Get all FIXED expenses for the month
      const startDate = `${targetMonth}-01`;
      const endDate = `${targetMonth}-31`;
      
      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('family_id', family.id)
        .eq('type', 'expense')
        .eq('expense_nature', 'FIXED')
        .gte('cash_date', startDate)
        .lte('cash_date', endDate);
      
      if (error) throw error;
      
      // Group by category
      const categoryTotals = new Map<string, { amount: number; subcategories: Map<string, number> }>();
      
      for (const tx of transactions || []) {
        const catId = tx.category_id || 'unknown';
        const subId = tx.subcategory_id;
        
        if (!categoryTotals.has(catId)) {
          categoryTotals.set(catId, { amount: 0, subcategories: new Map() });
        }
        
        const cat = categoryTotals.get(catId)!;
        cat.amount += Number(tx.amount);
        
        if (subId) {
          cat.subcategories.set(subId, (cat.subcategories.get(subId) || 0) + Number(tx.amount));
        }
      }
      
      // Build breakdown
      const breakdown: CategoryFixedBreakdown[] = [];
      let total = 0;
      
      for (const [catId, data] of categoryTotals) {
        const category = getCategoryById(catId);
        total += data.amount;
        
        breakdown.push({
          categoryId: catId,
          categoryName: category?.name || catId,
          amount: data.amount,
          subcategories: Array.from(data.subcategories.entries()).map(([subId, amount]) => ({
            subcategoryId: subId,
            subcategoryName: getSubcategoryName(catId, subId) || subId,
            amount,
          })),
        });
      }
      
      // Sort by amount descending
      breakdown.sort((a, b) => b.amount - a.amount);
      
      return {
        monthRef: targetMonth,
        totalFixedAmount: total,
        categoryBreakdown: breakdown,
        transactionCount: transactions?.length || 0,
      };
    },
    enabled: !!family?.id,
  });
}

/**
 * Compare fixed costs between two months
 */
export function useFixedCostComparison(currentMonthRef?: string) {
  const current = currentMonthRef || format(new Date(), 'yyyy-MM');
  const previous = format(subMonths(parseISO(`${current}-01`), 1), 'yyyy-MM');
  
  const { data: currentData, isLoading: loadingCurrent } = useMonthlyFixedCosts(current);
  const { data: previousData, isLoading: loadingPrevious } = useMonthlyFixedCosts(previous);
  
  const isLoading = loadingCurrent || loadingPrevious;
  
  const comparison: FixedCostChange | null = (currentData && previousData) ? (() => {
    const currentAmount = currentData.totalFixedAmount;
    const previousAmount = previousData.totalFixedAmount;
    const difference = currentAmount - previousAmount;
    const percentageChange = previousAmount > 0 
      ? (difference / previousAmount) * 100 
      : (currentAmount > 0 ? 100 : 0);
    
    // Calculate category-level changes
    const categoryChanges: CategoryChange[] = [];
    const allCategoryIds = new Set([
      ...currentData.categoryBreakdown.map(c => c.categoryId),
      ...previousData.categoryBreakdown.map(c => c.categoryId),
    ]);
    
    for (const catId of allCategoryIds) {
      const currentCat = currentData.categoryBreakdown.find(c => c.categoryId === catId);
      const previousCat = previousData.categoryBreakdown.find(c => c.categoryId === catId);
      const currentAmt = currentCat?.amount || 0;
      const previousAmt = previousCat?.amount || 0;
      
      if (currentAmt !== previousAmt) {
        categoryChanges.push({
          categoryId: catId,
          categoryName: currentCat?.categoryName || previousCat?.categoryName || catId,
          previousAmount: previousAmt,
          currentAmount: currentAmt,
          difference: currentAmt - previousAmt,
        });
      }
    }
    
    // Sort by absolute difference
    categoryChanges.sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference));
    
    return {
      previousMonth: previous,
      currentMonth: current,
      previousAmount,
      currentAmount,
      difference,
      percentageChange,
      direction: Math.abs(percentageChange) < 2 
        ? 'stable' 
        : difference > 0 
          ? 'increase' 
          : 'decrease',
      topChanges: categoryChanges.slice(0, 5),
    } as FixedCostChange;
  })() : null;
  
  return {
    data: comparison,
    currentData,
    previousData,
    isLoading,
  };
}

/**
 * Get fixed cost ratio (fixed costs / income)
 */
export function useFixedCostRatio(monthRef?: string) {
  const { family } = useAuth();
  const targetMonth = monthRef || format(new Date(), 'yyyy-MM');
  
  const { data: fixedCosts, isLoading: loadingFixed } = useMonthlyFixedCosts(targetMonth);
  
  return useQuery({
    queryKey: ['fixed-cost-ratio', family?.id, targetMonth],
    queryFn: async () => {
      if (!family?.id || !fixedCosts) return null;
      
      // Get total income for the month
      const startDate = `${targetMonth}-01`;
      const endDate = `${targetMonth}-31`;
      
      const { data: incomes, error } = await supabase
        .from('transactions')
        .select('amount')
        .eq('family_id', family.id)
        .eq('type', 'income')
        .gte('cash_date', startDate)
        .lte('cash_date', endDate);
      
      if (error) throw error;
      
      const totalIncome = (incomes || []).reduce((sum, t) => sum + Number(t.amount), 0);
      const ratio = totalIncome > 0 ? (fixedCosts.totalFixedAmount / totalIncome) * 100 : 0;
      
      return {
        fixedAmount: fixedCosts.totalFixedAmount,
        incomeAmount: totalIncome,
        ratio,
        riskLevel: ratio > 70 ? 'high' : ratio > 50 ? 'medium' : 'low',
      };
    },
    enabled: !!family?.id && !!fixedCosts,
  });
}
