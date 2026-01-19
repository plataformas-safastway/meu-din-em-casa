import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { GOALS_CATEGORY_ID, createGoalSubcategoryId } from "@/data/categories";

export type GoalStatus = "ACTIVE" | "PAUSED" | "COMPLETED";

export interface Goal {
  id: string;
  family_id: string;
  title: string;
  description: string | null;
  target_amount: number | null;
  current_amount: number | null;
  due_date: string | null;
  status: GoalStatus;
  category_id: string;
  subcategory_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface GoalInput {
  title: string;
  description?: string | null;
  target_amount?: number | null;
  current_amount?: number | null;
  due_date?: string | null;
}

export interface GoalUpdate extends Partial<GoalInput> {
  status?: GoalStatus;
}

export function useGoals() {
  const { family } = useAuth();

  return useQuery({
    queryKey: ["goals", family?.id],
    queryFn: async () => {
      if (!family) return [];

      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .eq("family_id", family.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Goal[];
    },
    enabled: !!family,
  });
}

export function useActiveGoals() {
  const { family } = useAuth();

  return useQuery({
    queryKey: ["goals", family?.id, "active"],
    queryFn: async () => {
      if (!family) return [];

      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .eq("family_id", family.id)
        .in("status", ["ACTIVE", "PAUSED"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Goal[];
    },
    enabled: !!family,
  });
}

export function useGoalBySubcategoryId(subcategoryId: string | null) {
  const { family } = useAuth();

  return useQuery({
    queryKey: ["goal-by-subcategory", subcategoryId],
    queryFn: async () => {
      if (!family || !subcategoryId) return null;

      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .eq("family_id", family.id)
        .eq("subcategory_id", subcategoryId)
        .maybeSingle();

      if (error) throw error;
      return data as Goal | null;
    },
    enabled: !!family && !!subcategoryId,
  });
}

export function useCreateGoal() {
  const queryClient = useQueryClient();
  const { family } = useAuth();

  return useMutation({
    mutationFn: async (data: GoalInput) => {
      if (!family) throw new Error("No family");

      // Validate inputs
      if (!data.title?.trim()) {
        throw new Error("Título é obrigatório");
      }
      if (data.target_amount !== null && data.target_amount !== undefined && data.target_amount < 0) {
        throw new Error("Valor alvo não pode ser negativo");
      }
      if (data.current_amount !== null && data.current_amount !== undefined && data.current_amount < 0) {
        throw new Error("Valor atual não pode ser negativo");
      }

      // Generate subcategory ID based on title
      const subcategoryId = createGoalSubcategoryId(data.title.trim());

      // Check if goal with same subcategory already exists
      const { data: existingGoal } = await supabase
        .from("goals")
        .select("id")
        .eq("family_id", family.id)
        .eq("subcategory_id", subcategoryId)
        .maybeSingle();

      if (existingGoal) {
        throw new Error("Já existe um objetivo com este nome");
      }

      const { data: goal, error } = await supabase
        .from("goals")
        .insert({
          family_id: family.id,
          title: data.title.trim(),
          description: data.description?.trim() || null,
          target_amount: data.target_amount ?? null,
          current_amount: data.current_amount ?? 0,
          due_date: data.due_date || null,
          status: "ACTIVE",
          category_id: GOALS_CATEGORY_ID,
          subcategory_id: subcategoryId,
        })
        .select()
        .single();

      if (error) throw error;
      return goal as Goal;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
  });
}

export function useUpdateGoal() {
  const queryClient = useQueryClient();
  const { family } = useAuth();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: GoalUpdate }) => {
      // Validate inputs
      if (data.title !== undefined && !data.title?.trim()) {
        throw new Error("Título é obrigatório");
      }
      if (data.target_amount !== null && data.target_amount !== undefined && data.target_amount < 0) {
        throw new Error("Valor alvo não pode ser negativo");
      }
      if (data.current_amount !== null && data.current_amount !== undefined && data.current_amount < 0) {
        throw new Error("Valor atual não pode ser negativo");
      }

      const updateData: Record<string, unknown> = {};
      
      if (data.title !== undefined) {
        const trimmedTitle = data.title.trim();
        updateData.title = trimmedTitle;
        // Update subcategory_id when title changes
        updateData.subcategory_id = createGoalSubcategoryId(trimmedTitle);
        
        // Check if another goal with same subcategory already exists
        if (family) {
          const { data: existingGoal } = await supabase
            .from("goals")
            .select("id")
            .eq("family_id", family.id)
            .eq("subcategory_id", updateData.subcategory_id as string)
            .neq("id", id)
            .maybeSingle();

          if (existingGoal) {
            throw new Error("Já existe um objetivo com este nome");
          }
        }
      }
      
      if (data.description !== undefined) updateData.description = data.description?.trim() || null;
      if (data.target_amount !== undefined) updateData.target_amount = data.target_amount;
      if (data.current_amount !== undefined) updateData.current_amount = data.current_amount;
      if (data.due_date !== undefined) updateData.due_date = data.due_date || null;
      if (data.status !== undefined) updateData.status = data.status;

      const { error } = await supabase
        .from("goals")
        .update(updateData)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
  });
}

export function useDeleteGoal() {
  const queryClient = useQueryClient();
  const { family } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      if (!family) throw new Error("No family");

      // Check if there are transactions linked to this goal
      const { data: goal } = await supabase
        .from("goals")
        .select("subcategory_id")
        .eq("id", id)
        .single();

      const subcategoryId = goal?.subcategory_id as string | null;

      if (subcategoryId) {
        const { count } = await supabase
          .from("transactions")
          .select("*", { count: "exact", head: true })
          .eq("family_id", family.id)
          .eq("category_id", GOALS_CATEGORY_ID)
          .eq("subcategory_id", subcategoryId);

        if (count && count > 0) {
          // If there are transactions, just mark as completed/archived
          const { error } = await supabase
            .from("goals")
            .update({ status: "COMPLETED" })
            .eq("id", id);
          
          if (error) throw error;
          return { archived: true };
        }
      }

      // No transactions, safe to delete
      const { error } = await supabase.from("goals").delete().eq("id", id);
      if (error) throw error;
      return { archived: false };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
  });
}

// Helper to recalculate goal's current_amount from transactions
export function useRecalculateGoalAmount() {
  const queryClient = useQueryClient();
  const { family } = useAuth();

  return useMutation({
    mutationFn: async (goalId: string) => {
      if (!family) throw new Error("No family");

      // Get goal's subcategory
      const { data: goal } = await supabase
        .from("goals")
        .select("subcategory_id")
        .eq("id", goalId)
        .single();

      if (!goal?.subcategory_id) return;

      // Sum all transactions for this goal's subcategory
      const { data: transactions } = await supabase
        .from("transactions")
        .select("amount")
        .eq("family_id", family.id)
        .eq("category_id", GOALS_CATEGORY_ID)
        .eq("subcategory_id", goal.subcategory_id);

      const totalAmount = transactions?.reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      // Update goal's current_amount
      const { error } = await supabase
        .from("goals")
        .update({ current_amount: totalAmount })
        .eq("id", goalId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
  });
}
