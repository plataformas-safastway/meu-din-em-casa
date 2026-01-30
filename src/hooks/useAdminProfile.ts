/**
 * useAdminProfile - Hook for managing admin user profile data
 * 
 * Handles:
 * - Fetching current admin user profile
 * - Updating profile data (name, phone, avatar)
 * - Password change via Supabase Auth
 * 
 * All errors are logged to observability for monitoring
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { captureEvent, captureException } from "@/lib/observability";

// Schema for admin profile form
export const adminProfileSchema = z.object({
  display_name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres").max(100),
  phone_country: z.string().default("+55"),
  phone_number: z.string().max(20).optional().nullable(),
});

export type AdminProfileFormData = z.infer<typeof adminProfileSchema>;

// Schema for password change
export const adminPasswordSchema = z.object({
  currentPassword: z.string().min(1, "Senha atual é obrigatória"),
  newPassword: z
    .string()
    .min(8, "A senha deve ter pelo menos 8 caracteres")
    .regex(/[A-Z]/, "A senha deve conter pelo menos uma letra maiúscula")
    .regex(/[0-9]/, "A senha deve conter pelo menos um número"),
  confirmPassword: z.string().min(1, "Confirmação é obrigatória"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "As senhas não coincidem",
  path: ["confirmPassword"],
});

export type AdminPasswordFormData = z.infer<typeof adminPasswordSchema>;

export interface AdminProfile {
  id: string;
  user_id: string;
  email: string | null;
  display_name: string | null;
  admin_role: string;
  phone_country: string | null;
  phone_number: string | null;
  avatar_url: string | null;
  created_at: string;
  last_login_at: string | null;
  is_active: boolean;
}

/**
 * Fetch current admin user's profile
 */
export function useAdminProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["admin-profile", user?.id],
    queryFn: async (): Promise<AdminProfile | null> => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("admin_users")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // No admin profile found
          return null;
        }
        console.error("[useAdminProfile] Error fetching profile:", error);
        throw error;
      }

      return data as AdminProfile;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Update admin profile data
 */
export function useUpdateAdminProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (updates: Partial<AdminProfileFormData>) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      // Prepare the update payload - only include non-empty values
      const updatePayload: Record<string, any> = {
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      };

      if (updates.display_name !== undefined) {
        updatePayload.display_name = updates.display_name;
      }
      if (updates.phone_country !== undefined) {
        updatePayload.phone_country = updates.phone_country;
      }
      if (updates.phone_number !== undefined) {
        // Store as null if empty, otherwise store the value
        updatePayload.phone_number = updates.phone_number || null;
      }

      console.log("[useUpdateAdminProfile] Updating with payload:", updatePayload);
      console.log("[useUpdateAdminProfile] User ID:", user.id);

      const { data, error } = await supabase
        .from("admin_users")
        .update(updatePayload)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) {
        // Log detailed error info to console for debugging
        console.error("[useUpdateAdminProfile] Supabase error:", {
          code: error.code,
          message: error.message,
          details: error.details,
          hint: error.hint,
        });

        // Log to observability with full error details
        captureEvent({
          category: 'storage',
          name: 'ADMIN_PROFILE_SAVE_FAILED',
          severity: 'error',
          message: `Failed to update admin profile: ${error.message}`,
          data: {
            userId: user.id.substring(0, 8) + '...',
            errorCode: error.code,
            errorMessage: error.message,
            errorDetails: error.details,
            errorHint: error.hint,
            screen: '/admin/profile',
            route: '/admin/profile',
          },
        });
        throw error;
      }

      console.log("[useUpdateAdminProfile] Update successful:", data);
      return data;
    },
    onSuccess: () => {
      toast.success("Perfil atualizado com sucesso");
      queryClient.invalidateQueries({ queryKey: ["admin-profile"] });
    },
    onError: (error: any) => {
      // Capture exception with full context
      captureException(error, { 
        context: 'useUpdateAdminProfile',
        screen: '/admin/profile',
        route: '/admin/profile',
        errorCode: error?.code,
        errorMessage: error?.message,
      });
      
      // Show more specific error message when possible
      const errorMessage = error?.code === '42501' 
        ? "Permissão negada. Verifique suas credenciais."
        : error?.code === '42703'
        ? "Erro de configuração do banco de dados."
        : "Erro ao atualizar perfil";
      
      toast.error(errorMessage);
    },
  });
}

/**
 * Update admin avatar URL
 */
export function useUpdateAdminAvatar() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (avatarUrl: string | null) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      console.log("[useUpdateAdminAvatar] Updating avatar URL:", avatarUrl);

      const { data, error } = await supabase
        .from("admin_users")
        .update({
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
          updated_by: user.id,
        })
        .eq("user_id", user.id)
        .select()
        .single();

      if (error) {
        console.error("[useUpdateAdminAvatar] Error:", {
          code: error.code,
          message: error.message,
          details: error.details,
        });

        captureEvent({
          category: 'storage',
          name: 'ADMIN_AVATAR_UPDATE_FAILED',
          severity: 'error',
          message: `Failed to update admin avatar URL: ${error.message}`,
          data: {
            userId: user.id.substring(0, 8) + '...',
            errorCode: error.code,
            errorMessage: error.message,
            screen: '/admin/profile',
            route: '/admin/profile',
          },
        });
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      toast.success("Foto atualizada com sucesso");
      queryClient.invalidateQueries({ queryKey: ["admin-profile"] });
    },
    onError: (error: any) => {
      captureException(error, { 
        context: 'useUpdateAdminAvatar',
        screen: '/admin/profile',
        route: '/admin/profile',
      });
      toast.error("Erro ao atualizar foto");
    },
  });
}

/**
 * Upload admin avatar to storage and update profile
 */
export function useUploadAdminAvatar() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const updateAvatar = useUpdateAdminAvatar();

  return useMutation({
    mutationFn: async (file: File) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      // Validate file
      const MAX_SIZE = 5 * 1024 * 1024; // 5MB
      const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

      if (!ALLOWED_TYPES.includes(file.type)) {
        const validationError = new Error("Tipo de arquivo não permitido. Use JPG, PNG ou WebP.");
        captureEvent({
          category: 'storage',
          name: 'ADMIN_AVATAR_VALIDATION_FAILED',
          severity: 'warning',
          message: 'Invalid file type for avatar upload',
          data: {
            userId: user.id.substring(0, 8) + '...',
            fileType: file.type,
            screen: '/admin/profile',
          },
        });
        throw validationError;
      }

      if (file.size > MAX_SIZE) {
        const sizeError = new Error("Arquivo muito grande. Máximo 5MB.");
        captureEvent({
          category: 'storage',
          name: 'ADMIN_AVATAR_VALIDATION_FAILED',
          severity: 'warning',
          message: 'File too large for avatar upload',
          data: {
            userId: user.id.substring(0, 8) + '...',
            fileSize: file.size,
            screen: '/admin/profile',
          },
        });
        throw sizeError;
      }

      // Create unique path
      const timestamp = Date.now();
      const ext = file.name.split('.').pop() || 'jpg';
      const path = `admin/${user.id}/${timestamp}.${ext}`;

      console.log("[useUploadAdminAvatar] Uploading to path:", path);

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        console.error("[useUploadAdminAvatar] Storage error:", uploadError);
        
        captureEvent({
          category: 'storage',
          name: 'ADMIN_AVATAR_UPLOAD_FAILED',
          severity: 'error',
          message: `Storage upload failed: ${uploadError.message}`,
          data: {
            userId: user.id.substring(0, 8) + '...',
            fileSize: file.size,
            fileType: file.type,
            errorMessage: uploadError.message,
            screen: '/admin/profile',
            route: '/admin/profile',
          },
        });
        throw new Error("Falha no upload da imagem");
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(path);

      console.log("[useUploadAdminAvatar] Got public URL:", publicUrl);

      // Update database with new URL
      await updateAvatar.mutateAsync(publicUrl);

      return publicUrl;
    },
    onError: (error: any) => {
      captureException(error, { 
        context: 'useUploadAdminAvatar',
        screen: '/admin/profile',
        route: '/admin/profile',
      });
      toast.error(error.message || "Erro ao fazer upload da foto");
    },
  });
}

/**
 * Change admin password via Supabase Auth
 * Does NOT store password in database
 */
export function useChangeAdminPassword() {
  return useMutation({
    mutationFn: async ({ 
      currentPassword, 
      newPassword 
    }: { 
      currentPassword: string; 
      newPassword: string 
    }) => {
      // First, verify current password by re-authenticating
      const { data: sessionData } = await supabase.auth.getSession();
      const email = sessionData.session?.user?.email;

      if (!email) {
        throw new Error("Usuário não autenticado");
      }

      // Try to sign in with current password to verify it
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });

      if (verifyError) {
        throw new Error("Senha atual incorreta");
      }

      // Update to new password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        console.error("[useChangeAdminPassword] Update error:", updateError);
        const errorMessage = updateError.message?.toLowerCase() || "";
        
        // Handle leaked/breached passwords
        if (
          errorMessage.includes("password") && (
            errorMessage.includes("breach") ||
            errorMessage.includes("leaked") ||
            errorMessage.includes("compromised") ||
            errorMessage.includes("pwned") ||
            errorMessage.includes("exposed")
          )
        ) {
          throw new Error("Esta senha foi encontrada em vazamentos de dados. Escolha uma senha diferente.");
        }
        
        // Handle weak password
        if (
          errorMessage.includes("password") && (
            errorMessage.includes("weak") ||
            errorMessage.includes("short")
          )
        ) {
          throw new Error("Senha muito fraca. Use uma senha mais forte.");
        }
        
        throw new Error("Erro ao alterar senha. Tente novamente.");
      }

      return true;
    },
    onSuccess: () => {
      toast.success("Senha alterada com sucesso");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Erro ao alterar senha");
    },
  });
}

/**
 * Get role display name
 */
export function getRoleDisplayName(role: string): string {
  const roleMap: Record<string, string> = {
    admin: "Administrador",
    cs: "Customer Success",
    admin_master: "Master",
    MASTER: "Master",
    ADMIN: "Administrador",
    CS: "Customer Success",
    financeiro: "Financeiro",
    tecnologia: "Tecnologia",
    suporte: "Suporte",
    diretoria: "Diretoria",
  };
  return roleMap[role] || role;
}
