import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";
import type { OnboardingData } from "@/data/budgetModes";
import type { BudgetItem } from "@/components/onboarding/BudgetProposalScreen";
import { getCategoryIdFromPrefix, getBandById } from "@/data/budgetTemplates";

export interface SaveOnboardingInput {
  data: OnboardingData;
  budgets: BudgetItem[];
}

/**
 * CRITICAL RULE: Onboarding NEVER creates a family automatically.
 * 
 * This hook operates within an existing family context:
 * - If user has an active family (from AuthContext), use it
 * - If user has no family, throw an error (family must be created explicitly beforehand)
 * 
 * Family creation is ONLY allowed via explicit user action (CTA/button)
 * in a dedicated family creation flow, NOT during onboarding steps.
 */
export function useOnboardingWizard() {
  const { user, family, refreshFamily } = useAuth();
  const queryClient = useQueryClient();

  /**
   * CRITICAL: Complete onboarding using UPSERT with ON CONFLICT (user_id)
   * 
   * The user_onboarding table is GLOBAL per user (user_id is UNIQUE).
   * This function ensures the status is correctly set to 'completed'.
   */
  const completeOnboarding = async (userId: string, familyId: string | null): Promise<void> => {
    const nowISO = new Date().toISOString();
    
    const payload = {
      user_id: userId,
      family_id: familyId,
      status: 'completed' as const,
      onboarding_wizard_completed_at: nowISO,
      suggested_budget_generated_at: nowISO,
      step_budget_at: nowISO,
    };

    console.log('[completeOnboarding] Upserting onboarding status:', payload);

    const { data, error } = await supabase
      .from('user_onboarding')
      .upsert(payload, { 
        onConflict: 'user_id',
        ignoreDuplicates: false // Ensure update happens
      })
      .select()
      .single();

    if (error) {
      console.error('[completeOnboarding] ERROR:', {
        payload,
        error,
        code: error.code,
        message: error.message,
        details: error.details,
      });
      throw new Error(`Erro ao atualizar status do onboarding: ${error.message}`);
    }

    console.log('[completeOnboarding] SUCCESS:', { data });
  };

  // Save all onboarding data and create budgets within EXISTING family context
  const saveOnboarding = useMutation({
    mutationFn: async ({ data, budgets }: SaveOnboardingInput) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      // CRITICAL: Must have an active family context
      // Onboarding NEVER creates family - it must already exist
      if (!family?.id) {
        console.error("[useOnboardingWizard] BLOCKED: No active family context");
        throw new Error("Nenhuma família ativa. Crie ou selecione uma família antes de continuar.");
      }

      const familyId = family.id;
      console.log("[useOnboardingWizard] Using existing family context:", familyId);

      // Get the name from session storage (set during signup)
      const displayName = sessionStorage.getItem("onboarding_name") || "Usuário";

      // Get subband info for reference
      const band = getBandById(data.incomeBandId);
      const subBand = band?.subBands.find(sb => sb.midpoint === data.incomeAnchorValue);

      // 1. Update family with extended onboarding data (NOT create)
      const { error: updateError } = await supabase
        .from("families")
        .update({
          income_range: data.incomeBandId,
          primary_objective: data.budgetMode,
          income_anchor_value: data.incomeAnchorValue,
          income_subband: subBand?.id || null,
          income_type: data.incomeType,
          financial_stage: data.financialStage,
          budget_mode: data.budgetMode,
          household_structure: data.householdStructure,
          has_pets: data.hasPets,
          has_dependents: data.hasDependents,
          non_monthly_planning_level: data.nonMonthlyPlanningLevel,
        })
        .eq("id", familyId);

      if (updateError) {
        console.error("Error updating family:", updateError);
        throw new Error("Erro ao atualizar dados da família");
      }

      // 2. Update family member display name if needed
      const { error: memberError } = await supabase
        .from("family_members")
        .update({
          display_name: displayName,
        })
        .eq("family_id", familyId)
        .eq("user_id", user.id);

      if (memberError) {
        console.error("Error updating family member:", memberError);
        // Non-critical, continue
      }

      // 3. Log onboarding responses (for analytics, no sensitive data)
      const responses = [
        { key: 'income_band', value: data.incomeBandId },
        { key: 'income_type', value: data.incomeType },
        { key: 'financial_stage', value: data.financialStage },
        { key: 'budget_mode', value: data.budgetMode },
        { key: 'household_structure', value: data.householdStructure },
        { key: 'has_pets', value: String(data.hasPets) },
        { key: 'non_monthly_planning', value: data.nonMonthlyPlanningLevel },
      ];

      for (const resp of responses) {
        await supabase.from("onboarding_responses").insert({
          family_id: familyId,
          user_id: user.id,
          response_key: resp.key,
          response_value: resp.value,
        });
      }

      // 4. Create budgets
      const monthRef = format(new Date(), "yyyy-MM");
      let budgetsCreated = 0;

      for (const budget of budgets) {
        const categoryId = getCategoryIdFromPrefix(budget.prefixCode);
        if (!categoryId || budget.amount <= 0) continue;

        const { error: budgetError } = await supabase
          .from("budgets")
          .insert({
            family_id: familyId,
            category_id: categoryId,
            subcategory_id: null,
            monthly_limit: budget.amount,
            is_active: true,
          });

        if (!budgetError) budgetsCreated++;
      }

      // 5. Record template application
      const percentagesApplied: Record<string, number> = {};
      budgets.forEach(b => {
        percentagesApplied[b.prefixCode] = b.percentage / 100;
      });

      await supabase.from("budget_template_applications").upsert({
        family_id: familyId,
        income_band: data.incomeBandId,
        income_subband: subBand?.id || data.incomeBandId + '_mid',
        estimated_income_midpoint: data.incomeAnchorValue,
        percentages_applied: percentagesApplied,
        has_pets: data.hasPets,
        has_dependents: data.hasDependents,
        applied_by: user.id,
        month_ref: monthRef,
      }, {
        onConflict: "family_id,month_ref",
      });

      // 6. CRITICAL: Complete onboarding using UPSERT with ON CONFLICT (user_id)
      // This is the authoritative persistence of onboarding completion
      await completeOnboarding(user.id, familyId);

      // 7. Log audit event
      await supabase.from("audit_logs").insert({
        user_id: user.id,
        family_id: familyId,
        action: "ONBOARDING_COMPLETED",
        entity_type: "onboarding",
        entity_id: familyId,
        metadata: {
          budget_mode: data.budgetMode,
          budgets_created: budgetsCreated,
          used_existing_family: true,
        },
      });

      // 8. Refresh family data in auth context
      await refreshFamily();

      // Clear session storage
      sessionStorage.removeItem("onboarding_name");

      return { budgetsCreated, familyId };
    },
    onSuccess: async (result) => {
      // CRITICAL: Invalidate and refetch BEFORE navigating
      // This ensures the gate sees the updated status
      await queryClient.invalidateQueries({ queryKey: ["app-authorization-onboarding", user?.id] });
      await queryClient.invalidateQueries({ queryKey: ["onboarding", user?.id] });
      await queryClient.invalidateQueries({ queryKey: ["budgets"] });
      await queryClient.invalidateQueries({ queryKey: ["family"] });
      await queryClient.invalidateQueries({ queryKey: ["budget-template-application"] });
      
      // Force refetch to ensure fresh data before navigation
      await queryClient.refetchQueries({ queryKey: ["app-authorization-onboarding", user?.id] });
      
      toast.success(`Orçamento criado com ${result.budgetsCreated} categorias!`);
    },
    onError: (error: any) => {
      console.error("[useOnboardingWizard] Error saving onboarding:", error);
      toast.error(error.message || "Erro ao salvar configurações");
    },
  });

  // Generate AI suggestions (placeholder - will call edge function)
  const generateAISuggestions = useMutation({
    mutationFn: async (currentBudgets: BudgetItem[]) => {
      // This would call an edge function to generate AI suggestions
      // For now, return the same budgets (AI generation to be implemented)
      toast.info("Geração por AI será implementada em breve");
      return currentBudgets;
    },
  });

  return {
    saveOnboarding,
    generateAISuggestions,
    isLoading: saveOnboarding.isPending,
    completeOnboarding, // Export for direct use if needed
  };
}
