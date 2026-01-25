import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { TransactionSource } from "@/hooks/useTransactions";

export interface TransactionChangeLog {
  id: string;
  transaction_id: string;
  family_id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  changed_by_user_id: string;
  changed_by_user_name: string;
  source: TransactionSource;
  changed_at: string;
  batch_id: string | null;
}

export interface ChangeLogInput {
  transaction_id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  source: TransactionSource;
  batch_id?: string;
}

// Field display names for UI
export const FIELD_DISPLAY_NAMES: Record<string, string> = {
  description: "Descrição",
  category_id: "Categoria",
  subcategory_id: "Subcategoria",
  amount: "Valor",
  date: "Data",
  notes: "Observações",
  payment_method: "Forma de pagamento",
  bank_account_id: "Conta bancária",
  credit_card_id: "Cartão de crédito",
};

// Get change logs for a specific transaction
export function useTransactionChangeLogs(transactionId: string | null) {
  return useQuery({
    queryKey: ["transaction-change-logs", transactionId],
    queryFn: async () => {
      if (!transactionId) return [];

      const { data, error } = await supabase
        .from("transaction_change_logs")
        .select("*")
        .eq("transaction_id", transactionId)
        .order("changed_at", { ascending: false });

      if (error) throw error;
      return data as TransactionChangeLog[];
    },
    enabled: !!transactionId,
  });
}

// Get all change logs for a family (for CS/Support dashboard)
export function useFamilyChangeLogs(options?: {
  familyId?: string;
  limit?: number;
  userId?: string;
  startDate?: string;
  endDate?: string;
}) {
  const { family } = useAuth();
  const familyId = options?.familyId || family?.id;

  return useQuery({
    queryKey: ["family-change-logs", familyId, options],
    queryFn: async () => {
      if (!familyId) return [];

      let query = supabase
        .from("transaction_change_logs")
        .select("*")
        .eq("family_id", familyId)
        .order("changed_at", { ascending: false });

      if (options?.limit) {
        query = query.limit(options.limit);
      }

      if (options?.userId) {
        query = query.eq("changed_by_user_id", options.userId);
      }

      if (options?.startDate) {
        query = query.gte("changed_at", options.startDate);
      }

      if (options?.endDate) {
        query = query.lte("changed_at", options.endDate);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as TransactionChangeLog[];
    },
    enabled: !!familyId,
  });
}

// Log multiple changes (async, non-blocking)
export function useLogTransactionChanges() {
  const { family, user, familyMember } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (changes: ChangeLogInput[]) => {
      if (!family || !user || changes.length === 0) return;

      const userName = familyMember?.display_name || user.email?.split("@")[0] || "Usuário";
      const batchId = crypto.randomUUID();

      const logs = changes.map((change) => ({
        transaction_id: change.transaction_id,
        family_id: family.id,
        field_name: change.field_name,
        old_value: change.old_value,
        new_value: change.new_value,
        changed_by_user_id: user.id,
        changed_by_user_name: userName,
        source: change.source,
        batch_id: change.batch_id || batchId,
      }));

      // Insert asynchronously - don't block the main transaction save
      const { error } = await supabase.from("transaction_change_logs").insert(logs);

      if (error) {
        console.error("Failed to log transaction changes:", error);
        // Don't throw - logging should not block the transaction
      }
    },
    onSuccess: (_, variables) => {
      // Invalidate change logs for affected transactions
      const transactionIds = [...new Set(variables.map((c) => c.transaction_id))];
      transactionIds.forEach((id) => {
        queryClient.invalidateQueries({ queryKey: ["transaction-change-logs", id] });
      });
      queryClient.invalidateQueries({ queryKey: ["family-change-logs"] });
    },
  });
}

// Helper to detect and format changes between old and new transaction data
export function detectChanges(
  transactionId: string,
  oldData: Record<string, any>,
  newData: Record<string, any>,
  source: TransactionSource
): ChangeLogInput[] {
  const changes: ChangeLogInput[] = [];
  const trackableFields = ["description", "category_id", "subcategory_id", "amount", "date", "notes"];

  for (const field of trackableFields) {
    const oldValue = oldData[field];
    const newValue = newData[field];

    // Only log if there's an actual change
    if (oldValue !== newValue && (oldValue !== null || newValue !== null)) {
      changes.push({
        transaction_id: transactionId,
        field_name: field,
        old_value: oldValue != null ? String(oldValue) : null,
        new_value: newValue != null ? String(newValue) : null,
        source,
      });
    }
  }

  return changes;
}
