/**
 * OIK AI Dashboard Page
 * Monitoring and analytics for the OIK AI Assistant product
 * 
 * Updated: Real metrics from get_ai_dashboard_metrics RPC
 */
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Sparkles, 
  MessageSquare, 
  TrendingUp, 
  Users, 
  Clock, 
  AlertCircle,
  CheckCircle,
  Zap,
  Brain,
  BarChart3,
  Activity,
  RefreshCw,
  Settings,
  ThumbsUp,
  ThumbsDown,
  Info
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";

interface AIMetrics {
  total_conversations: number;
  prev_total_conversations: number;
  active_users: number;
  response_p50_ms: number;
  satisfaction_rate: number;
  tokens_used: number;
  tokens_in: number;
  tokens_out: number;
  top_questions: Array<{ question: string; count: number }>;
  daily_usage: Array<{ date: string; day: string; conversations: number }>;
  recent_errors: Array<{ timestamp: string; error: string; count: number }>;
  period_days: number;
  calculated_at: string;
}

// Cost estimation based on Gemini pricing (approximate)
const COST_PER_1M_TOKENS = 0.35; // gemini-3-flash-preview

export function OikAIPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [periodDays, setPeriodDays] = useState(7);

  // Query real metrics from RPC
  const { data: metrics, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["oik-ai-metrics", periodDays],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_ai_dashboard_metrics", {
        days_back: periodDays
      });
      
      if (error) {
        console.error("Error fetching AI metrics:", error);
        throw error;
      }
      
      return data as unknown as AIMetrics;
    },
    staleTime: 60000, // 1 minute
  });

  // Calculate growth percentage
  const getGrowthPercent = () => {
    if (!metrics) return 0;
    const prev = metrics.prev_total_conversations;
    const curr = metrics.total_conversations;
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  };

  // Format response time for display
  const formatResponseTime = (ms: number | undefined) => {
    if (!ms || ms === 0) return "—";
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  // Estimate cost based on tokens
  const estimateCost = (tokens: number) => {
    return ((tokens / 1_000_000) * COST_PER_1M_TOKENS).toFixed(2);
  };

  // Check if we have any data
  const hasData = metrics && (metrics.total_conversations > 0 || metrics.active_users > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">OIK AI</h1>
            <p className="text-sm text-muted-foreground">
              Assistente de Planejamento Financeiro Familiar
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <CheckCircle className="h-3 w-3 text-green-500" />
            Operacional
          </Badge>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="flex gap-2">
        <Button 
          variant={periodDays === 7 ? "default" : "outline"} 
          size="sm"
          onClick={() => setPeriodDays(7)}
        >
          7 dias
        </Button>
        <Button 
          variant={periodDays === 30 ? "default" : "outline"} 
          size="sm"
          onClick={() => setPeriodDays(30)}
        >
          30 dias
        </Button>
        <Button 
          variant={periodDays === 90 ? "default" : "outline"} 
          size="sm"
          onClick={() => setPeriodDays(90)}
        >
          90 dias
        </Button>
      </div>

      {/* No Data Alert */}
      {!isLoading && !hasData && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle>Sem dados suficientes</AlertTitle>
          <AlertDescription>
            O módulo de IA ainda não tem conversas registradas. 
            As métricas serão exibidas quando os usuários começarem a interagir com o assistente.
          </AlertDescription>
        </Alert>
      )}

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Conversas Totais</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {metrics?.total_conversations.toLocaleString() ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {getGrowthPercent() !== 0 && (
                    <span className={getGrowthPercent() > 0 ? "text-green-500" : "text-red-500"}>
                      {getGrowthPercent() > 0 ? "+" : ""}{getGrowthPercent()}%
                    </span>
                  )}
                  {getGrowthPercent() !== 0 && " vs. período anterior"}
                  {getGrowthPercent() === 0 && `Últimos ${periodDays} dias`}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{metrics?.active_users ?? 0}</div>
                <p className="text-xs text-muted-foreground">Últimos {periodDays} dias</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tempo de Resposta</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatResponseTime(metrics?.response_p50_ms)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {metrics?.response_p50_ms ? "Mediana (p50)" : "Aguardando dados"}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Satisfação</CardTitle>
            <ThumbsUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : metrics?.satisfaction_rate && metrics.satisfaction_rate > 0 ? (
              <>
                <div className="text-2xl font-bold">{metrics.satisfaction_rate}%</div>
                <Progress value={metrics.satisfaction_rate} className="mt-2" />
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-muted-foreground">—</div>
                <p className="text-xs text-muted-foreground">Sem feedback ainda</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Visão Geral
          </TabsTrigger>
          <TabsTrigger value="usage" className="gap-2">
            <Activity className="h-4 w-4" />
            Uso & Custos
          </TabsTrigger>
          <TabsTrigger value="insights" className="gap-2">
            <Brain className="h-4 w-4" />
            Insights
          </TabsTrigger>
          <TabsTrigger value="config" className="gap-2">
            <Settings className="h-4 w-4" />
            Configuração
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Top Questions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Perguntas Mais Frequentes</CardTitle>
                <CardDescription>Tópicos mais consultados pelos usuários</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map(i => (
                      <Skeleton key={i} className="h-8 w-full" />
                    ))}
                  </div>
                ) : metrics?.top_questions && metrics.top_questions.length > 0 ? (
                  <ScrollArea className="h-[250px]">
                    <div className="space-y-3">
                      {metrics.top_questions.map((item, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-muted-foreground w-6">
                              #{index + 1}
                            </span>
                            <span className="text-sm truncate max-w-[200px]" title={item.question}>
                              {item.question}
                            </span>
                          </div>
                          <Badge variant="secondary">{item.count}</Badge>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                    Sem perguntas registradas ainda
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Daily Usage Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Uso Diário</CardTitle>
                <CardDescription>Conversas por dia</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-end justify-between h-[250px] gap-2">
                    {[1, 2, 3, 4, 5, 6, 7].map(i => (
                      <Skeleton key={i} className="flex-1 h-24" />
                    ))}
                  </div>
                ) : metrics?.daily_usage && metrics.daily_usage.length > 0 ? (
                  <div className="flex items-end justify-between h-[250px] gap-2">
                    {metrics.daily_usage.map((day, index) => {
                      const maxConvs = Math.max(...metrics.daily_usage.map(d => d.conversations), 1);
                      const height = (day.conversations / maxConvs) * 200;
                      return (
                        <div key={index} className="flex flex-col items-center gap-2 flex-1">
                          <span className="text-xs text-muted-foreground">{day.conversations}</span>
                          <div 
                            className="w-full bg-primary/80 rounded-t min-h-[4px]"
                            style={{ height: `${Math.max(height, 4)}px` }}
                          />
                          <span className="text-xs text-muted-foreground">{day.day}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                    Sem dados de uso diário
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Errors */}
          {metrics?.recent_errors && metrics.recent_errors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  Erros Recentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {metrics.recent_errors.map((error, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-destructive/5 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">{error.timestamp}</span>
                        <span className="text-sm">{error.error}</span>
                      </div>
                      <Badge variant="destructive">{error.count}x</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Usage & Costs Tab */}
        <TabsContent value="usage" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Tokens Utilizados</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-24" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">
                      {metrics?.tokens_used 
                        ? `${(metrics.tokens_used / 1_000_000).toFixed(2)}M`
                        : "0"
                      }
                    </div>
                    <p className="text-xs text-muted-foreground">Últimos {periodDays} dias</p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Custo Estimado</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <Skeleton className="h-8 w-20" />
                ) : (
                  <>
                    <div className="text-2xl font-bold">
                      ${estimateCost(metrics?.tokens_used ?? 0)}
                    </div>
                    <p className="text-xs text-muted-foreground">Últimos {periodDays} dias</p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Modelo</CardTitle>
                <Brain className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold">gemini-3-flash-preview</div>
                <p className="text-xs text-muted-foreground">Lovable AI Gateway</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Detalhamento de Tokens</CardTitle>
              <CardDescription>Consumo por tipo nos últimos {periodDays} dias</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Tokens de entrada (prompts)</span>
                    <span className="font-medium">
                      {metrics?.tokens_in?.toLocaleString() ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Tokens de saída (respostas)</span>
                    <span className="font-medium">
                      {metrics?.tokens_out?.toLocaleString() ?? 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t pt-4">
                    <span className="text-sm font-medium">Total</span>
                    <span className="font-bold">
                      {metrics?.tokens_used?.toLocaleString() ?? 0}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {hasData && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Projeção de Custos</CardTitle>
                <CardDescription>Baseado no uso atual</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Custo médio por conversa</span>
                    <span className="font-medium">
                      ${metrics?.total_conversations && metrics.total_conversations > 0
                        ? (parseFloat(estimateCost(metrics?.tokens_used ?? 0)) / metrics.total_conversations).toFixed(4)
                        : "0.00"
                      }
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Tokens médios por conversa</span>
                    <span className="font-medium">
                      ~{metrics?.total_conversations && metrics.total_conversations > 0
                        ? Math.round((metrics?.tokens_used ?? 0) / metrics.total_conversations).toLocaleString()
                        : "0"
                      }
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Projeção mensal (30 dias)</span>
                    <span className="font-medium text-primary">
                      ${periodDays > 0
                        ? (parseFloat(estimateCost(metrics?.tokens_used ?? 0)) * (30 / periodDays)).toFixed(2)
                        : "0.00"
                      }
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          {!hasData ? (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Insights em desenvolvimento</AlertTitle>
              <AlertDescription>
                Os insights de comportamento serão gerados automaticamente conforme os usuários 
                interagirem com o assistente. Volte em breve!
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Análise de Comportamento</CardTitle>
                  <CardDescription>Padrões identificados nas interações (em desenvolvimento)</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <h4 className="font-medium mb-2">📊 Resumo do Período</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex justify-between">
                          <span>Conversas</span>
                          <span className="text-muted-foreground">{metrics?.total_conversations ?? 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Usuários únicos</span>
                          <span className="text-muted-foreground">{metrics?.active_users ?? 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tempo médio p50</span>
                          <span className="text-muted-foreground">{formatResponseTime(metrics?.response_p50_ms)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Taxa de satisfação</span>
                          <span className="text-muted-foreground">
                            {metrics?.satisfaction_rate ? `${metrics.satisfaction_rate}%` : "—"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-muted/50 rounded-lg">
                      <h4 className="font-medium mb-2">🎯 Próximos Passos</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Análise de perfis comportamentais (em breve)</li>
                        <li>• Detecção de temas predominantes (em breve)</li>
                        <li>• Oportunidades de melhoria (em breve)</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Feedback dos Usuários</CardTitle>
                </CardHeader>
                <CardContent>
                  {metrics?.satisfaction_rate && metrics.satisfaction_rate > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="flex items-center gap-4 p-4 bg-green-500/10 rounded-lg">
                        <ThumbsUp className="h-8 w-8 text-green-500" />
                        <div>
                          <div className="text-2xl font-bold text-green-600">{metrics.satisfaction_rate}%</div>
                          <p className="text-sm text-muted-foreground">Respostas úteis</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 p-4 bg-destructive/10 rounded-lg">
                        <ThumbsDown className="h-8 w-8 text-destructive" />
                        <div>
                          <div className="text-2xl font-bold text-destructive">{100 - metrics.satisfaction_rate}%</div>
                          <p className="text-sm text-muted-foreground">Precisam melhorar</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <ThumbsUp className="h-12 w-12 mx-auto mb-2 opacity-30" />
                      <p>Ainda não há feedback dos usuários</p>
                      <p className="text-sm">Os dados aparecerão conforme os usuários avaliarem as respostas</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Config Tab */}
        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Configuração do Assistente</CardTitle>
              <CardDescription>Parâmetros atuais da IA OIK</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg mb-2">
                  <div>
                    <h4 className="font-medium">Versão do Prompt</h4>
                    <p className="text-sm text-muted-foreground">v7.0.0 - Metodologia Safastway</p>
                  </div>
                  <Badge className="bg-green-500">Atual</Badge>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Modelo de IA</h4>
                    <p className="text-sm text-muted-foreground">google/gemini-3-flash-preview</p>
                  </div>
                  <Badge variant="outline">Padrão</Badge>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Temperature</h4>
                    <p className="text-sm text-muted-foreground">0.7 (balanceado)</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Max Tokens</h4>
                    <p className="text-sm text-muted-foreground">2.048 tokens por resposta</p>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Streaming</h4>
                    <p className="text-sm text-muted-foreground">Habilitado (resposta progressiva)</p>
                  </div>
                  <Badge className="bg-green-500">Ativo</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Base de Conhecimento</CardTitle>
              <CardDescription>Materiais incluídos no prompt do sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 text-sm">
                <div className="p-2 bg-muted/50 rounded">📘 Planejamento Financeiro Pessoal – Jornada Completa</div>
                <div className="p-2 bg-muted/50 rounded">📘 Vida Financeira em 8 Passos</div>
                <div className="p-2 bg-muted/50 rounded">📘 Princípios do Equilíbrio Financeiro Familiar</div>
                <div className="p-2 bg-muted/50 rounded">📘 Guia para Vencer a Ansiedade Financeira</div>
                <div className="p-2 bg-muted/50 rounded">📘 Brigas por Causa do Dinheiro</div>
                <div className="p-2 bg-muted/50 rounded">📘 Módulos CFP® 01-08 (Técnicos)</div>
                <div className="text-xs text-muted-foreground mt-2">
                  Total: 20 materiais Safastway integrados
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default OikAIPage;
