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

const RESEND_CONFIG_FIELDS: ConfigField[] = [
  {
    key: 'api_key',
    label: 'API Key',
    type: 'secret',
    placeholder: 're_xxxxxxxx...',
    required: true,
    helperText: 'Chave de API do Resend (mantida em segurança)',
  },
  {
    key: 'from_email',
    label: 'E-mail de Envio',
    type: 'email',
    placeholder: 'noreply@seudominio.com',
    required: true,
    helperText: 'Endereço que aparecerá como remetente',
  },
  {
    key: 'from_name',
    label: 'Nome do Remetente',
    type: 'text',
    placeholder: 'OIK Finance',
    helperText: 'Nome que aparecerá junto ao e-mail de envio',
  },
];

const RESEND_METRICS = [
  { key: 'emails_sent', label: 'E-mails enviados' },
  { key: 'emails_delivered', label: 'Entregues' },
  { key: 'emails_failed', label: 'Falhas' },
  { key: 'emails_opened', label: 'Abertos' },
];

export function IntegrationResendPage() {
  const { toast } = useToast();
  const { data: config, isLoading } = useIntegrationConfig('RESEND');
  const testConnection = useTestIntegrationConnection();
  const toggleIntegration = useToggleIntegration();
  const updateConfig = useUpdateIntegrationConfig();

  const handleTestConnection = async () => {
    const result = await testConnection.mutateAsync('RESEND');
    toast({
      title: result.success ? "Conexão bem-sucedida" : "Falha na conexão",
      description: result.errorMessage || "A integração está funcionando corretamente",
      variant: result.success ? "default" : "destructive",
    });
  };

  const handleToggle = async (enabled: boolean) => {
    await toggleIntegration.mutateAsync({ provider: 'RESEND', enabled });
    toast({
      title: enabled ? "Integração ativada" : "Integração desativada",
    });
  };

  const handleSaveConfig = async (newConfig: Record<string, unknown>) => {
    await updateConfig.mutateAsync({
      provider: 'RESEND',
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
        <h2 className="text-2xl font-bold">Resend (E-mail)</h2>
        <p className="text-muted-foreground">
          Serviço de envio de e-mails transacionais e notificações
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Card */}
        <IntegrationStatusCard
          config={config}
          providerName="Resend"
          description="Envio de e-mails transacionais (boas-vindas, alertas, relatórios)"
          onTestConnection={handleTestConnection}
          onToggle={handleToggle}
          isTestingConnection={testConnection.isPending}
          isToggling={toggleIntegration.isPending}
        />

        {/* Config Form */}
        <IntegrationConfigForm
          fields={RESEND_CONFIG_FIELDS}
          currentConfig={(config?.config as Record<string, unknown>) || {}}
          onSave={handleSaveConfig}
          isSaving={updateConfig.isPending}
        />
      </div>

      {/* Metrics */}
      <IntegrationMetricsCard
        provider="RESEND"
        metricDefinitions={RESEND_METRICS}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Logs */}
        <IntegrationLogsCard provider="RESEND" />

        {/* About */}
        <IntegrationAboutCard
          title="Resend (E-mail)"
          description="A integração com Resend permite enviar e-mails transacionais como boas-vindas, alertas de orçamento, relatórios mensais e notificações."
          features={[
            "Envio de e-mails transacionais em escala",
            "Templates HTML personalizados",
            "Métricas de entrega e abertura",
            "Alta taxa de entrega (deliverability)",
          ]}
          limitations={[
            "Requer domínio verificado para melhor entrega",
            "Limite de envios conforme plano contratado",
            "E-mails de marketing devem seguir políticas anti-spam",
          ]}
          helpArticleId="integracoes-resend"
          externalDocsUrl="https://resend.com/docs"
        />
      </div>
    </div>
  );
}
