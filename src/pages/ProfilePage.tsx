import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Phone, 
  Lock, 
  Download, 
  Trash2, 
  Loader2,
  Save,
  Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/contexts/AuthContext";
import { useUpdateProfile, profileSchema, ProfileFormData } from "@/hooks/useProfile";
import { AvatarUpload } from "@/components/profile/AvatarUpload";
import { ChangePasswordSheet } from "@/components/profile/ChangePasswordSheet";
import { ExportDataSheet } from "@/components/profile/ExportDataSheet";
import { DeleteAccountSheet } from "@/components/profile/DeleteAccountSheet";

interface ProfilePageProps {
  onBack: () => void;
}

export function ProfilePage({ onBack }: ProfilePageProps) {
  const { user, familyMember } = useAuth();
  const updateProfile = useUpdateProfile();
  
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [exportDataOpen, setExportDataOpen] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      display_name: familyMember?.display_name || "",
      phone: "",
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    if (!familyMember) return;
    
    await updateProfile.mutateAsync({
      memberId: familyMember.id,
      updates: data,
    });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="container px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-semibold">Meus Dados</h1>
          </div>
        </div>
      </header>

      <main className="container px-4 py-6 space-y-6">
        {/* Avatar & User Info */}
        <div className="flex flex-col items-center gap-4 py-4">
          <AvatarUpload
            avatarUrl={familyMember?.avatar_url}
            displayName={familyMember?.display_name || "Usuário"}
            size="lg"
          />
          <div className="text-center">
            <p className="font-semibold text-lg">{familyMember?.display_name}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>

        {/* Profile Form */}
        <div className="bg-card rounded-2xl border border-border/30 p-4">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            Dados Pessoais
          </h2>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="display_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Nome
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Seu nome" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  E-mail
                </label>
                <Input 
                  value={user?.email || ""} 
                  disabled 
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  O e-mail não pode ser alterado
                </p>
              </div>

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      Telefone
                    </FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="+55 (00) 00000-0000" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                className="w-full"
                disabled={updateProfile.isPending || !form.formState.isDirty}
              >
                {updateProfile.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Salvar Alterações
                  </>
                )}
              </Button>
            </form>
          </Form>
        </div>

        {/* Security Section */}
        <div className="bg-card rounded-2xl border border-border/30 p-4 space-y-3">
          <h2 className="font-semibold flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            Segurança
          </h2>

          <Button
            variant="outline"
            className="w-full justify-start gap-3"
            onClick={() => setChangePasswordOpen(true)}
          >
            <Lock className="w-4 h-4" />
            Alterar Senha
          </Button>
        </div>

        {/* LGPD Section */}
        <div className="bg-card rounded-2xl border border-border/30 p-4 space-y-3">
          <h2 className="font-semibold flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            Privacidade (LGPD)
          </h2>
          <p className="text-xs text-muted-foreground">
            Conforme a Lei Geral de Proteção de Dados, você tem direito de acessar, 
            exportar e solicitar a exclusão dos seus dados pessoais.
          </p>

          <Button
            variant="outline"
            className="w-full justify-start gap-3"
            onClick={() => setExportDataOpen(true)}
          >
            <Download className="w-4 h-4" />
            Exportar Meus Dados
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start gap-3 text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={() => setDeleteAccountOpen(true)}
          >
            <Trash2 className="w-4 h-4" />
            Excluir Minha Conta
          </Button>
        </div>

        {/* Info Card */}
        <div className="bg-muted/50 rounded-xl p-4 text-center">
          <p className="text-xs text-muted-foreground">
            Membro desde {user?.created_at ? new Date(user.created_at).toLocaleDateString("pt-BR", { 
              month: "long", 
              year: "numeric" 
            }) : "—"}
          </p>
        </div>
      </main>

      {/* Sheets */}
      <ChangePasswordSheet 
        open={changePasswordOpen} 
        onOpenChange={setChangePasswordOpen} 
      />
      <ExportDataSheet 
        open={exportDataOpen} 
        onOpenChange={setExportDataOpen} 
      />
      <DeleteAccountSheet 
        open={deleteAccountOpen} 
        onOpenChange={setDeleteAccountOpen} 
      />
    </div>
  );
}