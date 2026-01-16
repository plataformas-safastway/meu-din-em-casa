import { useState } from "react";
import { ArrowLeft, Calendar, Mail, Settings, Loader2, TrendingUp, TrendingDown, AlertCircle, Sparkles, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { 
  useMonthlyReports, 
  useLatestMonthlyReport, 
  useGenerateMonthlyReport,
  useReportSettings,
  useUpdateReportSettings,
  MonthlyReport
} from "@/hooks/useMonthlyReports";

interface MonthlyReportsPageProps {
  onBack: () => void;
}

const monthNames = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

function ReportCard({ report }: { report: MonthlyReport }) {
  const content = report.report_content;
  const isPositive = content.balance >= 0;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">
            {monthNames[report.month - 1]} {report.year}
          </CardTitle>
          <div className={cn(
            "text-sm font-semibold px-3 py-1 rounded-full",
            isPositive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
          )}>
            {isPositive ? "+" : ""}{formatCurrency(content.balance)}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 rounded-xl bg-success/5 border border-success/10">
            <p className="text-xs text-muted-foreground mb-1">Receitas</p>
            <p className="font-semibold text-success">{formatCurrency(content.income)}</p>
          </div>
          <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/10">
            <p className="text-xs text-muted-foreground mb-1">Despesas</p>
            <p className="font-semibold text-destructive">{formatCurrency(content.expenses)}</p>
          </div>
        </div>

        {/* Top Categories */}
        {content.topCategories.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Top Categorias</p>
            <div className="space-y-2">
              {content.topCategories.map((cat, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{cat.name}</span>
                  <span className="font-medium">{formatCurrency(cat.amount)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Analysis */}
        {content.aiReport && (
          <div className="p-3 rounded-xl bg-primary/5 border border-primary/10">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <p className="text-xs font-medium text-primary">Análise</p>
            </div>
            <p className="text-sm text-foreground leading-relaxed">
              {content.aiReport.diagnosis}
            </p>
            
            {content.aiReport.recommendations.length > 0 && (
              <div className="mt-3 pt-3 border-t border-primary/10">
                <p className="text-xs font-medium text-muted-foreground mb-1">Recomendações:</p>
                <ul className="text-sm text-foreground space-y-1">
                  {content.aiReport.recommendations.slice(0, 2).map((rec, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Email status */}
        {report.email_sent_at && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Mail className="w-3 h-3" />
            <span>Enviado em {new Date(report.email_sent_at).toLocaleDateString("pt-BR")}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ReportSettings() {
  const { data: settings, isLoading } = useReportSettings();
  const updateSettings = useUpdateReportSettings();
  
  const [enabled, setEnabled] = useState(settings?.email_report_enabled ?? false);
  const [day, setDay] = useState(String(settings?.email_report_day ?? 1));
  const [email, setEmail] = useState(settings?.email_report_recipient ?? "");

  const handleSave = () => {
    updateSettings.mutate({
      email_report_enabled: enabled,
      email_report_day: parseInt(day),
      email_report_recipient: email || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Configurações do Relatório
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Receber por e-mail</Label>
            <p className="text-xs text-muted-foreground">
              Enviar relatório mensal automaticamente
            </p>
          </div>
          <Switch
            checked={enabled}
            onCheckedChange={setEnabled}
          />
        </div>

        {enabled && (
          <>
            <div className="space-y-2">
              <Label className="text-sm">E-mail destinatário</Label>
              <Input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Dia de envio</Label>
              <Select value={day} onValueChange={setDay}>
                <SelectTrigger className="h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      Dia {d} do mês
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                O relatório será enviado no dia selecionado, referente ao mês anterior.
              </p>
            </div>
          </>
        )}

        <Button 
          onClick={handleSave} 
          disabled={updateSettings.isPending}
          className="w-full"
        >
          {updateSettings.isPending ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            "Salvar configurações"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

export function MonthlyReportsPage({ onBack }: MonthlyReportsPageProps) {
  const { data: reports, isLoading } = useMonthlyReports();
  const generateReport = useGenerateMonthlyReport();

  const handleGenerateReport = () => {
    generateReport.mutate({});
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container flex items-center gap-4 px-4 py-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Relatórios Mensais</h1>
            <p className="text-sm text-muted-foreground">
              Análise financeira com IA
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerateReport}
            disabled={generateReport.isPending}
          >
            {generateReport.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
        </div>
      </header>

      <main className="container px-4 py-6">
        <Tabs defaultValue="reports" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="reports">Relatórios</TabsTrigger>
            <TabsTrigger value="settings">Configurações</TabsTrigger>
          </TabsList>

          <TabsContent value="reports" className="space-y-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : reports && reports.length > 0 ? (
              <div className="space-y-4">
                {reports.map((report) => (
                  <ReportCard key={report.id} report={report} />
                ))}
              </div>
            ) : (
              <Card className="p-8 text-center">
                <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-7 h-7 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">
                  Nenhum relatório ainda
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  O primeiro relatório será gerado automaticamente no início do próximo mês, 
                  ou você pode gerar um agora.
                </p>
                <Button onClick={handleGenerateReport} disabled={generateReport.isPending}>
                  {generateReport.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Gerando...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Gerar relatório do mês anterior
                    </>
                  )}
                </Button>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="settings">
            <ReportSettings />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
