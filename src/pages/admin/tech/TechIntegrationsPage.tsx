import { useState } from "react";
import { Server, CheckCircle, AlertTriangle, XCircle, Wrench, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useIntegrations, useUpdateIntegrationStatus, IntegrationStatus, getStatusColor } from "@/hooks/useTechModule";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_OPTIONS: { value: IntegrationStatus; label: string }[] = [
  { value: 'active', label: 'Ativo' },
  { value: 'unstable', label: 'Instável' },
  { value: 'inactive', label: 'Inativo' },
  { value: 'maintenance', label: 'Manutenção' },
];

const STATUS_ICONS = {
  active: CheckCircle,
  unstable: AlertTriangle,
  inactive: XCircle,
  maintenance: Wrench,
};

export function TechIntegrationsPage() {
  const { toast } = useToast();
  const { data: integrations, isLoading, refetch } = useIntegrations();
  const updateStatus = useUpdateIntegrationStatus();
  const [pendingUpdate, setPendingUpdate] = useState<{ id: string; status: IntegrationStatus } | null>(null);

  const handleStatusChange = async () => {
    if (!pendingUpdate) return;

    try {
      await updateStatus.mutateAsync(pendingUpdate);
      toast({ title: "Status atualizado com sucesso" });
    } catch (error) {
      toast({ title: "Erro ao atualizar status", variant: "destructive" });
    } finally {
      setPendingUpdate(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Integrações</h2>
          <p className="text-muted-foreground">Gerencie conexões com serviços externos</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Integrations Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {integrations?.map((integration) => {
            const StatusIcon = STATUS_ICONS[integration.status];
            return (
              <Card key={integration.id} className={integration.is_critical ? 'border-red-200' : ''}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Server className="w-5 h-5 text-muted-foreground" />
                      <CardTitle className="text-lg">{integration.display_name}</CardTitle>
                      {integration.is_critical && (
                        <Badge variant="destructive" className="text-xs">Crítico</Badge>
                      )}
                    </div>
                    <Badge className={getStatusColor(integration.status)}>
                      <StatusIcon className="w-3 h-3 mr-1" />
                      {STATUS_OPTIONS.find(s => s.value === integration.status)?.label}
                    </Badge>
                  </div>
                  <CardDescription>{integration.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="p-2 rounded bg-muted/50">
                      <p className="text-lg font-bold">{integration.success_rate?.toFixed(1)}%</p>
                      <p className="text-xs text-muted-foreground">Sucesso</p>
                    </div>
                    <div className="p-2 rounded bg-muted/50">
                      <p className="text-lg font-bold">{integration.total_calls}</p>
                      <p className="text-xs text-muted-foreground">Chamadas</p>
                    </div>
                    <div className="p-2 rounded bg-muted/50">
                      <p className="text-lg font-bold">{integration.failed_calls}</p>
                      <p className="text-xs text-muted-foreground">Falhas</p>
                    </div>
                  </div>

                  {/* Last Events */}
                  <div className="text-xs text-muted-foreground space-y-1">
                    {integration.last_success_at && (
                      <p>
                        ✓ Último sucesso: {format(new Date(integration.last_success_at), "dd/MM HH:mm", { locale: ptBR })}
                      </p>
                    )}
                    {integration.last_failure_at && (
                      <p className="text-red-600">
                        ✗ Última falha: {format(new Date(integration.last_failure_at), "dd/MM HH:mm", { locale: ptBR })}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Select
                      value={integration.status}
                      onValueChange={(v) => setPendingUpdate({ id: integration.id, status: v as IntegrationStatus })}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={!!pendingUpdate} onOpenChange={(open) => !open && setPendingUpdate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar alteração de status</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a alterar o status da integração. Esta ação será registrada no log de auditoria.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleStatusChange}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
