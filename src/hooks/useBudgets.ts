import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Budget {
  id: string;
  family_id: string;
  category_id: string;
  subcategory_id: string | null;
  monthly_limit: number;
  is_active: boolean;
  use_income_reference: boolean;
  average_spending: number | null;
  projected_amount: number | null;
  created_at: string;
  updated_at: string;
}

export interface BudgetInput {
  category_id: string;
  subcategory_id?: string | null;
  monthly_limit: number;
  is_active?: boolean;
  use_income_reference?: boolean;
}

export interface BudgetAlert {
  budget: Budget;
  spent: number;
  percentage: number;
  remaining: number;
  status: "ok" | "warning" | "exceeded";
}

export function useBudgets() {
  const { family } = useAuth();

  return useQuery({
    queryKey: ["budgets", family?.id],
    queryFn: async () => {
      if (!family) return [];

      const { data, error } = await supabase
        .from("budgets")
        .select("*")
        .eq("family_id", family.id)
        .order("category_id");

      if (error) throw error;
      return data as Budget[];
    },
    enabled: !!family,
  });
}

export function useCreateBudget() {
  const queryClient = useQueryClient();
  const { family } = useAuth();

  return useMutation({
    mutationFn: async (input: BudgetInput) => {
      if (!family) throw new Error("No family");

      const { error } = await supabase.from("budgets").insert({
        family_id: family.id,
        category_id: input.category_id,
        subcategory_id: input.subcategory_id || null,
        monthly_limit: input.monthly_limit,
        is_active: input.is_active ?? true,
        use_income_reference: input.use_income_reference ?? false,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      queryClient.invalidateQueries({ queryKey: ["budget-alerts"] });
    },
  });
}

export function useUpdateBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<BudgetInput> }) => {
      const { error } = await supabase
        .from("budgets")
        .update(data)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      queryClient.invalidateQueries({ queryKey: ["budget-alerts"] });
    },
  });
}

export function useDeleteBudget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("budgets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      queryClient.invalidateQueries({ queryKey: ["budget-alerts"] });
    },
  });
}

// Hook to get budget alerts (spending vs limit) for a specific month
export function useBudgetAlerts(month?: number, year?: number) {
  const { family } = useAuth();
  const currentDate = new Date();
  const currentMonth = month ?? currentDate.getMonth();
  const currentYear = year ?? currentDate.getFullYear();

  return useQuery({
    queryKey: ["budget-alerts", family?.id, currentMonth, currentYear],
    queryFn: async (): Promise<BudgetAlert[]> => {
      if (!family) return [];

      // Get all active budgets
      const { data: budgets, error: budgetsError } = await supabase
        .from("budgets")
        .select("*")
        .eq("family_id", family.id)
        .eq("is_active", true);

      if (budgetsError) throw budgetsError;

      // Get transactions for the month (month is 0-indexed from Date, but we need 1-indexed for query)
      const monthForQuery = currentMonth; // Already 0-indexed
      const startDate = new Date(currentYear, monthForQuery, 1).toISOString().split("T")[0];
      const endDate = new Date(currentYear, monthForQuery + 1, 0).toISOString().split("T")[0];

      const { data: transactions, error: transactionsError } = await supabase
        .from("transactions")
        .select("category_id, subcategory_id, amount")
        .eq("family_id", family.id)
        .eq("type", "expense")
        .gte("date", startDate)
        .lte("date", endDate);

      if (transactionsError) throw transactionsError;

      // Calculate spending per category/subcategory
      const spending: Record<string, number> = {};
      transactions.forEach((t) => {
        const key = t.subcategory_id ? `${t.category_id}:${t.subcategory_id}` : t.category_id;
        spending[key] = (spending[key] || 0) + Number(t.amount);

        // Also add to category total if subcategory
        if (t.subcategory_id) {
          spending[t.category_id] = (spending[t.category_id] || 0) + Number(t.amount);
        }
      });

      // Generate alerts
      const alerts: BudgetAlert[] = [];

      (budgets as Budget[]).forEach((budget) => {
        const key = budget.subcategory_id
          ? `${budget.category_id}:${budget.subcategory_id}`
          : budget.category_id;
        const spent = spending[key] || 0;
        const percentage = budget.monthly_limit > 0 ? (spent / budget.monthly_limit) * 100 : 0;
        const remaining = Math.max(0, budget.monthly_limit - spent);

        let status: "ok" | "warning" | "exceeded" = "ok";
        if (percentage >= 100) {
          status = "exceeded";
        } else if (percentage >= 80) {
          status = "warning";
        }

        alerts.push({
          budget,
          spent,
          percentage,
          remaining,
          status,
        });
      });

      return alerts.sort((a, b) => b.percentage - a.percentage);
    },
    enabled: !!family,
  });
}

// Hook to get budget summary for the month
export function useBudgetSummary(month?: number, year?: number) {
  const { data: alerts = [], isLoading } = useBudgetAlerts(month, year);

  const summary = {
    total: alerts.length,
    exceeded: alerts.filter((a) => a.status === "exceeded").length,
    warning: alerts.filter((a) => a.status === "warning").length,
    ok: alerts.filter((a) => a.status === "ok").length,
    totalBudgeted: alerts.reduce((sum, a) => sum + a.budget.monthly_limit, 0),
    totalSpent: alerts.reduce((sum, a) => sum + a.spent, 0),
  };

  return { summary, isLoading };
}
