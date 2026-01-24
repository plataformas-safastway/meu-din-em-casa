import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ClipboardList,
  Filter,
  Eye,
  AlertTriangle,
  User,
  Clock,
  ChevronLeft,
  ChevronRight,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSupportAuditLogs } from "@/hooks/useSupportModule";

const ACTION_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  access_module: { label: "Acesso ao Módulo", icon: <Shield className="w-3 h-3" />, color: "bg-blue-500/10 text-blue-700" },
  view_error: { label: "Visualizou Erro", icon: <Eye className="w-3 h-3" />, color: "bg-purple-500/10 text-purple-700" },
  update_error: { label: "Atualizou Erro", icon: <AlertTriangle className="w-3 h-3" />, color: "bg-orange-500/10 text-orange-700" },
  start_session: { label: "Iniciou Sessão", icon: <User className="w-3 h-3" />, color: "bg-green-500/10 text-green-700" },
  end_session: { label: "Encerrou Sessão", icon: <User className="w-3 h-3" />, color: "bg-gray-500/10 text-gray-700" },
  add_note: { label: "Adicionou Nota", icon: <ClipboardList className="w-3 h-3" />, color: "bg-cyan-500/10 text-cyan-700" },
  access_denied: { label: "Acesso Negado", icon: <Shield className="w-3 h-3" />, color: "bg-red-500/10 text-red-700" },
};

export function SupportAuditPage() {
  const [actionFilter, setActionFilter] = useState<string>("");
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const { data, isLoading } = useSupportAuditLogs(
    { action: actionFilter || undefined },
    page,
    pageSize
  );
  const logs = data?.logs ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Auditoria de Suporte</h2>
        <p className="text-muted-foreground">
          Histórico completo de ações no módulo de suporte
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            <CardTitle className="text-base">Filtros</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Select
              value={actionFilter || "all"}
              onValueChange={(v) => {
                setActionFilter(v === "all" ? "" : v);
                setPage(0);
              }}
            >
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Tipo de Ação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as ações</SelectItem>
                {Object.entries(ACTION_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <ClipboardList className="w-8 h-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total de Logs</p>
                <p className="text-2xl font-bold">{total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <User className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Sessões Iniciadas</p>
                <p className="text-2xl font-bold">
                  {logs.filter(l => l.action === "start_session").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-orange-500" />
              <div>
                <p className="text-sm text-muted-foreground">Erros Atualizados</p>
                <p className="text-2xl font-bold">
                  {logs.filter(l => l.action === "update_error").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Shield className="w-8 h-8 text-red-500" />
              <div>
                <p className="text-sm text-muted-foreground">Acessos Negados</p>
                <p className="text-2xl font-bold">
                  {logs.filter(l => l.action === "access_denied").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Logs Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Logs de Auditoria</CardTitle>
            <Badge variant="secondary">{total} registros</Badge>
          </div>
          <CardDescription>
            Registro imutável de todas as ações do módulo de suporte
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum log encontrado</p>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {logs.map((log) => {
                  const config = ACTION_CONFIG[log.action] || {
                    label: log.action,
                    icon: <Clock className="w-3 h-3" />,
                    color: "bg-gray-500/10 text-gray-700",
                  };

                  return (
                    <div
                      key={log.id}
                      className="flex items-center gap-4 p-3 rounded-lg border"
                    >
                      <div className={`p-2 rounded-lg ${config.color}`}>
                        {config.icon}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {config.label}
                          </Badge>
                          {log.target_family_id && (
                            <span className="text-xs text-muted-foreground">
                              Família: {log.target_family_id.substring(0, 8)}...
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                          <span>Usuário: {log.user_id.substring(0, 8)}...</span>
                          {log.details && Object.keys(log.details).length > 0 && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-xs">
                                {JSON.stringify(log.details).substring(0, 50)}...
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground whitespace-nowrap">
                        <Clock className="w-3 h-3 inline mr-1" />
                        {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
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
    </div>
  );
}
