import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  type IntegrationProvider,
  useIntegrationMetrics,
  aggregateMetrics,
} from "@/hooks/useIntegrationsConfig";

interface MetricDefinition {
  key: string;
  label: string;
  format?: (value: number) => string;
}

interface IntegrationMetricsCardProps {
  provider: IntegrationProvider;
  metricDefinitions: MetricDefinition[];
  title?: string;
}

type Period = 'today' | '7d' | '30d' | 'month';

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Hoje',
  '7d': '7 dias',
  '30d': '30 dias',
  month: 'Mês atual',
};

export function IntegrationMetricsCard({
  provider,
  metricDefinitions,
  title = "Métricas de Serviço",
}: IntegrationMetricsCardProps) {
  const [period, setPeriod] = useState<Period>('7d');
  const { data: metrics, isLoading } = useIntegrationMetrics(provider, period);

  const aggregated = metrics ? aggregateMetrics(metrics) : {};

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription>Estatísticas de uso e desempenho</CardDescription>
          </div>
          <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <TabsList className="h-8">
              {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
                <TabsTrigger key={p} value={p} className="text-xs px-2">
                  {PERIOD_LABELS[p]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {metricDefinitions.map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {metricDefinitions.map((def) => {
              const value = aggregated[def.key] ?? 0;
              const formatted = def.format ? def.format(value) : value.toLocaleString('pt-BR');

              return (
                <div
                  key={def.key}
                  className="p-4 rounded-lg bg-muted/50 text-center"
                >
                  <p className="text-2xl font-bold">{formatted}</p>
                  <p className="text-xs text-muted-foreground">{def.label}</p>
                </div>
              );
            })}
          </div>
        )}

        {!isLoading && metrics?.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <p>Nenhuma métrica disponível para o período selecionado</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
