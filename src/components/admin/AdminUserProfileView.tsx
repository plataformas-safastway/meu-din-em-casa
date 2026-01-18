import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  User, 
  Mail, 
  Calendar, 
  Shield, 
  Clock, 
  FileText,
  Loader2,
  UserCog,
  Ban
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole, useAssignRole, useRemoveRole, AppRole } from "@/hooks/useUserRole";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

interface AdminUserProfileViewProps {
  userId: string;
  memberId: string;
  onBack?: () => void;
}

export function AdminUserProfileView({ userId, memberId }: AdminUserProfileViewProps) {
  const { data: adminRole } = useUserRole();
  const isAdmin = adminRole === "admin";

  // Fetch user profile data
  const { data: memberData, isLoading: memberLoading } = useQuery({
    queryKey: ["admin-member-profile", memberId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("family_members")
        .select(`
          *,
          families (
            id,
            name,
            members_count,
            created_at
          )
        `)
        .eq("id", memberId)
        .single();

      if (error) throw error;
      return data;
    },
  });

  // Fetch user role
  const { data: userRoleData, isLoading: roleLoading, refetch: refetchRole } = useQuery({
    queryKey: ["admin-user-role", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  // Fetch user stats
  const { data: stats } = useQuery({
    queryKey: ["admin-user-stats", memberData?.family_id],
    enabled: !!memberData?.family_id,
    queryFn: async () => {
      const familyId = memberData!.family_id;
      
      const [transactions, goals, budgets] = await Promise.all([
        supabase.from("transactions").select("id", { count: "exact", head: true }).eq("family_id", familyId),
        supabase.from("goals").select("id", { count: "exact", head: true }).eq("family_id", familyId),
        supabase.from("budgets").select("id", { count: "exact", head: true }).eq("family_id", familyId),
      ]);

      return {
        transactions: transactions.count || 0,
        goals: goals.count || 0,
        budgets: budgets.count || 0,
      };
    },
  });

  const assignRole = useAssignRole();
  const removeRole = useRemoveRole();

  const handleRoleChange = async (newRole: string) => {
    try {
      if (newRole === "none") {
        if (userRoleData?.role) {
          await removeRole.mutateAsync({ userId, role: userRoleData.role as AppRole });
        }
      } else {
        if (userRoleData?.role) {
          await removeRole.mutateAsync({ userId, role: userRoleData.role as AppRole });
        }
        await assignRole.mutateAsync({ userId, role: newRole as AppRole });
      }
      refetchRole();
      toast.success("Papel atualizado com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar papel");
    }
  };

  if (memberLoading || roleLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!memberData) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        Usuário não encontrado
      </div>
    );
  }

  const currentRole = userRoleData?.role || "user";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
            {memberData.display_name?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <div>
            <h2 className="text-xl font-semibold">{memberData.display_name}</h2>
            <p className="text-sm text-muted-foreground">
              Família: {memberData.families?.name}
            </p>
            <Badge variant={memberData.role === "owner" ? "default" : "secondary"} className="mt-1">
              {memberData.role === "owner" ? "Proprietário" : "Membro"}
            </Badge>
          </div>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <Select value={currentRole} onValueChange={handleRoleChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Usuário</SelectItem>
                <SelectItem value="cs">CS</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* User Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="w-4 h-4" />
            Dados do Usuário
          </CardTitle>
          <CardDescription>Informações do perfil (somente leitura)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground flex items-center gap-1">
                <User className="w-3 h-3" />
                Nome
              </label>
              <p className="text-sm font-medium">{memberData.display_name}</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground flex items-center gap-1">
                <Shield className="w-3 h-3" />
                Papel no Sistema
              </label>
              <Badge variant={currentRole === "admin" ? "destructive" : currentRole === "cs" ? "default" : "secondary"}>
                {currentRole === "admin" ? "Administrador" : currentRole === "cs" ? "Suporte" : "Usuário"}
              </Badge>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Membro desde
              </label>
              <p className="text-sm font-medium">
                {new Date(memberData.created_at).toLocaleDateString("pt-BR")}
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground flex items-center gap-1">
                <UserCog className="w-3 h-3" />
                Papel na Família
              </label>
              <p className="text-sm font-medium capitalize">{memberData.role}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileText className="w-4 h-4" />
            Estatísticas de Uso
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">{stats?.transactions || 0}</p>
              <p className="text-xs text-muted-foreground">Transações</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">{stats?.goals || 0}</p>
              <p className="text-xs text-muted-foreground">Metas</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-2xl font-bold">{stats?.budgets || 0}</p>
              <p className="text-xs text-muted-foreground">Orçamentos</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Family Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="w-4 h-4" />
            Família
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Nome</span>
            <span className="text-sm font-medium">{memberData.families?.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Membros</span>
            <span className="text-sm font-medium">{memberData.families?.members_count}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-muted-foreground">Criada em</span>
            <span className="text-sm font-medium">
              {memberData.families?.created_at 
                ? new Date(memberData.families.created_at).toLocaleDateString("pt-BR")
                : "—"}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Security Notice */}
      <div className="bg-muted/50 rounded-xl p-4 text-center">
        <p className="text-xs text-muted-foreground">
          <Shield className="w-3 h-3 inline mr-1" />
          Senhas e dados sensíveis não são visíveis por segurança
        </p>
      </div>
    </div>
  );
}
