/**
 * OpenStreetMap Integration Configuration Page
 * 
 * Manages the OpenStreetMap/Nominatim geocoding integration.
 * This is a free service that doesn't require API keys.
 */

import { MapPin, CheckCircle, Info, Globe, Navigation, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

export function IntegrationOpenStreetMapPage() {
  const { data: config, isLoading } = useIntegrationConfig('OPENSTREETMAP');
  const toggleMutation = useToggleIntegration();

  const handleToggle = async (enabled: boolean) => {
    try {
      await toggleMutation.mutateAsync({ provider: 'OPENSTREETMAP', enabled });
      toast.success(enabled ? "OpenStreetMap ativado" : "OpenStreetMap desativado");
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

  const status = config?.status || 'ACTIVE';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <MapPin className="h-6 w-6 text-primary" />
            OpenStreetMap
          </h2>
          <p className="text-muted-foreground">
            Geocodificação reversa para contexto de localização
          </p>
        </div>
        <Badge className={getIntegrationStatusColor(status)}>
          <CheckCircle className="w-4 h-4 mr-1" />
          {getIntegrationStatusLabel(status)}
        </Badge>
      </div>

      {/* Free service notice */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Serviço Gratuito</AlertTitle>
        <AlertDescription>
          O OpenStreetMap Nominatim é um serviço de geocodificação gratuito e aberto.
          Não requer chave de API, mas possui limites de uso (1 requisição por segundo).
        </AlertDescription>
      </Alert>

      {/* Enable/Disable */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ativar/Desativar</CardTitle>
          <CardDescription>
            Controle se o contexto de localização está habilitado
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="osm-enabled" className="text-base font-medium">
                OpenStreetMap
              </Label>
              <p className="text-sm text-muted-foreground">
                Habilitar identificação de localização do usuário
              </p>
            </div>
            <Switch
              id="osm-enabled"
              checked={config?.is_enabled ?? true}
              onCheckedChange={handleToggle}
              disabled={toggleMutation.isPending}
            />
          </div>
        </CardContent>
      </Card>

      {/* How it's used */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Como é Utilizado</CardTitle>
          <CardDescription>
            Funcionalidades que dependem da geolocalização
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <Navigation className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Contexto de Localização</p>
              <p className="text-sm text-muted-foreground">
                Exibe o bairro/cidade atual do usuário no dashboard para personalização
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <Globe className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Geocodificação Reversa</p>
              <p className="text-sm text-muted-foreground">
                Converte coordenadas GPS em endereço legível (cidade, bairro, estado)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rate limits */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Limites de Uso
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm">Máximo de requisições</span>
              <Badge variant="secondary">1/segundo</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm">Cache local</span>
              <Badge variant="secondary">5 minutos</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              O sistema respeita automaticamente os limites do Nominatim e utiliza 
              cache para minimizar requisições.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Logs */}
      <IntegrationLogsCard provider="OPENSTREETMAP" />

      {/* About */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sobre</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm dark:prose-invert max-w-none">
          <p>
            O <strong>OpenStreetMap</strong> é um projeto colaborativo para criar mapas 
            gratuitos e editáveis do mundo. O serviço <strong>Nominatim</strong> permite
            geocodificação (endereço → coordenadas) e geocodificação reversa 
            (coordenadas → endereço).
          </p>
          <p>
            Utilizamos a geocodificação reversa para:
          </p>
          <ul>
            <li>Identificar a cidade/bairro do usuário para personalização do dashboard</li>
            <li>Adicionar contexto de localização a transações (quando permitido)</li>
          </ul>
          <p className="text-muted-foreground text-sm">
            <a 
              href="https://operations.osmfoundation.org/policies/nominatim/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="underline"
            >
              Política de uso do Nominatim
            </a>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
