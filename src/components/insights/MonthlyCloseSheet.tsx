import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  TrendingUp,
  TrendingDown,
  Lock,
  Unlock,
  Download,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Wallet,
} from "lucide-react";
import {
  useMonthlyReportDetail,
  useCloseMonth,
  useReopenMonth,
  useRequestPdfExport,
} from "@/hooks/useInsightsHub";
import { getCategoryById } from "@/data/categories";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface MonthlyCloseSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  monthRef: string;
}

export function MonthlyCloseSheet({
  open,
  onOpenChange,
  monthRef,
}: MonthlyCloseSheetProps) {
  const navigate = useNavigate();
  const [confirmClose, setConfirmClose] = useState(false);
  const [confirmReopen, setConfirmReopen] = useState(false);

  const { data: report, isLoading } = useMonthlyReportDetail(monthRef);
  const closeMonth = useCloseMonth();
  const reopenMonth = useReopenMonth();
  const requestPdf = useRequestPdfExport();

  if (!monthRef) return null;

  const monthDate = parse(monthRef, "yyyy-MM", new Date());
  const monthLabel = format(monthDate, "MMMM yyyy", { locale: ptBR });
  const isClosed = report?.status === "closed";

  const handleClose = () => {
    if (!report) return;
    closeMonth.mutate({
      monthRef,
      summary: report.summary,
      issues: report.issues,
    });
    setConfirmClose(false);
  };

  const handleReopen = () => {
    reopenMonth.mutate(monthRef);
    setConfirmReopen(false);
  };

  const handleIssueClick = (actionUrl?: string) => {
    if (actionUrl) {
      onOpenChange(false);
      navigate(actionUrl);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
          <SheetHeader className="text-left pb-4">
            <div className="flex items-center justify-between">
              <div>
                <SheetTitle className="capitalize">
                  Fechamento de {monthLabel}
                </SheetTitle>
                <SheetDescription>
                  Revise o resumo e pendências do mês
                </SheetDescription>
              </div>
              <Badge variant={isClosed ? "default" : "secondary"}>
                {isClosed ? (
                  <>
                    <Lock className="h-3 w-3 mr-1" />
                    Fechado
                  </>
                ) : (
                  <>
                    <Unlock className="h-3 w-3 mr-1" />
                    Aberto
                  </>
                )}
              </Badge>
            </div>
          </SheetHeader>

          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : report ? (
            <div className="space-y-6 pb-8">
              {/* Summary Card */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    Resumo do mês
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Income */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-success">
                      <TrendingUp className="h-4 w-4" />
                      <span className="text-sm">Receitas</span>
                    </div>
                    <span className="font-semibold text-success">
                      {report.summary.income.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </span>
                  </div>

                  {/* Expenses */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-destructive">
                      <TrendingDown className="h-4 w-4" />
                      <span className="text-sm">Despesas</span>
                    </div>
                    <span className="font-semibold text-destructive">
                      {report.summary.expenses.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </span>
                  </div>

                  <Separator />

                  {/* Balance */}
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Saldo do mês</span>
                    <span
                      className={cn(
                        "text-lg font-bold",
                        report.summary.balance >= 0
                          ? "text-success"
                          : "text-destructive"
                      )}
                    >
                      {report.summary.balance.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </span>
                  </div>

                  {/* Transaction count */}
                  <div className="text-xs text-muted-foreground text-center">
                    {report.transactionCount || 0} transações registradas
                  </div>
                </CardContent>
              </Card>

              {/* Top Categories */}
              {report.summary.topCategories.length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">
                      Principais categorias
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {report.summary.topCategories.map((cat, index) => {
                      const category = getCategoryById(cat.categoryId);
                      return (
                        <div
                          key={cat.categoryId}
                          className="flex items-center gap-3"
                        >
                          <div
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{
                              backgroundColor: category?.color || "hsl(var(--muted))",
                            }}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium truncate">
                                {category?.name || cat.categoryId}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {cat.percentage.toFixed(0)}%
                              </span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${Math.min(cat.percentage, 100)}%`,
                                  backgroundColor: category?.color || "hsl(var(--primary))",
                                }}
                              />
                            </div>
                          </div>
                          <span className="text-sm font-semibold shrink-0">
                            {cat.amount.toLocaleString("pt-BR", {
                              style: "currency",
                              currency: "BRL",
                            })}
                          </span>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}

              {/* Issues/Pendencies */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Pendências do mês
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {report.issues.length === 0 ? (
                    <div className="flex items-center gap-3 py-4 text-success">
                      <CheckCircle2 className="h-5 w-5" />
                      <span className="text-sm">
                        Nenhuma pendência identificada
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {report.issues.map((issue) => (
                        <div
                          key={issue.id}
                          className={cn(
                            "flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                            issue.severity === "high"
                              ? "bg-destructive/10 hover:bg-destructive/15"
                              : issue.severity === "medium"
                              ? "bg-warning/10 hover:bg-warning/15"
                              : "bg-muted hover:bg-muted/80"
                          )}
                          onClick={() => handleIssueClick(issue.actionUrl)}
                        >
                          <AlertCircle
                            className={cn(
                              "h-5 w-5 mt-0.5 shrink-0",
                              issue.severity === "high"
                                ? "text-destructive"
                                : issue.severity === "medium"
                                ? "text-warning"
                                : "text-muted-foreground"
                            )}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{issue.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {issue.description}
                            </p>
                          </div>
                          {issue.actionUrl && (
                            <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Actions */}
              <div className="flex flex-col gap-3">
                {isClosed ? (
                  <>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setConfirmReopen(true)}
                    >
                      <Unlock className="h-4 w-4 mr-2" />
                      Reabrir mês
                    </Button>
                    {report.closed_at && (
                      <p className="text-xs text-center text-muted-foreground">
                        Fechado em{" "}
                        {format(new Date(report.closed_at), "dd/MM/yyyy 'às' HH:mm", {
                          locale: ptBR,
                        })}
                      </p>
                    )}
                  </>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() => setConfirmClose(true)}
                    disabled={closeMonth.isPending}
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    Fechar mês
                  </Button>
                )}

                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => requestPdf.mutate(monthRef)}
                  disabled={requestPdf.isPending}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {requestPdf.isPending ? "Gerando..." : "Baixar PDF"}
                </Button>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Confirm Close Dialog */}
      <AlertDialog open={confirmClose} onOpenChange={setConfirmClose}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fechar o mês?</AlertDialogTitle>
            <AlertDialogDescription>
              Ao fechar o mês, o resumo será salvo e você receberá um alerta
              caso tente editar transações deste período. Você pode reabrir
              o mês a qualquer momento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleClose}>
              Fechar mês
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Reopen Dialog */}
      <AlertDialog open={confirmReopen} onOpenChange={setConfirmReopen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reabrir o mês?</AlertDialogTitle>
            <AlertDialogDescription>
              Ao reabrir, você poderá editar as transações normalmente.
              O status de fechamento será removido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleReopen}>
              Reabrir mês
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
