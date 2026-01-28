import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { invalidateQueryGroup } from "@/lib/queryConfig";
import { useLogActivity } from "@/hooks/useFamilyActivity";

/**
 * Hook for registering cheque compensation (setting cash_date)
 */
export function useRegisterChequeCompensation() {
  const queryClient = useQueryClient();
  const { user, familyMember } = useAuth();
  const logActivity = useLogActivity();

  return useMutation({
    mutationFn: async ({ 
      transactionId, 
      compensationDate 
    }: { 
      transactionId: string; 
      compensationDate: string; 
    }) => {
      const { error } = await supabase
        .from("transactions")
        .update({ 
          cash_date: compensationDate,
          last_edited_by_user_id: user?.id,
        })
        .eq("id", transactionId)
        .eq("payment_method", "cheque"); // Safety: only allow on cheques

      if (error) throw error;
      return { transactionId, compensationDate };
    },
    onSuccess: (result) => {
      logActivity.mutate({
        action_type: "cheque_compensated",
        entity_type: "transaction",
        entity_id: result.transactionId,
        metadata: { 
          cash_date: result.compensationDate,
          actor: familyMember?.display_name,
        },
      });
      invalidateQueryGroup(queryClient, 'transactionMutation');
    },
  });
}

/**
 * Hook for creating invoice payment transaction (Pagamento de Fatura)
 * This creates a cash transaction that represents the actual money outflow
 */
export function useCreateInvoicePayment() {
  const queryClient = useQueryClient();
  const { family, user, familyMember } = useAuth();
  const logActivity = useLogActivity();

  return useMutation({
    mutationFn: async ({
      creditCardId,
      cardName,
      amount,
      paymentDate,
      paymentMethod,
      bankAccountId,
      referenceMonth, // YYYY-MM format
      notes,
    }: {
      creditCardId: string;
      cardName: string;
      amount: number;
      paymentDate: string;
      paymentMethod: "pix" | "debit" | "transfer" | "boleto";
      bankAccountId?: string;
      referenceMonth?: string;
      notes?: string;
    }) => {
      if (!family) throw new Error("No family");

      // Create the invoice payment transaction
      const { data: inserted, error } = await supabase
        .from("transactions")
        .insert({
          family_id: family.id,
          type: "expense",
          amount,
          category_id: "despesas-financeiras", // Financial expenses category
          subcategory_id: "despesas-financeiras-parcelamento-do-cartao", // Invoice payment subcategory
          description: `Pagamento fatura ${cardName}${referenceMonth ? ` (ref: ${referenceMonth})` : ""}`,
          date: paymentDate,
          event_date: paymentDate,
          cash_date: paymentDate, // This IS the cash moment
          payment_method: paymentMethod as any,
          bank_account_id: bankAccountId || null,
          credit_card_id: creditCardId,
          source: "MANUAL" as any,
          notes: notes || `Pagamento de fatura do cartão ${cardName}`,
          created_by_user_id: user?.id,
          created_by_name: familyMember?.display_name || user?.email?.split("@")[0] || "Usuário",
        } as any)
        .select("id")
        .single();

      if (error) throw error;
      return { id: inserted.id, creditCardId, amount, paymentDate };
    },
    onSuccess: (result) => {
      logActivity.mutate({
        action_type: "invoice_payment_created",
        entity_type: "transaction",
        entity_id: result.id,
        metadata: {
          credit_card_id: result.creditCardId,
          amount: result.amount,
          payment_date: result.paymentDate,
        },
      });
      invalidateQueryGroup(queryClient, 'transactionMutation');
    },
  });
}

/**
 * Hook to fetch pending credit card purchases (purchases without cash_date)
 * Useful for calculating suggested invoice amounts
 */
export function usePendingCardPurchases(creditCardId?: string) {
  const { family } = useAuth();
  
  return {
    fetch: async () => {
      if (!family) return [];
      
      let query = supabase
        .from("transactions")
        .select("id, amount, date, description, category_id")
        .eq("family_id", family.id)
        .eq("payment_method", "credit")
        .is("cash_date", null);
      
      if (creditCardId) {
        query = query.eq("credit_card_id", creditCardId);
      }
      
      const { data, error } = await query.order("date", { ascending: false });
      
      if (error) throw error;
      return data;
    },
  };
}
