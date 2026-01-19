import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface TransactionInput {
  type: "income" | "expense";
  amount: number;
  category_id: string;
  subcategory_id?: string;
  description?: string;
  date: string;
  payment_method: "cash" | "debit" | "credit" | "pix" | "transfer";
  bank_account_id?: string;
  credit_card_id?: string;
  is_recurring?: boolean;
  notes?: string;
}

export function useTransactions(month?: number, year?: number) {
  const { family } = useAuth();
  const currentMonth = month ?? new Date().getMonth();
  const currentYear = year ?? new Date().getFullYear();

  return useQuery({
    queryKey: ["transactions", family?.id, currentMonth, currentYear],
    queryFn: async () => {
      if (!family) return [];

      const startDate = new Date(currentYear, currentMonth, 1).toISOString().split("T")[0];
      const endDate = new Date(currentYear, currentMonth + 1, 0).toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("transactions")
        .select("*, bank_accounts(nickname, banks(name)), credit_cards(card_name), goals(title)")
        .eq("family_id", family.id)
        .gte("date", startDate)
        .lte("date", endDate)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!family,
  });
}

export function useAllTransactions() {
  const { family } = useAuth();

  return useQuery({
    queryKey: ["transactions", family?.id, "all"],
    queryFn: async () => {
      if (!family) return [];

      const { data, error } = await supabase
        .from("transactions")
        .select("*, bank_accounts(nickname, banks(name)), credit_cards(card_name), goals(title)")
        .eq("family_id", family.id)
        .order("date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data;
    },
    enabled: !!family,
  });
}

export function useTransactionsLast6Months() {
  const { family } = useAuth();

  return useQuery({
    queryKey: ["transactions", family?.id, "last-6-months"],
    queryFn: async () => {
      if (!family) return [];

      // Calculate date 6 months ago
      const now = new Date();
      const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      const startDate = sixMonthsAgo.toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("transactions")
        .select("id, type, amount, category_id, subcategory_id, date")
        .eq("family_id", family.id)
        .gte("date", startDate)
        .order("date", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!family,
  });
}

export function useTransactionsCurrentYear() {
  const { family } = useAuth();
  const currentYear = new Date().getFullYear();

  return useQuery({
    queryKey: ["transactions", family?.id, "current-year", currentYear],
    queryFn: async () => {
      if (!family) return [];

      const startDate = `${currentYear}-01-01`;

      const { data, error } = await supabase
        .from("transactions")
        .select("id, type, amount, category_id, subcategory_id, date")
        .eq("family_id", family.id)
        .gte("date", startDate)
        .order("date", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!family,
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  const { family } = useAuth();

  return useMutation({
    mutationFn: async (data: TransactionInput) => {
      if (!family) throw new Error("No family");

      const { error } = await supabase.from("transactions").insert({
        family_id: family.id,
        type: data.type,
        amount: data.amount,
        category_id: data.category_id,
        subcategory_id: data.subcategory_id,
        description: data.description,
        date: data.date,
        payment_method: data.payment_method,
        bank_account_id: data.bank_account_id,
        credit_card_id: data.credit_card_id,
        is_recurring: data.is_recurring || false,
        notes: data.notes,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["finance-summary"] });
    },
  });
}

export interface TransactionUpdate {
  category_id?: string;
  subcategory_id?: string | null;
  description?: string | null;
  amount?: number;
  date?: string;
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TransactionUpdate }) => {
      const { error } = await supabase
        .from("transactions")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["finance-summary"] });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["finance-summary"] });
    },
  });
}

export function useFinanceSummary(month?: number, year?: number) {
  const { family } = useAuth();
  const currentMonth = month ?? new Date().getMonth();
  const currentYear = year ?? new Date().getFullYear();

  return useQuery({
    queryKey: ["finance-summary", family?.id, currentMonth, currentYear],
    queryFn: async () => {
      if (!family) return null;

      const startDate = new Date(currentYear, currentMonth, 1).toISOString().split("T")[0];
      const endDate = new Date(currentYear, currentMonth + 1, 0).toISOString().split("T")[0];

      const { data: transactions, error } = await supabase
        .from("transactions")
        .select("type, amount, category_id")
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

      const balance = income - expenses;
      const savingsRate = income > 0 ? ((income - expenses) / income) * 100 : 0;

      // Group expenses by category
      const expensesByCategory: Record<string, number> = {};
      transactions
        .filter((t) => t.type === "expense")
        .forEach((t) => {
          expensesByCategory[t.category_id] = (expensesByCategory[t.category_id] || 0) + Number(t.amount);
        });

      return {
        income,
        expenses,
        balance,
        savingsRate,
        expensesByCategory,
        transactionCount: transactions.length,
      };
    },
    enabled: !!family,
  });
}
