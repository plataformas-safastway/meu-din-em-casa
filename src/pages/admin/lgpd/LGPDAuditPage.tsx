import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  ClipboardList, 
  User, 
  Calendar,
  Eye,
  FileText,
  Shield,
  Download,
  AlertTriangle,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDashboardAuditLogs } from "@/hooks/useDashboardAudit";

const eventTypeConfig: Record<string, { label: string; icon: typeof Eye; color: string }> = {
  FAMILY_PROFILE_VIEWED: { label: "Perfil Visualizado", icon: Eye, color: "text-blue-600" },
  REPORT_VIEWED: { label: "Relatório Visualizado", icon: FileText, color: "text-purple-600" },
  EXPORT_REQUESTED: { label: "Exportação Solicitada", icon: Download, color: "text-orange-600" },
  LGPD_REQUEST_VIEWED: { label: "LGPD Visualizada", icon: Shield, color: "text-green-600" },
  LGPD_REQUEST_UPDATED: { label: "LGPD Atualizada", icon: Shield, color: "text-green-600" },
  BREAKGLASS_REQUESTED: { label: "Break-glass Solicitado", icon: AlertTriangle, color: "text-amber-600" },
  BREAKGLASS_APPROVED: { label: "Break-glass Aprovado", icon: Shield, color: "text-green-600" },
  BREAKGLASS_DENIED: { label: "Break-glass Negado", icon: AlertTriangle, color: "text-red-600" },
  VAULT_VIEWED: { label: "Cofre Visualizado", icon: Eye, color: "text-primary" },
  EXPORT_CREATED: { label: "Exportação Criada", icon: Download, color: "text-blue-600" },
};

export function LGPDAuditPage() {
  const [filter, setFilter] = useState<string | undefined>(undefined);
  
  const { data: logs, isLoading } = useDashboardAuditLogs({ 
    eventType: filter,
    limit: 100 
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-primary" />
          Auditoria de Acessos
        </h2>
        <p className="text-muted-foreground">
          Rastreamento de todas as ações no módulo LGPD
        </p>
      </div>

      {/* Info */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-green-600 mt-0.5" />
            <div>
              <p className="font-medium text-green-800">Logs Pseudonimizados</p>
              <p className="text-sm text-green-700">
                Todos os identificadores (family_id, user_id, IP) são armazenados como hash SHA256 irreversível.
                Nenhum dado pessoal é exposto nos logs.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Tabs defaultValue="all" onValueChange={(v) => setFilter(v === "all" ? undefined : v)}>
        <TabsList className="grid grid-cols-4 w-full max-w-md">
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="LGPD">LGPD</TabsTrigger>
          <TabsTrigger value="BREAKGLASS">Break-glass</TabsTrigger>
          <TabsTrigger value="VAULT">Cofre</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Logs List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Eventos ({logs?.length ?? 0})
          </CardTitle>
          <CardDescription>
            Últimos 100 eventos registrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-3 border rounded-lg">
                  <Skeleton className="w-8 h-8 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : logs?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <ClipboardList className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum evento encontrado</p>
            </div>
          ) : (
            <div className="space-y-2">
              {logs?.map((log) => {
                const config = eventTypeConfig[log.event_type] || { 
                  label: log.event_type, 
                  icon: FileText, 
                  color: "text-muted-foreground" 
                };
                const EventIcon = config.icon;

                return (
                  <div
                    key={log.id}
                    className="flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className={`w-8 h-8 rounded-lg bg-muted flex items-center justify-center ${config.color}`}>
                      <EventIcon className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{config.label}</span>
                        <Badge variant="outline" className="text-xs">
                          {log.actor_role}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        {log.family_ref && (
                          <span className="font-mono">
                            family: {log.family_ref.substring(0, 12)}...
                          </span>
                        )}
                        {log.ip_ref && (
                          <span className="font-mono">
                            IP: {log.ip_ref}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(log.created_at), "dd/MM HH:mm", { locale: ptBR })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
