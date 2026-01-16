import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PlaceCategoryMapping {
  id: string;
  place_type: string;
  category_id: string;
  subcategory_id: string | null;
}

export interface NotificationLog {
  id: string;
  family_id: string;
  user_id: string;
  notification_type: string;
  place_id: string | null;
  category_id: string | null;
  message: string | null;
  created_at: string;
}

// Get place type to category mappings
export function usePlaceMappings() {
  return useQuery({
    queryKey: ["place-mappings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("place_category_mapping")
        .select("*");

      if (error) throw error;
      return data as PlaceCategoryMapping[];
    },
  });
}

// Check if we can send notification (anti-spam)
export function useCanSendNotification() {
  const { family, user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (placeId: string): Promise<boolean> => {
      if (!family || !user) return false;

      // Check if we sent a notification for this place in the last 6 hours
      const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();

      const { data, error } = await supabase
        .from("notifications_log")
        .select("id")
        .eq("family_id", family.id)
        .eq("place_id", placeId)
        .gte("created_at", sixHoursAgo)
        .limit(1);

      if (error) throw error;

      return data.length === 0;
    },
  });
}

// Log a notification
export function useLogNotification() {
  const { family, user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      notification_type: string;
      place_id?: string;
      category_id?: string;
      message?: string;
    }) => {
      if (!family || !user) throw new Error("No family or user");

      const { error } = await supabase.from("notifications_log").insert({
        family_id: family.id,
        user_id: user.id,
        notification_type: data.notification_type,
        place_id: data.place_id || null,
        category_id: data.category_id || null,
        message: data.message || null,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications-log"] });
    },
  });
}

// Get recent notifications
export function useRecentNotifications() {
  const { family } = useAuth();

  return useQuery({
    queryKey: ["notifications-log", family?.id],
    queryFn: async () => {
      if (!family) return [];

      const { data, error } = await supabase
        .from("notifications_log")
        .select("*")
        .eq("family_id", family.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data as NotificationLog[];
    },
    enabled: !!family,
  });
}
