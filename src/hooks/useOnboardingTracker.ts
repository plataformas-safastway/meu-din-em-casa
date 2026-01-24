import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Hook that automatically tracks onboarding step completions
 * by listening to relevant database changes
 */
export function useOnboardingTracker() {
  const { user, family } = useAuth();
  const queryClient = useQueryClient();
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (!user?.id || !family?.id || hasInitialized.current) return;
    hasInitialized.current = true;

    // Check and update onboarding steps based on existing data
    const checkAndUpdateSteps = async () => {
      try {
        // Fetch current onboarding state
        const { data: onboarding } = await supabase
          .from("user_onboarding")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!onboarding) return;

        const updates: Record<string, string> = {};

        // Check bank accounts
        if (!onboarding.step_bank_account_at) {
          const { count } = await supabase
            .from("bank_accounts")
            .select("id", { count: "exact", head: true })
            .eq("family_id", family.id);
          
          if (count && count > 0) {
            updates.step_bank_account_at = new Date().toISOString();
          }
        }

        // Check imports
        if (!onboarding.step_import_at) {
          const { count } = await supabase
            .from("imports")
            .select("id", { count: "exact", head: true })
            .eq("family_id", family.id)
            .eq("status", "completed");
          
          if (count && count > 0) {
            updates.step_import_at = new Date().toISOString();
          }
        }

        // Check budgets
        if (!onboarding.step_budget_at) {
          const { count } = await supabase
            .from("budgets")
            .select("id", { count: "exact", head: true })
            .eq("family_id", family.id)
            .eq("is_active", true);
          
          if (count && count > 0) {
            updates.step_budget_at = new Date().toISOString();
          }
        }

        // Check goals
        if (!onboarding.step_goal_at) {
          const { count } = await supabase
            .from("goals")
            .select("id", { count: "exact", head: true })
            .eq("family_id", family.id);
          
          if (count && count > 0) {
            updates.step_goal_at = new Date().toISOString();
          }
        }

        // Check family members (more than 1)
        if (!onboarding.step_family_invite_at) {
          const { count } = await supabase
            .from("family_members")
            .select("id", { count: "exact", head: true })
            .eq("family_id", family.id);
          
          if (count && count > 1) {
            updates.step_family_invite_at = new Date().toISOString();
          }
        }

        // Apply updates if any
        if (Object.keys(updates).length > 0) {
          await supabase
            .from("user_onboarding")
            .update(updates)
            .eq("user_id", user.id);
          
          // Invalidate onboarding query
          queryClient.invalidateQueries({ queryKey: ["onboarding", user.id] });
        }
      } catch (error) {
        console.error("Error checking onboarding steps:", error);
      }
    };

    checkAndUpdateSteps();
  }, [user?.id, family?.id, queryClient]);
}
