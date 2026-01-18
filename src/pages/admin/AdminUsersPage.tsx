import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Users, 
  Search, 
  Eye, 
  Shield, 
  UserCog,
  Loader2,
  ChevronRight
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
import { supabase } from "@/integrations/supabase/client";
import { useAssignRole, useRemoveRole, AppRole } from "@/hooks/useUserRole";
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
  }[];
}

export function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [selectedFamily, setSelectedFamily] = useState<FamilyWithMembers | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

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
            cpf
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

  const handleViewDetails = (family: FamilyWithMembers) => {
    setSelectedFamily(family);
    setDetailsOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Usuários</h2>
        <p className="text-muted-foreground">Gerencie usuários e famílias do sistema</p>
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

      {/* Users Table */}
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

              {/* Members */}
              <div className="space-y-2">
                <h4 className="font-medium">Membros</h4>
                <div className="space-y-2">
                  {selectedFamily.family_members.map((member) => (
                    <MemberCard key={member.id} member={member} />
                  ))}
                </div>
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
    </div>
  );
}

function MemberCard({ member }: { member: FamilyWithMembers['family_members'][0] }) {
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
    <div className="bg-muted/50 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">{member.display_name}</p>
          <p className="text-xs text-muted-foreground capitalize">
            {member.role === 'owner' ? 'Dono' : 'Membro'} da família
          </p>
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
