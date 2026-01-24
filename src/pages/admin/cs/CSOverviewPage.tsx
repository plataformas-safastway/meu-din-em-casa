import { Users, UserCheck, UserX, AlertTriangle, Target, FileUp, PiggyBank, TrendingUp, Activity } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useCSOverview } from "@/hooks/useCSModule";

export function CSOverviewPage() {
  const { data: stats, isLoading } = useCSOverview();

  const kpis = [
    { 
      label: "Total de Usuários", 
      value: stats?.total_users ?? 0, 
      icon: Users, 
      color: "text-blue-500",
      bgColor: "bg-blue-50"
    },
    { 
      label: "Ativos (7 dias)", 
      value: stats?.active_7d ?? 0, 
      icon: UserCheck, 
      color: "text-green-500",
      bgColor: "bg-green-50"
    },
    { 
      label: "Ativos (30 dias)", 
      value: stats?.active_30d ?? 0, 
      icon: Activity, 
      color: "text-emerald-500",
      bgColor: "bg-emerald-50"
    },
    { 
      label: "Inativos", 
      value: stats?.inactive ?? 0, 
      icon: UserX, 
      color: "text-gray-500",
      bgColor: "bg-gray-50"
    },
  ];

  const statusCards = [
    { 
      label: "Em Onboarding", 
      value: stats?.onboarding ?? 0, 
      icon: TrendingUp, 
      color: "text-purple-500",
      bgColor: "bg-purple-50"
    },
    { 
      label: "Risco de Churn", 
      value: stats?.at_risk ?? 0, 
      icon: AlertTriangle, 
      color: "text-orange-500",
      bgColor: "bg-orange-50"
    },
    { 
      label: "Churned", 
      value: stats?.churned ?? 0, 
      icon: UserX, 
      color: "text-red-500",
      bgColor: "bg-red-50"
    },
    { 
      label: "Taxa de Ativação", 
      value: `${stats?.activation_rate ?? 0}%`, 
      icon: Target, 
      color: "text-teal-500",
      bgColor: "bg-teal-50"
    },
  ];

  const pendingCards = [
    { 
      label: "Sem Importação", 
      value: stats?.no_import ?? 0, 
      icon: FileUp, 
      color: "text-amber-500"
    },
    { 
      label: "Sem Orçamento", 
      value: stats?.no_budget ?? 0, 
      icon: PiggyBank, 
      color: "text-amber-500"
    },
    { 
      label: "Sem Metas", 
      value: stats?.no_goals ?? 0, 
      icon: Target, 
      color: "text-amber-500"
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Customer Success</h2>
        <p className="text-muted-foreground">Visão geral de engajamento e saúde da base</p>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${kpi.bgColor}`}>
                    <Icon className={`w-6 h-6 ${kpi.color}`} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{kpi.label}</p>
                    {isLoading ? (
                      <Skeleton className="h-8 w-16" />
                    ) : (
                      <p className="text-2xl font-bold">{kpi.value}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Status Cards */}
      <Card>
        <CardHeader>
          <CardTitle>Status de Acompanhamento</CardTitle>
          <CardDescription>Distribuição dos usuários por status CS</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statusCards.map((card) => {
              const Icon = card.icon;
              return (
                <div 
                  key={card.label}
                  className={`p-4 rounded-lg ${card.bgColor} flex flex-col items-center justify-center text-center`}
                >
                  <Icon className={`w-8 h-8 ${card.color} mb-2`} />
                  {isLoading ? (
                    <Skeleton className="h-8 w-12" />
                  ) : (
                    <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
                  )}
                  <p className="text-sm text-muted-foreground mt-1">{card.label}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Pending Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Usuários Pendentes de Ação</CardTitle>
          <CardDescription>Usuários que ainda não completaram etapas importantes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {pendingCards.map((card) => {
              const Icon = card.icon;
              return (
                <div 
                  key={card.label}
                  className="p-4 rounded-lg border border-amber-200 bg-amber-50/50 flex items-center gap-4"
                >
                  <Icon className={`w-8 h-8 ${card.color}`} />
                  <div>
                    {isLoading ? (
                      <Skeleton className="h-8 w-12" />
                    ) : (
                      <p className="text-2xl font-bold text-amber-700">{card.value}</p>
                    )}
                    <p className="text-sm text-amber-600">{card.label}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Score Explanation */}
      <Card>
        <CardHeader>
          <CardTitle>Como o Score de Engajamento é calculado</CardTitle>
          <CardDescription>O score é transparente e baseado em ações reais do usuário</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="font-medium">Login Recente</p>
              <p className="text-muted-foreground">Até 25 pontos - login hoje/ontem = máximo</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="font-medium">Frequência de Uso</p>
              <p className="text-muted-foreground">Até 15 pontos - baseado em acessos no mês</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="font-medium">Importação Realizada</p>
              <p className="text-muted-foreground">20 pontos - usuário importou extrato</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="font-medium">Orçamentos Configurados</p>
              <p className="text-muted-foreground">15 pontos - possui orçamentos ativos</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="font-medium">Metas Criadas</p>
              <p className="text-muted-foreground">15 pontos - definiu metas financeiras</p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="font-medium">Lançamentos Manuais</p>
              <p className="text-muted-foreground">10 pontos - cadastrou transações manualmente</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
