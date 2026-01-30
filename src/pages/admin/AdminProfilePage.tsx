/**
 * AdminProfilePage - Admin user profile management
 * 
 * Features:
 * - Edit personal data (name, phone)
 * - Update avatar photo
 * - Change password securely
 * 
 * Security:
 * - User can only edit their own profile
 * - Password change via Supabase Auth (never stored in app DB)
 * - Session remains active after password change
 */

import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Shield, 
  Calendar, 
  Clock, 
  Save, 
  Loader2,
  Lock,
  Eye,
  EyeOff,
  Check,
  X,
  Camera
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { PhoneInput } from "@/components/profile/PhoneInput";
import { 
  useAdminProfile, 
  useUpdateAdminProfile,
  useUploadAdminAvatar,
  useChangeAdminPassword,
  adminProfileSchema, 
  adminPasswordSchema,
  getRoleDisplayName,
  type AdminProfileFormData,
  type AdminPasswordFormData
} from "@/hooks/useAdminProfile";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

export function AdminProfilePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile, isLoading, refetch } = useAdminProfile();
  const updateProfile = useUpdateAdminProfile();
  const uploadAvatar = useUploadAdminAvatar();
  const changePassword = useChangeAdminPassword();

  // Avatar file input ref
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Password visibility states
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Profile form
  const profileForm = useForm<AdminProfileFormData>({
    resolver: zodResolver(adminProfileSchema),
    defaultValues: {
      display_name: "",
      phone_country: "+55",
      phone_number: "",
    },
  });

  // Password form
  const passwordForm = useForm<AdminPasswordFormData>({
    resolver: zodResolver(adminPasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Populate form when profile loads
  useEffect(() => {
    if (profile) {
      profileForm.reset({
        display_name: profile.display_name || "",
        phone_country: profile.phone_country || "+55",
        phone_number: profile.phone_number || "",
      });
    }
  }, [profile, profileForm]);

  const handleProfileSubmit = async (data: AdminProfileFormData) => {
    await updateProfile.mutateAsync(data);
    // Refetch to ensure UI is in sync
    await refetch();
  };

  const handlePhoneChange = (phoneE164: string, countryCode: string) => {
    // Extract just the number part from E.164
    const country = phoneE164 ? `+${phoneE164.match(/^\+(\d+)/)?.[1] || "55"}` : "+55";
    const number = phoneE164.replace(/^\+\d+/, "");
    
    profileForm.setValue("phone_country", country, { shouldDirty: true });
    profileForm.setValue("phone_number", number, { shouldDirty: true });
  };

  const handleAvatarClick = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    await uploadAvatar.mutateAsync(file);
    await refetch();
    
    // Reset input so same file can be selected again
    if (avatarInputRef.current) {
      avatarInputRef.current.value = "";
    }
  };

  const handlePasswordSubmit = async (data: AdminPasswordFormData) => {
    await changePassword.mutateAsync({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });

    if (!changePassword.isError) {
      passwordForm.reset();
    }
  };

  // Password strength indicators
  const newPassword = passwordForm.watch("newPassword");
  const passwordStrength = {
    hasMinLength: newPassword.length >= 8,
    hasUppercase: /[A-Z]/.test(newPassword),
    hasNumber: /[0-9]/.test(newPassword),
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate("/admin")}
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Meu Perfil</h1>
          <p className="text-sm text-muted-foreground">
            Gerencie seus dados pessoais e credenciais
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Section 1: Personal Data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Dados Pessoais
            </CardTitle>
            <CardDescription>
              Atualize suas informações de perfil
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar with upload */}
            <div className="flex items-center gap-4">
              <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
                <Avatar className="w-20 h-20">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="text-lg bg-primary/10 text-primary">
                    {getInitials(profile?.display_name)}
                  </AvatarFallback>
                </Avatar>
                {/* Overlay for hover */}
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {uploadAvatar.isPending ? (
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  ) : (
                    <Camera className="w-6 h-6 text-white" />
                  )}
                </div>
                {/* Hidden file input */}
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>
              <div className="flex-1">
                <p className="font-medium">{profile?.display_name || "Sem nome"}</p>
                <p className="text-sm text-muted-foreground">{profile?.email}</p>
                <Badge variant="secondary" className="mt-1">
                  {getRoleDisplayName(profile?.admin_role || "")}
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">
                  Clique na foto para alterar
                </p>
              </div>
            </div>

            <Separator />

            {/* Profile Form */}
            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit(handleProfileSubmit)} className="space-y-4">
                <FormField
                  control={profileForm.control}
                  name="display_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome Completo *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Seu nome" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-2">
                  <FormLabel>Telefone</FormLabel>
                  <PhoneInput
                    value={profile?.phone_number ? `${profile.phone_country || "+55"}${profile.phone_number}` : ""}
                    countryCode={profile?.phone_country?.replace("+", "") === "55" ? "BR" : "BR"}
                    onChange={handlePhoneChange}
                  />
                </div>

                <Button 
                  type="submit" 
                  disabled={updateProfile.isPending || !profileForm.formState.isDirty}
                  className="w-full"
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

            <Separator />

            {/* Read-only Info */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Informações da Conta</h4>
              
              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Email:</span>
                <span>{profile?.email || user?.email}</span>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <Shield className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Tipo:</span>
                <Badge variant="outline">
                  {getRoleDisplayName(profile?.admin_role || "")}
                </Badge>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Criado em:</span>
                <span>
                  {profile?.created_at 
                    ? format(new Date(profile.created_at), "dd/MM/yyyy", { locale: ptBR })
                    : "-"}
                </span>
              </div>

              <div className="flex items-center gap-3 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">Último login:</span>
                <span>
                  {profile?.last_login_at 
                    ? format(new Date(profile.last_login_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                    : "-"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Change Password */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Alterar Senha
            </CardTitle>
            <CardDescription>
              Atualize sua senha de acesso ao Dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(handlePasswordSubmit)} className="space-y-4">
                <FormField
                  control={passwordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Senha Atual *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showCurrentPassword ? "text" : "password"}
                            placeholder="••••••••"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          >
                            {showCurrentPassword ? (
                              <EyeOff className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <Eye className="w-4 h-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={passwordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nova Senha *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showNewPassword ? "text" : "password"}
                            placeholder="••••••••"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                          >
                            {showNewPassword ? (
                              <EyeOff className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <Eye className="w-4 h-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                      
                      {/* Password strength indicators */}
                      <div className="space-y-1 pt-2">
                        <div className={cn(
                          "flex items-center gap-2 text-xs",
                          passwordStrength.hasMinLength ? "text-success" : "text-muted-foreground"
                        )}>
                          {passwordStrength.hasMinLength ? (
                            <Check className="w-3 h-3" />
                          ) : (
                            <X className="w-3 h-3" />
                          )}
                          Mínimo 8 caracteres
                        </div>
                        <div className={cn(
                          "flex items-center gap-2 text-xs",
                          passwordStrength.hasUppercase ? "text-success" : "text-muted-foreground"
                        )}>
                          {passwordStrength.hasUppercase ? (
                            <Check className="w-3 h-3" />
                          ) : (
                            <X className="w-3 h-3" />
                          )}
                          Pelo menos 1 letra maiúscula
                        </div>
                        <div className={cn(
                          "flex items-center gap-2 text-xs",
                          passwordStrength.hasNumber ? "text-success" : "text-muted-foreground"
                        )}>
                          {passwordStrength.hasNumber ? (
                            <Check className="w-3 h-3" />
                          ) : (
                            <X className="w-3 h-3" />
                          )}
                          Pelo menos 1 número
                        </div>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={passwordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirmar Nova Senha *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="••••••••"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <Eye className="w-4 h-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  disabled={changePassword.isPending}
                  className="w-full"
                >
                  {changePassword.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Alterando...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      Alterar Senha
                    </>
                  )}
                </Button>
              </form>
            </Form>

            {/* Security Tips */}
            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <h4 className="text-sm font-medium mb-2">Dicas de Segurança</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Use uma senha única que você não usa em outros sites</li>
                <li>• Evite informações pessoais como datas de nascimento</li>
                <li>• Considere usar um gerenciador de senhas</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
