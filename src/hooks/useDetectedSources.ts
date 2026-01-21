import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface DetectedSource {
  id: string;
  import_id: string;
  source_type: "bank_account" | "credit_card";
  bank_name: string;
  agency?: string | null;
  account_number?: string | null;
  last4?: string | null;
  matched_source_id?: string | null;
  match_status: "pending" | "matched" | "created" | "skipped";
  user_confirmed: boolean;
  created_at: string;
}

export function useDetectedSources(importId: string | null) {
  const { family } = useAuth();

  return useQuery({
    queryKey: ["detected_sources", importId],
    queryFn: async () => {
      if (!importId || !family) return [];

      const { data, error } = await supabase
        .from("import_detected_sources")
        .select("*")
        .eq("import_id", importId)
        .eq("family_id", family.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as DetectedSource[];
    },
    enabled: !!importId && !!family,
  });
}

export function useUpdateDetectedSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      id: string;
      matched_source_id?: string | null;
      match_status: "pending" | "matched" | "created" | "skipped";
      user_confirmed?: boolean;
    }) => {
      const { error } = await supabase
        .from("import_detected_sources")
        .update({
          matched_source_id: data.matched_source_id,
          match_status: data.match_status,
          user_confirmed: data.user_confirmed ?? true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["detected_sources"] });
    },
  });
}

export function useCreateSourceFromDetected() {
  const queryClient = useQueryClient();
  const { family } = useAuth();

  return useMutation({
    mutationFn: async (detected: DetectedSource) => {
      if (!family) throw new Error("No family");

      let createdId: string;

      if (detected.source_type === "bank_account") {
        // Try to find bank by name
        const { data: banks } = await supabase
          .from("banks")
          .select("id, name")
          .ilike("name", `%${detected.bank_name}%`)
          .limit(1);

        const bankId = banks?.[0]?.id;

        const { data: newAccount, error: accountError } = await supabase
          .from("bank_accounts")
          .insert({
            family_id: family.id,
            bank_id: bankId || null,
            custom_bank_name: bankId ? null : detected.bank_name,
            account_type: "checking",
            nickname: detected.account_number
              ? `${detected.bank_name} - ${detected.account_number}`
              : detected.bank_name,
            initial_balance: 0,
          })
          .select("id")
          .single();

        if (accountError) throw accountError;
        createdId = newAccount.id;

        toast.success("Conta bancária criada", {
          description: `${detected.bank_name} foi adicionada automaticamente.`,
        });
      } else {
        // Credit card
        const { data: newCard, error: cardError } = await supabase
          .from("credit_cards")
          .insert({
            family_id: family.id,
            card_name: detected.last4
              ? `${detected.bank_name} ****${detected.last4}`
              : detected.bank_name,
            brand: "visa", // Default
            closing_day: 25,
            due_day: 5,
          })
          .select("id")
          .single();

        if (cardError) throw cardError;
        createdId = newCard.id;

        toast.success("Cartão de crédito criado", {
          description: `${detected.bank_name} foi adicionado automaticamente.`,
        });
      }

      // Update detected source with the created ID
      const { error: updateError } = await supabase
        .from("import_detected_sources")
        .update({
          matched_source_id: createdId,
          match_status: "created",
          user_confirmed: true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", detected.id);

      if (updateError) throw updateError;

      return createdId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["detected_sources"] });
      queryClient.invalidateQueries({ queryKey: ["bank_accounts"] });
      queryClient.invalidateQueries({ queryKey: ["credit_cards"] });
    },
  });
}

export function useMatchSimilarSources(detected: DetectedSource | null) {
  const { family } = useAuth();

  return useQuery({
    queryKey: ["similar_sources", detected?.id, detected?.source_type],
    queryFn: async () => {
      if (!detected || !family) return [];

      if (detected.source_type === "bank_account") {
        const { data } = await supabase
          .from("bank_accounts")
          .select("id, nickname, bank_id, custom_bank_name, banks(name)")
          .eq("family_id", family.id)
          .eq("is_active", true);

        // Score similarity
        const scored = (data || []).map((account) => {
          let score = 0;
          const bankName = (account.banks as { name: string } | null)?.name || account.custom_bank_name || "";
          
          // Check bank name similarity
          if (bankName.toLowerCase().includes(detected.bank_name.toLowerCase()) ||
              detected.bank_name.toLowerCase().includes(bankName.toLowerCase())) {
            score += 50;
          }

          // Check account number
          if (detected.account_number && account.nickname.includes(detected.account_number)) {
            score += 40;
          }

          return {
            id: account.id,
            name: account.nickname,
            details: bankName,
            score,
          };
        });

        return scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score);
      } else {
        const { data } = await supabase
          .from("credit_cards")
          .select("id, card_name, brand")
          .eq("family_id", family.id)
          .eq("is_active", true);

        const scored = (data || []).map((card) => {
          let score = 0;

          // Check bank name in card name
          if (card.card_name.toLowerCase().includes(detected.bank_name.toLowerCase())) {
            score += 50;
          }

          // Check last4
          if (detected.last4 && card.card_name.includes(detected.last4)) {
            score += 40;
          }

          return {
            id: card.id,
            name: card.card_name,
            details: card.brand,
            score,
          };
        });

        return scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score);
      }
    },
    enabled: !!detected && !!family,
  });
}
