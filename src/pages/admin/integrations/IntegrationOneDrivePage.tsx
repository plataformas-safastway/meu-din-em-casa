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

const ONEDRIVE_CONFIG_FIELDS: ConfigField[] = [
  {
    key: 'client_id',
    label: 'Microsoft Client ID (Application ID)',
    type: 'text',
    placeholder: 'Ex: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
    required: true,
    helperText: 'Obtido no Azure Portal (App Registration)',
  },
  {
    key: 'tenant_id',
    label: 'Tenant ID (opcional)',
    type: 'text',
    placeholder: 'Ex: common ou seu tenant ID',
    helperText: 'Use "common" para multi-tenant ou seu Tenant ID específico',
  },
];

const ONEDRIVE_METRICS = [
  { key: 'imports_total', label: 'Importações realizadas' },
  { key: 'imports_success', label: 'Importações bem-sucedidas' },
  { key: 'imports_failed', label: 'Importações com falha' },
  { key: 'files_downloaded', label: 'Arquivos baixados' },
];

export function IntegrationOneDrivePage() {
  const { toast } = useToast();
  const { data: config, isLoading } = useIntegrationConfig('ONEDRIVE');
  const testConnection = useTestIntegrationConnection();
  const toggleIntegration = useToggleIntegration();
  const updateConfig = useUpdateIntegrationConfig();

  const handleTestConnection = async () => {
    const result = await testConnection.mutateAsync('ONEDRIVE');
    toast({
      title: result.success ? "Conexão bem-sucedida" : "Falha na conexão",
      description: result.errorMessage || "A integração está funcionando corretamente",
      variant: result.success ? "default" : "destructive",
    });
  };

  const handleToggle = async (enabled: boolean) => {
    await toggleIntegration.mutateAsync({ provider: 'ONEDRIVE', enabled });
    toast({
      title: enabled ? "Integração ativada" : "Integração desativada",
    });
  };

  const handleSaveConfig = async (newConfig: Record<string, unknown>) => {
    await updateConfig.mutateAsync({
      provider: 'ONEDRIVE',
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
        <h2 className="text-2xl font-bold">Microsoft OneDrive</h2>
        <p className="text-muted-foreground">
          Importação de arquivos financeiros diretamente do OneDrive
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Card */}
        <IntegrationStatusCard
          config={config}
          providerName="Microsoft OneDrive"
          description="Permite importar extratos e faturas do OneDrive do usuário"
          onTestConnection={handleTestConnection}
          onToggle={handleToggle}
          isTestingConnection={testConnection.isPending}
          isToggling={toggleIntegration.isPending}
        />

        {/* Config Form */}
        <IntegrationConfigForm
          fields={ONEDRIVE_CONFIG_FIELDS}
          currentConfig={(config?.config as Record<string, unknown>) || {}}
          onSave={handleSaveConfig}
          isSaving={updateConfig.isPending}
        />
      </div>

      {/* Metrics */}
      <IntegrationMetricsCard
        provider="ONEDRIVE"
        metricDefinitions={ONEDRIVE_METRICS}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Logs */}
        <IntegrationLogsCard provider="ONEDRIVE" />

        {/* About */}
        <IntegrationAboutCard
          title="Microsoft OneDrive"
          description="A integração com OneDrive permite que os usuários importem arquivos financeiros (extratos, faturas, OFX, CSV, PDF) diretamente de suas contas do Microsoft OneDrive."
          features={[
            "Seleção segura de arquivos via Microsoft File Picker oficial",
            "Suporte a OFX, CSV, XLS, XLSX e PDF",
            "OAuth 2.0 com escopos mínimos (Files.Read)",
            "Arquivo baixado e validado no backend antes do processamento",
            "Token OAuth nunca armazenado no frontend",
            "Compatível com contas pessoais e corporativas (Microsoft 365)",
          ]}
          limitations={[
            "Requer autorização explícita do usuário a cada sessão",
            "Limite de 10MB por arquivo",
            "Apenas arquivos que o usuário pode acessar são listados",
            "Não mantém acesso persistente à conta Microsoft",
          ]}
          helpArticleId="integracoes-onedrive"
          externalDocsUrl="https://learn.microsoft.com/en-us/onedrive/developer/controls/file-pickers/"
        />
      </div>
    </div>
  );
}
