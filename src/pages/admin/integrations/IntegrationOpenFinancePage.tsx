import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useIntegrationConfig,
  useTestIntegrationConnection,
  useToggleIntegration,
  useUpdateIntegrationConfig,
} from "@/hooks/useIntegrationsConfig";
import {
  IntegrationStatusCard,
  IntegrationConfigForm,
  IntegrationMetricsCard,
  IntegrationLogsCard,
  IntegrationAboutCard,
  type ConfigField,
} from "@/components/integrations";

const OPEN_FINANCE_CONFIG_FIELDS: ConfigField[] = [
  {
    key: 'pluggy_client_id',
    label: 'Pluggy Client ID',
    type: 'text',
    placeholder: 'Ex: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    required: true,
    helperText: 'Obtido no painel da Pluggy',
  },
  {
    key: 'pluggy_client_secret',
    label: 'Pluggy Client Secret',
    type: 'secret',
    placeholder: 'Insira o secret',
    required: true,
    helperText: 'Mantido em segurança. Após salvar, não será exibido.',
  },
  {
    key: 'webhook_url',
    label: 'URL de Webhook',
    type: 'url',
    placeholder: 'https://...',
    helperText: 'URL para receber eventos da Pluggy (opcional)',
  },
];

const OPEN_FINANCE_METRICS = [
  { key: 'active_accounts', label: 'Contas ativas conectadas' },
  { key: 'queries_total', label: 'Consultas realizadas' },
  { key: 'sync_success', label: 'Sincronizações OK' },
  { key: 'sync_failures', label: 'Falhas de sincronização' },
];

export function IntegrationOpenFinancePage() {
  const { toast } = useToast();
  const { data: config, isLoading } = useIntegrationConfig('OPEN_FINANCE');
  const testConnection = useTestIntegrationConnection();
  const toggleIntegration = useToggleIntegration();
  const updateConfig = useUpdateIntegrationConfig();

  const handleTestConnection = async () => {
    const result = await testConnection.mutateAsync('OPEN_FINANCE');
    toast({
      title: result.success ? "Conexão bem-sucedida" : "Falha na conexão",
      description: result.errorMessage || "A integração está funcionando corretamente",
      variant: result.success ? "default" : "destructive",
    });
  };

  const handleToggle = async (enabled: boolean) => {
    await toggleIntegration.mutateAsync({ provider: 'OPEN_FINANCE', enabled });
    toast({
      title: enabled ? "Integração ativada" : "Integração desativada",
    });
  };

  const handleSaveConfig = async (newConfig: Record<string, unknown>) => {
    await updateConfig.mutateAsync({
      provider: 'OPEN_FINANCE',
      config: newConfig,
    });
    toast({ title: "Configuração salva com sucesso" });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Open Finance</h2>
        <p className="text-muted-foreground">
          Conexão com bancos via Pluggy para importação automática de extratos
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Card */}
        <IntegrationStatusCard
          config={config}
          providerName="Open Finance (Pluggy)"
          description="Integração com Open Banking para sincronização de contas"
          onTestConnection={handleTestConnection}
          onToggle={handleToggle}
          isTestingConnection={testConnection.isPending}
          isToggling={toggleIntegration.isPending}
        />

        {/* Config Form */}
        <IntegrationConfigForm
          fields={OPEN_FINANCE_CONFIG_FIELDS}
          currentConfig={(config?.config as Record<string, unknown>) || {}}
          onSave={handleSaveConfig}
          isSaving={updateConfig.isPending}
        />
      </div>

      {/* Metrics */}
      <IntegrationMetricsCard
        provider="OPEN_FINANCE"
        metricDefinitions={OPEN_FINANCE_METRICS}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Logs */}
        <IntegrationLogsCard provider="OPEN_FINANCE" />

        {/* About */}
        <IntegrationAboutCard
          title="Open Finance (Pluggy)"
          description="A integração com Open Finance permite que os usuários conectem suas contas bancárias para importação automática de extratos e transações."
          features={[
            "Conexão segura com mais de 100 instituições financeiras",
            "Importação automática de transações",
            "Sincronização de saldos em tempo real",
            "Categorização inteligente de gastos",
          ]}
          limitations={[
            "Requer consentimento do usuário para cada instituição",
            "Algumas instituições podem ter limitações de API",
            "Dados são atualizados conforme disponibilidade do banco",
          ]}
          helpArticleId="integracoes-open-finance"
          externalDocsUrl="https://docs.pluggy.ai/"
        />
      </div>
    </div>
  );
}
