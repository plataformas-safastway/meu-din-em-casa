import { Building2, CreditCard, Mail, FileText, CheckCircle, AlertTriangle, Clock, XCircle, ArrowRight, HardDrive } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useIntegrationsConfig,
  type IntegrationProvider,
  type IntegrationStatus,
  getIntegrationStatusColor,
  getIntegrationStatusLabel,
  getProviderDisplayName,
} from "@/hooks/useIntegrationsConfig";

interface IntegrationsOverviewPageProps {
  onNavigate: (provider: IntegrationProvider) => void;
}

const PROVIDER_ICONS: Record<IntegrationProvider, React.ReactNode> = {
  OPEN_FINANCE: <Building2 className="w-8 h-8" />,
  ACQUIRER: <CreditCard className="w-8 h-8" />,
  RESEND: <Mail className="w-8 h-8" />,
  ENOTAS: <FileText className="w-8 h-8" />,
  GOOGLE_DRIVE: <HardDrive className="w-8 h-8" />,
};

const STATUS_ICONS: Record<IntegrationStatus, React.ReactNode> = {
  ACTIVE: <CheckCircle className="w-5 h-5 text-green-600" />,
  INACTIVE: <XCircle className="w-5 h-5 text-muted-foreground" />,
  PENDING: <Clock className="w-5 h-5 text-yellow-600" />,
  ERROR: <AlertTriangle className="w-5 h-5 text-red-600" />,
};

const PROVIDER_DESCRIPTIONS: Record<IntegrationProvider, string> = {
  OPEN_FINANCE: "Conexão com bancos via Pluggy para importação automática de extratos",
  ACQUIRER: "Processamento de pagamentos via cartão de crédito/débito",
  RESEND: "Envio de e-mails transacionais e notificações",
  ENOTAS: "Emissão automática de notas fiscais de serviço (NFS-e)",
  GOOGLE_DRIVE: "Importação de arquivos financeiros diretamente do Google Drive",
};

export function IntegrationsOverviewPage({ onNavigate }: IntegrationsOverviewPageProps) {
  const { data: configs, isLoading } = useIntegrationsConfig();

  const getConfigForProvider = (provider: IntegrationProvider) => {
    return configs?.find((c) => c.provider === provider);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold">Integrações</h2>
          <p className="text-muted-foreground">
            Gerencie as conexões com serviços externos
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  const providers: IntegrationProvider[] = ['OPEN_FINANCE', 'GOOGLE_DRIVE', 'ACQUIRER', 'RESEND', 'ENOTAS'];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Integrações</h2>
        <p className="text-muted-foreground">
          Gerencie as conexões com serviços externos
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {providers.map((provider) => {
          const config = getConfigForProvider(provider);
          const status = config?.status || 'PENDING';

          return (
            <Card
              key={provider}
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => onNavigate(provider)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="p-3 rounded-lg bg-primary/10 text-primary">
                    {PROVIDER_ICONS[provider]}
                  </div>
                  <Badge className={getIntegrationStatusColor(status)}>
                    {STATUS_ICONS[status]}
                    <span className="ml-1">{getIntegrationStatusLabel(status)}</span>
                  </Badge>
                </div>
                <CardTitle className="text-lg mt-4">
                  {getProviderDisplayName(provider)}
                </CardTitle>
                <CardDescription>{PROVIDER_DESCRIPTIONS[provider]}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button variant="ghost" className="w-full justify-between group">
                  Configurar
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Resumo</CardTitle>
          <CardDescription>Status geral das integrações</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div className="p-4 rounded-lg bg-muted/50">
              <p className="text-3xl font-bold">{configs?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Total</p>
            </div>
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950">
              <p className="text-3xl font-bold text-green-600">
                {configs?.filter((c) => c.status === 'ACTIVE').length || 0}
              </p>
              <p className="text-sm text-muted-foreground">Ativas</p>
            </div>
            <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950">
              <p className="text-3xl font-bold text-yellow-600">
                {configs?.filter((c) => c.status === 'PENDING').length || 0}
              </p>
              <p className="text-sm text-muted-foreground">Pendentes</p>
            </div>
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950">
              <p className="text-3xl font-bold text-red-600">
                {configs?.filter((c) => c.status === 'ERROR').length || 0}
              </p>
              <p className="text-sm text-muted-foreground">Com erro</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
