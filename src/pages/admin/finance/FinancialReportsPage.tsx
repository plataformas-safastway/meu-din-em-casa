import { useState } from "react";
import { 
  Download, 
  FileSpreadsheet,
  Calendar,
  TrendingUp,
  Users,
  AlertTriangle,
  DollarSign,
  Loader2,
  FileText
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { 
  useFinancialMetrics,
  useUserSubscriptions,
  useSubscriptionPayments,
  useInvoices
} from "@/hooks/useFinancialModule";
import { formatCurrency } from "@/lib/formatters";
import { format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { exportToExcel } from "@/lib/excelParser";

// Mask CPF for LGPD
function maskCPF(cpf: string): string {
  if (!cpf) return "";
  if (cpf.length === 11) {
    return `***.***.***.${cpf.slice(-2)}`;
  }
  return cpf.slice(0, 3) + "***" + cpf.slice(-2);
}

interface ReportType {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const REPORT_TYPES: ReportType[] = [
  {
    id: "faturamento",
    title: "Relatório de Faturamento",
    description: "Receitas mensais por plano e método de pagamento",
    icon: DollarSign,
    color: "text-green-500"
  },
  {
    id: "inadimplencia",
    title: "Relatório de Inadimplência",
    description: "Usuários em atraso e valores pendentes",
    icon: AlertTriangle,
    color: "text-orange-500"
  },
  {
    id: "churn",
    title: "Relatório de Churn",
    description: "Análise de cancelamentos e motivos",
    icon: TrendingUp,
    color: "text-red-500"
  },
  {
    id: "planos",
    title: "Relatório por Plano",
    description: "Distribuição de usuários por plano de assinatura",
    icon: Users,
    color: "text-blue-500"
  },
];

export function FinancialReportsPage() {
  const [selectedReport, setSelectedReport] = useState<string>("faturamento");
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), "yyyy-MM"));
  const [isExporting, setIsExporting] = useState(false);

  const { data: metrics } = useFinancialMetrics();
  const { data: subscriptions } = useUserSubscriptions();
  const { data: payments } = useSubscriptionPayments();
  const { data: invoices } = useInvoices();

  const months = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return {
      value: format(date, "yyyy-MM"),
      label: format(date, "MMMM yyyy", { locale: ptBR })
    };
  });

  const generateReport = async (reportId: string, exportFormat: 'csv' | 'xlsx') => {
    setIsExporting(true);
    
    try {
      let data: Record<string, unknown>[] = [];
      let filename = "";

      switch (reportId) {
        case "faturamento":
          data = (payments || [])
            .filter(p => p.status === 'paid')
            .map(p => ({
              "Data": p.paid_at ? format(new Date(p.paid_at), "dd/MM/yyyy") : "—",
              "Família": p.family?.name || "—",
              "Plano": p.subscription?.plan?.name || "—",
              "Valor": p.amount,
              "Método": p.payment_method || "—",
            }));
          filename = `faturamento_${selectedMonth}`;
          break;

        case "inadimplencia":
          data = (subscriptions || [])
            .filter(s => s.status === 'overdue')
            .map(s => ({
              "Família": s.family?.name || "—",
              "Plano": s.plan?.name || "—",
              "Valor Mensal": s.plan?.price || 0,
              "Status": "Inadimplente",
              "Desde": s.started_at ? format(new Date(s.started_at), "dd/MM/yyyy") : "—",
              "Observações": s.notes || "",
            }));
          
          // Add pending payments
          const overduePayments = (payments || []).filter(p => 
            p.status === 'failed' || 
            (p.status === 'pending' && new Date(p.due_date) < new Date())
          );
          
          overduePayments.forEach(p => {
            data.push({
              "Família": p.family?.name || "—",
              "Plano": p.subscription?.plan?.name || "—",
              "Valor Mensal": p.amount,
              "Status": p.status === 'failed' ? "Pagamento Falhou" : "Vencido",
              "Desde": format(new Date(p.due_date), "dd/MM/yyyy"),
              "Observações": p.failure_reason || "",
            });
          });
          
          filename = `inadimplencia_${selectedMonth}`;
          break;

        case "churn":
          data = (subscriptions || [])
            .filter(s => s.status === 'cancelled')
            .map(s => ({
              "Família": s.family?.name || "—",
              "Plano": s.plan?.name || "—",
              "Data Início": s.started_at ? format(new Date(s.started_at), "dd/MM/yyyy") : "—",
              "Data Cancelamento": s.cancelled_at ? format(new Date(s.cancelled_at), "dd/MM/yyyy") : "—",
              "Motivo": s.cancellation_reason || "Não informado",
              "Tempo como Cliente (dias)": s.started_at && s.cancelled_at 
                ? Math.floor((new Date(s.cancelled_at).getTime() - new Date(s.started_at).getTime()) / (1000 * 60 * 60 * 24))
                : "—",
            }));
          filename = `churn_${selectedMonth}`;
          break;

        case "planos":
          // Group by plan
          const planGroups: Record<string, { count: number; revenue: number; name: string }> = {};
          
          (subscriptions || []).forEach(s => {
            const planName = s.plan?.name || "Sem plano";
            if (!planGroups[planName]) {
              planGroups[planName] = { count: 0, revenue: 0, name: planName };
            }
            planGroups[planName].count++;
            if (s.status === 'active') {
              planGroups[planName].revenue += s.plan?.price || 0;
            }
          });

          data = Object.values(planGroups).map(g => ({
            "Plano": g.name,
            "Total de Usuários": g.count,
            "Receita Mensal Estimada": g.revenue,
          }));
          filename = `planos_${selectedMonth}`;
          break;
      }

      if (data.length === 0) {
        toast.error("Nenhum dado disponível para exportar");
        return;
      }

      // Use secure ExcelJS export
      await exportToExcel(data, filename, "Relatório");

      toast.success("Relatório exportado com sucesso");
    } catch (error) {
      console.error("Error generating report:", error);
      toast.error("Erro ao gerar relatório");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Relatórios Financeiros</h2>
        <p className="text-muted-foreground">Gere e exporte relatórios detalhados</p>
      </div>

      {/* LGPD Notice */}
      <Card className="border-yellow-500/20 bg-yellow-500/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-500 mt-0.5" />
            <div>
              <p className="font-medium text-yellow-600">Conformidade LGPD</p>
              <p className="text-sm text-muted-foreground">
                Os relatórios exportados mascaram automaticamente dados sensíveis (CPF/CNPJ). 
                Dados bancários e informações de cartão não são incluídos nas exportações.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="space-y-2 flex-1">
              <Label>Período</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <Calendar className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Selecione o mês" />
                </SelectTrigger>
                <SelectContent>
                  {months.map(month => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {REPORT_TYPES.map((report) => {
          const Icon = report.icon;
          const isSelected = selectedReport === report.id;
          
          return (
            <Card 
              key={report.id}
              className={`cursor-pointer transition-all ${
                isSelected ? 'ring-2 ring-primary' : 'hover:bg-muted/50'
              }`}
              onClick={() => setSelectedReport(report.id)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-muted`}>
                      <Icon className={`w-5 h-5 ${report.color}`} />
                    </div>
                    <div>
                      <CardTitle className="text-base">{report.title}</CardTitle>
                      <CardDescription className="text-sm">
                        {report.description}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              {isSelected && (
                <CardContent className="pt-0">
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        generateReport(report.id, 'csv');
                      }}
                      disabled={isExporting}
                    >
                      {isExporting ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <FileText className="w-4 h-4 mr-2" />
                      )}
                      CSV
                    </Button>
                    <Button 
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        generateReport(report.id, 'xlsx');
                      }}
                      disabled={isExporting}
                    >
                      {isExporting ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <FileSpreadsheet className="w-4 h-4 mr-2" />
                      )}
                      Excel
                    </Button>
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Quick Stats */}
      {metrics && (
        <Card>
          <CardHeader>
            <CardTitle>Resumo do Período</CardTitle>
            <CardDescription>Dados agregados para {format(new Date(selectedMonth), "MMMM yyyy", { locale: ptBR })}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Receita</p>
                <p className="text-xl font-bold text-green-500">
                  {formatCurrency(metrics.revenueThisMonth)}
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Usuários Ativos</p>
                <p className="text-xl font-bold">{metrics.activeUsers}</p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Churn</p>
                <p className="text-xl font-bold text-orange-500">
                  {metrics.churnRate.toFixed(1)}%
                </p>
              </div>
              <div className="p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Inadimplência</p>
                <p className="text-xl font-bold text-red-500">
                  {formatCurrency(metrics.inadimplenciaValue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
