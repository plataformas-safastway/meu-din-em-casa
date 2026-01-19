import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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
  const { family } = useAuth();

  return useMutation({
    mutationFn: async (data: ContributionInput) => {
      if (!family) throw new Error("No family");

      if (!data.amount || data.amount <= 0) {
        throw new Error("Valor deve ser maior que zero");
      }

      // Insert contribution
      const { data: contribution, error: contribError } = await supabase
        .from("goal_contributions")
        .insert({
          goal_id: data.goal_id,
          family_id: family.id,
          amount: data.amount,
          description: data.description?.trim() || null,
          contributed_at: data.contributed_at || new Date().toISOString(),
        })
        .select()
        .single();

      if (contribError) throw contribError;

      // Update goal's current_amount
      const { data: goal } = await supabase
        .from("goals")
        .select("current_amount")
        .eq("id", data.goal_id)
        .single();

      const newAmount = (Number(goal?.current_amount) || 0) + data.amount;

      const { error: updateError } = await supabase
        .from("goals")
        .update({ current_amount: newAmount })
        .eq("id", data.goal_id);

      if (updateError) throw updateError;

      return contribution as GoalContribution;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["goal-contributions", variables.goal_id] });
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
  });
}

export function useDeleteContribution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, goalId, amount }: { id: string; goalId: string; amount: number }) => {
      // Delete contribution
      const { error: deleteError } = await supabase
        .from("goal_contributions")
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;

      // Update goal's current_amount
      const { data: goal } = await supabase
        .from("goals")
        .select("current_amount")
        .eq("id", goalId)
        .single();

      const newAmount = Math.max(0, (Number(goal?.current_amount) || 0) - amount);

      const { error: updateError } = await supabase
        .from("goals")
        .update({ current_amount: newAmount })
        .eq("id", goalId);

      if (updateError) throw updateError;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["goal-contributions", variables.goalId] });
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
  });
}
