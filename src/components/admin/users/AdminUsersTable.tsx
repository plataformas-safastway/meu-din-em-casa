import { useState } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Search, 
  MoreHorizontal, 
  Shield, 
  ShieldCheck, 
  ShieldAlert,
  Key,
  Ban,
  CheckCircle,
  Trash2,
  Edit
} from "lucide-react";
import { AdminUser, AdminRole, useCurrentAdminRole } from "@/hooks/useAdminUsers";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AdminUsersTableProps {
  users: AdminUser[];
  onEdit: (user: AdminUser) => void;
  onToggleActive: (user: AdminUser) => void;
  onRequirePasswordChange: (user: AdminUser) => void;
  onDelete: (user: AdminUser) => void;
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
  CS: <Shield className="w-3 h-3" />,
  ADMIN: <ShieldCheck className="w-3 h-3" />,
  LEGAL: <ShieldAlert className="w-3 h-3" />,
  MASTER: <ShieldCheck className="w-3 h-3" />,
};

export function AdminUsersTable({ 
  users, 
  onEdit, 
  onToggleActive, 
  onRequirePasswordChange,
  onDelete 
}: AdminUsersTableProps) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  const { data: currentRole } = useCurrentAdminRole();
  const isMaster = currentRole === "MASTER";

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      (user.email?.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      (user.display_name?.toLowerCase().includes(search.toLowerCase()) ?? false);
    
    const matchesRole = roleFilter === "all" || user.admin_role === roleFilter;
    const matchesStatus = statusFilter === "all" || 
      (statusFilter === "active" && user.is_active) ||
      (statusFilter === "inactive" && !user.is_active);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const canEditUser = (user: AdminUser): boolean => {
    if (isMaster) return true;
    if (currentRole === "ADMIN") {
      // ADMIN can edit CS and LEGAL, but not MASTER or other ADMINs
      return user.admin_role === "CS" || user.admin_role === "LEGAL";
    }
    return false;
  };

  const canDeleteUser = (user: AdminUser): boolean => {
    // Only MASTER can delete
    return isMaster && user.admin_role !== "MASTER";
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por email ou nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="Papel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os papéis</SelectItem>
            <SelectItem value="CS">CS</SelectItem>
            <SelectItem value="ADMIN">Admin</SelectItem>
            <SelectItem value="LEGAL">Legal</SelectItem>
            <SelectItem value="MASTER">Master</SelectItem>
          </SelectContent>
        </Select>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="inactive">Inativos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuário</TableHead>
              <TableHead>Papel</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="hidden md:table-cell">MFA</TableHead>
              <TableHead className="hidden lg:table-cell">Última Atualização</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhum usuário encontrado
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{user.display_name || user.email}</p>
                      {user.display_name && (
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${roleColors[user.admin_role]} gap-1`}>
                      {roleIcons[user.admin_role]}
                      {roleLabels[user.admin_role]}
                    </Badge>
                  </TableCell>
                  <TableCell>
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
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {user.mfa_required ? (
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        {user.mfa_verified ? "Verificado" : "Obrigatório"}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-sm">Não exigido</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {format(new Date(user.updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    {canEditUser(user) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(user)}>
                            <Edit className="w-4 h-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onRequirePasswordChange(user)}>
                            <Key className="w-4 h-4 mr-2" />
                            Exigir troca de senha
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onToggleActive(user)}>
                            {user.is_active ? (
                              <>
                                <Ban className="w-4 h-4 mr-2" />
                                Desativar
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Ativar
                              </>
                            )}
                          </DropdownMenuItem>
                          {canDeleteUser(user) && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => onDelete(user)}
                                className="text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
