import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface LGPDDeletionRequest {
  id: string;
  user_id: string;
  family_id: string | null;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "CANCELLED";
  requested_at: string;
  processed_at: string | null;
  deadline_at: string;
  completed_at: string | null;
  completion_notes: string | null;
}

// Check if user has pending LGPD request
export function useLGPDRequestStatus() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["lgpd-request-status", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("lgpd_deletion_requests")
        .select("*")
        .eq("user_id", user.id)
        .in("status", ["PENDING", "PROCESSING"])
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error fetching LGPD status:", error);
        return null;
      }

      return data as LGPDDeletionRequest | null;
    },
    enabled: !!user,
  });
}

// Get all user's LGPD requests (history)
export function useLGPDRequestHistory() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["lgpd-request-history", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("lgpd_deletion_requests")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching LGPD history:", error);
        return [];
      }

      return data as LGPDDeletionRequest[];
    },
    enabled: !!user,
  });
}

// Send verification code
export function useSendLGPDCode() {
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("lgpd-send-code", {
        method: "POST",
      });

      if (error) throw new Error(error.message || "Erro ao enviar código");
      if (data?.error) throw new Error(data.error);

      return data;
    },
    onSuccess: () => {
      toast.success("Código enviado para seu e-mail!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao enviar código");
    },
  });
}

// Verify code and create request
export function useVerifyLGPDCode() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (code: string) => {
      const { data, error } = await supabase.functions.invoke("lgpd-verify-code", {
        method: "POST",
        body: { code },
      });

      if (error) throw new Error(error.message || "Erro ao verificar código");
      if (data?.error) throw new Error(data.error);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lgpd-request-status"] });
      queryClient.invalidateQueries({ queryKey: ["lgpd-request-history"] });
      toast.success("Solicitação registrada com sucesso!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Código inválido ou expirado");
    },
  });
}

// Cancel pending request
export function useCancelLGPDRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestId: string) => {
      const { data, error } = await supabase.functions.invoke("lgpd-cancel-request", {
        method: "POST",
        body: { request_id: requestId },
      });

      if (error) throw new Error(error.message || "Erro ao cancelar solicitação");
      if (data?.error) throw new Error(data.error);

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lgpd-request-status"] });
      queryClient.invalidateQueries({ queryKey: ["lgpd-request-history"] });
      toast.success("Solicitação cancelada com sucesso!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao cancelar solicitação");
    },
  });
}
