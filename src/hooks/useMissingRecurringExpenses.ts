import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

// Minimum consecutive months to consider a pattern "recurring"
const MIN_RECURRING_MONTHS = 3;

// Confidence threshold for patterns
const MIN_CONFIDENCE = 0.7;

export interface DetectedPattern {
  categoryId: string;
  subcategoryId: string | null;
  patternType: "monthly" | "bimonthly" | "quarterly" | "yearly";
  averageAmount: number;
  occurrenceCount: number;
  lastOccurrenceDate: string;
  confidence: number;
}

export interface MissingRecurringExpense {
  categoryId: string;
  subcategoryId: string | null;
  categoryName: string;
  subcategoryName: string | null;
  patternType: string;
  averageAmount: number;
  lastOccurrence: string;
  monthRef: string;
  confirmationStatus: "none" | "no_payment" | "registered" | "ignored";
}

export type ConfirmationType = "no_payment" | "registered" | "ignored";

/**
 * Detects recurring expense patterns from transaction history
 */
export function useDetectRecurringPatterns() {
  const { family, user } = useAuth();

  return useQuery({
    queryKey: ["recurring-patterns", family?.id],
    queryFn: async () => {
      if (!family) return [];

      // Get the last 12 months of expense transactions
      const endDate = new Date();
      const startDate = subMonths(endDate, 12);

      const { data: transactions, error } = await supabase
        .from("transactions")
        .select("category_id, subcategory_id, amount, date")
        .eq("family_id", family.id)
        .eq("type", "expense")
        .gte("date", format(startDate, "yyyy-MM-dd"))
        .lte("date", format(endDate, "yyyy-MM-dd"))
        .order("date", { ascending: true });

      if (error) throw error;

      // Group transactions by category/subcategory and month
      const monthlyGroups: Record<
        string,
        Record<string, { total: number; count: number }>
      > = {};

      for (const t of transactions) {
        const key = `${t.category_id}|${t.subcategory_id || ""}`;
        const monthKey = t.date.substring(0, 7); // YYYY-MM

        if (!monthlyGroups[key]) monthlyGroups[key] = {};
        if (!monthlyGroups[key][monthKey]) {
          monthlyGroups[key][monthKey] = { total: 0, count: 0 };
        }

        monthlyGroups[key][monthKey].total += Number(t.amount);
        monthlyGroups[key][monthKey].count += 1;
      }

      // Analyze patterns
      const patterns: DetectedPattern[] = [];
      const allMonths = Array.from({ length: 12 }, (_, i) =>
        format(subMonths(endDate, 11 - i), "yyyy-MM")
      );

      for (const [key, monthData] of Object.entries(monthlyGroups)) {
        const [categoryId, subcategoryId] = key.split("|");
        const monthsWithTransactions = Object.keys(monthData).sort();

        if (monthsWithTransactions.length < MIN_RECURRING_MONTHS) continue;

        // Calculate average and check for monthly pattern
        const amounts = Object.values(monthData).map((m) => m.total);
        const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;

        // Check for monthly recurrence (at least 3 of last 6 months)
        const recentMonths = allMonths.slice(-6);
        const recentOccurrences = recentMonths.filter(
          (m) => monthData[m]
        ).length;

        if (recentOccurrences >= 3) {
          // Calculate confidence based on consistency
          const occurrenceRate = monthsWithTransactions.length / 12;
          const amountVariation =
            amounts.length > 1
              ? Math.min(
                  1,
                  avgAmount /
                    Math.max(...amounts.map((a) => Math.abs(a - avgAmount)))
                )
              : 1;

          const confidence = Math.min(
            0.98,
            occurrenceRate * 0.6 + amountVariation * 0.4
          );

          if (confidence >= MIN_CONFIDENCE) {
            patterns.push({
              categoryId,
              subcategoryId: subcategoryId || null,
              patternType: "monthly",
              averageAmount: avgAmount,
              occurrenceCount: monthsWithTransactions.length,
              lastOccurrenceDate:
                monthsWithTransactions[monthsWithTransactions.length - 1],
              confidence,
            });
          }
        }
      }

      return patterns;
    },
    enabled: !!family,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Gets existing confirmations for a specific month
 */
export function useRecurringConfirmations(monthRef: string) {
  const { family } = useAuth();

  return useQuery({
    queryKey: ["recurring-confirmations", family?.id, monthRef],
    queryFn: async () => {
      if (!family) return [];

      const { data, error } = await supabase
        .from("recurring_expense_confirmations")
        .select("*")
        .eq("family_id", family.id)
        .eq("month_ref", monthRef);

      if (error) throw error;
      return data;
    },
    enabled: !!family && !!monthRef,
  });
}

/**
 * Checks for missing recurring expenses in a specific month
 */
export function useMissingRecurringExpenses(month: number, year: number) {
  const { family } = useAuth();
  const monthRef = `${year}-${String(month + 1).padStart(2, "0")}`;

  const { data: patterns = [] } = useDetectRecurringPatterns();
  const { data: confirmations = [] } = useRecurringConfirmations(monthRef);

  return useQuery({
    queryKey: ["missing-recurring", family?.id, monthRef, patterns.length],
    queryFn: async () => {
      if (!family || patterns.length === 0) return [];

      // Get transactions for the selected month
      const startDate = format(new Date(year, month, 1), "yyyy-MM-dd");
      const endDate = format(endOfMonth(new Date(year, month, 1)), "yyyy-MM-dd");

      const { data: monthTransactions, error } = await supabase
        .from("transactions")
        .select("category_id, subcategory_id")
        .eq("family_id", family.id)
        .eq("type", "expense")
        .gte("date", startDate)
        .lte("date", endDate);

      if (error) throw error;

      // Find which recurring patterns are missing
      const existingKeys = new Set(
        monthTransactions.map(
          (t) => `${t.category_id}|${t.subcategory_id || ""}`
        )
      );

      const missing: MissingRecurringExpense[] = [];

      for (const pattern of patterns) {
        const key = `${pattern.categoryId}|${pattern.subcategoryId || ""}`;

        // Skip if transaction exists this month
        if (existingKeys.has(key)) continue;

        // Check for existing confirmation
        const confirmation = confirmations.find(
          (c) =>
            c.category_id === pattern.categoryId &&
            c.subcategory_id === pattern.subcategoryId
        );

        // If already confirmed as "no_payment" or "ignored", skip
        if (confirmation?.confirmation_type === "ignored") continue;

        missing.push({
          categoryId: pattern.categoryId,
          subcategoryId: pattern.subcategoryId,
          categoryName: "", // Will be enriched by consumer
          subcategoryName: null,
          patternType: pattern.patternType,
          averageAmount: pattern.averageAmount,
          lastOccurrence: pattern.lastOccurrenceDate,
          monthRef,
          confirmationStatus: (confirmation?.confirmation_type as "no_payment" | "registered" | "ignored") || "none",
        });
      }

      return missing;
    },
    enabled: !!family && patterns.length > 0,
    staleTime: 30 * 1000, // 30 seconds
  });
}

/**
 * Mutation to confirm a recurring expense status
 */
export function useConfirmRecurringExpense() {
  const queryClient = useQueryClient();
  const { family, user } = useAuth();

  return useMutation({
    mutationFn: async ({
      categoryId,
      subcategoryId,
      monthRef,
      confirmationType,
    }: {
      categoryId: string;
      subcategoryId: string | null;
      monthRef: string;
      confirmationType: ConfirmationType;
    }) => {
      if (!family || !user) throw new Error("No family or user");

      const { error } = await supabase
        .from("recurring_expense_confirmations")
        .upsert(
          {
            family_id: family.id,
            category_id: categoryId,
            subcategory_id: subcategoryId,
            month_ref: monthRef,
            confirmation_type: confirmationType,
            confirmed_by_user_id: user.id,
          },
          {
            onConflict: "family_id,category_id,subcategory_id,month_ref",
          }
        );

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["recurring-confirmations", family?.id, variables.monthRef],
      });
      queryClient.invalidateQueries({
        queryKey: ["missing-recurring", family?.id],
      });
    },
  });
}
