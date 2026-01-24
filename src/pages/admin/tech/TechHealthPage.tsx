import { Activity, AlertTriangle, CheckCircle, Clock, Server, Zap, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useSystemHealth, useIntegrations, useTechLogs, getStatusColor } from "@/hooks/useTechModule";

export function TechHealthPage() {
  const { data: health, isLoading: healthLoading } = useSystemHealth();
  const { data: integrations, isLoading: integrationsLoading } = useIntegrations();
  const { data: logsData, isLoading: logsLoading } = useTechLogs({ level: 'error' }, 0, 5);

  const statusIcon = {
    ok: <CheckCircle className="w-8 h-8 text-green-500" />,
    warning: <AlertTriangle className="w-8 h-8 text-yellow-500" />,
    incident: <AlertTriangle className="w-8 h-8 text-red-500" />,
  };

  const statusLabel = {
    ok: 'Sistema Operacional',
    warning: 'Atenção Necessária',
    incident: 'Incidente em Andamento',
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Saúde do Sistema</h2>
        <p className="text-muted-foreground">Monitoramento em tempo real da infraestrutura</p>
      </div>

      {/* Main Status Card */}
      <Card className={`border-2 ${health?.status === 'ok' ? 'border-green-200' : health?.status === 'warning' ? 'border-yellow-200' : 'border-red-200'}`}>
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            {healthLoading ? (
              <Skeleton className="w-16 h-16 rounded-full" />
            ) : (
              <div className={`p-4 rounded-full ${health?.status === 'ok' ? 'bg-green-100' : health?.status === 'warning' ? 'bg-yellow-100' : 'bg-red-100'}`}>
                {statusIcon[health?.status || 'ok']}
              </div>
            )}
            <div className="flex-1">
              {healthLoading ? (
                <Skeleton className="h-8 w-48" />
              ) : (
                <>
                  <h3 className="text-2xl font-bold">{statusLabel[health?.status || 'ok']}</h3>
                  <p className="text-muted-foreground">
                    {health?.message || 'Todos os sistemas funcionando normalmente'}
                  </p>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-50">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Uptime</p>
                {healthLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-2xl font-bold">{health?.uptime_percentage?.toFixed(2)}%</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-50">
                <Zap className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tempo Médio</p>
                {healthLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-2xl font-bold">{health?.avg_response_ms || 0}ms</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-orange-50">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Erros (1h)</p>
                {healthLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-2xl font-bold">{health?.errors_last_hour || 0}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-red-50">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Erros (24h)</p>
                {healthLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-2xl font-bold">{health?.errors_last_24h || 0}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Integrations Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="w-5 h-5" />
            Status das Integrações
          </CardTitle>
          <CardDescription>Saúde das conexões externas</CardDescription>
        </CardHeader>
        <CardContent>
          {integrationsLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {integrations?.map((integration) => (
                <div
                  key={integration.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="flex items-center gap-3">
                    {integration.is_critical && (
                      <div className="w-2 h-2 rounded-full bg-red-500" title="Crítico" />
                    )}
                    <div>
                      <p className="font-medium">{integration.display_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {integration.success_rate?.toFixed(1)}% sucesso
                      </p>
                    </div>
                  </div>
                  <Badge className={getStatusColor(integration.status)}>
                    {integration.status === 'active' ? 'Ativo' :
                     integration.status === 'unstable' ? 'Instável' :
                     integration.status === 'inactive' ? 'Inativo' : 'Manutenção'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Errors */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Erros Recentes
          </CardTitle>
          <CardDescription>Últimos 5 erros registrados</CardDescription>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : logsData?.logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500 opacity-50" />
              <p>Nenhum erro recente</p>
            </div>
          ) : (
            <div className="space-y-2">
              {logsData?.logs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <div className="p-2 rounded bg-red-100">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{log.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {log.service} • {log.origin} • {new Date(log.created_at).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
