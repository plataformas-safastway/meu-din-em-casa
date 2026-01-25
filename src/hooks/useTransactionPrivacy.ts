import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { addDays, format } from "date-fns";

export interface TransactionPrivacy {
  id: string;
  transactionId: string;
  familyId: string;
  createdByUserId: string;
  isPrivate: boolean;
  revealAt: string | null;
  revealedAt: string | null;
  reason: string | null;
  source: 'OPEN_FINANCE' | 'PLUGGY';
  maxPrivacyDays: number;
  createdAt: string;
  updatedAt: string;
}

interface TransactionPrivacyRow {
  id: string;
  transaction_id: string;
  family_id: string;
  created_by_user_id: string;
  is_private: boolean;
  reveal_at: string | null;
  revealed_at: string | null;
  reason: string | null;
  source: string;
  max_privacy_days: number;
  created_at: string;
  updated_at: string;
}

// Get all private transactions for the current family
export function usePrivateTransactions() {
  const { family } = useAuth();

  return useQuery({
    queryKey: ["private-transactions", family?.id],
    queryFn: async (): Promise<TransactionPrivacy[]> => {
      if (!family) return [];

      try {
        const { data, error } = await supabase
          .from("transaction_privacy" as any)
          .select("*")
          .eq("family_id", family.id)
          .order("created_at", { ascending: false });

        if (error) {
          console.warn("Error fetching private transactions:", error);
          return [];
        }

        if (!data || !Array.isArray(data)) return [];

        return (data as unknown as TransactionPrivacyRow[]).map(row => ({
          id: row.id,
          transactionId: row.transaction_id,
          familyId: row.family_id,
          createdByUserId: row.created_by_user_id,
          isPrivate: row.is_private,
          revealAt: row.reveal_at,
          revealedAt: row.revealed_at,
          reason: row.reason,
          source: row.source as 'OPEN_FINANCE' | 'PLUGGY',
          maxPrivacyDays: row.max_privacy_days,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        }));
      } catch {
        return [];
      }
    },
    enabled: !!family,
  });
}

// Check if a specific transaction is private for current user
export function useTransactionPrivacy(transactionId: string | undefined) {
  const { user, family } = useAuth();

  return useQuery({
    queryKey: ["transaction-privacy", transactionId, user?.id],
    queryFn: async (): Promise<{ isPrivateForUser: boolean; privacy: TransactionPrivacy | null }> => {
      if (!transactionId || !user || !family) {
        return { isPrivateForUser: false, privacy: null };
      }

      try {
        const { data, error } = await supabase
          .from("transaction_privacy" as any)
          .select("*")
          .eq("transaction_id", transactionId)
          .maybeSingle();

        if (error || !data) {
          return { isPrivateForUser: false, privacy: null };
        }

        const row = data as unknown as TransactionPrivacyRow;
        const privacy: TransactionPrivacy = {
          id: row.id,
          transactionId: row.transaction_id,
          familyId: row.family_id,
          createdByUserId: row.created_by_user_id,
          isPrivate: row.is_private,
          revealAt: row.reveal_at,
          revealedAt: row.revealed_at,
          reason: row.reason,
          source: row.source as 'OPEN_FINANCE' | 'PLUGGY',
          maxPrivacyDays: row.max_privacy_days,
          createdAt: row.created_at,
          updatedAt: row.updated_at,
        };

        // If user is the creator, they see everything
        const isPrivateForUser = row.is_private && row.created_by_user_id !== user.id;

        return { isPrivateForUser, privacy };
      } catch {
        return { isPrivateForUser: false, privacy: null };
      }
    },
    enabled: !!transactionId && !!user && !!family,
  });
}

// Mark a transaction as private
export function useMarkTransactionPrivate() {
  const queryClient = useQueryClient();
  const { user, family } = useAuth();

  return useMutation({
    mutationFn: async ({
      transactionId,
      revealAt,
      reason,
      maxPrivacyDays = 30,
      source = 'OPEN_FINANCE',
    }: {
      transactionId: string;
      revealAt?: string | null;
      reason?: string;
      maxPrivacyDays?: number;
      source?: 'OPEN_FINANCE' | 'PLUGGY';
    }) => {
      if (!user || !family) throw new Error("No user or family");

      const { error } = await supabase
        .from("transaction_privacy" as any)
        .insert({
          transaction_id: transactionId,
          family_id: family.id,
          created_by_user_id: user.id,
          is_private: true,
          reveal_at: revealAt || null,
          reason: reason || null,
          source,
          max_privacy_days: maxPrivacyDays,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["private-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transaction-privacy"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast({
        title: "Despesa marcada como privada",
        description: "Os detalhes ficarão ocultos para outros membros.",
      });
    },
    onError: (error: any) => {
      // Check if it's a duplicate key error
      if (error?.code === '23505') {
        toast({
          title: "Despesa já é privada",
          description: "Esta despesa já possui configuração de privacidade.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro ao marcar privacidade",
          description: "Não foi possível ocultar a despesa.",
          variant: "destructive",
        });
      }
    },
  });
}

// Reveal a private transaction
export function useRevealTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (privacyId: string) => {
      const { error } = await supabase
        .from("transaction_privacy" as any)
        .update({
          is_private: false,
          revealed_at: new Date().toISOString(),
        })
        .eq("id", privacyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["private-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transaction-privacy"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast({
        title: "Despesa revelada",
        description: "Todos os membros podem ver os detalhes agora.",
      });
    },
    onError: () => {
      toast({
        title: "Erro ao revelar",
        description: "Não foi possível revelar a despesa.",
        variant: "destructive",
      });
    },
  });
}

// Schedule reveal for a future date
export function useScheduleReveal() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ privacyId, revealAt }: { privacyId: string; revealAt: string }) => {
      const { error } = await supabase
        .from("transaction_privacy" as any)
        .update({
          reveal_at: revealAt,
        })
        .eq("id", privacyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["private-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transaction-privacy"] });
      toast({
        title: "Revelação agendada",
        description: "A despesa será revelada automaticamente na data definida.",
      });
    },
    onError: () => {
      toast({
        title: "Erro ao agendar",
        description: "Não foi possível agendar a revelação.",
        variant: "destructive",
      });
    },
  });
}

// Update privacy reason
export function useUpdatePrivacyReason() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ privacyId, reason }: { privacyId: string; reason: string }) => {
      const { error } = await supabase
        .from("transaction_privacy" as any)
        .update({ reason })
        .eq("id", privacyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["private-transactions"] });
      toast({
        title: "Motivo atualizado",
        description: "Sua anotação foi salva.",
      });
    },
  });
}

// Remove privacy (delete the record)
export function useRemovePrivacy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (privacyId: string) => {
      const { error } = await supabase
        .from("transaction_privacy" as any)
        .delete()
        .eq("id", privacyId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["private-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["transaction-privacy"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast({
        title: "Privacidade removida",
        description: "A despesa agora é visível normalmente.",
      });
    },
  });
}
