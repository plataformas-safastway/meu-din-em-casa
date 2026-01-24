import { useState } from "react";
import { 
  Search,
  Shield,
  Clock,
  User,
  FileText,
  Loader2,
  AlertCircle
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useFinancialAuditLogs } from "@/hooks/useFinancialModule";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  'SUBSCRIPTION_STATUS_CHANGED': { label: "Status Alterado", color: "bg-blue-500/10 text-blue-500" },
  'PAYMENT_RETRY': { label: "Cobrança Reprocessada", color: "bg-yellow-500/10 text-yellow-500" },
  'INVOICE_CREATED': { label: "NF Criada", color: "bg-green-500/10 text-green-500" },
  'INVOICE_EMITTED': { label: "NF Emitida", color: "bg-emerald-500/10 text-emerald-500" },
  'INVOICE_CANCELLED': { label: "NF Cancelada", color: "bg-red-500/10 text-red-500" },
};

export function FinancialAuditPage() {
  const [search, setSearch] = useState("");
  const { data: logs, isLoading } = useFinancialAuditLogs(100);

  const filteredLogs = (logs || []).filter(log => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      log.action?.toLowerCase().includes(searchLower) ||
      log.entity_type?.toLowerCase().includes(searchLower)
    );
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Logs de Auditoria</h2>
        <p className="text-muted-foreground">Histórico de ações no módulo financeiro</p>
      </div>

      {/* Security Notice */}
      <Card className="border-green-500/20 bg-green-500/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-green-500 mt-0.5" />
            <div>
              <p className="font-medium text-green-600">Registro de Auditoria Ativo</p>
              <p className="text-sm text-muted-foreground">
                Todas as ações críticas são registradas automaticamente. 
                Dados sensíveis são mascarados conforme LGPD.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por ação ou entidade..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Ações</CardTitle>
          <CardDescription>
            {filteredLogs.length} registro(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            {filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mb-4 opacity-50" />
                <p>Nenhum log encontrado</p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredLogs.map((log) => {
                  const actionConfig = ACTION_LABELS[log.action] || { 
                    label: log.action, 
                    color: "bg-gray-500/10 text-gray-500" 
                  };
                  
                  return (
                    <div key={log.id} className="p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary" className={actionConfig.color}>
                              {actionConfig.label}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {log.entity_type}
                            </span>
                          </div>
                          
                          {log.new_value && (
                            <div className="text-sm text-muted-foreground">
                              {typeof log.new_value === 'object' 
                                ? Object.entries(log.new_value as Record<string, unknown>)
                                    .filter(([key]) => !['password', 'token', 'secret'].some(s => key.toLowerCase().includes(s)))
                                    .map(([key, value]) => (
                                      <span key={key} className="mr-3">
                                        <span className="font-medium">{key}:</span>{' '}
                                        {String(value)}
                                      </span>
                                    ))
                                : String(log.new_value)
                              }
                            </div>
                          )}
                          
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                            </span>
                            {log.user_id && (
                              <span className="flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {log.user_id.slice(0, 8)}...
                              </span>
                            )}
                            {log.ip_address && (
                              <span>IP: {log.ip_address}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Access Info */}
      <Card className="border-muted">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <p className="font-medium">Acesso Restrito</p>
              <p className="text-sm text-muted-foreground">
                Este log é acessível apenas para perfis ADMIN_MASTER e TECNOLOGIA.
                Os registros são imutáveis e não podem ser editados ou excluídos.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
