import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  useOpenFinanceConnections, 
  useOpenFinanceAccounts, 
  useOpenFinanceCards, 
  useOpenFinanceSyncLogs,
  useSyncConnection,
  useDisconnectConnection,
  useDeleteConnection,
  useToggleAccount,
  useToggleCard
} from "@/hooks/useOpenFinance";
import { 
  Building2, 
  CreditCard, 
  RefreshCw, 
  Trash2, 
  Unlink, 
  CheckCircle, 
  AlertCircle,
  Clock,
  Loader2,
  Wallet
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatCurrency } from "@/lib/formatters";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ConnectionDetailsSheetProps {
  connectionId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusConfig = {
  PENDING: { label: "Pendente", color: "bg-yellow-500" },
  ACTIVE: { label: "Conectado", color: "bg-green-500" },
  NEEDS_RECONNECT: { label: "Reconectar", color: "bg-orange-500" },
  EXPIRED: { label: "Expirado", color: "bg-red-500" },
  DISCONNECTED: { label: "Desconectado", color: "bg-gray-500" },
  ERROR: { label: "Erro", color: "bg-red-500" },
};

const syncStatusConfig = {
  STARTED: { label: "Em andamento", icon: Loader2, color: "text-blue-500" },
  COMPLETED: { label: "Concluída", icon: CheckCircle, color: "text-green-500" },
  FAILED: { label: "Falhou", icon: AlertCircle, color: "text-red-500" },
};

export function ConnectionDetailsSheet({ connectionId, open, onOpenChange }: ConnectionDetailsSheetProps) {
  const { data: connections } = useOpenFinanceConnections();
  const { data: accounts, isLoading: accountsLoading } = useOpenFinanceAccounts(connectionId || undefined);
  const { data: cards, isLoading: cardsLoading } = useOpenFinanceCards(connectionId || undefined);
  const { data: syncLogs, isLoading: logsLoading } = useOpenFinanceSyncLogs(connectionId || undefined);
  
  const syncMutation = useSyncConnection();
  const disconnectMutation = useDisconnectConnection();
  const deleteMutation = useDeleteConnection();
  const toggleAccountMutation = useToggleAccount();
  const toggleCardMutation = useToggleCard();

  const connection = connections?.find(c => c.id === connectionId);
  
  if (!connection) return null;

  const status = statusConfig[connection.status as keyof typeof statusConfig] || statusConfig.ERROR;

  const handleSync = () => {
    if (connectionId) {
      syncMutation.mutate(connectionId);
    }
  };

  const handleDisconnect = () => {
    if (connectionId) {
      disconnectMutation.mutate(connectionId);
      onOpenChange(false);
    }
  };

  const handleDelete = () => {
    if (connectionId) {
      deleteMutation.mutate(connectionId);
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl">
        <SheetHeader className="text-left pb-4">
          <div className="flex items-center gap-4">
            {connection.institution_logo_url ? (
              <img 
                src={connection.institution_logo_url} 
                alt={connection.institution_name}
                className="w-12 h-12 rounded-xl object-contain bg-white p-1"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
            )}
            <div className="flex-1">
              <SheetTitle>{connection.institution_name}</SheetTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={`${status.color} text-white text-xs`}>
                  {status.label}
                </Badge>
                {connection.last_sync_at && (
                  <span className="text-xs text-muted-foreground">
                    Última sync: {formatDistanceToNow(new Date(connection.last_sync_at), { 
                      addSuffix: true, 
                      locale: ptBR 
                    })}
                  </span>
                )}
              </div>
            </div>
          </div>
        </SheetHeader>

        {/* Action buttons */}
        <div className="flex gap-2 pb-4">
          <Button 
            variant="outline" 
            className="flex-1 gap-2"
            onClick={handleSync}
            disabled={syncMutation.isPending || connection.status !== 'ACTIVE'}
          >
            <RefreshCw className={`w-4 h-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            Sincronizar
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="icon">
                <Unlink className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Desconectar {connection.institution_name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  A conexão será desativada mas os dados já importados serão mantidos.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDisconnect}>Desconectar</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="icon" className="text-destructive hover:text-destructive">
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Remover conexão?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. Os dados associados serão removidos.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                  Remover
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <Tabs defaultValue="accounts" className="flex-1">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="accounts">
              Contas ({accounts?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="cards">
              Cartões ({cards?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="logs">
              Histórico
            </TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[calc(90vh-320px)] mt-4">
            <TabsContent value="accounts" className="space-y-3 m-0">
              {accountsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : accounts && accounts.length > 0 ? (
                accounts.map((account) => (
                  <div 
                    key={account.id}
                    className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border/30"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">
                        {account.nickname || account.account_type}
                      </h4>
                      <p className="text-sm text-muted-foreground capitalize">
                        {account.account_type}
                      </p>
                      {account.current_balance !== null && (
                        <p className="text-sm font-medium text-primary mt-1">
                          {formatCurrency(account.current_balance)}
                        </p>
                      )}
                    </div>
                    <Switch
                      checked={account.is_active}
                      onCheckedChange={(checked) => 
                        toggleAccountMutation.mutate({ accountId: account.id, isActive: checked })
                      }
                    />
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma conta encontrada
                </div>
              )}
            </TabsContent>

            <TabsContent value="cards" className="space-y-3 m-0">
              {cardsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : cards && cards.length > 0 ? (
                cards.map((card) => (
                  <div 
                    key={card.id}
                    className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border/30"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm truncate">
                        {card.display_name || card.brand || "Cartão"}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {card.last4 ? `•••• ${card.last4}` : card.brand}
                      </p>
                      {card.credit_limit !== null && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Limite: {formatCurrency(card.credit_limit)}
                        </p>
                      )}
                    </div>
                    <Switch
                      checked={card.is_active}
                      onCheckedChange={(checked) => 
                        toggleCardMutation.mutate({ cardId: card.id, isActive: checked })
                      }
                    />
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum cartão encontrado
                </div>
              )}
            </TabsContent>

            <TabsContent value="logs" className="space-y-3 m-0">
              {logsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : syncLogs && syncLogs.length > 0 ? (
                syncLogs.map((log) => {
                  const logStatus = syncStatusConfig[log.status as keyof typeof syncStatusConfig];
                  const StatusIcon = logStatus?.icon || Clock;
                  
                  return (
                    <div 
                      key={log.id}
                      className="flex items-start gap-4 p-4 rounded-xl bg-card border border-border/30"
                    >
                      <StatusIcon className={`w-5 h-5 mt-0.5 ${logStatus?.color || 'text-muted-foreground'} ${log.status === 'STARTED' ? 'animate-spin' : ''}`} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm">{logStatus?.label || log.status}</span>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(log.started_at), "dd/MM HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {log.sync_type === 'FULL' ? 'Sincronização completa' : 'Sincronização incremental'}
                        </p>
                        {log.status === 'COMPLETED' && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {log.transactions_imported} transações • {log.accounts_synced} contas • {log.cards_synced} cartões
                          </p>
                        )}
                        {log.error_message && (
                          <p className="text-xs text-destructive mt-1">{log.error_message}</p>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma sincronização realizada
                </div>
              )}
            </TabsContent>
          </ScrollArea>
        </Tabs>

        {/* Consent info */}
        {connection.consent_expires_at && (
          <div className="pt-4 border-t border-border/30 mt-4">
            <p className="text-xs text-muted-foreground text-center">
              Consentimento expira em {format(new Date(connection.consent_expires_at), "dd/MM/yyyy", { locale: ptBR })}
            </p>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
