import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface MonthlyData {
  month: string;
  year: number;
  income: number;
  expenses: number;
  balance: number;
}

export interface CategoryMonthlyData {
  month: string;
  year: number;
  amount: number;
}

export interface CategoryReport {
  categoryId: string;
  monthlyData: CategoryMonthlyData[];
  total: number;
  average: number;
  max: { amount: number; month: string };
  min: { amount: number; month: string };
  trend: "up" | "down" | "stable";
}

// Get monthly data for the last N months
export function useMonthlyReport(months: number = 6) {
  const { family } = useAuth();

  return useQuery({
    queryKey: ["monthly-report", family?.id, months],
    queryFn: async () => {
      if (!family) return [];

      const results: MonthlyData[] = [];
      const today = new Date();

      for (let i = months - 1; i >= 0; i--) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const startDate = date.toISOString().split("T")[0];
        const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0)
          .toISOString()
          .split("T")[0];

        const { data: transactions, error } = await supabase
          .from("transactions")
          .select("type, amount")
          .eq("family_id", family.id)
          .gte("date", startDate)
          .lte("date", endDate);

        if (error) throw error;

        const income = transactions
          .filter((t) => t.type === "income")
          .reduce((sum, t) => sum + Number(t.amount), 0);

        const expenses = transactions
          .filter((t) => t.type === "expense")
          .reduce((sum, t) => sum + Number(t.amount), 0);

        const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

        results.push({
          month: monthNames[date.getMonth()],
          year: date.getFullYear(),
          income,
          expenses,
          balance: income - expenses,
        });
      }

      return results;
    },
    enabled: !!family,
  });
}

// Get category evolution over time
export function useCategoryReport(categoryId: string, months: number = 6) {
  const { family } = useAuth();

  return useQuery({
    queryKey: ["category-report", family?.id, categoryId, months],
    queryFn: async () => {
      if (!family || !categoryId) return null;

      const monthlyData: CategoryMonthlyData[] = [];
      const today = new Date();

      for (let i = months - 1; i >= 0; i--) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const startDate = date.toISOString().split("T")[0];
        const endDate = new Date(date.getFullYear(), date.getMonth() + 1, 0)
          .toISOString()
          .split("T")[0];

        const { data: transactions, error } = await supabase
          .from("transactions")
          .select("amount")
          .eq("family_id", family.id)
          .eq("category_id", categoryId)
          .eq("type", "expense")
          .gte("date", startDate)
          .lte("date", endDate);

        if (error) throw error;

        const amount = transactions.reduce((sum, t) => sum + Number(t.amount), 0);
        const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

        monthlyData.push({
          month: monthNames[date.getMonth()],
          year: date.getFullYear(),
          amount,
        });
      }

      const nonZeroMonths = monthlyData.filter((m) => m.amount > 0);
      const total = monthlyData.reduce((sum, m) => sum + m.amount, 0);
      const average = nonZeroMonths.length > 0 ? total / nonZeroMonths.length : 0;

      const maxMonth = monthlyData.reduce(
        (max, m) => (m.amount > max.amount ? m : max),
        { amount: 0, month: "" }
      );
      const minNonZero = nonZeroMonths.reduce(
        (min, m) => (m.amount < min.amount ? m : min),
        nonZeroMonths[0] || { amount: 0, month: "" }
      );

      // Calculate trend (compare last 2 months)
      let trend: "up" | "down" | "stable" = "stable";
      if (monthlyData.length >= 2) {
        const lastMonth = monthlyData[monthlyData.length - 1].amount;
        const prevMonth = monthlyData[monthlyData.length - 2].amount;
        if (lastMonth > prevMonth * 1.1) trend = "up";
        else if (lastMonth < prevMonth * 0.9) trend = "down";
      }

      const report: CategoryReport = {
        categoryId,
        monthlyData,
        total,
        average,
        max: { amount: maxMonth.amount, month: `${maxMonth.month}` },
        min: { amount: minNonZero?.amount || 0, month: minNonZero?.month || "" },
        trend,
      };

      return report;
    },
    enabled: !!family && !!categoryId,
  });
}

// Get all categories spending for comparison
export function useCategoriesComparison(month?: number, year?: number) {
  const { family } = useAuth();
  const currentMonth = month ?? new Date().getMonth();
  const currentYear = year ?? new Date().getFullYear();

  return useQuery({
    queryKey: ["categories-comparison", family?.id, currentMonth, currentYear],
    queryFn: async () => {
      if (!family) return [];

      const startDate = new Date(currentYear, currentMonth, 1).toISOString().split("T")[0];
      const endDate = new Date(currentYear, currentMonth + 1, 0).toISOString().split("T")[0];

      const { data: transactions, error } = await supabase
        .from("transactions")
        .select("category_id, amount")
        .eq("family_id", family.id)
        .eq("type", "expense")
        .gte("date", startDate)
        .lte("date", endDate);

      if (error) throw error;

      const byCategory: Record<string, number> = {};
      transactions.forEach((t) => {
        byCategory[t.category_id] = (byCategory[t.category_id] || 0) + Number(t.amount);
      });

      const total = Object.values(byCategory).reduce((sum, v) => sum + v, 0);

      return Object.entries(byCategory)
        .map(([categoryId, amount]) => ({
          categoryId,
          amount,
          percentage: total > 0 ? (amount / total) * 100 : 0,
        }))
        .sort((a, b) => b.amount - a.amount);
    },
    enabled: !!family,
  });
}
