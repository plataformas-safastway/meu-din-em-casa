import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Users, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  AdminUsersTable, 
  CreateAdminUserSheet, 
  EditAdminUserSheet,
  AdminAuditLogsTable 
} from "@/components/admin/users";
import { 
  useAdminUsersList, 
  useUpdateAdminUser, 
  useDeleteAdminUser,
  useCanManageAdmins,
  AdminUser 
} from "@/hooks/useAdminUsers";

export function AdminUsersManagementPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("users");
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<AdminUser | null>(null);
  
  const { data: users, isLoading } = useAdminUsersList();
  const { data: canManage, isLoading: checkingPermission } = useCanManageAdmins();
  const updateUser = useUpdateAdminUser();
  const deleteUserMutation = useDeleteAdminUser();

  const handleToggleActive = async (user: AdminUser) => {
    await updateUser.mutateAsync({
      id: user.id,
      isActive: !user.is_active,
    });
  };

  const handleRequirePasswordChange = async (user: AdminUser) => {
    await updateUser.mutateAsync({
      id: user.id,
      mustChangePassword: true,
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteUser) return;
    await deleteUserMutation.mutateAsync(deleteUser.id);
    setDeleteUser(null);
  };

  if (checkingPermission) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">Acesso Restrito</h2>
          <p className="text-muted-foreground mb-4">
            Você não tem permissão para gerenciar usuários administrativos.
          </p>
          <Button variant="outline" onClick={() => navigate("/admin")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Usuários Administrativos</h1>
            <p className="text-muted-foreground">
              Gerencie usuários com acesso ao dashboard
            </p>
          </div>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Usuário
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="users" className="gap-2">
            <Users className="w-4 h-4" />
            Usuários
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-2">
            <History className="w-4 h-4" />
            Auditoria
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-6">
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <AdminUsersTable
              users={users || []}
              onEdit={setEditUser}
              onToggleActive={handleToggleActive}
              onRequirePasswordChange={handleRequirePasswordChange}
              onDelete={setDeleteUser}
            />
          )}
        </TabsContent>

        <TabsContent value="audit" className="mt-6">
          <AdminAuditLogsTable />
        </TabsContent>
      </Tabs>

      {/* Sheets */}
      <CreateAdminUserSheet 
        open={createOpen} 
        onOpenChange={setCreateOpen} 
      />
      
      <EditAdminUserSheet
        user={editUser}
        open={!!editUser}
        onOpenChange={(open) => !open && setEditUser(null)}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteUser} onOpenChange={(open) => !open && setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {deleteUser?.display_name || deleteUser?.email}?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
