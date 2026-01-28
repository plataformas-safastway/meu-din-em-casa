/**
 * OIK AI Dashboard Page
 * Monitoring and analytics for the OIK AI Assistant product
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
  FileText,
  ThumbsUp,
  ThumbsDown
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";

// Mock data for initial implementation - will be replaced with real analytics
const mockMetrics = {
  totalConversations: 1247,
  activeUsers: 89,
  avgResponseTime: 1.8,
  satisfactionRate: 94,
  tokensUsed: 2450000,
  costEstimate: 12.50,
  topQuestions: [
    { question: "Como organizar meu orçamento?", count: 156 },
    { question: "Dicas para economizar", count: 134 },
    { question: "Como criar uma reserva de emergência?", count: 98 },
    { question: "Como sair das dívidas?", count: 87 },
    { question: "Qual a melhor forma de investir?", count: 76 },
  ],
  recentErrors: [
    { timestamp: "2026-01-28 21:30", error: "Rate limit exceeded", count: 3 },
    { timestamp: "2026-01-28 20:15", error: "Timeout", count: 1 },
  ],
  dailyUsage: [
    { day: "Seg", conversations: 145 },
    { day: "Ter", conversations: 189 },
    { day: "Qua", conversations: 210 },
    { day: "Qui", conversations: 178 },
    { day: "Sex", conversations: 234 },
    { day: "Sáb", conversations: 156 },
    { day: "Dom", conversations: 135 },
  ],
};

export function OikAIPage() {
  const [activeTab, setActiveTab] = useState("overview");

  // Future: Query real analytics from database
  const { data: metrics, isLoading, refetch } = useQuery({
    queryKey: ["oik-ai-metrics"],
    queryFn: async () => {
      // For now, return mock data
      // TODO: Implement real analytics table and queries
      return mockMetrics;
    },
    staleTime: 60000, // 1 minute
  });

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
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Conversas Totais</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalConversations.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-500">+12%</span> vs. semana anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.activeUsers}</div>
            <p className="text-xs text-muted-foreground">Últimos 7 dias</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Tempo de Resposta</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.avgResponseTime}s</div>
            <p className="text-xs text-muted-foreground">Média (p50)</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Satisfação</CardTitle>
            <ThumbsUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.satisfactionRate}%</div>
            <Progress value={metrics?.satisfactionRate} className="mt-2" />
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
                <ScrollArea className="h-[250px]">
                  <div className="space-y-3">
                    {metrics?.topQuestions.map((item, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium text-muted-foreground w-6">
                            #{index + 1}
                          </span>
                          <span className="text-sm">{item.question}</span>
                        </div>
                        <Badge variant="secondary">{item.count}</Badge>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Daily Usage Chart Placeholder */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Uso Diário</CardTitle>
                <CardDescription>Conversas por dia da semana</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-end justify-between h-[250px] gap-2">
                  {metrics?.dailyUsage.map((day, index) => (
                    <div key={index} className="flex flex-col items-center gap-2 flex-1">
                      <div 
                        className="w-full bg-primary/80 rounded-t"
                        style={{ height: `${(day.conversations / 250) * 200}px` }}
                      />
                      <span className="text-xs text-muted-foreground">{day.day}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Errors */}
          {metrics?.recentErrors && metrics.recentErrors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-destructive" />
                  Erros Recentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {metrics.recentErrors.map((error, index) => (
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
                <div className="text-2xl font-bold">
                  {(metrics?.tokensUsed || 0 / 1000000).toFixed(2)}M
                </div>
                <p className="text-xs text-muted-foreground">Este mês</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Custo Estimado</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${metrics?.costEstimate.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">Este mês</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Modelo</CardTitle>
                <Brain className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-lg font-bold">gemini-3-flash</div>
                <p className="text-xs text-muted-foreground">Google AI</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Projeção de Custos</CardTitle>
              <CardDescription>Baseado no uso atual</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Custo médio por conversa</span>
                  <span className="font-medium">$0.01</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Tokens médios por conversa</span>
                  <span className="font-medium">~1,950</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Projeção mensal (30 dias)</span>
                  <span className="font-medium text-primary">$37.50</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Análise de Comportamento</CardTitle>
              <CardDescription>Padrões identificados nas interações</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">🎯 Temas Predominantes</h4>
                  <div className="flex flex-wrap gap-2">
                    <Badge>Orçamento</Badge>
                    <Badge>Economia</Badge>
                    <Badge>Reserva de Emergência</Badge>
                    <Badge>Dívidas</Badge>
                    <Badge>Investimentos</Badge>
                  </div>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">📊 Perfil dos Usuários</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• 65% das conversas são sobre organização financeira básica</li>
                    <li>• 20% buscam orientação sobre dívidas</li>
                    <li>• 15% perguntam sobre investimentos</li>
                  </ul>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">💡 Oportunidades</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Criar conteúdo educativo sobre reserva de emergência</li>
                    <li>• Expandir orientações sobre renegociação de dívidas</li>
                    <li>• Adicionar simuladores interativos</li>
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
              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center gap-4 p-4 bg-green-500/10 rounded-lg">
                  <ThumbsUp className="h-8 w-8 text-green-500" />
                  <div>
                    <div className="text-2xl font-bold text-green-600">94%</div>
                    <p className="text-sm text-muted-foreground">Respostas úteis</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 p-4 bg-destructive/10 rounded-lg">
                  <ThumbsDown className="h-8 w-8 text-destructive" />
                  <div>
                    <div className="text-2xl font-bold text-destructive">6%</div>
                    <p className="text-sm text-muted-foreground">Precisam melhorar</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
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
                    <p className="text-sm text-muted-foreground">0.7 (Balanceado)</p>
                  </div>
                  <Badge variant="outline">Padrão</Badge>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Max Tokens</h4>
                    <p className="text-sm text-muted-foreground">2,048 tokens por resposta</p>
                  </div>
                  <Badge variant="outline">Padrão</Badge>
                </div>

                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <h4 className="font-medium">Streaming</h4>
                    <p className="text-sm text-muted-foreground">Habilitado (SSE)</p>
                  </div>
                  <Badge className="bg-green-500">Ativo</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Prompt Base
              </CardTitle>
              <CardDescription>Personalidade e regras do assistente</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">
                  O prompt base define 10 princípios fundamentais:
                </p>
                <ol className="text-sm space-y-1 list-decimal list-inside">
                  <li>Princípios Fundamentais</li>
                  <li>Modelo Mental</li>
                  <li>Estrutura de Raciocínio</li>
                  <li>Regras de Orçamento (núcleo OIK)</li>
                  <li>Limites de Recomendação</li>
                  <li>Comportamento em Resistência</li>
                  <li>Finanças Comportamentais</li>
                  <li>Tom de Voz e Linguagem</li>
                  <li>Papel Educacional</li>
                  <li>Regra de Ouro</li>
                </ol>
                <Button variant="outline" size="sm" className="mt-4">
                  Ver Documentação Completa
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default OikAIPage;
