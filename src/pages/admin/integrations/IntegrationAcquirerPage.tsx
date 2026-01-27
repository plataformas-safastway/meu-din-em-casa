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

const ACQUIRER_CONFIG_FIELDS: ConfigField[] = [
  {
    key: 'provider_name',
    label: 'Nome do Provedor',
    type: 'text',
    placeholder: 'Ex: Stone, PagSeguro, Cielo',
    required: true,
    helperText: 'Nome do adquirente configurado',
  },
  {
    key: 'merchant_id',
    label: 'Merchant ID',
    type: 'text',
    placeholder: 'ID do lojista',
    required: true,
    helperText: 'Identificador único no adquirente',
  },
  {
    key: 'api_key',
    label: 'API Key',
    type: 'secret',
    placeholder: 'Chave de API',
    required: true,
    helperText: 'Chave de acesso à API do adquirente',
  },
];

const ACQUIRER_METRICS = [
  { key: 'transactions_total', label: 'Transações realizadas' },
  { key: 'transactions_approved', label: 'Aprovadas' },
  { key: 'transactions_declined', label: 'Recusadas' },
  { key: 'volume_total', label: 'Volume total (R$)', format: (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` },
];

export function IntegrationAcquirerPage() {
  const { toast } = useToast();
  const { data: config, isLoading } = useIntegrationConfig('ACQUIRER');
  const testConnection = useTestIntegrationConnection();
  const toggleIntegration = useToggleIntegration();
  const updateConfig = useUpdateIntegrationConfig();

  const handleTestConnection = async () => {
    const result = await testConnection.mutateAsync('ACQUIRER');
    toast({
      title: result.success ? "Conexão bem-sucedida" : "Falha na conexão",
      description: result.errorMessage || "A integração está funcionando corretamente",
      variant: result.success ? "default" : "destructive",
    });
  };

  const handleToggle = async (enabled: boolean) => {
    await toggleIntegration.mutateAsync({ provider: 'ACQUIRER', enabled });
    toast({
      title: enabled ? "Integração ativada" : "Integração desativada",
    });
  };

  const handleSaveConfig = async (newConfig: Record<string, unknown>) => {
    await updateConfig.mutateAsync({
      provider: 'ACQUIRER',
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
        <h2 className="text-2xl font-bold">Adquirentes</h2>
        <p className="text-muted-foreground">
          Integração com adquirentes de pagamento (Stone, PagSeguro, Cielo, etc.)
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Card */}
        <IntegrationStatusCard
          config={config}
          providerName="Adquirentes de Pagamento"
          description="Processamento de transações via cartão de crédito/débito"
          onTestConnection={handleTestConnection}
          onToggle={handleToggle}
          isTestingConnection={testConnection.isPending}
          isToggling={toggleIntegration.isPending}
        />

        {/* Config Form */}
        <IntegrationConfigForm
          fields={ACQUIRER_CONFIG_FIELDS}
          currentConfig={(config?.config as Record<string, unknown>) || {}}
          onSave={handleSaveConfig}
          isSaving={updateConfig.isPending}
        />
      </div>

      {/* Metrics */}
      <IntegrationMetricsCard
        provider="ACQUIRER"
        metricDefinitions={ACQUIRER_METRICS}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Logs */}
        <IntegrationLogsCard provider="ACQUIRER" />

        {/* About */}
        <IntegrationAboutCard
          title="Adquirentes de Pagamento"
          description="A integração com adquirentes permite processar pagamentos via cartão de crédito e débito, além de acompanhar métricas de transações."
          features={[
            "Processamento de pagamentos em tempo real",
            "Suporte a múltiplos adquirentes",
            "Relatórios de transações e conciliação",
            "Gestão de chargebacks e disputas",
          ]}
          limitations={[
            "Requer contrato ativo com o adquirente",
            "Taxas variam conforme volume e negociação",
            "Alguns recursos dependem do plano contratado",
          ]}
          helpArticleId="integracoes-adquirentes"
        />
      </div>
    </div>
  );
}
