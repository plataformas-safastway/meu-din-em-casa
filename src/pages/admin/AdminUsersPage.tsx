import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Users, 
  Search, 
  Eye, 
  Loader2,
  ChevronRight,
  ArrowLeft,
  Ban,
  UserX,
  Shield,
  History,
  MoreHorizontal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAssignRole, useRemoveRole, AppRole } from "@/hooks/useUserRole";
import { AdminUserProfileView } from "@/components/admin/AdminUserProfileView";
import { UserStatusBadge } from "@/components/admin/UserStatusBadge";
import { ChangeUserStatusDialog } from "@/components/admin/ChangeUserStatusDialog";
import { UserStatusAuditSheet } from "@/components/admin/UserStatusAuditSheet";
import { useUsersWithStatus, useUserStatusCounts, UserAccountStatus } from "@/hooks/useUserAccountStatus";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FamilyWithMembers {
  id: string;
  name: string;
  created_at: string;
  members_count: number;
  family_members: {
    id: string;
    user_id: string;
    display_name: string;
    role: string;
    cpf: string | null;
    status: string;
  }[];
}

export function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [selectedFamily, setSelectedFamily] = useState<FamilyWithMembers | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<{ userId: string; memberId: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"active" | "blocked">("active");
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [auditSheetOpen, setAuditSheetOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{
    userId: string;
    userName: string;
    status: UserAccountStatus;
  } | null>(null);

  // User status data
  const { data: statusCounts } = useUserStatusCounts();
  const { data: usersWithStatus, isLoading: usersLoading } = useUsersWithStatus(
    activeTab === "active" ? "ACTIVE" : "ALL"
  );

  // Filter users for blocked/disabled tab
  const blockedUsers = usersWithStatus?.filter(
    (u) => u.account_status === "BLOCKED" || u.account_status === "DISABLED"
  );

  const { data: families, isLoading } = useQuery({
    queryKey: ['admin-families'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('families')
        .select(`
          id,
          name,
          created_at,
          members_count,
          family_members (
            id,
            user_id,
            display_name,
            role,
            cpf,
            status
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as FamilyWithMembers[];
    },
  });

  const filteredFamilies = families?.filter(family => 
    family.name.toLowerCase().includes(search.toLowerCase()) ||
    family.family_members.some(m => 
      m.display_name.toLowerCase().includes(search.toLowerCase())
    )
  );

  const filteredUsers = (activeTab === "active" ? usersWithStatus : blockedUsers)?.filter(
    (u) =>
      u.display_name.toLowerCase().includes(search.toLowerCase()) ||
      u.families?.some((f: any) => f.name.toLowerCase().includes(search.toLowerCase()))
  );

  const handleViewDetails = (family: FamilyWithMembers) => {
    setSelectedFamily(family);
    setDetailsOpen(true);
  };

  const handleViewMemberProfile = (userId: string, memberId: string) => {
    setSelectedMember({ userId, memberId });
    setDetailsOpen(false);
  };

  const handleOpenStatusDialog = (userId: string, userName: string, status: UserAccountStatus) => {
    setSelectedUser({ userId, userName, status });
    setStatusDialogOpen(true);
  };

  const handleOpenAuditSheet = (userId: string, userName: string, status: UserAccountStatus) => {
    setSelectedUser({ userId, userName, status });
    setAuditSheetOpen(true);
  };

  // If viewing a member profile
  if (selectedMember) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setSelectedMember(null)}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold">Perfil do Usuário</h2>
            <p className="text-muted-foreground">Visualização administrativa (somente leitura)</p>
          </div>
        </div>
        
        <AdminUserProfileView 
          userId={selectedMember.userId}
          memberId={selectedMember.memberId}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Usuários</h2>
        <p className="text-muted-foreground">Gerencie usuários e famílias do sistema</p>
      </div>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{statusCounts?.total || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Ativos</p>
                <p className="text-2xl font-bold">{statusCounts?.active || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <UserX className="w-8 h-8 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Desativados</p>
                <p className="text-2xl font-bold">{statusCounts?.disabled || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Ban className="w-8 h-8 text-destructive" />
              <div>
                <p className="text-sm text-muted-foreground">Bloqueados</p>
                <p className="text-2xl font-bold">{statusCounts?.blocked || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou família..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabs for Active / Blocked users */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "active" | "blocked")}>
        <TabsList>
          <TabsTrigger value="active" className="gap-2">
            <Shield className="w-4 h-4" />
            Usuários Ativos
          </TabsTrigger>
          <TabsTrigger value="blocked" className="gap-2">
            <Ban className="w-4 h-4" />
            Bloqueados / Desativados
            {(statusCounts?.blocked || 0) + (statusCounts?.disabled || 0) > 0 && (
              <Badge variant="destructive" className="ml-1">
                {(statusCounts?.blocked || 0) + (statusCounts?.disabled || 0)}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Active Users Tab */}
        <TabsContent value="active" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Usuários Ativos
              </CardTitle>
              <CardDescription>
                {filteredUsers?.length || 0} usuários ativos no sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Famílias</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Criado em</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers?.map((user: any) => (
                      <TableRow key={user.user_id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{user.display_name}</p>
                            <p className="text-xs text-muted-foreground capitalize">
                              {user.role === 'owner' ? 'Dono' : 'Membro'}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {user.families?.slice(0, 2).map((f: any, i: number) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {f.name}
                              </Badge>
                            ))}
                            {user.families?.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{user.families.length - 2}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <UserStatusBadge status={user.account_status} />
                        </TableCell>
                        <TableCell>
                          {format(new Date(user.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleViewMemberProfile(user.user_id, user.id)}>
                                <Eye className="w-4 h-4 mr-2" />
                                Ver perfil
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenStatusDialog(user.user_id, user.display_name, user.account_status)}>
                                <UserX className="w-4 h-4 mr-2" />
                                Alterar status
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenAuditSheet(user.user_id, user.display_name, user.account_status)}>
                                <History className="w-4 h-4 mr-2" />
                                Histórico de status
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredUsers?.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          Nenhum usuário encontrado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Blocked/Disabled Users Tab */}
        <TabsContent value="blocked" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ban className="w-5 h-5" />
                Usuários Bloqueados / Desativados
              </CardTitle>
              <CardDescription>
                Usuários com acesso restrito à plataforma
              </CardDescription>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : blockedUsers?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum usuário bloqueado ou desativado</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Usuário</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Motivo</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {blockedUsers?.map((user: any) => (
                      <TableRow key={user.user_id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{user.display_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {user.families?.[0]?.name || "—"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <UserStatusBadge status={user.account_status} />
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {user.account_status_reason || "—"}
                          </span>
                        </TableCell>
                        <TableCell>
                          {user.account_status_changed_at
                            ? format(new Date(user.account_status_changed_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                            : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleOpenStatusDialog(user.user_id, user.display_name, user.account_status)}>
                                <Shield className="w-4 h-4 mr-2" />
                                Reativar usuário
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenAuditSheet(user.user_id, user.display_name, user.account_status)}>
                                <History className="w-4 h-4 mr-2" />
                                Histórico de status
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Families Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Famílias Cadastradas
          </CardTitle>
          <CardDescription>
            {families?.length || 0} famílias no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Família</TableHead>
                  <TableHead>Membros</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFamilies?.map((family) => (
                  <TableRow key={family.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{family.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {family.family_members[0]?.display_name || "—"}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {family.members_count} {family.members_count === 1 ? 'membro' : 'membros'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(family.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewDetails(family)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Ver
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredFamilies?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Nenhuma família encontrada
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Family Details Sheet */}
      <Sheet open={detailsOpen} onOpenChange={setDetailsOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selectedFamily?.name}</SheetTitle>
            <SheetDescription>
              Detalhes da família e membros
            </SheetDescription>
          </SheetHeader>

          {selectedFamily && (
            <div className="mt-6 space-y-6">
              {/* Family Info */}
              <div className="space-y-2">
                <h4 className="font-medium">Informações</h4>
                <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ID:</span>
                    <span className="font-mono text-xs">{selectedFamily.id.slice(0, 8)}...</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Criado em:</span>
                    <span>{format(new Date(selectedFamily.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Membros:</span>
                    <span>{selectedFamily.members_count}</span>
                  </div>
                </div>
              </div>

              {/* Members by Status */}
              <div className="space-y-4">
                <h4 className="font-medium">Membros Ativos</h4>
                <div className="space-y-2">
                  {selectedFamily.family_members
                    .filter((m) => m.status === "ACTIVE")
                    .map((member) => (
                      <MemberCard key={member.id} member={member} />
                    ))}
                  {selectedFamily.family_members.filter((m) => m.status === "ACTIVE").length === 0 && (
                    <p className="text-sm text-muted-foreground">Nenhum membro ativo</p>
                  )}
                </div>

                {selectedFamily.family_members.some((m) => m.status === "INVITED") && (
                  <>
                    <h4 className="font-medium">Convidados</h4>
                    <div className="space-y-2">
                      {selectedFamily.family_members
                        .filter((m) => m.status === "INVITED")
                        .map((member) => (
                          <MemberCard key={member.id} member={member} />
                        ))}
                    </div>
                  </>
                )}

                {selectedFamily.family_members.some((m) => ["REMOVED", "DISABLED", "BLOCKED"].includes(m.status)) && (
                  <>
                    <h4 className="font-medium text-muted-foreground">Removidos / Inativos</h4>
                    <div className="space-y-2">
                      {selectedFamily.family_members
                        .filter((m) => ["REMOVED", "DISABLED", "BLOCKED"].includes(m.status))
                        .map((member) => (
                          <MemberCard key={member.id} member={member} showStatus />
                        ))}
                    </div>
                  </>
                )}
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <h4 className="font-medium">Ações</h4>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start">
                    <Eye className="w-4 h-4 mr-2" />
                    Ver resumo financeiro
                  </Button>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Change Status Dialog */}
      {selectedUser && (
        <>
          <ChangeUserStatusDialog
            open={statusDialogOpen}
            onOpenChange={setStatusDialogOpen}
            userId={selectedUser.userId}
            userName={selectedUser.userName}
            currentStatus={selectedUser.status}
          />
          <UserStatusAuditSheet
            open={auditSheetOpen}
            onOpenChange={setAuditSheetOpen}
            userId={selectedUser.userId}
            userName={selectedUser.userName}
          />
        </>
      )}
    </div>
  );
}

function MemberCard({ member, showStatus }: { member: FamilyWithMembers['family_members'][0]; showStatus?: boolean }) {
  const assignRole = useAssignRole();
  const removeRole = useRemoveRole();
  const [currentRole, setCurrentRole] = useState<AppRole | null>(null);

  // Fetch user role
  const { data: userRoles } = useQuery({
    queryKey: ['user-roles', member.user_id],
    queryFn: async () => {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', member.user_id);
      return data?.map(r => r.role as AppRole) || [];
    },
  });

  const handleRoleChange = async (newRole: string) => {
    try {
      // Remove old roles first
      if (userRoles?.length) {
        for (const oldRole of userRoles) {
          await removeRole.mutateAsync({ userId: member.user_id, role: oldRole });
        }
      }
      
      // Assign new role
      if (newRole !== 'none') {
        await assignRole.mutateAsync({ userId: member.user_id, role: newRole as AppRole });
      }
      
      toast.success("Papel atualizado com sucesso");
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar papel");
    }
  };

  const primaryRole = userRoles?.[0] || 'user';

  return (
    <div className={`bg-muted/50 rounded-lg p-4 space-y-3 ${showStatus && member.status !== "ACTIVE" ? "opacity-70" : ""}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div>
            <p className="font-medium">{member.display_name}</p>
            <p className="text-xs text-muted-foreground capitalize">
              {member.role === 'owner' ? 'Dono' : 'Membro'} da família
            </p>
          </div>
          {showStatus && member.status !== "ACTIVE" && (
            <UserStatusBadge status={member.status as any} size="sm" />
          )}
        </div>
        <Badge variant={primaryRole === 'admin' ? 'default' : primaryRole === 'cs' ? 'secondary' : 'outline'}>
          {primaryRole.toUpperCase()}
        </Badge>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Papel no sistema:</span>
        <Select
          value={primaryRole}
          onValueChange={handleRoleChange}
        >
          <SelectTrigger className="w-32 h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="user">Usuário</SelectItem>
            <SelectItem value="cs">CS</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {member.cpf && (
        <p className="text-xs text-muted-foreground">
          CPF: {member.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.***.***-$4')}
        </p>
      )}
    </div>
  );
}
