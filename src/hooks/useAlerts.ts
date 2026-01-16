import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface Alert {
  id: string;
  family_id: string;
  alert_type: string;
  title: string;
  message: string;
  category_id: string | null;
  severity: "info" | "warning" | "danger";
  is_read: boolean;
  action_url: string | null;
  created_at: string;
}

export function useAlerts() {
  const { family } = useAuth();

  return useQuery({
    queryKey: ["alerts", family?.id],
    queryFn: async () => {
      if (!family) return [];

      const { data, error } = await supabase
        .from("alerts")
        .select("*")
        .eq("family_id", family.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as Alert[];
    },
    enabled: !!family,
  });
}

export function useUnreadAlerts() {
  const { family } = useAuth();

  return useQuery({
    queryKey: ["alerts", "unread", family?.id],
    queryFn: async () => {
      if (!family) return [];

      const { data, error } = await supabase
        .from("alerts")
        .select("*")
        .eq("family_id", family.id)
        .eq("is_read", false)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Alert[];
    },
    enabled: !!family,
  });
}

export function useCreateAlert() {
  const queryClient = useQueryClient();
  const { family } = useAuth();

  return useMutation({
    mutationFn: async (data: {
      alert_type: string;
      title: string;
      message: string;
      category_id?: string;
      severity?: "info" | "warning" | "danger";
      action_url?: string;
    }) => {
      if (!family) throw new Error("No family");

      const { error } = await supabase.from("alerts").insert({
        family_id: family.id,
        alert_type: data.alert_type,
        title: data.title,
        message: data.message,
        category_id: data.category_id || null,
        severity: data.severity || "info",
        action_url: data.action_url || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    },
  });
}

export function useMarkAlertRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("alerts")
        .update({ is_read: true })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    },
  });
}

export function useMarkAllAlertsRead() {
  const queryClient = useQueryClient();
  const { family } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!family) throw new Error("No family");

      const { error } = await supabase
        .from("alerts")
        .update({ is_read: true })
        .eq("family_id", family.id)
        .eq("is_read", false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts"] });
    },
  });
}
