import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { GOALS_CATEGORY_ID, createGoalSubcategoryId } from "@/data/categories";
import { Goal } from "./useGoals";

export interface GoalContribution {
  id: string;
  goal_id: string;
  family_id: string;
  amount: number;
  description: string | null;
  contributed_at: string;
  created_at: string;
}

export interface ContributionInput {
  goal_id: string;
  amount: number;
  description?: string | null;
  contributed_at?: string;
  bank_account_id?: string;
  credit_card_id?: string;
  payment_method?: 'pix' | 'cash' | 'transfer' | 'debit' | 'credit' | 'cheque';
}

export function useGoalContributions(goalId: string | null) {
  const { family } = useAuth();

  return useQuery({
    queryKey: ["goal-contributions", goalId],
    queryFn: async () => {
      if (!family || !goalId) return [];

      const { data, error } = await supabase
        .from("goal_contributions")
        .select("*")
        .eq("goal_id", goalId)
        .order("contributed_at", { ascending: false });

      if (error) throw error;
      return data as GoalContribution[];
    },
    enabled: !!family && !!goalId,
  });
}

export function useCreateContribution() {
  const queryClient = useQueryClient();
  const { family, user, familyMember } = useAuth();

  return useMutation({
    mutationFn: async (data: ContributionInput & { goal: Goal }) => {
      if (!family) throw new Error("No family");

      if (!data.amount || data.amount <= 0) {
        throw new Error("Valor deve ser maior que zero");
      }

      const contributedAt = data.contributed_at || new Date().toISOString();
      const contributedDate = contributedAt.split('T')[0];

      // Ensure goal has a subcategory_id, create one if missing
      let subcategoryId = data.goal.subcategory_id;
      if (!subcategoryId) {
        subcategoryId = createGoalSubcategoryId(data.goal.title);
        
        // Update goal with the subcategory_id
        await supabase
          .from("goals")
          .update({ 
            category_id: GOALS_CATEGORY_ID,
            subcategory_id: subcategoryId 
          })
          .eq("id", data.goal_id);
      }

      // 1. Insert contribution record
      const { data: contribution, error: contribError } = await supabase
        .from("goal_contributions")
        .insert({
          goal_id: data.goal_id,
          family_id: family.id,
          amount: data.amount,
          description: data.description?.trim() || null,
          contributed_at: contributedAt,
        })
        .select()
        .single();

      if (contribError) throw contribError;

      // 2. Create automatic transaction for this contribution
      const { error: txError } = await supabase
        .from("transactions")
        .insert({
          family_id: family.id,
          type: 'expense' as const,
          amount: data.amount,
          category_id: GOALS_CATEGORY_ID,
          subcategory_id: subcategoryId,
          date: contributedDate,
          description: `Aporte no objetivo: ${data.goal.title}`,
          payment_method: data.payment_method || 'pix',
          goal_id: data.goal_id,
          source: 'GOAL_CONTRIBUTION',
          bank_account_id: data.bank_account_id || null,
          credit_card_id: data.credit_card_id || null,
          // Audit fields
          created_by_user_id: user?.id,
          created_by_name: familyMember?.display_name || user?.email?.split('@')[0] || 'Usuário',
        });

      if (txError) {
        console.error("Error creating goal transaction:", txError);
        throw txError; // Now we throw so the user knows it failed
      }

      // 3. Recalculate goal's current_amount from all transactions
      await recalculateGoalAmount(family.id, data.goal_id, subcategoryId);

      return contribution as GoalContribution;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["goal-contributions", variables.goal_id] });
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export function useDeleteContribution() {
  const queryClient = useQueryClient();
  const { family } = useAuth();

  return useMutation({
    mutationFn: async ({ id, goalId, amount, contributedAt, goal }: { 
      id: string; 
      goalId: string; 
      amount: number; 
      contributedAt: string;
      goal: Goal 
    }) => {
      if (!family) throw new Error("No family");

      // Delete contribution
      const { error: deleteError } = await supabase
        .from("goal_contributions")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;

      // Delete only the specific transaction that matches this contribution
      // We identify it by goal_id, source, amount and date
      const contributedDate = contributedAt.split('T')[0];
      await supabase
        .from("transactions")
        .delete()
        .eq("family_id", family.id)
        .eq("goal_id", goalId)
        .eq("source", "GOAL_CONTRIBUTION")
        .eq("amount", amount)
        .eq("date", contributedDate);

      // Get subcategory_id from goal or generate it
      const subcategoryId = goal.subcategory_id || createGoalSubcategoryId(goal.title);

      // Recalculate goal's current_amount
      await recalculateGoalAmount(family.id, goalId, subcategoryId);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["goal-contributions", variables.goalId] });
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

// Helper function to recalculate goal amount from transactions
async function recalculateGoalAmount(familyId: string, goalId: string, subcategoryId: string | null) {
  if (!subcategoryId) return;

  // Sum all transactions for this goal's subcategory
  const { data: transactions } = await supabase
    .from("transactions")
    .select("amount")
    .eq("family_id", familyId)
    .eq("category_id", GOALS_CATEGORY_ID)
    .eq("subcategory_id", subcategoryId);

  const totalAmount = transactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

  // Update goal's current_amount
  await supabase
    .from("goals")
    .update({ current_amount: totalAmount })
    .eq("id", goalId);
}

// Hook to sync goal amount when transactions change
export function useSyncGoalFromTransaction() {
  const queryClient = useQueryClient();
  const { family } = useAuth();

  return useMutation({
    mutationFn: async ({ subcategoryId }: { subcategoryId: string }) => {
      if (!family) throw new Error("No family");

      // Find goal with this subcategory
      const { data: goal } = await supabase
        .from("goals")
        .select("id, subcategory_id")
        .eq("family_id", family.id)
        .eq("subcategory_id", subcategoryId)
        .maybeSingle();

      if (!goal) return null;

      // Recalculate
      await recalculateGoalAmount(family.id, goal.id, subcategoryId);
      return goal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
  });
}
