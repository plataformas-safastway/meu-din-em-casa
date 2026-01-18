import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { z } from "zod";

// Validation schemas
export const profileSchema = z.object({
  display_name: z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres").max(100, "Nome muito longo"),
  phone: z.string().optional().refine(
    (val) => !val || /^\+?[\d\s()-]{10,20}$/.test(val),
    "Telefone inválido"
  ),
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

// Hook to update profile
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { refreshFamily } = useAuth();

  return useMutation({
    mutationFn: async (data: { memberId: string; updates: Partial<ProfileFormData> }) => {
      const { error } = await supabase
        .from("family_members")
        .update({
          display_name: data.updates.display_name,
        })
        .eq("id", data.memberId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["family"] });
      refreshFamily();
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
  const { deleteAccount, signOut } = useAuth();

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
