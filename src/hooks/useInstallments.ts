import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Installment {
  id: string;
  family_id: string;
  credit_card_id: string | null;
  description: string;
  total_amount: number;
  installment_amount: number;
  total_installments: number;
  current_installment: number;
  start_date: string;
  category_id: string;
  subcategory_id: string | null;
  is_active: boolean;
  created_at: string;
}

export interface InstallmentInput {
  credit_card_id?: string | null;
  description: string;
  total_amount: number;
  installment_amount: number;
  total_installments: number;
  current_installment?: number;
  start_date: string;
  category_id: string;
  subcategory_id?: string | null;
}

export function useInstallments() {
  const { family } = useAuth();

  return useQuery({
    queryKey: ["installments", family?.id],
    queryFn: async () => {
      if (!family) return [];

      const { data, error } = await supabase
        .from("installments")
        .select("*")
        .eq("family_id", family.id)
        .eq("is_active", true)
        .order("start_date", { ascending: false });

      if (error) throw error;
      return data as Installment[];
    },
    enabled: !!family,
  });
}

export function useCreateInstallment() {
  const queryClient = useQueryClient();
  const { family } = useAuth();

  return useMutation({
    mutationFn: async (input: InstallmentInput) => {
      if (!family) throw new Error("No family");

      const { error } = await supabase.from("installments").insert({
        family_id: family.id,
        credit_card_id: input.credit_card_id || null,
        description: input.description,
        total_amount: input.total_amount,
        installment_amount: input.installment_amount,
        total_installments: input.total_installments,
        current_installment: input.current_installment || 1,
        start_date: input.start_date,
        category_id: input.category_id,
        subcategory_id: input.subcategory_id || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["installments"] });
      queryClient.invalidateQueries({ queryKey: ["cashflow"] });
    },
  });
}

export function useUpdateInstallment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<InstallmentInput> }) => {
      const { error } = await supabase
        .from("installments")
        .update(data)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["installments"] });
      queryClient.invalidateQueries({ queryKey: ["cashflow"] });
    },
  });
}

export function useDeleteInstallment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("installments")
        .update({ is_active: false })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["installments"] });
      queryClient.invalidateQueries({ queryKey: ["cashflow"] });
    },
  });
}

// Get future installments for cash flow projection
export function useFutureInstallments(months: number = 3) {
  const { family } = useAuth();

  return useQuery({
    queryKey: ["installments", "future", family?.id, months],
    queryFn: async () => {
      if (!family) return [];

      const today = new Date();
      const { data: installments, error } = await supabase
        .from("installments")
        .select("*")
        .eq("family_id", family.id)
        .eq("is_active", true);

      if (error) throw error;

      // Calculate future payments
      const futurePayments: Array<{
        date: string;
        amount: number;
        description: string;
        installment: string; // e.g., "3/12"
        categoryId: string;
      }> = [];

      (installments as Installment[]).forEach((inst) => {
        const startDate = new Date(inst.start_date);
        const remaining = inst.total_installments - inst.current_installment + 1;

        for (let i = 0; i < remaining && i < months; i++) {
          const paymentDate = new Date(startDate);
          paymentDate.setMonth(startDate.getMonth() + inst.current_installment - 1 + i);

          if (paymentDate >= today) {
            futurePayments.push({
              date: paymentDate.toISOString().split("T")[0],
              amount: inst.installment_amount,
              description: inst.description,
              installment: `${inst.current_installment + i}/${inst.total_installments}`,
              categoryId: inst.category_id,
            });
          }
        }
      });

      return futurePayments.sort((a, b) => a.date.localeCompare(b.date));
    },
    enabled: !!family,
  });
}
