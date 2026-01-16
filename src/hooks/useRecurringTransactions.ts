import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface RecurringTransaction {
  id: string;
  family_id: string;
  type: "income" | "expense";
  amount: number;
  category_id: string;
  subcategory_id: string | null;
  description: string;
  frequency: "weekly" | "monthly" | "yearly";
  day_of_month: number | null;
  start_date: string;
  end_date: string | null;
  payment_method: "cash" | "debit" | "credit" | "pix" | "transfer";
  bank_account_id: string | null;
  credit_card_id: string | null;
  is_active: boolean;
  last_generated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RecurringTransactionInput {
  type: "income" | "expense";
  amount: number;
  category_id: string;
  subcategory_id?: string | null;
  description: string;
  frequency?: "weekly" | "monthly" | "yearly";
  day_of_month?: number;
  start_date: string;
  end_date?: string | null;
  payment_method: "cash" | "debit" | "credit" | "pix" | "transfer";
  bank_account_id?: string | null;
  credit_card_id?: string | null;
  is_active?: boolean;
}

export function useRecurringTransactions() {
  const { family } = useAuth();

  return useQuery({
    queryKey: ["recurring-transactions", family?.id],
    queryFn: async () => {
      if (!family) return [];

      const { data, error } = await supabase
        .from("recurring_transactions")
        .select("*")
        .eq("family_id", family.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as RecurringTransaction[];
    },
    enabled: !!family,
  });
}

export function useCreateRecurringTransaction() {
  const queryClient = useQueryClient();
  const { family } = useAuth();

  return useMutation({
    mutationFn: async (input: RecurringTransactionInput) => {
      if (!family) throw new Error("No family");

      const { error } = await supabase.from("recurring_transactions").insert({
        family_id: family.id,
        type: input.type,
        amount: input.amount,
        category_id: input.category_id,
        subcategory_id: input.subcategory_id || null,
        description: input.description,
        frequency: input.frequency || "monthly",
        day_of_month: input.day_of_month || new Date().getDate(),
        start_date: input.start_date,
        end_date: input.end_date || null,
        payment_method: input.payment_method,
        bank_account_id: input.bank_account_id || null,
        credit_card_id: input.credit_card_id || null,
        is_active: input.is_active ?? true,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-transactions"] });
    },
  });
}

export function useUpdateRecurringTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<RecurringTransactionInput> }) => {
      const { error } = await supabase
        .from("recurring_transactions")
        .update(data)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-transactions"] });
    },
  });
}

export function useDeleteRecurringTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("recurring_transactions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-transactions"] });
    },
  });
}

// Toggle active status
export function useToggleRecurring() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("recurring_transactions")
        .update({ is_active })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-transactions"] });
    },
  });
}
