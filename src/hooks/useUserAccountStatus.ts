import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type UserAccountStatus = "ACTIVE" | "DISABLED" | "BLOCKED";

export interface UserStatusRecord {
  id: string;
  user_id: string;
  status: UserAccountStatus;
  changed_by: string | null;
  changed_at: string;
  reason: string | null;
  created_at: string;
}

export interface UserStatusAudit {
  id: string;
  user_id: string;
  old_status: UserAccountStatus | null;
  new_status: UserAccountStatus;
  changed_by: string;
  changed_at: string;
  reason: string | null;
}

// Get all users with their status
export function useUsersWithStatus(statusFilter?: UserAccountStatus | "ALL") {
  return useQuery({
    queryKey: ["users-with-status", statusFilter],
    queryFn: async () => {
      // Get all family members with their status
      const { data: members, error: membersError } = await supabase
        .from("family_members")
        .select(`
          id,
          user_id,
          display_name,
          avatar_url,
          created_at,
          family_id,
          role,
          status,
          families!inner (
            id,
            name
          )
        `)
        .order("created_at", { ascending: false });

      if (membersError) throw membersError;

      // Get user account status for all users
      const { data: statusRecords, error: statusError } = await supabase
        .from("user_account_status_log")
        .select("*");

      if (statusError) throw statusError;

      // Map status to users
      const statusMap = new Map<string, UserStatusRecord>();
      statusRecords?.forEach((s: any) => {
        statusMap.set(s.user_id, s as UserStatusRecord);
      });

      // Get unique users (avoid duplicates from multi-family)
      const userMap = new Map<string, any>();
      members?.forEach((m: any) => {
        if (!userMap.has(m.user_id)) {
          const accountStatus = statusMap.get(m.user_id);
          userMap.set(m.user_id, {
            ...m,
            account_status: accountStatus?.status || "ACTIVE",
            account_status_changed_at: accountStatus?.changed_at,
            account_status_reason: accountStatus?.reason,
            families: [m.families],
          });
        } else {
          // Add family to existing user
          userMap.get(m.user_id).families.push(m.families);
        }
      });

      let users = Array.from(userMap.values());

      // Filter by status if specified
      if (statusFilter && statusFilter !== "ALL") {
        users = users.filter((u) => u.account_status === statusFilter);
      }

      return users;
    },
  });
}

// Get user status audit history
export function useUserStatusAudit(userId: string) {
  return useQuery({
    queryKey: ["user-status-audit", userId],
    queryFn: async (): Promise<UserStatusAudit[]> => {
      const { data, error } = await supabase
        .from("user_status_audit")
        .select("*")
        .eq("user_id", userId)
        .order("changed_at", { ascending: false });

      if (error) throw error;
      return (data || []) as UserStatusAudit[];
    },
    enabled: !!userId,
  });
}

// Change user account status
export function useChangeUserAccountStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      newStatus,
      reason,
    }: {
      userId: string;
      newStatus: UserAccountStatus;
      reason?: string;
    }) => {
      const { data, error } = await supabase.rpc("change_user_account_status", {
        _user_id: userId,
        _new_status: newStatus,
        _reason: reason || null,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users-with-status"] });
      queryClient.invalidateQueries({ queryKey: ["user-status-audit"] });
      toast.success("Status do usuário atualizado");
    },
    onError: (error: any) => {
      console.error("Error changing user status:", error);
      if (error.message?.includes("No permission")) {
        toast.error("Sem permissão para alterar status de usuário");
      } else {
        toast.error("Erro ao alterar status do usuário");
      }
    },
  });
}

// Get counts by status
export function useUserStatusCounts() {
  return useQuery({
    queryKey: ["user-status-counts"],
    queryFn: async () => {
      // Get all family members (unique users)
      const { data: members, error: membersError } = await supabase
        .from("family_members")
        .select("user_id");

      if (membersError) throw membersError;

      const uniqueUserIds = new Set(members?.map((m) => m.user_id) || []);
      const totalUsers = uniqueUserIds.size;

      // Get status counts
      const { data: statusRecords, error: statusError } = await supabase
        .from("user_account_status_log")
        .select("status");

      if (statusError) throw statusError;

      const blocked = statusRecords?.filter((s: any) => s.status === "BLOCKED").length || 0;
      const disabled = statusRecords?.filter((s: any) => s.status === "DISABLED").length || 0;
      const active = totalUsers - blocked - disabled;

      return {
        total: totalUsers,
        active,
        disabled,
        blocked,
      };
    },
  });
}
