import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useOnboarding } from "./useOnboarding";

export interface EducationTip {
  id: string;
  tipKey: string;
  title: string;
  content: string;
  icon: string | null;
  module: string;
  triggerCondition: string | null;
}

export function useEducation() {
  const { user, family } = useAuth();
  const queryClient = useQueryClient();
  const { state: onboardingState } = useOnboarding();

  // Fetch all education content - ONLY when authenticated
  const { data: allTips = [] } = useQuery({
    queryKey: ["education-content", user?.id],
    queryFn: async () => {
      // Security: Only fetch if user is authenticated
      if (!user?.id) {
        return [];
      }

      const { data, error } = await supabase
        .from("education_content")
        .select("*")
        .eq("is_active", true)
        .order("display_order");

      if (error) {
        console.error("Error fetching education content:", error);
        return [];
      }

      return data.map((tip) => ({
        id: tip.id,
        tipKey: tip.tip_key,
        title: tip.title,
        content: tip.content,
        icon: tip.icon,
        module: tip.module,
        triggerCondition: tip.trigger_condition,
      })) as EducationTip[];
    },
    enabled: !!user?.id, // Only run query when user is authenticated
    staleTime: 1000 * 60 * 30, // 30 minutes
  });

  // Fetch shown tips for this user - ONLY when authenticated
  const { data: shownTips = [] } = useQuery({
    queryKey: ["education-tips-shown", user?.id],
    queryFn: async () => {
      // Security: Require authenticated user
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("education_tips_shown")
        .select("tip_key, dismissed_at")
        .eq("user_id", user.id);

      if (error) {
        console.error("Error fetching shown tips:", error);
        return [];
      }

      return data ?? [];
    },
    enabled: !!user?.id, // Only run when authenticated
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Mark tip as shown
  const markTipShown = useMutation({
    mutationFn: async (tipKey: string) => {
      if (!user?.id || !family?.id) throw new Error("No user or family");

      const { error } = await supabase
        .from("education_tips_shown")
        .upsert({
          user_id: user.id,
          family_id: family.id,
          tip_key: tipKey,
          shown_at: new Date().toISOString(),
        }, {
          onConflict: "user_id,tip_key",
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["education-tips-shown", user?.id] });
    },
  });

  // Dismiss tip (user clicked "Entendi")
  const dismissTip = useMutation({
    mutationFn: async (tipKey: string) => {
      if (!user?.id) throw new Error("No user");

      const { error } = await supabase
        .from("education_tips_shown")
        .update({ dismissed_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .eq("tip_key", tipKey);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["education-tips-shown", user?.id] });
    },
  });

  // Check if tips are enabled
  const areTipsEnabled = onboardingState.educationTipsEnabled;

  // Get tips that haven't been dismissed
  const getAvailableTips = (module?: string) => {
    if (!areTipsEnabled) return [];

    const dismissedKeys = shownTips
      .filter((t) => t.dismissed_at)
      .map((t) => t.tip_key);

    return allTips.filter((tip) => {
      if (dismissedKeys.includes(tip.tipKey)) return false;
      if (module && tip.module !== module) return false;
      return true;
    });
  };

  // Get contextual tip for a specific trigger
  const getContextualTip = (trigger: string): EducationTip | null => {
    if (!areTipsEnabled || !onboardingState.contextualHintsEnabled) return null;

    const dismissedKeys = shownTips
      .filter((t) => t.dismissed_at)
      .map((t) => t.tip_key);

    const tip = allTips.find(
      (t) => t.triggerCondition === trigger && !dismissedKeys.includes(t.tipKey)
    );

    return tip || null;
  };

  // Get tips by module for FAQ/Help
  const getTipsByModule = (module: string) => {
    return allTips.filter((tip) => tip.module === module);
  };

  return {
    allTips,
    shownTips,
    areTipsEnabled,
    markTipShown,
    dismissTip,
    getAvailableTips,
    getContextualTip,
    getTipsByModule,
  };
}
