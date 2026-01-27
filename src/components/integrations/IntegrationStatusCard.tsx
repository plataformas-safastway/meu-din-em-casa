import { CheckCircle, XCircle, AlertTriangle, Clock, RefreshCw, Power, PowerOff } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  type IntegrationConfig,
  type IntegrationStatus,
  getIntegrationStatusColor,
  getIntegrationStatusLabel,
} from "@/hooks/useIntegrationsConfig";

interface IntegrationStatusCardProps {
  config: IntegrationConfig | null;
  providerName: string;
  description: string;
  isLoading?: boolean;
  onTestConnection?: () => void;
  onToggle?: (enabled: boolean) => void;
  isTestingConnection?: boolean;
  isToggling?: boolean;
}

const STATUS_ICONS: Record<IntegrationStatus, React.ReactNode> = {
  ACTIVE: <CheckCircle className="w-5 h-5 text-green-600" />,
  INACTIVE: <PowerOff className="w-5 h-5 text-muted-foreground" />,
  PENDING: <Clock className="w-5 h-5 text-yellow-600" />,
  ERROR: <XCircle className="w-5 h-5 text-red-600" />,
};

export function IntegrationStatusCard({
  config,
  providerName,
  description,
  isLoading,
  onTestConnection,
  onToggle,
  isTestingConnection,
  isToggling,
}: IntegrationStatusCardProps) {
  const status = config?.status || 'PENDING';
  const isEnabled = config?.is_enabled ?? false;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {STATUS_ICONS[status]}
            <div>
              <CardTitle className="text-lg">{providerName}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
          <Badge className={getIntegrationStatusColor(status)}>
            {getIntegrationStatusLabel(status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Timestamps */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Última atualização</p>
            <p className="font-medium">
              {config?.updated_at
                ? format(new Date(config.updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                : "—"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Último teste</p>
            <p className="font-medium">
              {config?.last_test_at
                ? format(new Date(config.last_test_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                : "Nunca testado"}
            </p>
          </div>
        </div>

        {/* Error message */}
        {config?.error_message && status === 'ERROR' && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
              <p className="text-sm text-red-800 dark:text-red-200">
                {config.error_message}
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t">
          {onTestConnection && (
            <Button
              variant="outline"
              size="sm"
              onClick={onTestConnection}
              disabled={isTestingConnection || isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${isTestingConnection ? 'animate-spin' : ''}`} />
              Testar conexão
            </Button>
          )}
          {onToggle && (
            <Button
              variant={isEnabled ? "destructive" : "default"}
              size="sm"
              onClick={() => onToggle(!isEnabled)}
              disabled={isToggling || isLoading || status === 'PENDING'}
            >
              {isEnabled ? (
                <>
                  <PowerOff className="w-4 h-4 mr-2" />
                  Desativar
                </>
              ) : (
                <>
                  <Power className="w-4 h-4 mr-2" />
                  Ativar
                </>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
