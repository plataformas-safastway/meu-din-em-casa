import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

export interface NotificationPreferences {
  id: string;
  member_id: string;
  family_id: string;
  push_transactions: boolean;
  push_budget_alerts: boolean;
  push_location_context: boolean;
  push_subscription: Json | null;
  created_at: string;
  updated_at: string;
}

// Get notification preferences
export function useNotificationPreferences() {
  const { familyMember } = useAuth();

  return useQuery({
    queryKey: ["notification-preferences", familyMember?.id],
    queryFn: async () => {
      if (!familyMember) return null;

      const { data, error } = await supabase
        .from("member_notification_preferences")
        .select("*")
        .eq("member_id", familyMember.id)
        .maybeSingle();

      if (error) throw error;
      return data as NotificationPreferences | null;
    },
    enabled: !!familyMember,
  });
}

// Update notification preferences
export function useUpdateNotificationPreferences() {
  const { familyMember, family } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: {
      push_transactions?: boolean;
      push_budget_alerts?: boolean;
      push_location_context?: boolean;
      push_subscription?: Json | null;
    }) => {
      if (!familyMember || !family) throw new Error("Não autenticado");

      // Check if record exists
      const { data: existing } = await supabase
        .from("member_notification_preferences")
        .select("id")
        .eq("member_id", familyMember.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("member_notification_preferences")
          .update({
            push_transactions: updates.push_transactions,
            push_budget_alerts: updates.push_budget_alerts,
            push_location_context: updates.push_location_context,
            push_subscription: updates.push_subscription,
            updated_at: new Date().toISOString(),
          })
          .eq("member_id", familyMember.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("member_notification_preferences")
          .insert([{
            member_id: familyMember.id,
            family_id: family.id,
            push_transactions: updates.push_transactions ?? true,
            push_budget_alerts: updates.push_budget_alerts ?? true,
            push_location_context: updates.push_location_context ?? false,
            push_subscription: updates.push_subscription ?? null,
          }]);

        if (error) throw error;
      }

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
      toast.success("Preferências atualizadas!");
    },
    onError: (error: any) => {
      console.error("Error updating preferences:", error);
      toast.error("Erro ao atualizar preferências");
    },
  });
}

// Subscribe to Web Push
export function useWebPushSubscription() {
  const updatePreferences = useUpdateNotificationPreferences();

  const subscribe = async () => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      toast.error("Push notifications não suportadas neste navegador");
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        toast.error("Permissão de notificação negada");
        return false;
      }

      const registration = await navigator.serviceWorker.ready;
      
      // For PWA, we don't need VAPID key for basic notifications
      // Just save the fact that user has granted permission
      await updatePreferences.mutateAsync({
        push_subscription: { granted: true, timestamp: Date.now() },
      });

      toast.success("Notificações ativadas!");
      return true;
    } catch (error) {
      console.error("Push subscription error:", error);
      toast.error("Erro ao ativar notificações");
      return false;
    }
  };

  const unsubscribe = async () => {
    try {
      await updatePreferences.mutateAsync({
        push_subscription: null,
      });
      toast.success("Notificações desativadas");
      return true;
    } catch (error) {
      console.error("Push unsubscribe error:", error);
      return false;
    }
  };

  return { subscribe, unsubscribe };
}
