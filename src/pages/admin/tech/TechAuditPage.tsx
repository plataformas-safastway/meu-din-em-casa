import { useState } from "react";
import { ClipboardList, ChevronLeft, ChevronRight, User, Calendar, Database, Key, Flag, Server } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useTechAuditLogs } from "@/hooks/useTechModule";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const RESOURCE_ICONS: Record<string, typeof Database> = {
  integration: Server,
  api_key: Key,
  feature_flag: Flag,
  default: Database,
};

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  update_integration_status: { label: "Status Integração", color: "bg-blue-100 text-blue-800" },
  revoke_api_key: { label: "Chave Revogada", color: "bg-red-100 text-red-800" },
  toggle_feature_flag: { label: "Flag Alterada", color: "bg-purple-100 text-purple-800" },
  create_feature_flag: { label: "Flag Criada", color: "bg-green-100 text-green-800" },
  view_logs: { label: "Visualização Logs", color: "bg-gray-100 text-gray-600" },
  module_access: { label: "Acesso ao Módulo", color: "bg-gray-100 text-gray-600" },
};

export function TechAuditPage() {
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const { data, isLoading } = useTechAuditLogs(page, pageSize);
  const totalPages = Math.ceil((data?.total || 0) / pageSize);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Auditoria Técnica</h2>
        <p className="text-muted-foreground">
          Registro imutável de todas as ações no módulo de Tecnologia
        </p>
      </div>

      {/* Info Card */}
      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="p-4">
          <p className="text-sm text-amber-800">
            <strong>Conformidade LGPD:</strong> Este log é imutável e não pode ser editado ou excluído. 
            Todas as alterações em integrações, chaves de API e feature flags são registradas automaticamente.
          </p>
        </CardContent>
      </Card>

      {/* Audit Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />
            Logs de Auditoria ({data?.total || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : data?.logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum log de auditoria encontrado</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data?.logs.map((log) => {
                const actionConfig = ACTION_LABELS[log.action] || { 
                  label: log.action, 
                  color: "bg-gray-100 text-gray-800" 
                };
                const Icon = RESOURCE_ICONS[log.resource_type] || RESOURCE_ICONS.default;

                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-4 p-4 border rounded-lg"
                  >
                    {/* Icon */}
                    <div className="p-2 rounded bg-muted">
                      <Icon className="w-5 h-5 text-muted-foreground" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={actionConfig.color}>
                          {actionConfig.label}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {log.resource_type}
                        </Badge>
                      </div>
                      
                      {log.resource_id && (
                        <p className="text-sm text-muted-foreground font-mono">
                          ID: {log.resource_id.substring(0, 8)}...
                        </p>
                      )}

                      {/* Changes */}
                      {(log.old_value || log.new_value) && (
                        <div className="mt-2 text-xs space-y-1">
                          {log.old_value && (
                            <p className="text-red-600">
                              − {JSON.stringify(log.old_value)}
                            </p>
                          )}
                          {log.new_value && (
                            <p className="text-green-600">
                              + {JSON.stringify(log.new_value)}
                            </p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Timestamp */}
                    <div className="text-right text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(log.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                      <div className="text-xs">
                        {format(new Date(log.created_at), "HH:mm:ss", { locale: ptBR })}
                      </div>
                    </div>
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
    </div>
  );
}
