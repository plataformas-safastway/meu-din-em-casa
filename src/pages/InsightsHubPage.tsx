import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Lightbulb, FileText, TrendingUp, AlertTriangle, CheckCircle2, Info, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { MonthSelector } from "@/components/MonthSelector";
import { InsightCard } from "@/components/insights/InsightCard";
import { MonthlyReportsList } from "@/components/insights/MonthlyReportsList";
import { MonthlyCloseSheet } from "@/components/insights/MonthlyCloseSheet";
import { useContextualInsights, useMonthlyReportsList } from "@/hooks/useInsightsHub";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function InsightsHubPage() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState("insights");
  const [selectedMonthRef, setSelectedMonthRef] = useState<string | null>(null);

  const selectedMonth = selectedDate.getMonth();
  const selectedYear = selectedDate.getFullYear();
  const currentMonthRef = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`;

  const { data: insights, isLoading: loadingInsights } = useContextualInsights(selectedMonth, selectedYear);
  const { data: reports, isLoading: loadingReports } = useMonthlyReportsList();

  const hasInsights = insights && insights.length > 0;
  const hasNoData = !loadingInsights && !hasInsights;

  const handleViewReport = (monthRef: string) => {
    setSelectedMonthRef(monthRef);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-bold">Insights</h1>
              <p className="text-sm text-muted-foreground">
                Recomendações e visão do seu mês
              </p>
            </div>
          </div>
        </div>
      </div>

      <main className="container px-4 py-4 space-y-4">
        {/* Month Selector */}
        <MonthSelector selectedDate={selectedDate} onMonthChange={setSelectedDate} />

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="insights" className="flex items-center gap-2">
              <Lightbulb className="h-4 w-4" />
              Insights do mês
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Relatórios
            </TabsTrigger>
          </TabsList>

          {/* Insights Tab */}
          <TabsContent value="insights" className="mt-4 space-y-4">
            {loadingInsights ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-32 w-full rounded-xl" />
                ))}
              </div>
            ) : hasNoData ? (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                    <Lightbulb className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-semibold text-lg mb-2">
                    Ainda não temos dados suficientes
                  </h3>
                  <p className="text-muted-foreground text-sm max-w-sm">
                    Comece lançando suas receitas e despesas para receber
                    insights personalizados sobre suas finanças.
                  </p>
                  <Button
                    className="mt-6"
                    onClick={() => navigate("/extrato")}
                  >
                    Começar a lançar
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {insights?.map((insight) => (
                  <InsightCard
                    key={insight.id}
                    insight={insight}
                    onClick={() => insight.actionUrl && navigate(insight.actionUrl)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Reports Tab */}
          <TabsContent value="reports" className="mt-4">
            <MonthlyReportsList
              reports={reports || []}
              isLoading={loadingReports}
              onViewReport={handleViewReport}
            />
          </TabsContent>
        </Tabs>
      </main>

      {/* Monthly Close Sheet */}
      <MonthlyCloseSheet
        open={!!selectedMonthRef}
        onOpenChange={(open) => !open && setSelectedMonthRef(null)}
        monthRef={selectedMonthRef || ""}
      />
    </div>
  );
}
