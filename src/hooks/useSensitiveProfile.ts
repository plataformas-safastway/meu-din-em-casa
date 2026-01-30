/**
 * useSensitiveProfile - Hook to manage sensitive personal data (LGPD)
 * 
 * Sensitive data is stored in family_member_private table with:
 * - At-rest encryption using pgcrypto (AES-256)
 * - Restricted RLS: Users can only read/write their own data
 * - Family owners can read (but not write) data of family members
 * 
 * Fields (encrypted): cpf, phone_e164
 * Fields (plaintext): birth_date, phone_country, profession
 * 
 * IMPORTANT: Use RPC functions for decrypted access:
 * - get_my_sensitive_private() - Own data
 * - get_family_member_sensitive(family_member_id) - Owner access
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface SensitiveProfileData {
  id: string;
  family_member_id: string;
  user_id: string;
  cpf: string | null;
  birth_date: string | null;
  phone_e164: string | null;
  phone_country: string | null;
  profession: string | null;
  created_at: string;
  updated_at: string;
}

export interface SensitiveProfileUpdate {
  cpf?: string | null;
  birth_date?: string | null;
  phone_e164?: string | null;
  phone_country?: string | null;
  profession?: string | null;
}

/**
 * Fetch the current user's sensitive profile data (decrypted via RPC)
 */
export function useSensitiveProfile() {
  const { user, familyMember } = useAuth();

  return useQuery({
    queryKey: ["sensitive-profile", user?.id],
    queryFn: async (): Promise<SensitiveProfileData | null> => {
      if (!user?.id || !familyMember?.id) return null;

      // Fetch encrypted fields via secure RPC
      const { data: decryptedData, error: rpcError } = await supabase
        .rpc("get_my_sensitive_private");

      if (rpcError) {
        console.error("[useSensitiveProfile] RPC error:", rpcError);
        // If encryption key not configured, return null gracefully
        if (rpcError.message?.includes("Encryption key")) {
          console.warn("[useSensitiveProfile] Encryption key not configured");
          return null;
        }
        throw rpcError;
      }

      // Fetch non-encrypted fields directly
      const { data: privateRecord, error: recordError } = await supabase
        .from("family_member_private")
        .select("id, family_member_id, user_id, birth_date, phone_country, profession, created_at, updated_at")
        .eq("family_member_id", familyMember.id)
        .maybeSingle();

      if (recordError) {
        console.error("[useSensitiveProfile] Error fetching record:", recordError);
        throw recordError;
      }

      if (!privateRecord) return null;

      // Merge decrypted fields with record
      const decrypted = decryptedData?.[0] || { cpf: null, phone_e164: null };
      
      return {
        ...privateRecord,
        cpf: decrypted.cpf,
        phone_e164: decrypted.phone_e164,
      } as SensitiveProfileData;
    },
    enabled: !!user?.id && !!familyMember?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Fetch sensitive data for a specific family member (owner access via RPC)
 */
export function useFamilyMemberSensitiveProfile(familyMemberId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["sensitive-profile-member", familyMemberId],
    queryFn: async (): Promise<SensitiveProfileData | null> => {
      if (!familyMemberId) return null;

      // Fetch decrypted data via secure RPC
      const { data: decryptedData, error: rpcError } = await supabase
        .rpc("get_family_member_sensitive", { p_family_member_id: familyMemberId });

      if (rpcError) {
        // RLS will block if user doesn't have permission
        console.error("[useFamilyMemberSensitiveProfile] RPC error:", rpcError);
        return null;
      }

      // Fetch non-encrypted fields directly
      const { data: privateRecord, error: recordError } = await supabase
        .from("family_member_private")
        .select("id, family_member_id, user_id, birth_date, phone_country, profession, created_at, updated_at")
        .eq("family_member_id", familyMemberId)
        .maybeSingle();

      if (recordError) {
        console.error("[useFamilyMemberSensitiveProfile] Error:", recordError);
        return null;
      }

      if (!privateRecord) return null;

      const decrypted = decryptedData?.[0] || { cpf: null, phone_e164: null };

      return {
        ...privateRecord,
        cpf: decrypted.cpf,
        phone_e164: decrypted.phone_e164,
      } as SensitiveProfileData;
    },
    enabled: !!user?.id && !!familyMemberId,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Update or create sensitive profile data
 * Note: Writes go to plaintext columns, trigger auto-encrypts
 */
export function useUpdateSensitiveProfile() {
  const queryClient = useQueryClient();
  const { user, familyMember } = useAuth();

  return useMutation({
    mutationFn: async (updates: SensitiveProfileUpdate) => {
      if (!user?.id || !familyMember?.id) {
        throw new Error("Usuário não autenticado");
      }

      // Check if record exists
      const { data: existing } = await supabase
        .from("family_member_private")
        .select("id")
        .eq("family_member_id", familyMember.id)
        .maybeSingle();

      if (existing) {
        // Update existing record - trigger will auto-encrypt cpf/phone_e164
        const { data, error } = await supabase
          .from("family_member_private")
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq("family_member_id", familyMember.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Insert new record - trigger will auto-encrypt cpf/phone_e164
        const { data, error } = await supabase
          .from("family_member_private")
          .insert({
            family_member_id: familyMember.id,
            user_id: user.id,
            ...updates,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sensitive-profile"] });
    },
    onError: (error: any) => {
      console.error("[useUpdateSensitiveProfile] Error:", error);
      toast.error("Erro ao atualizar dados pessoais");
    },
  });
}

/**
 * Update CPF specifically (for import flow)
 */
export function useUpdateCpf() {
  const updateProfile = useUpdateSensitiveProfile();

  return useMutation({
    mutationFn: async (cpf: string) => {
      return updateProfile.mutateAsync({ cpf });
    },
    onSuccess: () => {
      toast.success("CPF atualizado com sucesso!");
    },
    onError: (error: any) => {
      console.error("[useUpdateCpf] Error:", error);
      toast.error("Erro ao salvar CPF");
    },
  });
}

/**
 * Check if current user has CPF registered (uses RPC for decrypted check)
 */
export function useHasCpf(): { hasCpf: boolean; isLoading: boolean; cpf: string | null } {
  const { data, isLoading } = useSensitiveProfile();
  
  const cpf = data?.cpf ?? null;
  const hasCpf = !!cpf && cpf.length === 11;

  return { hasCpf, isLoading, cpf };
}
