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

const GOOGLE_DRIVE_CONFIG_FIELDS: ConfigField[] = [
  {
    key: 'client_id',
    label: 'Google Client ID',
    type: 'text',
    placeholder: 'Ex: 123456789-abc.apps.googleusercontent.com',
    required: true,
    helperText: 'Obtido no Google Cloud Console (OAuth 2.0 Client)',
  },
  {
    key: 'api_key',
    label: 'Google API Key',
    type: 'secret',
    placeholder: 'Insira a API Key',
    required: true,
    helperText: 'Chave de API para o Google Picker. Após salvar, não será exibida.',
  },
];

const GOOGLE_DRIVE_METRICS = [
  { key: 'imports_total', label: 'Importações realizadas' },
  { key: 'imports_success', label: 'Importações bem-sucedidas' },
  { key: 'imports_failed', label: 'Importações com falha' },
  { key: 'files_downloaded', label: 'Arquivos baixados' },
];

export function IntegrationGoogleDrivePage() {
  const { toast } = useToast();
  const { data: config, isLoading } = useIntegrationConfig('GOOGLE_DRIVE');
  const testConnection = useTestIntegrationConnection();
  const toggleIntegration = useToggleIntegration();
  const updateConfig = useUpdateIntegrationConfig();

  const handleTestConnection = async () => {
    const result = await testConnection.mutateAsync('GOOGLE_DRIVE');
    toast({
      title: result.success ? "Conexão bem-sucedida" : "Falha na conexão",
      description: result.errorMessage || "A integração está funcionando corretamente",
      variant: result.success ? "default" : "destructive",
    });
  };

  const handleToggle = async (enabled: boolean) => {
    await toggleIntegration.mutateAsync({ provider: 'GOOGLE_DRIVE', enabled });
    toast({
      title: enabled ? "Integração ativada" : "Integração desativada",
    });
  };

  const handleSaveConfig = async (newConfig: Record<string, unknown>) => {
    await updateConfig.mutateAsync({
      provider: 'GOOGLE_DRIVE',
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
        <h2 className="text-2xl font-bold">Google Drive</h2>
        <p className="text-muted-foreground">
          Importação de arquivos financeiros diretamente do Google Drive
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Card */}
        <IntegrationStatusCard
          config={config}
          providerName="Google Drive"
          description="Permite importar extratos e faturas do Google Drive do usuário"
          onTestConnection={handleTestConnection}
          onToggle={handleToggle}
          isTestingConnection={testConnection.isPending}
          isToggling={toggleIntegration.isPending}
        />

        {/* Config Form */}
        <IntegrationConfigForm
          fields={GOOGLE_DRIVE_CONFIG_FIELDS}
          currentConfig={(config?.config as Record<string, unknown>) || {}}
          onSave={handleSaveConfig}
          isSaving={updateConfig.isPending}
        />
      </div>

      {/* Metrics */}
      <IntegrationMetricsCard
        provider="GOOGLE_DRIVE"
        metricDefinitions={GOOGLE_DRIVE_METRICS}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Logs */}
        <IntegrationLogsCard provider="GOOGLE_DRIVE" />

        {/* About */}
        <IntegrationAboutCard
          title="Google Drive"
          description="A integração com Google Drive permite que os usuários importem arquivos financeiros (extratos, faturas, OFX, CSV, PDF) diretamente de suas contas do Google Drive."
          features={[
            "Seleção segura de arquivos via Google Picker oficial",
            "Suporte a OFX, CSV, XLS, XLSX e PDF",
            "OAuth 2.0 com escopos mínimos (somente leitura do arquivo selecionado)",
            "Arquivo baixado e validado no backend antes do processamento",
            "Token OAuth nunca armazenado no frontend",
          ]}
          limitations={[
            "Requer autorização explícita do usuário a cada sessão",
            "Limite de 10MB por arquivo",
            "Apenas arquivos que o usuário pode acessar são listados",
            "Não mantém acesso persistente à conta do Google",
          ]}
          helpArticleId="integracoes-google-drive"
          externalDocsUrl="https://developers.google.com/drive/api/guides/about-sdk"
        />
      </div>
    </div>
  );
}
