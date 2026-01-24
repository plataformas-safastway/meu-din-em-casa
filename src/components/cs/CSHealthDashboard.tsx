import { 
  Users, 
  UserCheck, 
  AlertTriangle, 
  TrendingUp,
  Heart,
  Activity,
  Brain,
  Target
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { calculateStageForFamily, type UserStage, STAGE_CONFIG } from "@/hooks/useUserStage";

/**
 * CS Health Dashboard
 * 
 * Displays aggregated user stage distribution and health metrics
 * for the CS team to prioritize actions.
 */
export function CSHealthDashboard() {
  const { data: healthData, isLoading } = useQuery({
    queryKey: ['cs-health-dashboard'],
    queryFn: async () => {
      // Get all families with metrics
      const { data: families } = await supabase
        .from('families')
        .select('id, created_at');

      const { data: metrics } = await supabase
        .from('cs_engagement_metrics')
        .select('*');

      const { data: transactions } = await supabase
        .from('transactions')
        .select('family_id');

      // Count transactions per family
      const txCountByFamily = new Map<string, number>();
      transactions?.forEach(tx => {
        const count = txCountByFamily.get(tx.family_id) || 0;
        txCountByFamily.set(tx.family_id, count + 1);
      });

      // Build metrics map
      const metricsMap = new Map(metrics?.map(m => [m.family_id, m]));

      // Calculate stage for each family
      const stageDistribution: Record<UserStage, number> = {
        new: 0,
        activated: 0,
        engaged: 0,
        stagnant: 0,
        churn_risk: 0,
        healthy_active: 0,
      };

      let totalChurnScore = 0;
      let highRiskCount = 0;
      let mediumRiskCount = 0;

      families?.forEach(family => {
        const m = metricsMap.get(family.id);
        const stageData = calculateStageForFamily({
          lastLoginAt: m?.last_login_at || null,
          totalLogins30d: m?.total_logins_30d || 0,
          hasImport: m?.has_import || false,
          hasBudget: m?.has_budget || false,
          hasGoals: m?.has_goals || false,
          hasManualTransactions: m?.has_manual_transactions || false,
          transactionCount: txCountByFamily.get(family.id) || 0,
          createdAt: family.created_at,
        });

        stageDistribution[stageData.stage]++;
        totalChurnScore += stageData.churnScore;

        if (stageData.churnLevel === 'high') highRiskCount++;
        if (stageData.churnLevel === 'medium') mediumRiskCount++;
      });

      const totalUsers = families?.length || 1;
      const avgChurnScore = Math.round(totalChurnScore / totalUsers);

      // Health score: inverse of churn risk
      const healthScore = Math.max(0, 100 - avgChurnScore);

      return {
        stageDistribution,
        totalUsers,
        avgChurnScore,
        healthScore,
        highRiskCount,
        mediumRiskCount,
        healthyCount: stageDistribution.healthy_active + stageDistribution.engaged,
      };
    },
    staleTime: 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const stages: UserStage[] = ['healthy_active', 'engaged', 'activated', 'new', 'stagnant', 'churn_risk'];

  return (
    <div className="space-y-6">
      {/* Health Score Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-lg ${healthData?.healthScore && healthData.healthScore >= 70 ? 'bg-green-100' : healthData?.healthScore && healthData.healthScore >= 40 ? 'bg-amber-100' : 'bg-red-100'}`}>
                <Heart className={`w-6 h-6 ${healthData?.healthScore && healthData.healthScore >= 70 ? 'text-green-600' : healthData?.healthScore && healthData.healthScore >= 40 ? 'text-amber-600' : 'text-red-600'}`} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Saúde da Base</p>
                <p className="text-3xl font-bold">{healthData?.healthScore}%</p>
              </div>
            </div>
            <Progress 
              value={healthData?.healthScore} 
              className="h-2 mt-3"
              indicatorClassName={healthData?.healthScore && healthData.healthScore >= 70 ? 'bg-green-500' : healthData?.healthScore && healthData.healthScore >= 40 ? 'bg-amber-500' : 'bg-red-500'}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-red-100">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Alto Risco</p>
                <p className="text-3xl font-bold text-red-600">{healthData?.highRiskCount}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Usuários que precisam de atenção urgente
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-100">
                <UserCheck className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Saudáveis</p>
                <p className="text-3xl font-bold text-green-600">{healthData?.healthyCount}</p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Usuários engajados e ativos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Stage Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Distribuição por Estágio
          </CardTitle>
          <CardDescription>
            Classificação automática baseada em padrões de uso
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stages.map((stage) => {
              const count = healthData?.stageDistribution[stage] || 0;
              const percentage = healthData?.totalUsers 
                ? Math.round((count / healthData.totalUsers) * 100) 
                : 0;
              const config = STAGE_CONFIG[stage];

              return (
                <div key={stage} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge className={`${config.bgColor} ${config.color} border-0`}>
                        {config.label}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {config.description}
                      </span>
                    </div>
                    <span className="font-medium">{count} ({percentage}%)</span>
                  </div>
                  <Progress 
                    value={percentage} 
                    className="h-2"
                  />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* AI Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            Insights da IA
          </CardTitle>
          <CardDescription>
            Análises automáticas para guiar ações de CS
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {healthData?.highRiskCount && healthData.highRiskCount > 0 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/30">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800 dark:text-red-200">
                    {healthData.highRiskCount} usuário(s) em risco de churn
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    Recomendação: Priorize contato proativo e empático
                  </p>
                </div>
              </div>
            )}

            {healthData?.stageDistribution.new && healthData.stageDistribution.new > 0 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30">
                <Target className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-blue-800 dark:text-blue-200">
                    {healthData.stageDistribution.new} usuário(s) novo(s)
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Oportunidade: Onboarding guiado pode aumentar ativação
                  </p>
                </div>
              </div>
            )}

            {healthData?.healthScore && healthData.healthScore >= 70 && (
              <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/30">
                <Heart className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-green-800 dark:text-green-200">
                    Base saudável!
                  </p>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    A maioria dos usuários está engajada. Foco em manter qualidade.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
