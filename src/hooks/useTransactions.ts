import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { STALE_TIMES, invalidateQueryGroup } from "@/lib/queryConfig";
import { useLogActivity } from "@/hooks/useFamilyActivity";

// Valid transaction sources
export type TransactionSource = 'MANUAL' | 'UPLOAD' | 'IMPORT' | 'OCR' | 'OPEN_FINANCE' | 'GOAL_CONTRIBUTION';

export interface TransactionInput {
  type: "income" | "expense";
  amount: number;
  category_id: string;
  subcategory_id?: string | null;
  description?: string | null;
  date: string;
  event_date?: string; // When the event occurred (auto-set if not provided)
  cash_date?: string | null; // When money actually moved (null for credit purchases)
  payment_method: "cash" | "debit" | "credit" | "pix" | "transfer" | "cheque";
  bank_account_id?: string;
  credit_card_id?: string;
  is_recurring?: boolean;
  notes?: string;
  // Goal linking
  goal_id?: string;
  // Audit metadata - set automatically when not provided
  source?: TransactionSource;
  // OCR specific
  ocr_confidence?: number;
  original_description?: string;
}

export function useTransactions(month?: number, year?: number, options?: { enabled?: boolean }) {
  const { family } = useAuth();
  const currentMonth = month ?? new Date().getMonth();
  const currentYear = year ?? new Date().getFullYear();
  const isEnabled = options?.enabled ?? true;

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
      
      // Transform to include cash-basis fields
      return data.map((t: any) => ({
        ...t,
        event_date: t.event_date || t.date,
        cash_date: t.cash_date,
        budget_month: t.budget_month,
      }));
    },
    enabled: !!family && isEnabled,
    staleTime: STALE_TIMES.transactions,
    // Keep previous data while refetching
    placeholderData: (previousData) => previousData,
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

export function useTransactionsLast6Months(options?: { enabled?: boolean }) {
  const { family } = useAuth();
  const isEnabled = options?.enabled ?? true;

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
    enabled: !!family && isEnabled,
    // This is deferred/secondary data, longer stale time
    staleTime: STALE_TIMES.projection,
    placeholderData: (previousData) => previousData,
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
  const { family, user, familyMember } = useAuth();
  const logActivity = useLogActivity();

  return useMutation({
    mutationFn: async (data: TransactionInput) => {
      if (!family) throw new Error("No family");

      const { data: inserted, error } = await supabase.from("transactions").insert({
        family_id: family.id,
        type: data.type,
        amount: data.amount,
        category_id: data.category_id,
        subcategory_id: data.subcategory_id,
        description: data.description,
        date: data.date,
        payment_method: data.payment_method as any,
        bank_account_id: data.bank_account_id,
        credit_card_id: data.credit_card_id,
        is_recurring: data.is_recurring || false,
        notes: data.notes,
        goal_id: data.goal_id || null,
        source: (data.source || 'MANUAL') as any,
        created_by_user_id: user?.id,
        created_by_name: familyMember?.display_name || user?.email?.split('@')[0] || 'Usuário',
        ocr_confidence: data.ocr_confidence,
        original_description: data.original_description || data.description,
      } as any).select("id").single();

      if (error) throw error;
      return { id: inserted.id, ...data };
    },
    onSuccess: (result) => {
      // Log family activity for push notifications
      logActivity.mutate({
        action_type: "transaction_created",
        entity_type: "transaction",
        entity_id: result.id,
        metadata: {
          type: result.type,
          amount: result.amount,
          category_id: result.category_id,
          source: result.source || 'MANUAL',
        },
      });
      // Invalidate all transaction-related queries for multi-device sync
      invalidateQueryGroup(queryClient, 'transactionMutation');
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
  const { user, familyMember } = useAuth();
  const logActivity = useLogActivity();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: TransactionUpdate }) => {
      const { error } = await supabase
        .from("transactions")
        .update({
          ...data,
          // Track who edited (last_edited_at is set by trigger)
          last_edited_by_user_id: user?.id,
        })
        .eq("id", id);
      if (error) throw error;
      return { id, ...data };
    },
    onSuccess: (result) => {
      logActivity.mutate({
        action_type: "transaction_updated",
        entity_type: "transaction",
        entity_id: result.id,
        metadata: { 
          amount: result.amount, 
          category_id: result.category_id,
          edited_by: familyMember?.display_name,
        },
      });
      invalidateQueryGroup(queryClient, 'transactionMutation');
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  const logActivity = useLogActivity();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("transactions").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: (deletedId) => {
      logActivity.mutate({
        action_type: "transaction_deleted",
        entity_type: "transaction",
        entity_id: deletedId,
      });
      invalidateQueryGroup(queryClient, 'transactionMutation');
    },
  });
}

export function useFinanceSummary(month?: number, year?: number, options?: { enabled?: boolean }) {
  const { family } = useAuth();
  const currentMonth = month ?? new Date().getMonth();
  const currentYear = year ?? new Date().getFullYear();
  const isEnabled = options?.enabled ?? true;

  return useQuery({
    queryKey: ["finance-summary", family?.id, currentMonth, currentYear],
    queryFn: async () => {
      if (!family) return null;

      // Calculate budget_month string for cash-basis filtering
      const budgetMonthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

      // Use budget_month for cash-basis accounting (regime de caixa)
      // Only include transactions with cash_date (actual money flow)
      const { data: transactions, error } = await supabase
        .from("transactions")
        .select("type, amount, category_id, cash_date, budget_month, payment_method")
        .eq("family_id", family.id)
        .eq("budget_month", budgetMonthStr);

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

      // Also count pending items (credit card purchases without cash_date in this period)
      const startDate = new Date(currentYear, currentMonth, 1).toISOString().split("T")[0];
      const endDate = new Date(currentYear, currentMonth + 1, 0).toISOString().split("T")[0];
      
      const { count: pendingCount } = await supabase
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .eq("family_id", family.id)
        .eq("type", "expense")
        .is("cash_date", null)
        .gte("event_date", startDate)
        .lte("event_date", endDate);

      return {
        income,
        expenses,
        balance,
        savingsRate,
        expensesByCategory,
        transactionCount: transactions.length,
        pendingCashItems: pendingCount || 0,
        isCashBasis: true,
      };
    },
    enabled: !!family && isEnabled,
    staleTime: STALE_TIMES.financeSummary,
    placeholderData: (previousData) => previousData,
  });
}
