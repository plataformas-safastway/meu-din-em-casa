import { useState } from "react";
import { Search, Filter, ChevronLeft, ChevronRight, Users, AlertTriangle, UserCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useCSUsersList, CSStatus, calculateEngagementScore, getScoreLabel } from "@/hooks/useCSModule";
import { CSUserDetailSheet } from "./CSUserDetailSheet";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_CONFIG: Record<CSStatus | 'all', { label: string; color: string; icon?: typeof AlertTriangle }> = {
  all: { label: "Todos", color: "bg-gray-100 text-gray-800" },
  active: { label: "Ativo", color: "bg-green-100 text-green-800", icon: UserCheck },
  onboarding: { label: "Em Ativação", color: "bg-purple-100 text-purple-800" },
  at_risk: { label: "Risco de Churn", color: "bg-orange-100 text-orange-800", icon: AlertTriangle },
  inactive: { label: "Inativo", color: "bg-gray-100 text-gray-800" },
  churned: { label: "Churned", color: "bg-red-100 text-red-800" },
};

export function CSUsersListPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CSStatus | 'all'>('all');
  const [sortBy, setSortBy] = useState<'score' | 'last_login' | 'created_at'>('score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(0);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);

  const pageSize = 20;

  const { data, isLoading } = useCSUsersList(
    {
      status: statusFilter === 'all' ? undefined : statusFilter,
      search: search || undefined,
      sortBy,
      sortOrder,
    },
    page,
    pageSize
  );

  const totalPages = Math.ceil((data?.total || 0) / pageSize);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Base de Usuários</h2>
        <p className="text-muted-foreground">Gerencie e acompanhe os usuários da plataforma</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                className="pl-10"
              />
            </div>
            
            <Select 
              value={statusFilter} 
              onValueChange={(v) => {
                setStatusFilter(v as CSStatus | 'all');
                setPage(0);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select 
              value={sortBy} 
              onValueChange={(v) => setSortBy(v as 'score' | 'last_login' | 'created_at')}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="score">Score de Engajamento</SelectItem>
                <SelectItem value="last_login">Último Acesso</SelectItem>
                <SelectItem value="created_at">Data de Cadastro</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Usuários ({data?.total || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                  <Skeleton className="w-12 h-12 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          ) : data?.users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum usuário encontrado</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data?.users.map((user) => {
                const scoreData = calculateEngagementScore(user.metrics || null);
                const scoreLabel = getScoreLabel(scoreData.score);
                const statusConfig = STATUS_CONFIG[user.status?.status || 'active'];

                return (
                  <div
                    key={user.family_id}
                    className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => setSelectedFamilyId(user.family_id)}
                  >
                    {/* Avatar placeholder */}
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-lg font-semibold text-primary">
                        {user.owner_name.charAt(0).toUpperCase()}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{user.owner_name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {user.family_name} • {user.members_count} membro(s)
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Desde {format(new Date(user.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>

                    {/* Score */}
                    <div className="text-center">
                      <p className={`text-xl font-bold ${scoreLabel.color}`}>
                        {scoreData.score}
                      </p>
                      <p className="text-xs text-muted-foreground">{scoreLabel.label}</p>
                    </div>

                    {/* Status Badge */}
                    <Badge className={statusConfig.color}>
                      {statusConfig.label}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Página {page + 1} de {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Detail Sheet */}
      <CSUserDetailSheet
        familyId={selectedFamilyId}
        onClose={() => setSelectedFamilyId(null)}
      />
    </div>
  );
}
