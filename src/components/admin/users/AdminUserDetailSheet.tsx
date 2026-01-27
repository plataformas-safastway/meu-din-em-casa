import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  User, 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  Key,
  Ban,
  CheckCircle,
  Edit,
  History,
  Lock,
  Smartphone
} from "lucide-react";
import { AdminUser, AdminRole, useCurrentAdminRole } from "@/hooks/useAdminUsers";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AdminUserDetailSheetProps {
  user: AdminUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (user: AdminUser) => void;
  onResetPassword: (user: AdminUser) => void;
  onToggleActive: (user: AdminUser) => void;
  onRequirePasswordChange: (user: AdminUser) => void;
}

const roleLabels: Record<AdminRole, string> = {
  CS: "Customer Success",
  ADMIN: "Administrador",
  LEGAL: "Jurídico/LGPD",
  MASTER: "Master",
};

const roleColors: Record<AdminRole, string> = {
  CS: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  ADMIN: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  LEGAL: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  MASTER: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const roleIcons: Record<AdminRole, React.ReactNode> = {
  CS: <Shield className="w-4 h-4" />,
  ADMIN: <ShieldCheck className="w-4 h-4" />,
  LEGAL: <ShieldAlert className="w-4 h-4" />,
  MASTER: <ShieldCheck className="w-4 h-4" />,
};

export function AdminUserDetailSheet({
  user,
  open,
  onOpenChange,
  onEdit,
  onResetPassword,
  onToggleActive,
  onRequirePasswordChange,
}: AdminUserDetailSheetProps) {
  const { data: currentRole } = useCurrentAdminRole();
  const isMaster = currentRole === "MASTER";

  if (!user) return null;

  const canEdit = isMaster || (currentRole === "ADMIN" && user.admin_role !== "MASTER");
  const canResetPassword = canEdit;
  const canToggleActive = canEdit;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Detalhes do Usuário
          </SheetTitle>
          <SheetDescription>
            Informações e ações rápidas
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* User Info Card */}
          <div className="p-4 bg-muted rounded-lg space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                {roleIcons[user.admin_role]}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">
                  {user.display_name || user.email?.split("@")[0]}
                </h3>
                <p className="text-sm text-muted-foreground">{user.email}</p>
              </div>
            </div>
            
            <div className="flex gap-2 flex-wrap">
              <Badge className={`${roleColors[user.admin_role]} gap-1`}>
                {roleIcons[user.admin_role]}
                {roleLabels[user.admin_role]}
              </Badge>
              
              {user.is_active ? (
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Ativo
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                  <Ban className="w-3 h-3 mr-1" />
                  Inativo
                </Badge>
              )}
            </div>
          </div>

          {/* Status Details */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Status</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 border rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Lock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Troca de Senha</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {user.must_change_password ? "Obrigatória" : "Não exigida"}
                </p>
              </div>
              
              <div className="p-3 border rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <Smartphone className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium">MFA</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {user.mfa_required 
                    ? (user.mfa_verified ? "Verificado" : "Obrigatório") 
                    : "Não exigido"}
                </p>
              </div>
            </div>
          </div>

          {/* Timestamps */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Histórico</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Último login:</span>
                <span>
                  {user.last_login_at 
                    ? format(new Date(user.last_login_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                    : "Nunca"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Criado em:</span>
                <span>
                  {format(new Date(user.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Atualizado em:</span>
                <span>
                  {format(new Date(user.updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Quick Actions */}
          {canEdit && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Ações Rápidas</h4>
              <div className="grid grid-cols-1 gap-2">
                <Button 
                  variant="outline" 
                  className="justify-start"
                  onClick={() => {
                    onOpenChange(false);
                    onEdit(user);
                  }}
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Editar Usuário
                </Button>
                
                {canResetPassword && (
                  <Button 
                    variant="outline" 
                    className="justify-start"
                    onClick={() => {
                      onOpenChange(false);
                      onResetPassword(user);
                    }}
                  >
                    <Key className="w-4 h-4 mr-2" />
                    Resetar Senha
                  </Button>
                )}
                
                {!user.must_change_password && (
                  <Button 
                    variant="outline" 
                    className="justify-start"
                    onClick={() => onRequirePasswordChange(user)}
                  >
                    <Lock className="w-4 h-4 mr-2" />
                    Exigir Troca de Senha
                  </Button>
                )}
                
                {canToggleActive && (
                  <Button 
                    variant="outline" 
                    className={`justify-start ${user.is_active ? "text-red-600 hover:text-red-700" : "text-green-600 hover:text-green-700"}`}
                    onClick={() => onToggleActive(user)}
                  >
                    {user.is_active ? (
                      <>
                        <Ban className="w-4 h-4 mr-2" />
                        Desativar Usuário
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Reativar Usuário
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
