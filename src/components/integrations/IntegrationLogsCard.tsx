import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Settings, 
  RefreshCw, 
  Power, 
  PowerOff, 
  CheckCircle, 
  XCircle,
  Mail,
  CreditCard,
  Building2,
  FileText,
  HardDrive,
  Cloud,
  Sparkles,
  MapPin,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { type IntegrationProvider, useIntegrationLogs } from "@/hooks/useIntegrationsConfig";

interface IntegrationLogsCardProps {
  provider: IntegrationProvider;
}

const EVENT_CONFIG: Record<string, { icon: React.ReactNode; label: string; color: string }> = {
  INTEGRATION_CONFIG_UPDATED: {
    icon: <Settings className="w-3 h-3" />,
    label: "Configuração atualizada",
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  },
  INTEGRATION_TEST_RUN: {
    icon: <RefreshCw className="w-3 h-3" />,
    label: "Teste de conexão",
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  },
  INTEGRATION_ENABLED: {
    icon: <Power className="w-3 h-3" />,
    label: "Integração ativada",
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  },
  INTEGRATION_DISABLED: {
    icon: <PowerOff className="w-3 h-3" />,
    label: "Integração desativada",
    color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
  },
};

const PROVIDER_ICONS: Record<IntegrationProvider, React.ReactNode> = {
  OPEN_FINANCE: <Building2 className="w-4 h-4" />,
  ACQUIRER: <CreditCard className="w-4 h-4" />,
  RESEND: <Mail className="w-4 h-4" />,
  ENOTAS: <FileText className="w-4 h-4" />,
  GOOGLE_DRIVE: <HardDrive className="w-4 h-4" />,
  ONEDRIVE: <Cloud className="w-4 h-4" />,
  LOVABLE_AI: <Sparkles className="w-4 h-4" />,
  OPENSTREETMAP: <MapPin className="w-4 h-4" />,
};

export function IntegrationLogsCard({ provider }: IntegrationLogsCardProps) {
  const { data: logs, isLoading } = useIntegrationLogs(provider);

  const filteredLogs = (logs || []).filter(log => {
    const metadata = log.metadata_safe as Record<string, unknown> | null;
    return metadata?.provider === provider;
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          {PROVIDER_ICONS[provider]}
          Histórico de Eventos
        </CardTitle>
        <CardDescription>Logs de alterações e testes (sem dados sensíveis)</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12" />
            ))}
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>Nenhum evento registrado</p>
          </div>
        ) : (
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {filteredLogs.map((log) => {
                const eventConfig = EVENT_CONFIG[log.event_type] || {
                  icon: <Settings className="w-3 h-3" />,
                  label: log.event_type,
                  color: "bg-gray-100 text-gray-800",
                };
                const metadata = log.metadata_safe as Record<string, unknown> | null;

                return (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-3">
                      <Badge className={`${eventConfig.color} gap-1`}>
                        {eventConfig.icon}
                        {eventConfig.label}
                      </Badge>
                      {metadata?.success !== undefined && (
                        metadata.success ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600" />
                        )
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(log.created_at), "dd/MM HH:mm", { locale: ptBR })}
                    </span>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
