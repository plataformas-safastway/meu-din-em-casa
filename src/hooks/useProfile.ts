import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { z } from "zod";

// Validation schemas
export const profileSchema = z.object({
  display_name: z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres").max(100, "Nome muito longo"),
  phone_e164: z.string().optional().refine(
    (val) => !val || /^\+\d{10,15}$/.test(val),
    "Telefone em formato inválido"
  ),
  phone_country: z.string().optional().default("BR"),
});

export const passwordSchema = z.object({
  currentPassword: z.string().min(6, "Senha atual é obrigatória"),
  newPassword: z.string()
    .min(8, "Nova senha deve ter pelo menos 8 caracteres")
    .regex(/[A-Z]/, "Deve conter pelo menos uma letra maiúscula")
    .regex(/[a-z]/, "Deve conter pelo menos uma letra minúscula")
    .regex(/[0-9]/, "Deve conter pelo menos um número"),
  confirmPassword: z.string().min(1, "Confirme a nova senha"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Senhas não conferem",
  path: ["confirmPassword"],
});

export type ProfileFormData = z.infer<typeof profileSchema>;
export type PasswordFormData = z.infer<typeof passwordSchema>;

// Allowed image types and max size (5MB)
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Validate image file
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: "Tipo de arquivo não permitido. Use JPG, PNG ou WebP." };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: "Arquivo muito grande. Máximo de 5MB." };
  }
  return { valid: true };
}

// Hook to upload avatar
export function useUploadAvatar() {
  const queryClient = useQueryClient();
  const { user, familyMember, refreshFamily } = useAuth();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!user || !familyMember) throw new Error("Usuário não autenticado");

      // Validate file
      const validation = validateImageFile(file);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // Generate unique filename with user folder
      const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `${user.id}/avatar-${Date.now()}.${fileExt}`;

      // Delete old avatar if exists
      if (familyMember.avatar_url) {
        const oldPath = familyMember.avatar_url.split("/avatars/")[1];
        if (oldPath) {
          await supabase.storage.from("avatars").remove([`${user.id}/${oldPath.split("/").pop()}`]);
        }
      }

      // Upload new avatar
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("avatars")
        .getPublicUrl(uploadData.path);

      const publicUrl = urlData.publicUrl;

      // Update family member with new avatar URL
      const { error: updateError } = await supabase
        .from("family_members")
        .update({ avatar_url: publicUrl })
        .eq("id", familyMember.id);

      if (updateError) throw updateError;

      return publicUrl;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["family"] });
      await refreshFamily();
      toast.success("Foto de perfil atualizada!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao enviar foto");
    },
  });
}

// Hook to remove avatar
export function useRemoveAvatar() {
  const queryClient = useQueryClient();
  const { user, familyMember, refreshFamily } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user || !familyMember) throw new Error("Usuário não autenticado");

      // Remove from storage if exists
      if (familyMember.avatar_url) {
        const urlParts = familyMember.avatar_url.split("/avatars/");
        if (urlParts[1]) {
          await supabase.storage.from("avatars").remove([urlParts[1]]);
        }
      }

      // Clear avatar URL in database
      const { error } = await supabase
        .from("family_members")
        .update({ avatar_url: null })
        .eq("id", familyMember.id);

      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["family"] });
      await refreshFamily();
      toast.success("Foto de perfil removida!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao remover foto");
    },
  });
}

// Hook to update profile (including phone)
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { refreshFamily } = useAuth();

  return useMutation({
    mutationFn: async (data: { memberId: string; updates: Partial<ProfileFormData> }) => {
      const updatePayload: Record<string, unknown> = {};
      
      if (data.updates.display_name !== undefined) {
        updatePayload.display_name = data.updates.display_name;
      }
      
      if (data.updates.phone_e164 !== undefined) {
        updatePayload.phone_e164 = data.updates.phone_e164 || null;
      }
      
      if (data.updates.phone_country !== undefined) {
        updatePayload.phone_country = data.updates.phone_country || "BR";
      }

      const { error } = await supabase
        .from("family_members")
        .update(updatePayload)
        .eq("id", data.memberId);

      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["family"] });
      await refreshFamily();
      toast.success("Perfil atualizado com sucesso!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao atualizar perfil");
    },
  });
}

// Hook to change password
export function useChangePassword() {
  return useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      // First verify current password by attempting to sign in
      const { data: sessionData } = await supabase.auth.getSession();
      const email = sessionData?.session?.user?.email;

      if (!email) {
        throw new Error("Usuário não autenticado");
      }

      // Verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: data.currentPassword,
      });

      if (signInError) {
        throw new Error("Senha atual incorreta");
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.newPassword,
      });

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      toast.success("Senha alterada com sucesso!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao alterar senha");
    },
  });
}

// Hook to export user data (LGPD)
export function useExportData() {
  const { user, family, familyMember } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user || !family) throw new Error("Usuário não autenticado");

      // Gather all user data
      const [transactions, goals, budgets, bankAccounts, creditCards] = await Promise.all([
        supabase.from("transactions").select("*").eq("family_id", family.id),
        supabase.from("goals").select("*").eq("family_id", family.id),
        supabase.from("budgets").select("*").eq("family_id", family.id),
        supabase.from("bank_accounts").select("*").eq("family_id", family.id),
        supabase.from("credit_cards").select("*").eq("family_id", family.id),
      ]);

      const exportData = {
        exportDate: new Date().toISOString(),
        user: {
          email: user.email,
          displayName: familyMember?.display_name,
          createdAt: user.created_at,
        },
        family: {
          name: family.name,
          membersCount: family.members_count,
        },
        transactions: transactions.data || [],
        goals: goals.data || [],
        budgets: budgets.data || [],
        bankAccounts: bankAccounts.data || [],
        creditCards: creditCards.data || [],
      };

      // Create and download JSON file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `meus-dados-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      return exportData;
    },
    onSuccess: () => {
      toast.success("Dados exportados com sucesso!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao exportar dados");
    },
  });
}

// Hook to request account deletion (LGPD)
export function useDeleteAccount() {
  const { deleteAccount } = useAuth();

  return useMutation({
    mutationFn: async () => {
      const { error } = await deleteAccount();
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Conta excluída com sucesso");
    },
    onError: (error: any) => {
      toast.error(error.message || "Erro ao excluir conta");
    },
  });
}