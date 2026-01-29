import { useMemo } from "react";
import { useTransactions, useTransactionsCurrentYear } from "./useTransactions";

interface CategorySpending {
  categoryId: string;
  subcategoryId: string | null;
  amount: number;
}

/**
 * Returns only categories/subcategories that have transactions in the given month
 * This is used to filter the category view to show only relevant items
 */
export function useCategorySpendingByMonth(month: number, year: number) {
  const { data: transactions = [], isLoading } = useTransactions(month, year);

  const categorySpending = useMemo(() => {
    const spending: Record<string, CategorySpending> = {};

    for (const t of transactions) {
      const catKey = t.category_id;
      const subKey = `${t.category_id}|${t.subcategory_id || ""}`;

      // Track category-level spending
      if (!spending[catKey]) {
        spending[catKey] = {
          categoryId: t.category_id,
          subcategoryId: null,
          amount: 0,
        };
      }
      spending[catKey].amount += Number(t.amount);

      // Track subcategory-level spending
      if (t.subcategory_id) {
        if (!spending[subKey]) {
          spending[subKey] = {
            categoryId: t.category_id,
            subcategoryId: t.subcategory_id,
            amount: 0,
          };
        }
        spending[subKey].amount += Number(t.amount);
      }
    }

    return spending;
  }, [transactions]);

  // Get unique category IDs that have transactions
  const activeCategoryIds = useMemo(() => {
    const ids = new Set<string>();
    for (const t of transactions) {
      ids.add(t.category_id);
    }
    return ids;
  }, [transactions]);

  // Get unique subcategory IDs that have transactions (keyed by category)
  const activeSubcategoryIds = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    for (const t of transactions) {
      if (t.subcategory_id) {
        if (!map[t.category_id]) map[t.category_id] = new Set();
        map[t.category_id].add(t.subcategory_id);
      }
    }
    return map;
  }, [transactions]);

  return {
    categorySpending,
    activeCategoryIds,
    activeSubcategoryIds,
    isLoading,
  };
}

/**
 * Returns categories/subcategories that have transactions in the current year
 * Used for annual view to show all categories that had any activity
 */
export function useCategorySpendingByYear(year: number) {
  const { data: yearTransactions = [], isLoading } = useTransactionsCurrentYear();

  // Filter to only the specified year (hook returns current year)
  const filteredTransactions = useMemo(() => {
    return yearTransactions.filter((t: any) => {
      const txYear = new Date(t.date).getFullYear();
      return txYear === year;
    });
  }, [yearTransactions, year]);

  const categorySpending = useMemo(() => {
    const spending: Record<string, CategorySpending> = {};

    for (const t of filteredTransactions) {
      const catKey = t.category_id;
      const subKey = `${t.category_id}|${t.subcategory_id || ""}`;

      if (!spending[catKey]) {
        spending[catKey] = {
          categoryId: t.category_id,
          subcategoryId: null,
          amount: 0,
        };
      }
      spending[catKey].amount += Number(t.amount);

      if (t.subcategory_id) {
        if (!spending[subKey]) {
          spending[subKey] = {
            categoryId: t.category_id,
            subcategoryId: t.subcategory_id,
            amount: 0,
          };
        }
        spending[subKey].amount += Number(t.amount);
      }
    }

    return spending;
  }, [filteredTransactions]);

  const activeCategoryIds = useMemo(() => {
    const ids = new Set<string>();
    for (const t of filteredTransactions) {
      ids.add(t.category_id);
    }
    return ids;
  }, [filteredTransactions]);

  const activeSubcategoryIds = useMemo(() => {
    const map: Record<string, Set<string>> = {};
    for (const t of filteredTransactions) {
      if (t.subcategory_id) {
        if (!map[t.category_id]) map[t.category_id] = new Set();
        map[t.category_id].add(t.subcategory_id);
      }
    }
    return map;
  }, [filteredTransactions]);

  return {
    categorySpending,
    activeCategoryIds,
    activeSubcategoryIds,
    isLoading,
  };
}

/**
 * Hook to check if a category has any transactions in a given period
 */
export function useCategoryHasTransactions(
  categoryId: string,
  month: number,
  year: number
) {
  const { activeCategoryIds, isLoading } = useCategorySpendingByMonth(month, year);
  
  return {
    hasTransactions: activeCategoryIds.has(categoryId),
    isLoading,
  };
}
