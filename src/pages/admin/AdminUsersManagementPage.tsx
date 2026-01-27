import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Users, History, Eye } from "lucide-react";
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
  AdminAuditLogsTable,
  ResetPasswordSheet,
  AdminUserDetailSheet,
} from "@/components/admin/users";
import { 
  useAdminUsersList, 
  useUpdateAdminUser, 
  useDeleteAdminUser,
  useCanManageAdmins,
  AdminUser 
} from "@/hooks/useAdminUsers";
import { toast } from "sonner";

export function AdminUsersManagementPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("users");
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<AdminUser | null>(null);
  const [deleteUser, setDeleteUser] = useState<AdminUser | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<AdminUser | null>(null);
  const [detailUser, setDetailUser] = useState<AdminUser | null>(null);
  
  const { data: users, isLoading, refetch } = useAdminUsersList();
  const { data: canManage, isLoading: checkingPermission } = useCanManageAdmins();
  const updateUser = useUpdateAdminUser();
  const deleteUserMutation = useDeleteAdminUser();

  const handleToggleActive = async (user: AdminUser) => {
    try {
      await updateUser.mutateAsync({
        id: user.id,
        isActive: !user.is_active,
      });
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleRequirePasswordChange = async (user: AdminUser) => {
    try {
      await updateUser.mutateAsync({
        id: user.id,
        mustChangePassword: true,
      });
      toast.success("Troca de senha será exigida no próximo login");
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteUser) return;
    try {
      await deleteUserMutation.mutateAsync(deleteUser.id);
      setDeleteUser(null);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleViewDetails = (user: AdminUser) => {
    setDetailUser(user);
  };

  if (checkingPermission) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!canManage) {
    return (
      <div className="p-4 md:p-6">
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
    <div className="p-4 md:p-6 space-y-6">
      {/* Header - Mobile responsive */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl md:text-2xl font-bold">Usuários Administrativos</h1>
            <p className="text-sm text-muted-foreground hidden sm:block">
              Gerencie usuários com acesso ao dashboard
            </p>
          </div>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Novo Usuário
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full sm:w-auto">
          <TabsTrigger value="users" className="flex-1 sm:flex-none gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Usuários</span>
          </TabsTrigger>
          <TabsTrigger value="audit" className="flex-1 sm:flex-none gap-2">
            <History className="w-4 h-4" />
            <span className="hidden sm:inline">Auditoria</span>
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
              onView={handleViewDetails}
              onResetPassword={setResetPasswordUser}
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

      <ResetPasswordSheet
        user={resetPasswordUser}
        open={!!resetPasswordUser}
        onOpenChange={(open) => !open && setResetPasswordUser(null)}
        onSuccess={() => refetch()}
      />

      <AdminUserDetailSheet
        user={detailUser}
        open={!!detailUser}
        onOpenChange={(open) => !open && setDetailUser(null)}
        onEdit={setEditUser}
        onResetPassword={setResetPasswordUser}
        onToggleActive={handleToggleActive}
        onRequirePasswordChange={handleRequirePasswordChange}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteUser} onOpenChange={(open) => !open && setDeleteUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteUser?.display_name || deleteUser?.email}</strong>?
              <br /><br />
              <span className="text-amber-600">
                Recomendamos desativar ao invés de excluir para manter o histórico de auditoria.
              </span>
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
