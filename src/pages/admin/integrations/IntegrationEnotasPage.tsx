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

const ENOTAS_CONFIG_FIELDS: ConfigField[] = [
  {
    key: 'api_key',
    label: 'API Key',
    type: 'secret',
    placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    required: true,
    helperText: 'Chave de API do eNotas (mantida em segurança)',
  },
  {
    key: 'empresa_id',
    label: 'ID da Empresa',
    type: 'text',
    placeholder: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    required: true,
    helperText: 'Identificador da empresa no eNotas',
  },
  {
    key: 'ambiente',
    label: 'Ambiente',
    type: 'text',
    placeholder: 'producao ou homologacao',
    helperText: 'Ambiente de emissão (producao ou homologacao)',
  },
];

const ENOTAS_METRICS = [
  { key: 'invoices_issued', label: 'Notas emitidas' },
  { key: 'invoices_cancelled', label: 'Notas canceladas' },
  { key: 'invoices_pending', label: 'Pendentes' },
  { key: 'last_emission_at', label: 'Última emissão' },
];

export function IntegrationEnotasPage() {
  const { toast } = useToast();
  const { data: config, isLoading } = useIntegrationConfig('ENOTAS');
  const testConnection = useTestIntegrationConnection();
  const toggleIntegration = useToggleIntegration();
  const updateConfig = useUpdateIntegrationConfig();

  const handleTestConnection = async () => {
    const result = await testConnection.mutateAsync('ENOTAS');
    toast({
      title: result.success ? "Conexão bem-sucedida" : "Falha na conexão",
      description: result.errorMessage || "A integração está funcionando corretamente",
      variant: result.success ? "default" : "destructive",
    });
  };

  const handleToggle = async (enabled: boolean) => {
    await toggleIntegration.mutateAsync({ provider: 'ENOTAS', enabled });
    toast({
      title: enabled ? "Integração ativada" : "Integração desativada",
    });
  };

  const handleSaveConfig = async (newConfig: Record<string, unknown>) => {
    await updateConfig.mutateAsync({
      provider: 'ENOTAS',
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
        <h2 className="text-2xl font-bold">eNotas</h2>
        <p className="text-muted-foreground">
          Emissão automática de notas fiscais de serviço (NFS-e)
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Card */}
        <IntegrationStatusCard
          config={config}
          providerName="eNotas"
          description="Emissão automática de notas fiscais eletrônicas de serviço"
          onTestConnection={handleTestConnection}
          onToggle={handleToggle}
          isTestingConnection={testConnection.isPending}
          isToggling={toggleIntegration.isPending}
        />

        {/* Config Form */}
        <IntegrationConfigForm
          fields={ENOTAS_CONFIG_FIELDS}
          currentConfig={(config?.config as Record<string, unknown>) || {}}
          onSave={handleSaveConfig}
          isSaving={updateConfig.isPending}
        />
      </div>

      {/* Metrics */}
      <IntegrationMetricsCard
        provider="ENOTAS"
        metricDefinitions={ENOTAS_METRICS}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Logs */}
        <IntegrationLogsCard provider="ENOTAS" />

        {/* About */}
        <IntegrationAboutCard
          title="eNotas"
          description="A integração com eNotas permite a emissão automática de notas fiscais de serviço (NFS-e) diretamente do sistema, sem necessidade de acesso ao portal da prefeitura."
          features={[
            "Emissão automática de NFS-e",
            "Cancelamento de notas quando necessário",
            "Consulta de status de emissão",
            "Integração com mais de 2.000 prefeituras",
            "Armazenamento seguro das notas emitidas",
          ]}
          limitations={[
            "Requer cadastro prévio no eNotas",
            "Algumas prefeituras podem ter limitações específicas",
            "Custos de emissão conforme plano contratado no eNotas",
          ]}
          helpArticleId="integracoes-enotas"
          externalDocsUrl="https://docs.enotas.com.br"
        />
      </div>
    </div>
  );
}
