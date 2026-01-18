import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useBanks() {
  return useQuery({
    queryKey: ["banks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("banks")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });
}

export function useBankAccounts() {
  const { family } = useAuth();
  return useQuery({
    queryKey: ["bank_accounts", family?.id],
    queryFn: async () => {
      if (!family) return [];
      const { data, error } = await supabase
        .from("bank_accounts")
        .select("*, banks(name)")
        .eq("family_id", family.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!family,
  });
}

export function useCreditCards() {
  const { family } = useAuth();
  return useQuery({
    queryKey: ["credit_cards", family?.id],
    queryFn: async () => {
      if (!family) return [];
      const { data, error } = await supabase
        .from("credit_cards")
        .select("*")
        .eq("family_id", family.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!family,
  });
}

export function usePixKeys(bankAccountId?: string) {
  const { family } = useAuth();
  return useQuery({
    queryKey: ["pix_keys", family?.id, bankAccountId],
    queryFn: async () => {
      if (!family) return [];
      let query = supabase
        .from("pix_keys")
        .select("*")
        .eq("family_id", family.id)
        .order("created_at", { ascending: false });
      
      if (bankAccountId) {
        query = query.eq("bank_account_id", bankAccountId);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!family,
  });
}

export function useCreateBankAccount() {
  const queryClient = useQueryClient();
  const { family } = useAuth();
  return useMutation({
    mutationFn: async (data: { bank_id?: string; custom_bank_name?: string; account_type: string; nickname: string; initial_balance?: number }) => {
      if (!family) throw new Error("No family");
      const { error } = await supabase.from("bank_accounts").insert({
        bank_id: data.bank_id,
        custom_bank_name: data.custom_bank_name,
        account_type: data.account_type as "checking" | "savings" | "digital" | "salary",
        nickname: data.nickname,
        initial_balance: data.initial_balance,
        family_id: family.id,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["bank_accounts"] }),
  });
}

export function useUpdateBankAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { id: string; bank_id?: string; custom_bank_name?: string; account_type: string; nickname: string; initial_balance?: number; is_active?: boolean }) => {
      const { error } = await supabase
        .from("bank_accounts")
        .update({
          bank_id: data.bank_id,
          custom_bank_name: data.custom_bank_name,
          account_type: data.account_type as "checking" | "savings" | "digital" | "salary",
          nickname: data.nickname,
          initial_balance: data.initial_balance,
          is_active: data.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank_accounts"] });
      queryClient.invalidateQueries({ queryKey: ["home-summary"] });
    },
  });
}

export function useDeleteBankAccount() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("bank_accounts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank_accounts"] });
      queryClient.invalidateQueries({ queryKey: ["home-summary"] });
    },
  });
}

export function useCreateCreditCard() {
  const queryClient = useQueryClient();
  const { family } = useAuth();
  return useMutation({
    mutationFn: async (data: { card_name: string; brand: string; closing_day: number; due_day: number; credit_limit?: number; bank_account_id?: string }) => {
      if (!family) throw new Error("No family");
      const { error } = await supabase.from("credit_cards").insert({
        card_name: data.card_name,
        brand: data.brand as "visa" | "mastercard" | "elo" | "amex" | "hipercard",
        closing_day: data.closing_day,
        due_day: data.due_day,
        credit_limit: data.credit_limit,
        bank_account_id: data.bank_account_id,
        family_id: family.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credit_cards"] });
      queryClient.invalidateQueries({ queryKey: ["home-summary"] });
    },
  });
}

export function useUpdateCreditCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { id: string; card_name: string; brand: string; closing_day: number; due_day: number; credit_limit?: number; bank_account_id?: string; is_active?: boolean }) => {
      const { error } = await supabase
        .from("credit_cards")
        .update({
          card_name: data.card_name,
          brand: data.brand as "visa" | "mastercard" | "elo" | "amex" | "hipercard",
          closing_day: data.closing_day,
          due_day: data.due_day,
          credit_limit: data.credit_limit,
          bank_account_id: data.bank_account_id,
          is_active: data.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credit_cards"] });
      queryClient.invalidateQueries({ queryKey: ["home-summary"] });
    },
  });
}

export function useDeleteCreditCard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("credit_cards").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["credit_cards"] });
      queryClient.invalidateQueries({ queryKey: ["home-summary"] });
    },
  });
}

export function useCreatePixKey() {
  const queryClient = useQueryClient();
  const { family } = useAuth();
  return useMutation({
    mutationFn: async (data: { bank_account_id: string; key_type: string; key_value_masked: string }) => {
      if (!family) throw new Error("No family");
      const { error } = await supabase.from("pix_keys").insert({
        bank_account_id: data.bank_account_id,
        family_id: family.id,
        key_type: data.key_type,
        key_value_masked: data.key_value_masked,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pix_keys"] }),
  });
}

export function useDeletePixKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pix_keys").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pix_keys"] }),
  });
}
