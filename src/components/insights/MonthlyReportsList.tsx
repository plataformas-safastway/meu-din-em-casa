import { FileText, Lock, Unlock, Download, ChevronRight, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MonthlyReport, useRequestPdfExport } from "@/hooks/useInsightsHub";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface MonthlyReportsListProps {
  reports: MonthlyReport[];
  isLoading: boolean;
  onViewReport: (monthRef: string) => void;
}

export function MonthlyReportsList({ reports, isLoading, onViewReport }: MonthlyReportsListProps) {
  const requestPdf = useRequestPdfExport();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">Nenhum relatório disponível</h3>
          <p className="text-muted-foreground text-sm">
            Os relatórios mensais aparecerão aqui conforme você usa o app.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {reports.map((report) => {
        const monthDate = parse(report.month_ref, "yyyy-MM", new Date());
        const monthLabel = format(monthDate, "MMMM yyyy", { locale: ptBR });
        const isClosed = report.status === "closed";
        const hasIssues = report.issues.length > 0;
        const hasSummary = report.summary.income > 0 || report.summary.expenses > 0;

        return (
          <Card
            key={report.month_ref}
            className={cn(
              "transition-all duration-200 hover:shadow-md cursor-pointer",
              isClosed && "border-success/30 bg-success/5"
            )}
            onClick={() => onViewReport(report.month_ref)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                {/* Status Icon */}
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                    isClosed ? "bg-success/20" : "bg-muted"
                  )}
                >
                  {isClosed ? (
                    <Lock className="h-5 w-5 text-success" />
                  ) : (
                    <Unlock className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className="font-semibold capitalize">
                      {monthLabel}
                    </h3>
                    <Badge variant={isClosed ? "default" : "secondary"}>
                      {isClosed ? "Fechado" : "Aberto"}
                    </Badge>
                  </div>

                  {hasSummary ? (
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                      <span className="text-success">
                        +{report.summary.income.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </span>
                      <span className="text-destructive">
                        -{report.summary.expenses.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </span>
                      <span
                        className={cn(
                          "font-medium",
                          report.summary.balance >= 0
                            ? "text-success"
                            : "text-destructive"
                        )}
                      >
                        Saldo:{" "}
                        {report.summary.balance.toLocaleString("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        })}
                      </span>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Sem dados para este período
                    </p>
                  )}

                  {hasIssues && (
                    <div className="flex items-center gap-1 mt-2 text-warning">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-xs">
                        {report.issues.length} pendência(s)
                      </span>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={(e) => {
                      e.stopPropagation();
                      requestPdf.mutate(report.month_ref);
                    }}
                    disabled={requestPdf.isPending}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
