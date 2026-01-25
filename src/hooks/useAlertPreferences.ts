import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface AlertPreferences {
  id: string;
  familyId: string;
  userId: string;
  alertsEnabled: boolean;
  quietHoursStart: number;
  quietHoursEnd: number;
  receivePush: boolean;
  receiveInApp: boolean;
  notifyDaysBefore: number[];
}

const DEFAULT_PREFERENCES: Omit<AlertPreferences, 'id' | 'familyId' | 'userId'> = {
  alertsEnabled: true,
  quietHoursStart: 20,
  quietHoursEnd: 8,
  receivePush: true,
  receiveInApp: true,
  notifyDaysBefore: [7, 3, 0],
};

export function useAlertPreferences() {
  const { user, family } = useAuth();

  return useQuery({
    queryKey: ["alert-preferences", family?.id, user?.id],
    queryFn: async (): Promise<AlertPreferences> => {
      if (!family || !user) {
        return {
          ...DEFAULT_PREFERENCES,
          id: '',
          familyId: '',
          userId: '',
        };
      }

      try {
        // Use raw SQL query to avoid type issues with new tables
        const { data, error } = await supabase
          .rpc('get_alert_preferences' as any, {
            p_family_id: family.id,
            p_user_id: user.id
          });

        if (error) {
          // Table might not exist yet, return defaults
          console.debug("Alert preferences not found, using defaults");
          return {
            ...DEFAULT_PREFERENCES,
            id: '',
            familyId: family.id,
            userId: user.id,
          };
        }

        if (!data || (Array.isArray(data) && data.length === 0)) {
          return {
            ...DEFAULT_PREFERENCES,
            id: '',
            familyId: family.id,
            userId: user.id,
          };
        }

        const row = Array.isArray(data) ? data[0] : data;

        return {
          id: row.id || '',
          familyId: row.family_id || family.id,
          userId: row.user_id || user.id,
          alertsEnabled: row.alerts_enabled ?? true,
          quietHoursStart: row.quiet_hours_start ?? 20,
          quietHoursEnd: row.quiet_hours_end ?? 8,
          receivePush: row.receive_push ?? true,
          receiveInApp: row.receive_in_app ?? true,
          notifyDaysBefore: row.notify_days_before ?? [7, 3, 0],
        };
      } catch {
        // Return defaults on any error
        return {
          ...DEFAULT_PREFERENCES,
          id: '',
          familyId: family.id,
          userId: user.id,
        };
      }
    },
    enabled: !!family && !!user,
  });
}

export function useUpdateAlertPreferences() {
  const queryClient = useQueryClient();
  const { user, family } = useAuth();

  return useMutation({
    mutationFn: async (updates: Partial<Omit<AlertPreferences, 'id' | 'familyId' | 'userId'>>) => {
      if (!family || !user) throw new Error("No family or user");

      const updatePayload: Record<string, unknown> = {
        family_id: family.id,
        user_id: user.id,
        updated_at: new Date().toISOString(),
      };

      if (updates.alertsEnabled !== undefined) {
        updatePayload.alerts_enabled = updates.alertsEnabled;
      }
      if (updates.quietHoursStart !== undefined) {
        updatePayload.quiet_hours_start = updates.quietHoursStart;
      }
      if (updates.quietHoursEnd !== undefined) {
        updatePayload.quiet_hours_end = updates.quietHoursEnd;
      }
      if (updates.receivePush !== undefined) {
        updatePayload.receive_push = updates.receivePush;
      }
      if (updates.receiveInApp !== undefined) {
        updatePayload.receive_in_app = updates.receiveInApp;
      }
      if (updates.notifyDaysBefore !== undefined) {
        updatePayload.notify_days_before = updates.notifyDaysBefore;
      }

      // Try to use RPC for upsert
      const { error } = await supabase.rpc('upsert_alert_preferences' as any, {
        p_family_id: family.id,
        p_user_id: user.id,
        p_alerts_enabled: updatePayload.alerts_enabled ?? true,
        p_quiet_hours_start: updatePayload.quiet_hours_start ?? 20,
        p_quiet_hours_end: updatePayload.quiet_hours_end ?? 8,
        p_receive_push: updatePayload.receive_push ?? true,
        p_receive_in_app: updatePayload.receive_in_app ?? true,
        p_notify_days_before: updatePayload.notify_days_before ?? [7, 3, 0],
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alert-preferences"] });
      toast({
        title: "Preferências salvas",
        description: "Suas configurações de alertas foram atualizadas.",
      });
    },
    onError: () => {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível atualizar suas preferências.",
        variant: "destructive",
      });
    },
  });
}

export function useToggleRecurringAlerts() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      recurringId, 
      enabled 
    }: { 
      recurringId: string; 
      enabled: boolean 
    }) => {
      const { error } = await supabase
        .from("recurring_transactions")
        .update({ alerts_enabled: enabled } as any)
        .eq("id", recurringId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recurring-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["upcoming-dues"] });
    },
  });
}
