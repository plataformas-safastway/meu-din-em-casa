import { useState } from "react";
import { 
  Search, 
  Filter, 
  MoreVertical,
  Calendar,
  RefreshCw,
  Download,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  Receipt
} from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  useSubscriptionPayments, 
  useRetryPayment,
  SubscriptionPayment 
} from "@/hooks/useFinancialModule";
import { formatCurrency } from "@/lib/formatters";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import * as XLSX from "xlsx";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending: { label: "Pendente", color: "bg-yellow-500/10 text-yellow-500", icon: Clock },
  processing: { label: "Processando", color: "bg-blue-500/10 text-blue-500", icon: RefreshCw },
  paid: { label: "Pago", color: "bg-green-500/10 text-green-500", icon: CheckCircle2 },
  failed: { label: "Falhou", color: "bg-red-500/10 text-red-500", icon: XCircle },
  refunded: { label: "Estornado", color: "bg-purple-500/10 text-purple-500", icon: RefreshCw },
  cancelled: { label: "Cancelado", color: "bg-gray-500/10 text-gray-500", icon: XCircle },
};

export function FinancialPaymentsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: payments, isLoading } = useSubscriptionPayments(
    statusFilter !== "all" ? { status: statusFilter } : undefined
  );
  const retryPayment = useRetryPayment();

  const filteredPayments = (payments || []).filter(payment => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return payment.family?.name?.toLowerCase().includes(searchLower);
  });

  // Stats
  const stats = {
    total: payments?.length || 0,
    paid: payments?.filter(p => p.status === 'paid').length || 0,
    pending: payments?.filter(p => p.status === 'pending').length || 0,
    failed: payments?.filter(p => p.status === 'failed').length || 0,
  };

  const handleRetry = async (paymentId: string) => {
    await retryPayment.mutateAsync(paymentId);
  };

  const handleExport = () => {
    if (!filteredPayments.length) {
      toast.error("Nenhum dado para exportar");
      return;
    }

    const exportData = filteredPayments.map(payment => ({
      "Família": payment.family?.name || "—",
      "Valor": payment.amount,
      "Status": STATUS_CONFIG[payment.status]?.label || payment.status,
      "Método": payment.payment_method || "—",
      "Vencimento": format(new Date(payment.due_date), "dd/MM/yyyy"),
      "Data Pagamento": payment.paid_at 
        ? format(new Date(payment.paid_at), "dd/MM/yyyy HH:mm") 
        : "—",
      "Tentativas": payment.attempts,
      "Motivo Falha": payment.failure_reason || "—",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Cobranças");
    XLSX.writeFile(wb, `cobrancas_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    
    toast.success("Relatório exportado com sucesso");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold">Mensalidades e Cobranças</h2>
          <p className="text-muted-foreground">Gerencie pagamentos e reprocesse cobranças</p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="w-4 h-4 mr-2" />
          Exportar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Total</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Pagos</p>
            <p className="text-2xl font-bold text-green-500">{stats.paid}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Pendentes</p>
            <p className="text-2xl font-bold text-yellow-500">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Falhas</p>
            <p className="text-2xl font-bold text-red-500">{stats.failed}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome da família..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="processing">Processando</SelectItem>
                <SelectItem value="paid">Pago</SelectItem>
                <SelectItem value="failed">Falhou</SelectItem>
                <SelectItem value="refunded">Estornado</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Cobranças</CardTitle>
          <CardDescription>
            {filteredPayments.length} registro(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Família</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Método</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Tentativas</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Nenhuma cobrança encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filteredPayments.map((payment) => {
                  const statusConfig = STATUS_CONFIG[payment.status] || STATUS_CONFIG.pending;
                  const StatusIcon = statusConfig.icon;
                  const isOverdue = new Date(payment.due_date) < new Date() && payment.status === 'pending';
                  
                  return (
                    <TableRow key={payment.id}>
                      <TableCell>
                        <div className="font-medium">{payment.family?.name || "—"}</div>
                        {payment.subscription?.plan?.name && (
                          <div className="text-xs text-muted-foreground">
                            {payment.subscription.plan.name}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={statusConfig.color}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusConfig.label}
                        </Badge>
                        {isOverdue && (
                          <Badge variant="destructive" className="ml-1 text-xs">
                            Vencido
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {payment.payment_method || <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-muted-foreground" />
                          {format(new Date(payment.due_date), "dd/MM/yyyy", { locale: ptBR })}
                        </div>
                        {payment.paid_at && (
                          <div className="text-xs text-green-500">
                            Pago em {format(new Date(payment.paid_at), "dd/MM HH:mm")}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1" title={payment.failure_reason || undefined}>
                          {payment.attempts}
                          {payment.failure_reason && (
                            <AlertCircle className="w-3 h-3 text-red-500" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {(payment.status === 'failed' || payment.status === 'pending') && (
                              <DropdownMenuItem
                                onClick={() => handleRetry(payment.id)}
                                disabled={retryPayment.isPending}
                              >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Reprocessar cobrança
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem>
                              <Receipt className="w-4 h-4 mr-2" />
                              Ver detalhes
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
