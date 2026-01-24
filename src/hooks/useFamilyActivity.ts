import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface FamilyActivity {
  id: string;
  family_id: string;
  actor_member_id: string;
  action_type: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, any>;
  created_at: string;
  actor?: {
    display_name: string;
    avatar_url: string | null;
  };
}

// Log family activity
export function useLogActivity() {
  const { family, familyMember } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (activity: {
      action_type: string;
      entity_type: string;
      entity_id?: string;
      metadata?: Record<string, any>;
    }) => {
      if (!family || !familyMember) return;

      const { error } = await supabase.from("family_activities").insert({
        family_id: family.id,
        actor_member_id: familyMember.id,
        action_type: activity.action_type,
        entity_type: activity.entity_type,
        entity_id: activity.entity_id || null,
        metadata: activity.metadata || {},
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["family-activities"] });
    },
  });
}

// Get recent family activities
export function useFamilyActivities(limit = 20) {
  const { family } = useAuth();

  return useQuery({
    queryKey: ["family-activities", family?.id, limit],
    queryFn: async () => {
      if (!family) return [];

      const { data, error } = await supabase
        .from("family_activities")
        .select(`
          *,
          actor:family_members!actor_member_id (
            display_name,
            avatar_url
          )
        `)
        .eq("family_id", family.id)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as FamilyActivity[];
    },
    enabled: !!family,
  });
}

// Format activity message for display
export function formatActivityMessage(activity: FamilyActivity): string {
  const actorName = activity.actor?.display_name || "Alguém";
  const { action_type, entity_type, metadata } = activity;

  switch (action_type) {
    case "transaction_created":
      const amount = metadata?.amount
        ? new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
          }).format(metadata.amount)
        : "";
      const category = metadata?.category || "";
      return `${actorName} registrou um gasto${category ? ` em ${category}` : ""}${amount ? ` (${amount})` : ""}`;

    case "transaction_updated":
      return `${actorName} editou um lançamento`;

    case "transaction_deleted":
      return `${actorName} excluiu um lançamento`;

    case "budget_updated":
      return `${actorName} atualizou o orçamento`;

    case "goal_created":
      return `${actorName} criou uma nova meta`;

    case "goal_contribution":
      const goalAmount = metadata?.amount
        ? new Intl.NumberFormat("pt-BR", {
            style: "currency",
            currency: "BRL",
          }).format(metadata.amount)
        : "";
      return `${actorName} contribuiu ${goalAmount} para uma meta`;

    case "import_completed":
      const count = metadata?.transactions_count || 0;
      return `${actorName} importou ${count} lançamento${count !== 1 ? "s" : ""}`;

    default:
      return `${actorName} realizou uma ação`;
  }
}
