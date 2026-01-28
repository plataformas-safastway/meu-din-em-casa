/**
 * Lovable AI Integration Configuration Page
 * 
 * Manages the AI gateway configuration for insights, OCR, and projections.
 * LOVABLE_API_KEY is auto-provisioned by Cloud - no user configuration needed.
 */

import { Sparkles, CheckCircle, Info, Cpu, Eye, TrendingUp, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  useIntegrationConfig,
  useToggleIntegration,
  getIntegrationStatusColor,
  getIntegrationStatusLabel,
} from "@/hooks/useIntegrationsConfig";
import { IntegrationLogsCard } from "@/components/integrations/IntegrationLogsCard";
import { toast } from "sonner";

const AI_FEATURES = [
  {
    id: "insights",
    label: "Insights Financeiros",
    description: "Análise de padrões de gastos e sugestões personalizadas",
    icon: TrendingUp,
    enabled: true,
  },
  {
    id: "ocr",
    label: "OCR de Recibos",
    description: "Extração automática de dados de comprovantes e notas fiscais",
    icon: FileText,
    enabled: true,
  },
  {
    id: "projections",
    label: "Projeções com IA",
    description: "Dicas personalizadas nas projeções de fluxo de caixa",
    icon: Eye,
    enabled: true,
  },
  {
    id: "cs-analysis",
    label: "Análise de Engajamento",
    description: "Sugestões proativas de Customer Success baseadas em comportamento",
    icon: Cpu,
    enabled: true,
  },
];

export function IntegrationLovableAIPage() {
  const { data: config, isLoading } = useIntegrationConfig('LOVABLE_AI');
  const toggleMutation = useToggleIntegration();

  const handleToggle = async (enabled: boolean) => {
    try {
      await toggleMutation.mutateAsync({ provider: 'LOVABLE_AI', enabled });
      toast.success(enabled ? "Lovable AI ativado" : "Lovable AI desativado");
    } catch (error) {
      toast.error("Erro ao alterar status");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  const status = config?.status || 'ACTIVE'; // Default to active since it's auto-provisioned

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" />
            Lovable AI
          </h2>
          <p className="text-muted-foreground">
            IA generativa para insights, OCR e projeções financeiras
          </p>
        </div>
        <Badge className={getIntegrationStatusColor(status)}>
          <CheckCircle className="w-4 h-4 mr-1" />
          {getIntegrationStatusLabel(status)}
        </Badge>
      </div>

      {/* Auto-configured notice */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Configuração Automática</AlertTitle>
        <AlertDescription>
          A integração com Lovable AI é provisionada automaticamente pelo Cloud. 
          A chave de API (LOVABLE_API_KEY) já está configurada e pronta para uso.
          Não é necessária nenhuma configuração adicional.
        </AlertDescription>
      </Alert>

      {/* Enable/Disable */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ativar/Desativar</CardTitle>
          <CardDescription>
            Controle se os recursos de IA estão habilitados no sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="ai-enabled" className="text-base font-medium">
                Lovable AI
              </Label>
              <p className="text-sm text-muted-foreground">
                Habilitar recursos de inteligência artificial
              </p>
            </div>
            <Switch
              id="ai-enabled"
              checked={config?.is_enabled ?? true}
              onCheckedChange={handleToggle}
              disabled={toggleMutation.isPending}
            />
          </div>
        </CardContent>
      </Card>

      {/* Features */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recursos Habilitados</CardTitle>
          <CardDescription>
            Funcionalidades que utilizam a integração com Lovable AI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {AI_FEATURES.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div key={feature.id}>
                {index > 0 && <Separator className="my-4" />}
                <div className="flex items-start gap-4">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{feature.label}</p>
                      <Badge variant="secondary" className="text-xs">Ativo</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Model Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Modelo Padrão</CardTitle>
          <CardDescription>
            Modelo de IA utilizado para processamento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <Cpu className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">google/gemini-3-flash-preview</p>
              <p className="text-sm text-muted-foreground">
                Modelo balanceado para velocidade e qualidade
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs */}
      <IntegrationLogsCard provider="LOVABLE_AI" />

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sobre</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm dark:prose-invert max-w-none">
          <p>
            O <strong>Lovable AI Gateway</strong> fornece acesso a modelos de IA de última geração
            (Google Gemini e OpenAI GPT-5) sem necessidade de configuração de chaves de API.
          </p>
          <p>
            Os recursos são utilizados para:
          </p>
          <ul>
            <li>Geração de insights personalizados sobre padrões de gastos</li>
            <li>Extração de dados de comprovantes via OCR com visão computacional</li>
            <li>Análise de projeções financeiras e sugestões de economia</li>
            <li>Análise de comportamento de usuários para Customer Success proativo</li>
          </ul>
          <p className="text-muted-foreground text-sm">
            O uso está sujeito aos limites do plano contratado. 
            Para aumentar limites, entre em contato com o suporte.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
