import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, addMonths } from "date-fns";
import type { Json } from "@/integrations/supabase/types";

export type BudgetVersionSourceType = "onboarding_only" | "transactions_based";
export type BudgetVersionStatus = "draft" | "active" | "archived";

export interface BudgetVersion {
  id: string;
  family_id: string;
  source_type: BudgetVersionSourceType;
  effective_month: string; // YYYY-MM
  status: BudgetVersionStatus;
  notes: string | null;
  input_snapshot: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BudgetVersionItem {
  id: string;
  budget_version_id: string;
  category_id: string;
  subcategory_id: string | null;
  suggested_amount: number;
  min_amount: number | null;
  max_amount: number | null;
  confidence: number | null;
  rationale: string | null;
  created_at: string;
}

export interface CreateBudgetVersionInput {
  source_type: BudgetVersionSourceType;
  effective_month: string;
  notes?: string;
  input_snapshot?: Record<string, unknown>;
  items: Omit<BudgetVersionItem, "id" | "budget_version_id" | "created_at">[];
}

// Hook to list all budget versions for the family
export function useBudgetVersions() {
  const { family } = useAuth();

  return useQuery({
    queryKey: ["budget-versions", family?.id],
    queryFn: async () => {
      if (!family) return [];

      const { data, error } = await supabase
        .from("budget_versions")
        .select("*")
        .eq("family_id", family.id)
        .order("effective_month", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as BudgetVersion[];
    },
    enabled: !!family,
  });
}

// Hook to get active budget for a specific month
export function useActiveBudgetForMonth(month?: string) {
  const { family } = useAuth();
  const targetMonth = month || format(new Date(), "yyyy-MM");

  return useQuery({
    queryKey: ["active-budget", family?.id, targetMonth],
    queryFn: async () => {
      if (!family) return null;

      const { data, error } = await supabase
        .from("budget_versions")
        .select("*")
        .eq("family_id", family.id)
        .eq("status", "active")
        .lte("effective_month", targetMonth)
        .order("effective_month", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data as BudgetVersion | null;
    },
    enabled: !!family,
  });
}

// Hook to get budget version items
export function useBudgetVersionItems(versionId?: string) {
  return useQuery({
    queryKey: ["budget-version-items", versionId],
    queryFn: async () => {
      if (!versionId) return [];

      const { data, error } = await supabase
        .from("budget_version_items")
        .select("*")
        .eq("budget_version_id", versionId);

      if (error) throw error;
      return data as BudgetVersionItem[];
    },
    enabled: !!versionId,
  });
}

// Hook to create a new budget version
export function useCreateBudgetVersion() {
  const queryClient = useQueryClient();
  const { family, familyMember } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateBudgetVersionInput) => {
      if (!family) throw new Error("No family");

      // Create the version
      const versionData = {
        family_id: family.id,
        source_type: input.source_type as "onboarding_only" | "transactions_based",
        effective_month: input.effective_month,
        status: "active" as const,
        notes: input.notes || null,
        input_snapshot: (input.input_snapshot as Json) || null,
        created_by: familyMember?.id || null,
      };

      const { data: version, error: versionError } = await supabase
        .from("budget_versions")
        .insert([versionData])
        .select()
        .single();

      if (versionError) throw versionError;

      // Insert items
      if (input.items.length > 0) {
        const itemsToInsert = input.items.map((item) => ({
          budget_version_id: version.id,
          category_id: item.category_id,
          subcategory_id: item.subcategory_id,
          suggested_amount: item.suggested_amount,
          min_amount: item.min_amount,
          max_amount: item.max_amount,
          confidence: item.confidence,
          rationale: item.rationale,
        }));

        const { error: itemsError } = await supabase
          .from("budget_version_items")
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      return version as BudgetVersion;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budget-versions"] });
      queryClient.invalidateQueries({ queryKey: ["active-budget"] });
    },
  });
}

// Hook to get categorization quality for transactions-based generation
// Uses cash_date for cash-basis accounting (regime de caixa)
export function useCategorizationQuality(periodDays: number = 90) {
  const { family } = useAuth();

  return useQuery({
    queryKey: ["categorization-quality", family?.id, periodDays],
    queryFn: async () => {
      if (!family) return null;

      const startDate = format(
        addMonths(new Date(), -(periodDays / 30)),
        "yyyy-MM-dd"
      );

      // Use cash_date for budget-relevant queries (regime de caixa)
      // Exclude transactions without cash_date (credit card purchases, pending cheques)
      const { data: transactions, error } = await supabase
        .from("transactions")
        .select("id, category_id, type, payment_method, cash_date")
        .eq("family_id", family.id)
        .eq("type", "expense")
        .not("cash_date", "is", null)
        .gte("cash_date", startDate);

      if (error) throw error;

      const total = transactions.length;
      const categorized = transactions.filter((t) => t.category_id).length;
      const percentage = total > 0 ? (categorized / total) * 100 : 0;

      // Count pending items (credit card purchases without cash_date)
      const { count: pendingCount } = await supabase
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .eq("family_id", family.id)
        .eq("type", "expense")
        .is("cash_date", null)
        .gte("event_date", startDate);

      return {
        total,
        categorized,
        percentage,
        isEligible: percentage >= 80,
        periodDays,
        pendingCashItems: pendingCount || 0,
      };
    },
    enabled: !!family,
  });
}

// Hook to calculate suggested budget from transactions
// Uses cash_date for cash-basis accounting (regime de caixa)
export function useTransactionBasedSuggestion(periodDays: number = 90) {
  const { family } = useAuth();

  return useQuery({
    queryKey: ["transaction-based-suggestion", family?.id, periodDays],
    queryFn: async () => {
      if (!family) return null;

      const startDate = format(
        addMonths(new Date(), -(periodDays / 30)),
        "yyyy-MM-dd"
      );

      // Use cash_date for budget calculations (regime de caixa)
      // Only include transactions with cash_date (actual money flow)
      const { data: transactions, error } = await supabase
        .from("transactions")
        .select("category_id, subcategory_id, amount, cash_date, budget_month, payment_method")
        .eq("family_id", family.id)
        .eq("type", "expense")
        .not("cash_date", "is", null)
        .gte("cash_date", startDate);

      if (error) throw error;

      // Check for pending credit card purchases (no invoice payment yet)
      const { data: pendingCredit } = await supabase
        .from("transactions")
        .select("id, amount")
        .eq("family_id", family.id)
        .eq("type", "expense")
        .eq("payment_method", "credit")
        .is("cash_date", null)
        .gte("event_date", startDate);

      const hasPendingCreditPurchases = (pendingCredit?.length || 0) > 0;

      // Group by category using budget_month for proper monthly grouping
      const categoryMonthlyTotals: Record<string, Record<string, number>> = {};

      transactions.forEach((t) => {
        if (!t.category_id || !t.budget_month) return;

        if (!categoryMonthlyTotals[t.category_id]) {
          categoryMonthlyTotals[t.category_id] = {};
        }

        if (!categoryMonthlyTotals[t.category_id][t.budget_month]) {
          categoryMonthlyTotals[t.category_id][t.budget_month] = 0;
        }

        categoryMonthlyTotals[t.category_id][t.budget_month] += Number(t.amount);
      });

      // Calculate monthly MEDIAN per category (more robust than average)
      const suggestions = Object.entries(categoryMonthlyTotals).map(([categoryId, monthlyTotals]) => {
        const monthlyAmounts = Object.values(monthlyTotals);
        monthlyAmounts.sort((a, b) => a - b);
        
        // Calculate median
        const mid = Math.floor(monthlyAmounts.length / 2);
        const median = monthlyAmounts.length % 2 !== 0
          ? monthlyAmounts[mid]
          : (monthlyAmounts[mid - 1] + monthlyAmounts[mid]) / 2;

        const monthCount = monthlyAmounts.length;

        return {
          category_id: categoryId,
          suggested_amount: median,
          confidence: Math.min(0.5 + (monthCount / 6) * 0.4, 0.95),
          rationale: `Mediana mensal de ${monthCount} mês(es) (regime de caixa)`,
          monthlyBreakdown: monthlyTotals,
        };
      });

      return {
        suggestions,
        periodDays,
        transactionCount: transactions.length,
        hasPendingCreditPurchases,
        pendingCreditCount: pendingCredit?.length || 0,
      };
    },
    enabled: !!family,
  });
}

// Helper to get effective month options
export function getEffectiveMonthOptions() {
  const now = new Date();
  const currentMonth = format(now, "yyyy-MM");
  const nextMonth = format(addMonths(now, 1), "yyyy-MM");
  const monthAfter = format(addMonths(now, 2), "yyyy-MM");

  return [
    { value: currentMonth, label: format(now, "MMMM 'de' yyyy", { locale: undefined }), isCurrentMonth: true },
    { value: nextMonth, label: format(addMonths(now, 1), "MMMM 'de' yyyy", { locale: undefined }), isDefault: true },
    { value: monthAfter, label: format(addMonths(now, 2), "MMMM 'de' yyyy", { locale: undefined }) },
  ];
}
