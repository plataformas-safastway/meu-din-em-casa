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

export function useOnboardingWizard() {
  const { user, refreshFamily } = useAuth();
  const queryClient = useQueryClient();

  // Save all onboarding data and create budgets
  const saveOnboarding = useMutation({
    mutationFn: async ({ data, budgets }: SaveOnboardingInput) => {
      if (!user?.id) throw new Error("No user");

      // Get the name from session storage (set during signup)
      const displayName = sessionStorage.getItem("onboarding_name") || "Usuário";

      // Get subband info for reference
      const band = getBandById(data.incomeBandId);
      const subBand = band?.subBands.find(sb => sb.midpoint === data.incomeAnchorValue);

      // 1. Create family via edge function (this also creates family member)
      const familyData = {
        name: `Família ${displayName.split(' ')[0]}`,
        membersCount: data.hasDependents ? 3 : (data.householdStructure === 'couple_no_kids' ? 2 : 1),
        incomeRange: data.incomeBandId,
        primaryObjective: data.budgetMode,
        displayName: displayName,
        // Extended onboarding data
        incomeAnchorValue: data.incomeAnchorValue,
        incomeSubband: subBand?.id || null,
        incomeType: data.incomeType,
        financialStage: data.financialStage,
        budgetMode: data.budgetMode,
        householdStructure: data.householdStructure,
        hasPets: data.hasPets,
        hasDependents: data.hasDependents,
        nonMonthlyPlanningLevel: data.nonMonthlyPlanningLevel,
      };

      const { data: resp, error: familyError } = await supabase.functions.invoke('create-family', {
        body: familyData,
      });

      if (familyError) {
        console.error("Error creating family:", familyError);
        throw new Error("Erro ao criar família");
      }

      const familyId = (resp as any)?.familyId;
      if (!familyId) {
        throw new Error("Família não criada");
      }

      // 2. Update family with extended onboarding data
      const { error: updateError } = await supabase
        .from("families")
        .update({
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

      // 6. Mark onboarding steps as complete
      await supabase
        .from("user_onboarding")
        .update({
          onboarding_wizard_completed_at: new Date().toISOString(),
          suggested_budget_generated_at: new Date().toISOString(),
          step_budget_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

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
        },
      });

      // 8. Refresh family data in auth context
      await refreshFamily();

      // Clear session storage
      sessionStorage.removeItem("onboarding_name");

      return { budgetsCreated, familyId };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      queryClient.invalidateQueries({ queryKey: ["family"] });
      queryClient.invalidateQueries({ queryKey: ["onboarding"] });
      queryClient.invalidateQueries({ queryKey: ["budget-template-application"] });
      toast.success(`Orçamento criado com ${result.budgetsCreated} categorias!`);
    },
    onError: (error: any) => {
      console.error("Error saving onboarding:", error);
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
  };
}
