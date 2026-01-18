import { useState } from "react";
import { 
  Building2, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  ExternalLink,
  Eye,
  EyeOff,
  RefreshCw,
  Settings,
  Wifi,
  Users,
  AlertCircle
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePluggyConfig } from "@/hooks/useOpenFinance";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient, useQuery } from "@tanstack/react-query";

export function AdminOpenFinancePage() {
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  
  const queryClient = useQueryClient();
  const { data: config, isLoading: configLoading } = usePluggyConfig();

  // Stats query - fetch all connections and accounts
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["admin-openfinance-stats"],
    queryFn: async () => {
      const [connectionsResult, accountsResult, cardsResult] = await Promise.all([
        supabase.from("openfinance_connections").select("id, status, family_id"),
        supabase.from("openfinance_accounts").select("id, is_active"),
        supabase.from("openfinance_cards").select("id, is_active"),
      ]);

      const connections = connectionsResult.data || [];
      const accounts = accountsResult.data || [];
      const cards = cardsResult.data || [];

      const activeConnections = connections.filter(c => c.status === 'ACTIVE').length;
      const uniqueFamilies = new Set(connections.map(c => c.family_id)).size;

      return {
        totalConnections: connections.length,
        activeConnections,
        totalAccounts: accounts.length,
        activeAccounts: accounts.filter(a => a.is_active).length,
        totalCards: cards.length,
        activeCards: cards.filter(c => c.is_active).length,
        familiesUsing: uniqueFamilies,
      };
    },
  });

  const handleSave = async () => {
    if (!clientId.trim() || !clientSecret.trim()) {
      toast.error("Preencha todos os campos");
      return;
    }

    setIsSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("pluggy-save-config", {
        body: { clientId, clientSecret },
      });

      if (error) throw error;

      toast.success("Credenciais do Pluggy validadas e salvas!");
      queryClient.invalidateQueries({ queryKey: ["pluggy-config"] });
      setClientId("");
      setClientSecret("");
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("pluggy-test-connection");
      
      if (error) throw error;
      
      if (data?.success) {
        toast.success("Conexão com Pluggy funcionando!");
      } else {
        toast.error("Falha no teste: " + (data?.error || "Erro desconhecido"));
      }
    } catch (error: any) {
      toast.error("Erro no teste: " + error.message);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Open Finance</h2>
        <p className="text-muted-foreground">Gerencie a integração com Pluggy para conexão bancária</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Status da API</p>
                <div className="flex items-center gap-2 mt-1">
                  {configLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : config?.configured ? (
                    <>
                      <Badge variant="secondary" className="bg-green-500 text-white">
                        Configurado
                      </Badge>
                    </>
                  ) : (
                    <Badge variant="destructive">Não configurado</Badge>
                  )}
                </div>
              </div>
              <Settings className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Conexões Ativas</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? "—" : stats?.activeConnections || 0}
                </p>
              </div>
              <Wifi className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Contas Sincronizadas</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? "—" : stats?.activeAccounts || 0}
                </p>
              </div>
              <Building2 className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Famílias Usando</p>
                <p className="text-2xl font-bold">
                  {statsLoading ? "—" : stats?.familiesUsing || 0}
                </p>
              </div>
              <Users className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="config" className="w-full">
        <TabsList>
          <TabsTrigger value="config">Configuração</TabsTrigger>
          <TabsTrigger value="docs">Documentação</TabsTrigger>
        </TabsList>

        <TabsContent value="config" className="space-y-4">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Status da Integração
              </CardTitle>
              <CardDescription>
                Verifique se as credenciais do Pluggy estão configuradas corretamente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {configLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verificando configuração...
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    {config?.hasClientId ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                    <div>
                      <p className="font-medium">Client ID</p>
                      <p className="text-sm text-muted-foreground">
                        {config?.hasClientId ? "Configurado no ambiente" : "Não configurado"}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    {config?.hasClientSecret ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                    <div>
                      <p className="font-medium">Client Secret</p>
                      <p className="text-sm text-muted-foreground">
                        {config?.hasClientSecret ? "Configurado no ambiente" : "Não configurado"}
                      </p>
                    </div>
                  </div>

                  {config?.configured && (
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={handleTest}
                      disabled={isTesting}
                    >
                      {isTesting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Testando conexão...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Testar Conexão com Pluggy
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Config Form Card */}
          <Card>
            <CardHeader>
              <CardTitle>
                {config?.configured ? "Atualizar Credenciais" : "Configurar Credenciais"}
              </CardTitle>
              <CardDescription>
                {config?.configured 
                  ? "Atualize suas credenciais do Pluggy se necessário"
                  : "Insira suas credenciais do Pluggy para habilitar o Open Finance"
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!config?.configured && (
                <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex gap-3">
                  <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
                  <div>
                    <p className="font-medium text-yellow-600">Configuração necessária</p>
                    <p className="text-sm text-muted-foreground">
                      Para que os usuários possam conectar seus bancos, você precisa configurar as credenciais do Pluggy.
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="admin-clientId">Client ID</Label>
                  <Input
                    id="admin-clientId"
                    placeholder="Cole seu Pluggy Client ID"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin-clientSecret">Client Secret</Label>
                  <div className="relative">
                    <Input
                      id="admin-clientSecret"
                      type={showSecret ? "text" : "password"}
                      placeholder="Cole seu Pluggy Client Secret"
                      value={clientSecret}
                      onChange={(e) => setClientSecret(e.target.value)}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full"
                      onClick={() => setShowSecret(!showSecret)}
                    >
                      {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              <Button 
                className="w-full" 
                onClick={handleSave}
                disabled={isSaving || !clientId.trim() || !clientSecret.trim()}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Validando e Salvando...
                  </>
                ) : (
                  "Salvar Credenciais"
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                🔐 As credenciais são armazenadas de forma segura como variáveis de ambiente
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="docs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Como Configurar</CardTitle>
              <CardDescription>
                Passo a passo para configurar a integração com Pluggy
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                    1
                  </div>
                  <div>
                    <h4 className="font-medium">Crie uma conta no Pluggy</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Acesse o dashboard do Pluggy e crie uma conta para obter suas credenciais de API.
                    </p>
                    <a 
                      href="https://dashboard.pluggy.ai" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-2"
                    >
                      Acessar Dashboard Pluggy
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                    2
                  </div>
                  <div>
                    <h4 className="font-medium">Obtenha suas credenciais</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      No dashboard, acesse "API Keys" no menu lateral e copie o Client ID e Client Secret.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                    3
                  </div>
                  <div>
                    <h4 className="font-medium">Configure o Webhook (opcional)</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Para receber atualizações automáticas de conexões, configure o webhook URL no dashboard do Pluggy.
                    </p>
                    <code className="text-xs bg-muted px-2 py-1 rounded mt-2 block break-all">
                      {`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/pluggy-webhook`}
                    </code>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold shrink-0">
                    4
                  </div>
                  <div>
                    <h4 className="font-medium">Cole as credenciais acima</h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      Volte para a aba "Configuração" e cole seu Client ID e Client Secret. O sistema validará e salvará automaticamente.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Sobre o Pluggy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                O Pluggy é uma plataforma brasileira de Open Finance que permite conectar contas bancárias 
                e cartões de crédito de forma segura, seguindo as regulamentações do Banco Central.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-lg bg-muted/50">
                  <h5 className="font-medium mb-2">✅ Recursos Suportados</h5>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Saldo de contas</li>
                    <li>• Extrato de transações</li>
                    <li>• Faturas de cartão de crédito</li>
                    <li>• Sincronização automática</li>
                  </ul>
                </div>

                <div className="p-4 rounded-lg bg-muted/50">
                  <h5 className="font-medium mb-2">🔒 Segurança</h5>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Criptografia ponta-a-ponta</li>
                    <li>• Conformidade LGPD</li>
                    <li>• Somente leitura (não movimenta)</li>
                    <li>• Usuário pode desconectar a qualquer momento</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
