import { useState } from "react";
import { ClipboardList, ChevronLeft, ChevronRight, User, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCSAuditLogs } from "@/hooks/useCSModule";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  status_change: { label: "Alteração de Status", color: "bg-blue-100 text-blue-800" },
  action_contact_made: { label: "Contato Realizado", color: "bg-green-100 text-green-800" },
  action_guidance_sent: { label: "Orientação Enviada", color: "bg-purple-100 text-purple-800" },
  action_material_shared: { label: "Material Compartilhado", color: "bg-indigo-100 text-indigo-800" },
  action_campaign_added: { label: "Campanha", color: "bg-pink-100 text-pink-800" },
  action_note_added: { label: "Nota Adicionada", color: "bg-gray-100 text-gray-800" },
  action_nudge_sent: { label: "Nudge Enviado", color: "bg-amber-100 text-amber-800" },
  action_followup_scheduled: { label: "Follow-up Agendado", color: "bg-teal-100 text-teal-800" },
  view_user: { label: "Visualização de Usuário", color: "bg-gray-100 text-gray-600" },
  module_access: { label: "Acesso ao Módulo", color: "bg-gray-100 text-gray-600" },
};

export function CSAuditPage() {
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const { data, isLoading } = useCSAuditLogs({}, page, pageSize);

  const totalPages = Math.ceil((data?.total || 0) / pageSize);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Auditoria CS</h2>
        <p className="text-muted-foreground">
          Registro imutável de todas as ações do Customer Success
        </p>
      </div>

      {/* Info Card */}
      <Card className="bg-amber-50 border-amber-200">
        <CardContent className="p-4">
          <p className="text-sm text-amber-800">
            <strong>Conformidade LGPD:</strong> Este log é imutável e não pode ser editado ou excluído. 
            Todas as ações de visualização, edição e acompanhamento de usuários são registradas automaticamente.
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
                <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-6 w-24" />
                </div>
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

                return (
                  <div
                    key={log.id}
                    className="flex items-center gap-4 p-4 border rounded-lg"
                  >
                    {/* User Icon */}
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <User className="w-5 h-5 text-muted-foreground" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={actionConfig.color}>
                          {actionConfig.label}
                        </Badge>
                      </div>
                      
                      {log.target_family_id && (
                        <p className="text-sm text-muted-foreground">
                          Família: {log.target_family_id.substring(0, 8)}...
                        </p>
                      )}
                      
                      {log.details && Object.keys(log.details).length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {JSON.stringify(log.details).substring(0, 100)}...
                        </p>
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
