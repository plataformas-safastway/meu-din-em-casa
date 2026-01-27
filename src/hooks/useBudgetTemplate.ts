import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  INCOME_BANDS,
  getBandById,
  getSubBandById,
  getBudgetablePrefixes,
  calculateAdjustedPercentages,
  calculateBudgetAmounts,
  getCategoryIdFromPrefix,
  getSubcategoryDistribution,
  type IncomeBand,
  type SubBand,
} from "@/data/budgetTemplates";
import { format } from "date-fns";

export interface BudgetTemplateInput {
  incomeBandId: string;
  incomeSubBandId: string;
  hasPets: boolean;
  hasDependents: boolean;
  createBudgets: boolean;
}

export interface GeneratedBudget {
  category_id: string;
  subcategory_id: string | null;
  monthly_limit: number;
  prefix_code: string;
}

export function useBudgetTemplate() {
  const { family, user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch current family income settings
  const { data: familySettings, isLoading: loadingSettings } = useQuery({
    queryKey: ["family-income-settings", family?.id],
    queryFn: async () => {
      if (!family?.id) return null;

      const { data, error } = await supabase
        .from("families")
        .select("income_range, income_subband, has_pets, has_dependents")
        .eq("id", family.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!family?.id,
  });

  // Fetch latest template application
  const { data: lastApplication, isLoading: loadingApplication } = useQuery({
    queryKey: ["budget-template-application", family?.id],
    queryFn: async () => {
      if (!family?.id) return null;

      const { data, error } = await supabase
        .from("budget_template_applications")
        .select("*")
        .eq("family_id", family.id)
        .order("applied_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
    enabled: !!family?.id,
  });

  // Update family income settings
  const updateFamilySettings = useMutation({
    mutationFn: async (input: {
      incomeBandId: string;
      incomeSubBandId: string;
      hasPets: boolean;
      hasDependents: boolean;
    }) => {
      if (!family?.id) throw new Error("No family");

      const { error } = await supabase
        .from("families")
        .update({
          income_range: input.incomeBandId,
          income_subband: input.incomeSubBandId,
          has_pets: input.hasPets,
          has_dependents: input.hasDependents,
        })
        .eq("id", family.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["family-income-settings"] });
      queryClient.invalidateQueries({ queryKey: ["family"] });
    },
  });

  // Generate and apply budget template
  const applyBudgetTemplate = useMutation({
    mutationFn: async (input: BudgetTemplateInput) => {
      if (!family?.id || !user?.id) throw new Error("No family or user");

      const band = getBandById(input.incomeBandId);
      const subBand = getSubBandById(input.incomeBandId, input.incomeSubBandId);

      if (!band || !subBand) {
        throw new Error("Invalid income band or sub-band");
      }

      // Calculate percentages with sub-band adjustments
      const percentages = calculateAdjustedPercentages(
        input.incomeBandId,
        subBand.position,
        input.hasPets,
        input.hasDependents
      );

      // Calculate budget amounts based on estimated income
      const budgetAmounts = calculateBudgetAmounts(subBand.midpoint, percentages);

      // Get current month reference
      const monthRef = format(new Date(), "yyyy-MM");

      // Update family settings first
      await updateFamilySettings.mutateAsync({
        incomeBandId: input.incomeBandId,
        incomeSubBandId: input.incomeSubBandId,
        hasPets: input.hasPets,
        hasDependents: input.hasDependents,
      });

      // Record template application
      const { error: appError } = await supabase
        .from("budget_template_applications")
        .upsert({
          family_id: family.id,
          income_band: input.incomeBandId,
          income_subband: input.incomeSubBandId,
          estimated_income_midpoint: subBand.midpoint,
          percentages_applied: percentages,
          has_pets: input.hasPets,
          has_dependents: input.hasDependents,
          applied_by: user.id,
          month_ref: monthRef,
        }, {
          onConflict: "family_id,month_ref",
        });

      if (appError) throw appError;

      // Create budgets if requested
      if (input.createBudgets) {
        const budgetablePrefixes = getBudgetablePrefixes(input.hasPets, input.hasDependents);
        
        // Delete existing budgets for this family (fresh start)
        await supabase
          .from("budgets")
          .delete()
          .eq("family_id", family.id);

        // Create new budgets at category level
        const budgetsToCreate: GeneratedBudget[] = [];

        budgetablePrefixes.forEach((prefix) => {
          const amount = budgetAmounts[prefix.code];
          if (!amount || amount <= 0) return;

          const categoryId = getCategoryIdFromPrefix(prefix.code);
          if (!categoryId) return;

          // Create category-level budget
          budgetsToCreate.push({
            category_id: categoryId,
            subcategory_id: null,
            monthly_limit: amount,
            prefix_code: prefix.code,
          });
        });

        // Insert all budgets
        for (const budget of budgetsToCreate) {
          const { error: budgetError } = await supabase
            .from("budgets")
            .insert({
              family_id: family.id,
              category_id: budget.category_id,
              subcategory_id: budget.subcategory_id,
              monthly_limit: budget.monthly_limit,
              is_active: true,
            });

          if (budgetError) {
            console.error("Error creating budget:", budgetError);
          }
        }

        // Log audit event
        await supabase.from("audit_logs").insert({
          user_id: user.id,
          family_id: family.id,
          action: "BUDGET_TEMPLATE_APPLIED",
          entity_type: "budget_template",
          entity_id: monthRef,
          metadata: {
            income_band: input.incomeBandId,
            income_subband: input.incomeSubBandId,
            has_pets: input.hasPets,
            has_dependents: input.hasDependents,
            budgets_created: budgetsToCreate.length,
          },
        });

        // Mark budget step as complete in onboarding
        await supabase
          .from("user_onboarding")
          .update({ step_budget_at: new Date().toISOString() })
          .eq("user_id", user.id);

        return {
          success: true,
          budgetsCreated: budgetsToCreate.length,
          estimatedIncome: subBand.midpoint,
          percentages,
          budgetAmounts,
        };
      }

      return {
        success: true,
        budgetsCreated: 0,
        estimatedIncome: subBand.midpoint,
        percentages,
        budgetAmounts,
      };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["budgets"] });
      queryClient.invalidateQueries({ queryKey: ["budget-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["budget-template-application"] });
      queryClient.invalidateQueries({ queryKey: ["onboarding"] });

      if (result.budgetsCreated > 0) {
        toast.success(`Orçamento criado com ${result.budgetsCreated} categorias!`);
      } else {
        toast.success("Configurações salvas!");
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao aplicar modelo de orçamento");
    },
  });

  // Preview budget without applying
  const previewBudget = (input: Omit<BudgetTemplateInput, "createBudgets">) => {
    const band = getBandById(input.incomeBandId);
    const subBand = getSubBandById(input.incomeBandId, input.incomeSubBandId);

    if (!band || !subBand) {
      return null;
    }

    const percentages = calculateAdjustedPercentages(
      input.incomeBandId,
      subBand.position,
      input.hasPets,
      input.hasDependents
    );

    const budgetAmounts = calculateBudgetAmounts(subBand.midpoint, percentages);
    const budgetablePrefixes = getBudgetablePrefixes(input.hasPets, input.hasDependents);

    const preview = budgetablePrefixes
      .filter((p) => budgetAmounts[p.code] > 0)
      .map((prefix) => ({
        code: prefix.code,
        name: prefix.name,
        categoryId: prefix.categoryId,
        percentage: percentages[prefix.code] * 100,
        amount: budgetAmounts[prefix.code],
      }));

    return {
      band,
      subBand,
      estimatedIncome: subBand.midpoint,
      totalBudgeted: Object.values(budgetAmounts).reduce((a, b) => a + b, 0),
      items: preview,
    };
  };

  return {
    incomeBands: INCOME_BANDS,
    familySettings,
    lastApplication,
    isLoading: loadingSettings || loadingApplication,
    updateFamilySettings,
    applyBudgetTemplate,
    previewBudget,
  };
}

// Export types for components
export type { IncomeBand, SubBand };
