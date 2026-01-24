import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface MemberPermissions {
  is_owner: boolean;
  can_view_all: boolean;
  can_edit_all: boolean;
  can_insert_transactions: boolean;
  can_delete_transactions: boolean;
  can_view_projection: boolean;
  can_view_budget: boolean;
  can_manage_family: boolean;
}

export interface PermissionProfile {
  id: string;
  name: string;
  description: string;
  permissions: Partial<MemberPermissions>;
}

export const PERMISSION_PROFILES: PermissionProfile[] = [
  {
    id: "viewer",
    name: "Visualizador",
    description: "Pode ver tudo, mas não editar",
    permissions: {
      can_view_all: true,
      can_edit_all: false,
      can_insert_transactions: false,
      can_delete_transactions: false,
      can_view_projection: true,
      can_view_budget: true,
      can_manage_family: false,
    },
  },
  {
    id: "editor",
    name: "Editor",
    description: "Pode inserir e editar lançamentos",
    permissions: {
      can_view_all: true,
      can_edit_all: true,
      can_insert_transactions: true,
      can_delete_transactions: false,
      can_view_projection: true,
      can_view_budget: true,
      can_manage_family: false,
    },
  },
  {
    id: "admin",
    name: "Administrador",
    description: "Acesso total, exceto excluir família",
    permissions: {
      can_view_all: true,
      can_edit_all: true,
      can_insert_transactions: true,
      can_delete_transactions: true,
      can_view_projection: true,
      can_view_budget: true,
      can_manage_family: true,
    },
  },
];

// Get current user's permissions
export function useMyPermissions() {
  const { user, family } = useAuth();

  return useQuery({
    queryKey: ["my-permissions", user?.id, family?.id],
    queryFn: async (): Promise<MemberPermissions> => {
      if (!user || !family) {
        return {
          is_owner: false,
          can_view_all: true,
          can_edit_all: false,
          can_insert_transactions: true,
          can_delete_transactions: false,
          can_view_projection: true,
          can_view_budget: true,
          can_manage_family: false,
        };
      }

      const { data, error } = await supabase.rpc("get_member_permissions", {
        _user_id: user.id,
        _family_id: family.id,
      });

      if (error) {
        console.error("[useMyPermissions] Error:", error);
        throw error;
      }

      return data as unknown as MemberPermissions;
    },
    enabled: !!user && !!family,
    staleTime: 5 * 60 * 1000,
  });
}

// Check specific permission
export function useHasPermission(permission: keyof MemberPermissions) {
  const { data: permissions, isLoading } = useMyPermissions();

  return {
    hasPermission: permissions?.[permission] ?? false,
    isLoading,
  };
}

// Get all family members with their permissions
export function useFamilyMembers() {
  const { family } = useAuth();

  return useQuery({
    queryKey: ["family-members", family?.id],
    queryFn: async () => {
      if (!family) return [];

      const { data, error } = await supabase
        .from("family_members")
        .select(`
          *,
          member_permissions (*)
        `)
        .eq("family_id", family.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!family,
  });
}

// Update member permissions
export function useUpdateMemberPermissions() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      memberId,
      permissions,
    }: {
      memberId: string;
      permissions: Partial<MemberPermissions>;
    }) => {
      // First check if permissions record exists
      const { data: existing } = await supabase
        .from("member_permissions")
        .select("id")
        .eq("member_id", memberId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("member_permissions")
          .update({
            can_view_all: permissions.can_view_all,
            can_edit_all: permissions.can_edit_all,
            can_insert_transactions: permissions.can_insert_transactions,
            can_delete_transactions: permissions.can_delete_transactions,
            can_view_projection: permissions.can_view_projection,
            can_view_budget: permissions.can_view_budget,
            can_manage_family: permissions.can_manage_family,
            updated_at: new Date().toISOString(),
          })
          .eq("member_id", memberId);

        if (error) throw error;
      }

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["family-members"] });
      queryClient.invalidateQueries({ queryKey: ["my-permissions"] });
      toast.success("Permissões atualizadas!");
    },
    onError: (error: any) => {
      console.error("Error updating permissions:", error);
      toast.error("Erro ao atualizar permissões");
    },
  });
}

// Apply permission profile to member
export function useApplyPermissionProfile() {
  const updatePermissions = useUpdateMemberPermissions();

  return useMutation({
    mutationFn: async ({
      memberId,
      profileId,
    }: {
      memberId: string;
      profileId: string;
    }) => {
      const profile = PERMISSION_PROFILES.find((p) => p.id === profileId);
      if (!profile) throw new Error("Perfil não encontrado");

      await updatePermissions.mutateAsync({
        memberId,
        permissions: profile.permissions,
      });

      return true;
    },
  });
}

// Remove family member
export function useRemoveFamilyMember() {
  const queryClient = useQueryClient();
  const { refreshFamily } = useAuth();

  return useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from("family_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;
      return true;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["family-members"] });
      await refreshFamily();
      toast.success("Membro removido da família");
    },
    onError: (error: any) => {
      console.error("Error removing member:", error);
      toast.error("Erro ao remover membro");
    },
  });
}
