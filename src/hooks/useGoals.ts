import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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
      if (data.title !== undefined) updateData.title = data.title.trim();
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

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("goals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
    },
  });
}
