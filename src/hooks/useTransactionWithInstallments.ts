import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCreateTransaction, TransactionInput } from "@/hooks/useTransactions";
import { useCreateInstallmentGroup } from "@/hooks/useInstallments";
import { useAuth } from "@/contexts/AuthContext";
import { addMonths, format } from "date-fns";

export type ChargeType = 'ONE_SHOT' | 'INSTALLMENT' | 'RECURRENT';

export interface TransactionWithInstallmentsInput extends TransactionInput {
  cardChargeType?: ChargeType;
  installmentsTotal?: number;
}

/**
 * Hook to create a transaction with automatic installment group creation
 * when the transaction is a credit card installment purchase
 */
export function useCreateTransactionWithInstallments() {
  const queryClient = useQueryClient();
  const { family } = useAuth();
  const createTransaction = useCreateTransaction();
  const createInstallmentGroup = useCreateInstallmentGroup();

  return useMutation({
    mutationFn: async (data: TransactionWithInstallmentsInput) => {
      if (!family) throw new Error("No family");

      // First, create the main transaction (first installment if applicable)
      const transaction = await createTransaction.mutateAsync({
        type: data.type,
        amount: data.cardChargeType === 'INSTALLMENT' && data.installmentsTotal 
          ? data.amount / data.installmentsTotal  // First installment value
          : data.amount,
        category_id: data.category_id,
        subcategory_id: data.subcategory_id,
        description: data.cardChargeType === 'INSTALLMENT' && data.installmentsTotal
          ? `${data.description || ''} 1/${data.installmentsTotal}`.trim()
          : data.description,
        date: data.date,
        payment_method: data.payment_method,
        bank_account_id: data.bank_account_id,
        credit_card_id: data.credit_card_id,
        is_recurring: data.is_recurring,
        notes: data.notes,
        goal_id: data.goal_id,
        source: data.source || 'MANUAL',
      });

      // If it's an installment purchase, create the installment group
      if (data.cardChargeType === 'INSTALLMENT' && data.installmentsTotal && data.installmentsTotal > 1) {
        const installmentValue = data.amount / data.installmentsTotal;
        
        // Calculate first due date (typically next month for credit card)
        const transactionDate = new Date(data.date);
        const firstDueDate = addMonths(transactionDate, 1);

        await createInstallmentGroup.mutateAsync({
          credit_card_id: data.credit_card_id || null,
          bank_account_id: data.bank_account_id || null,
          total_amount: data.amount,
          installments_total: data.installmentsTotal,
          installment_value: installmentValue,
          first_due_date: format(firstDueDate, 'yyyy-MM-dd'),
          description: data.description || 'Compra parcelada',
          category_id: data.category_id,
          subcategory_id: data.subcategory_id || null,
          source: 'MANUAL',
          parent_transaction_id: transaction.id,
          confidence_level: 'HIGH',
          needs_user_confirmation: false,
        });
      }

      return transaction;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["finance-summary"] });
      queryClient.invalidateQueries({ queryKey: ["projection"] });
      queryClient.invalidateQueries({ queryKey: ["cashflow"] });
      queryClient.invalidateQueries({ queryKey: ["installment-groups"] });
      queryClient.invalidateQueries({ queryKey: ["planned-installments"] });
    },
  });
}
