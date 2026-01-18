import { useQuery } from "@tanstack/react-query";
import { BarChart3, Users, TrendingUp, DollarSign, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export function AdminMetricsPage() {
  const { data: metrics, isLoading } = useQuery({
    queryKey: ['admin-metrics'],
    queryFn: async () => {
      // Get total families
      const { count: familiesCount } = await supabase
        .from('families')
        .select('*', { count: 'exact', head: true });

      // Get total family members
      const { count: membersCount } = await supabase
        .from('family_members')
        .select('*', { count: 'exact', head: true });

      // Get total transactions this month
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count: transactionsCount } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfMonth.toISOString());

      // Get total ebooks
      const { count: ebooksCount } = await supabase
        .from('ebook_ctas')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      // Get total goals
      const { count: goalsCount } = await supabase
        .from('goals')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'ACTIVE');

      return {
        families: familiesCount || 0,
        members: membersCount || 0,
        transactionsThisMonth: transactionsCount || 0,
        ebooks: ebooksCount || 0,
        activeGoals: goalsCount || 0,
      };
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const statsCards = [
    {
      title: "Famílias",
      value: metrics?.families || 0,
      description: "Total de famílias cadastradas",
      icon: Users,
      color: "text-blue-500",
    },
    {
      title: "Usuários",
      value: metrics?.members || 0,
      description: "Total de membros",
      icon: Users,
      color: "text-green-500",
    },
    {
      title: "Transações (mês)",
      value: metrics?.transactionsThisMonth || 0,
      description: "Lançamentos este mês",
      icon: TrendingUp,
      color: "text-orange-500",
    },
    {
      title: "eBooks Ativos",
      value: metrics?.ebooks || 0,
      description: "Conteúdo publicado",
      icon: BarChart3,
      color: "text-purple-500",
    },
    {
      title: "Metas Ativas",
      value: metrics?.activeGoals || 0,
      description: "Metas em andamento",
      icon: DollarSign,
      color: "text-teal-500",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Métricas</h2>
        <p className="text-muted-foreground">Acompanhe o uso do sistema</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statsCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {stat.title}
                  </CardTitle>
                  <Icon className={`w-4 h-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{stat.value.toLocaleString('pt-BR')}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Future: Add charts and graphs */}
      <Card>
        <CardHeader>
          <CardTitle>Evolução Mensal</CardTitle>
          <CardDescription>Gráficos de crescimento (em desenvolvimento)</CardDescription>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center text-muted-foreground">
          <BarChart3 className="w-12 h-12 opacity-50" />
        </CardContent>
      </Card>
    </div>
  );
}
