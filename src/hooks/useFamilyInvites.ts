import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface InviteValidation {
  invite_id: string | null;
  family_id: string | null;
  family_name: string | null;
  invited_email: string | null;
  inviter_name: string | null;
  role: string | null;
  permissions: Record<string, boolean> | null;
  is_valid: boolean;
  error_message: string | null;
}

export interface AcceptInviteResult {
  success: boolean;
  family_id: string | null;
  member_id: string | null;
  error_message: string | null;
}

export function useValidateInvite(token: string | null) {
  return useQuery({
    queryKey: ["invite-validation", token],
    queryFn: async (): Promise<InviteValidation | null> => {
      if (!token) return null;

      const { data, error } = await supabase.rpc("validate_invite_token", {
        invite_token: token,
      });

      if (error) {
        console.error("Error validating invite:", error);
        return {
          invite_id: null,
          family_id: null,
          family_name: null,
          invited_email: null,
          inviter_name: null,
          role: null,
          permissions: null,
          is_valid: false,
          error_message: "Erro ao validar convite",
        };
      }

      // RPC returns array, get first result
      const result = Array.isArray(data) ? data[0] : data;
      return result as InviteValidation;
    },
    enabled: !!token,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: 1,
  });
}

export function useAcceptInvite() {
  const queryClient = useQueryClient();
  const { refreshFamily } = useAuth();

  return useMutation({
    mutationFn: async ({
      token,
      displayName,
      phoneE164,
      phoneCountry,
      birthDate,
      profession,
    }: {
      token: string;
      displayName: string;
      phoneE164?: string | null;
      phoneCountry?: string;
      birthDate?: string | null;
      profession?: string | null;
    }): Promise<AcceptInviteResult> => {
      const { data, error } = await supabase.rpc("accept_family_invite", {
        invite_token: token,
        p_display_name: displayName,
        p_phone_e164: phoneE164 || null,
        p_phone_country: phoneCountry || "BR",
        p_birth_date: birthDate || null,
        p_profession: profession || null,
      });

      if (error) {
        console.error("Error accepting invite:", error);
        return {
          success: false,
          family_id: null,
          member_id: null,
          error_message: error.message || "Erro ao aceitar convite",
        };
      }

      // RPC returns array, get first result
      const result = Array.isArray(data) ? data[0] : data;
      return result as AcceptInviteResult;
    },
    onSuccess: async (data) => {
      if (data.success) {
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ["user-families"] });
        queryClient.invalidateQueries({ queryKey: ["invite-validation"] });
        
        // Refresh family data in auth context
        await refreshFamily();
      }
    },
  });
}

export function useCreateInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      familyId,
      email,
      role = "member",
      permissions = {},
    }: {
      familyId: string;
      email?: string | null;
      role?: string;
      permissions?: Record<string, boolean>;
    }) => {
      const { data, error } = await supabase.rpc("create_family_invite", {
        p_family_id: familyId,
        p_invited_email: email || null,
        p_role: role,
        p_permissions: permissions,
      });

      if (error) {
        console.error("Error creating invite:", error);
        throw error;
      }

      // RPC returns array, get first result
      const result = Array.isArray(data) ? data[0] : data;
      
      if (result.error_message) {
        throw new Error(result.error_message);
      }

      return {
        inviteId: result.invite_id as string,
        token: result.token as string,
        expiresAt: result.expires_at as string,
      };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["family-invites"] });
    },
  });
}
