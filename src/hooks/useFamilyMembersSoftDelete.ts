import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type MemberStatus = "INVITED" | "ACTIVE" | "REMOVED" | "DISABLED";

export interface FamilyMemberWithAudit {
  id: string;
  family_id: string;
  user_id: string;
  display_name: string;
  role: "owner" | "member";
  avatar_url: string | null;
  status: MemberStatus;
  added_by_user_id: string | null;
  added_at: string | null;
  removed_by_user_id: string | null;
  removed_at: string | null;
  removed_reason: string | null;
  created_at: string;
  member_permissions: any[];
  // Joined data
  added_by_name?: string;
  removed_by_name?: string;
}

// Get all family members by status
export function useFamilyMembersByStatus(status: MemberStatus | MemberStatus[]) {
  const { family } = useAuth();
  const statuses = Array.isArray(status) ? status : [status];

  return useQuery({
    queryKey: ["family-members-status", family?.id, statuses],
    queryFn: async (): Promise<FamilyMemberWithAudit[]> => {
      if (!family) return [];

      const { data, error } = await supabase
        .from("family_members")
        .select(`
          *,
          member_permissions (*)
        `)
        .eq("family_id", family.id)
        .in("status", statuses)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Fetch names for added_by and removed_by
      const userIds = new Set<string>();
      data?.forEach((m: any) => {
        if (m.added_by_user_id) userIds.add(m.added_by_user_id);
        if (m.removed_by_user_id) userIds.add(m.removed_by_user_id);
      });

      let userNames: Record<string, string> = {};
      if (userIds.size > 0) {
        const { data: members } = await supabase
          .from("family_members")
          .select("user_id, display_name")
          .in("user_id", Array.from(userIds));
        
        members?.forEach((m: any) => {
          userNames[m.user_id] = m.display_name;
        });
      }

      return (data || []).map((m: any) => ({
        ...m,
        added_by_name: m.added_by_user_id ? userNames[m.added_by_user_id] : undefined,
        removed_by_name: m.removed_by_user_id ? userNames[m.removed_by_user_id] : undefined,
      }));
    },
    enabled: !!family,
  });
}

// Get active members count
export function useActiveMembersCount() {
  const { family } = useAuth();

  return useQuery({
    queryKey: ["active-members-count", family?.id],
    queryFn: async () => {
      if (!family) return 0;

      const { count, error } = await supabase
        .from("family_members")
        .select("id", { count: "exact", head: true })
        .eq("family_id", family.id)
        .eq("status", "ACTIVE");

      if (error) throw error;
      return count || 0;
    },
    enabled: !!family,
  });
}

// Soft delete member
export function useSoftDeleteMember() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      memberId,
      reason,
    }: {
      memberId: string;
      reason?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.rpc("soft_delete_family_member", {
        _member_id: memberId,
        _removed_by: user.id,
        _reason: reason || null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["family-members"] });
      queryClient.invalidateQueries({ queryKey: ["family-members-status"] });
      queryClient.invalidateQueries({ queryKey: ["active-members-count"] });
      toast.success("Membro removido da família");
    },
    onError: (error: any) => {
      console.error("Error removing member:", error);
      if (error.message?.includes("Cannot remove family owner")) {
        toast.error("Não é possível remover o proprietário da família");
      } else if (error.message?.includes("No permission")) {
        toast.error("Sem permissão para remover membros");
      } else {
        toast.error("Erro ao remover membro");
      }
    },
  });
}

// Restore member
export function useRestoreMember() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (memberId: string) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase.rpc("restore_family_member", {
        _member_id: memberId,
        _restored_by: user.id,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["family-members"] });
      queryClient.invalidateQueries({ queryKey: ["family-members-status"] });
      queryClient.invalidateQueries({ queryKey: ["active-members-count"] });
      toast.success("Membro restaurado com sucesso!");
    },
    onError: (error: any) => {
      console.error("Error restoring member:", error);
      if (error.message?.includes("No permission")) {
        toast.error("Sem permissão para restaurar membros");
      } else {
        toast.error("Erro ao restaurar membro");
      }
    },
  });
}
