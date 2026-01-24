import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Search,
  User,
  Users,
  Eye,
  AlertCircle,
  Clock,
  StickyNote,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useSupportUsersList, useSupportErrors } from "@/hooks/useSupportModule";
import { SupportUserViewSheet } from "./SupportUserViewSheet";

export function SupportUsersPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [selectedUser, setSelectedUser] = useState<{
    userId: string;
    familyId: string;
    displayName: string;
  } | null>(null);
  const pageSize = 20;

  const { data: usersData, isLoading } = useSupportUsersList(page, pageSize, search);
  const users = usersData?.users ?? [];
  const total = usersData?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  // Get recent errors for all users to show indicators
  const { data: errorsData } = useSupportErrors({ status: "new" }, 0, 100);
  const recentErrors = errorsData?.errors ?? [];

  const getUserErrorCount = (familyId: string) => {
    return recentErrors.filter(e => e.family_id === familyId).length;
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(0);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Usuários Ativos</h2>
        <p className="text-muted-foreground">Visualize e acesse contas de usuários para suporte</p>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Users className="w-8 h-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total de Usuários</p>
                <p className="text-2xl font-bold">{total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-8 h-8 text-destructive" />
              <div>
                <p className="text-sm text-muted-foreground">Com Erros Recentes</p>
                <p className="text-2xl font-bold">
                  {users.filter(u => getUserErrorCount(u.family_id) > 0).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Novos Hoje</p>
                <p className="text-2xl font-bold">
                  {users.filter(u => {
                    const today = new Date().toDateString();
                    return new Date(u.created_at).toDateString() === today;
                  }).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Lista de Usuários</CardTitle>
            <Badge variant="secondary">{total} usuários</Badge>
          </div>
          <CardDescription>
            Clique em um usuário para iniciar acesso assistido
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum usuário encontrado</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {users.map((user) => {
                  const errorCount = getUserErrorCount(user.family_id);
                  return (
                    <div
                      key={user.id}
                      className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                      onClick={() => setSelectedUser({
                        userId: user.user_id,
                        familyId: user.family_id,
                        displayName: user.display_name,
                      })}
                    >
                      <Avatar>
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback>
                          {user.display_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{user.display_name}</p>
                          {errorCount > 0 && (
                            <Badge variant="destructive" className="text-xs">
                              {errorCount} erro{errorCount > 1 ? "s" : ""}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <span>Família: {user.families.name}</span>
                          <span>•</span>
                          <span>
                            Criado: {format(new Date(user.created_at), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" className="gap-2">
                          <Eye className="w-4 h-4" />
                          Visualizar
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Página {page + 1} de {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => p + 1)}
                    disabled={page >= totalPages - 1}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* User View Sheet */}
      <SupportUserViewSheet
        user={selectedUser}
        onClose={() => setSelectedUser(null)}
      />
    </div>
  );
}
