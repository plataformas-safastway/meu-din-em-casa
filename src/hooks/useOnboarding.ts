import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface OnboardingStep {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  completedAt: string | null;
  action?: () => void;
  optional?: boolean;
}

export interface OnboardingState {
  hasSeenWelcome: boolean;
  progressPercent: number;
  educationTipsEnabled: boolean;
  contextualHintsEnabled: boolean;
  steps: OnboardingStep[];
}

export function useOnboarding() {
  const { user, family } = useAuth();
  const queryClient = useQueryClient();

  // Fetch onboarding state
  const { data: onboarding, isLoading } = useQuery({
    queryKey: ["onboarding", user?.id],
    queryFn: async () => {
      if (!user?.id || !family?.id) return null;

      const { data, error } = await supabase
        .from("user_onboarding")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error && error.code !== "PGRST116") {
        console.error("Error fetching onboarding:", error);
        return null;
      }

      // If no record exists, create one
      if (!data) {
        const { data: newData, error: insertError } = await supabase
          .from("user_onboarding")
          .insert({
            user_id: user.id,
            family_id: family.id,
            has_seen_welcome: false,
            step_account_created_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (insertError) {
          console.error("Error creating onboarding:", insertError);
          return null;
        }
        return newData;
      }

      return data;
    },
    enabled: !!user?.id && !!family?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Mark welcome as seen
  const markWelcomeSeen = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("No user");

      const { error } = await supabase
        .from("user_onboarding")
        .update({
          has_seen_welcome: true,
          welcome_seen_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding", user?.id] });
    },
  });

  // Complete a step
  const completeStep = useMutation({
    mutationFn: async (step: "bank_account" | "import" | "budget" | "goal" | "family_invite") => {
      if (!user?.id) throw new Error("No user");

      const columnMap = {
        bank_account: "step_bank_account_at",
        import: "step_import_at",
        budget: "step_budget_at",
        goal: "step_goal_at",
        family_invite: "step_family_invite_at",
      };

      const column = columnMap[step];
      
      const { error } = await supabase
        .from("user_onboarding")
        .update({
          [column]: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding", user?.id] });
    },
  });

  // Update preferences
  const updatePreferences = useMutation({
    mutationFn: async (prefs: { educationTipsEnabled?: boolean; contextualHintsEnabled?: boolean }) => {
      if (!user?.id) throw new Error("No user");

      const updates: Record<string, boolean> = {};
      if (prefs.educationTipsEnabled !== undefined) {
        updates.education_tips_enabled = prefs.educationTipsEnabled;
      }
      if (prefs.contextualHintsEnabled !== undefined) {
        updates.contextual_hints_enabled = prefs.contextualHintsEnabled;
      }

      const { error } = await supabase
        .from("user_onboarding")
        .update(updates)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboarding", user?.id] });
    },
  });

  // Build steps list
  const steps: OnboardingStep[] = [
    {
      id: "account",
      label: "Criar conta",
      description: "Sua conta foi criada com sucesso",
      completed: !!onboarding?.step_account_created_at,
      completedAt: onboarding?.step_account_created_at ?? null,
    },
    {
      id: "bank_account",
      label: "Cadastrar conta bancária",
      description: "Adicione sua primeira conta ou importe um extrato",
      completed: !!onboarding?.step_bank_account_at,
      completedAt: onboarding?.step_bank_account_at ?? null,
    },
    {
      id: "import",
      label: "Importar extrato",
      description: "Importe seu extrato bancário para começar",
      completed: !!onboarding?.step_import_at,
      completedAt: onboarding?.step_import_at ?? null,
    },
    {
      id: "budget",
      label: "Criar orçamento",
      description: "Defina limites para suas categorias",
      completed: !!onboarding?.step_budget_at,
      completedAt: onboarding?.step_budget_at ?? null,
    },
    {
      id: "goal",
      label: "Definir um objetivo",
      description: "Crie sua primeira meta financeira",
      completed: !!onboarding?.step_goal_at,
      completedAt: onboarding?.step_goal_at ?? null,
    },
    {
      id: "family_invite",
      label: "Convidar familiar",
      description: "Compartilhe o controle financeiro com a família",
      completed: !!onboarding?.step_family_invite_at,
      completedAt: onboarding?.step_family_invite_at ?? null,
      optional: true,
    },
  ];

  const state: OnboardingState = {
    hasSeenWelcome: onboarding?.has_seen_welcome ?? false,
    progressPercent: onboarding?.progress_percent ?? 0,
    educationTipsEnabled: onboarding?.education_tips_enabled ?? true,
    contextualHintsEnabled: onboarding?.contextual_hints_enabled ?? true,
    steps,
  };

  return {
    state,
    isLoading,
    markWelcomeSeen,
    completeStep,
    updatePreferences,
    isNewUser: !onboarding?.has_seen_welcome,
  };
}
