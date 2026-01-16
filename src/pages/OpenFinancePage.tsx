import { useState } from "react";
import { ArrowLeft, Plus, RefreshCw, Settings, Wifi, WifiOff, AlertCircle, CheckCircle, Clock, Building2, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useOpenFinanceConnections, usePluggyConfig, useSyncConnection, useDisconnectConnection } from "@/hooks/useOpenFinance";
import { ConnectInstitutionSheet } from "@/components/openfinance/ConnectInstitutionSheet";
import { ConnectionDetailsSheet } from "@/components/openfinance/ConnectionDetailsSheet";
import { PluggyConfigSheet } from "@/components/openfinance/PluggyConfigSheet";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface OpenFinancePageProps {
  onBack: () => void;
}

const statusConfig = {
  PENDING: { label: "Pendente", color: "bg-yellow-500", icon: Clock },
  ACTIVE: { label: "Conectado", color: "bg-green-500", icon: CheckCircle },
  NEEDS_RECONNECT: { label: "Reconectar", color: "bg-orange-500", icon: AlertCircle },
  EXPIRED: { label: "Expirado", color: "bg-red-500", icon: WifiOff },
  DISCONNECTED: { label: "Desconectado", color: "bg-gray-500", icon: WifiOff },
  ERROR: { label: "Erro", color: "bg-red-500", icon: AlertCircle },
};

export function OpenFinancePage({ onBack }: OpenFinancePageProps) {
  const [showConnectSheet, setShowConnectSheet] = useState(false);
  const [showConfigSheet, setShowConfigSheet] = useState(false);
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  
  const { data: config, isLoading: configLoading } = usePluggyConfig();
  const { data: connections, isLoading: connectionsLoading } = useOpenFinanceConnections();
  const syncMutation = useSyncConnection();
  const disconnectMutation = useDisconnectConnection();

  const isConfigured = config?.configured ?? false;
  const activeConnections = connections?.filter(c => c.status === 'ACTIVE') || [];
  const otherConnections = connections?.filter(c => c.status !== 'ACTIVE') || [];

  const handleSync = (connectionId: string) => {
    syncMutation.mutate(connectionId);
  };

  const handleConnect = () => {
    if (!isConfigured) {
      setShowConfigSheet(true);
    } else {
      setShowConnectSheet(true);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="container px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={onBack}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-lg font-semibold">Open Finance</h1>
                <p className="text-sm text-muted-foreground">
                  Conecte seus bancos e cartões
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setShowConfigSheet(true)}>
              <Settings className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container px-4 py-4 space-y-6">
        {/* Config Status */}
        {!configLoading && !isConfigured && (
          <div className="p-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/30">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-medium text-yellow-500">Configuração Necessária</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Configure as credenciais do Pluggy para conectar suas contas bancárias.
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3 border-yellow-500/50 text-yellow-600 hover:bg-yellow-500/10"
                  onClick={() => setShowConfigSheet(true)}
                >
                  Configurar Pluggy
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 rounded-2xl bg-card border border-border/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <Wifi className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeConnections.length}</p>
                <p className="text-sm text-muted-foreground">Conexões ativas</p>
              </div>
            </div>
          </div>
          <div className="p-4 rounded-2xl bg-card border border-border/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{connections?.length || 0}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </div>
        </div>

        {/* Add Connection Button */}
        <Button 
          className="w-full gap-2" 
          onClick={handleConnect}
          disabled={configLoading}
        >
          <Plus className="w-4 h-4" />
          Conectar Banco ou Cartão
        </Button>

        {/* Connections List */}
        {connectionsLoading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : connections && connections.length > 0 ? (
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="active">
                Ativas ({activeConnections.length})
              </TabsTrigger>
              <TabsTrigger value="other">
                Outras ({otherConnections.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-3 mt-4">
              {activeConnections.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma conexão ativa
                </div>
              ) : (
                activeConnections.map((connection) => (
                  <ConnectionCard
                    key={connection.id}
                    connection={connection}
                    onSync={() => handleSync(connection.id)}
                    onDetails={() => setSelectedConnectionId(connection.id)}
                    isSyncing={syncMutation.isPending}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="other" className="space-y-3 mt-4">
              {otherConnections.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma outra conexão
                </div>
              ) : (
                otherConnections.map((connection) => (
                  <ConnectionCard
                    key={connection.id}
                    connection={connection}
                    onSync={() => handleSync(connection.id)}
                    onDetails={() => setSelectedConnectionId(connection.id)}
                    isSyncing={syncMutation.isPending}
                  />
                ))
              )}
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-medium text-foreground mb-2">Nenhuma conexão</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Conecte seus bancos para sincronizar transações automaticamente.
            </p>
          </div>
        )}

        {/* Info Section */}
        <div className="p-4 rounded-2xl bg-muted/30 border border-border/30 space-y-3">
          <h3 className="font-medium text-sm">Sobre Open Finance</h3>
          <ul className="text-sm text-muted-foreground space-y-2">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
              <span>Conexão somente leitura - não movimentamos seu dinheiro</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
              <span>Você pode desconectar quando quiser</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
              <span>Dados criptografados e protegidos pela LGPD</span>
            </li>
          </ul>
        </div>
      </main>

      {/* Sheets */}
      <ConnectInstitutionSheet
        open={showConnectSheet}
        onOpenChange={setShowConnectSheet}
      />

      <ConnectionDetailsSheet
        connectionId={selectedConnectionId}
        open={!!selectedConnectionId}
        onOpenChange={(open) => !open && setSelectedConnectionId(null)}
      />

      <PluggyConfigSheet
        open={showConfigSheet}
        onOpenChange={setShowConfigSheet}
      />
    </div>
  );
}

interface ConnectionCardProps {
  connection: {
    id: string;
    institution_name: string;
    institution_logo_url: string | null;
    status: keyof typeof statusConfig;
    last_sync_at: string | null;
    consent_expires_at: string | null;
  };
  onSync: () => void;
  onDetails: () => void;
  isSyncing: boolean;
}

function ConnectionCard({ connection, onSync, onDetails, isSyncing }: ConnectionCardProps) {
  const status = statusConfig[connection.status];
  const StatusIcon = status.icon;

  return (
    <div 
      className="p-4 rounded-2xl bg-card border border-border/30 hover:border-primary/30 transition-colors cursor-pointer"
      onClick={onDetails}
    >
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

        <div className="flex-1 min-w-0">
          <h3 className="font-medium truncate">{connection.institution_name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary" className={`${status.color} text-white text-xs`}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {status.label}
            </Badge>
            {connection.last_sync_at && (
              <span className="text-xs text-muted-foreground">
                Sync {formatDistanceToNow(new Date(connection.last_sync_at), { 
                  addSuffix: true, 
                  locale: ptBR 
                })}
              </span>
            )}
          </div>
        </div>

        {connection.status === 'ACTIVE' && (
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onSync();
            }}
            disabled={isSyncing}
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          </Button>
        )}
      </div>
    </div>
  );
}
