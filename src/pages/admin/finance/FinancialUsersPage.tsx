import { useState } from "react";
import { 
  Search, 
  Filter, 
  MoreVertical,
  User,
  Calendar,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  useUserSubscriptions, 
  useUpdateSubscriptionStatus,
  UserSubscription 
} from "@/hooks/useFinancialModule";
import { formatCurrency } from "@/lib/formatters";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  trial: { label: "Trial", color: "bg-blue-500/10 text-blue-500", icon: Clock },
  active: { label: "Ativo", color: "bg-green-500/10 text-green-500", icon: CheckCircle2 },
  inactive: { label: "Inativo", color: "bg-gray-500/10 text-gray-500", icon: XCircle },
  overdue: { label: "Inadimplente", color: "bg-orange-500/10 text-orange-500", icon: AlertCircle },
  cancelled: { label: "Cancelado", color: "bg-red-500/10 text-red-500", icon: XCircle },
};

export function FinancialUsersPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedSubscription, setSelectedSubscription] = useState<UserSubscription | null>(null);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [statusNotes, setStatusNotes] = useState("");
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);

  const { data: subscriptions, isLoading } = useUserSubscriptions(
    statusFilter !== "all" ? { status: statusFilter } : undefined
  );
  const updateStatus = useUpdateSubscriptionStatus();

  const filteredSubscriptions = (subscriptions || []).filter(sub => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      sub.family?.name?.toLowerCase().includes(searchLower) ||
      sub.plan?.name?.toLowerCase().includes(searchLower)
    );
  });

  const handleStatusChange = async () => {
    if (!selectedSubscription || !newStatus) return;

    await updateStatus.mutateAsync({
      subscriptionId: selectedSubscription.id,
      status: newStatus,
      notes: statusNotes
    });

    setStatusDialogOpen(false);
    setSelectedSubscription(null);
    setNewStatus("");
    setStatusNotes("");
  };

  const openStatusDialog = (subscription: UserSubscription, status: string) => {
    setSelectedSubscription(subscription);
    setNewStatus(status);
    setStatusDialogOpen(true);
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
      <div>
        <h2 className="text-2xl font-bold">Gestão Financeira de Usuários</h2>
        <p className="text-muted-foreground">Gerencie assinaturas e status de pagamento</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome da família ou plano..."
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
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
                <SelectItem value="overdue">Inadimplente</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Subscriptions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Assinaturas</CardTitle>
          <CardDescription>
            {filteredSubscriptions.length} registro(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Família</TableHead>
                <TableHead>Plano</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data Início</TableHead>
                <TableHead>Último Pagamento</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSubscriptions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Nenhuma assinatura encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filteredSubscriptions.map((sub) => {
                  const statusConfig = STATUS_CONFIG[sub.status] || STATUS_CONFIG.inactive;
                  const StatusIcon = statusConfig.icon;
                  
                  return (
                    <TableRow key={sub.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{sub.family?.name || "—"}</p>
                            <p className="text-xs text-muted-foreground">
                              {sub.family?.members_count || 0} membro(s)
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-muted-foreground" />
                          {sub.plan?.name || "—"}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">
                        {sub.plan ? formatCurrency(sub.plan.price) : "—"}
                        <span className="text-xs text-muted-foreground">/mês</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={statusConfig.color}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="w-3 h-3 text-muted-foreground" />
                          {format(new Date(sub.started_at), "dd/MM/yyyy", { locale: ptBR })}
                        </div>
                      </TableCell>
                      <TableCell>
                        {sub.current_period_end ? (
                          format(new Date(sub.current_period_end), "dd/MM/yyyy", { locale: ptBR })
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setSelectedSubscription(sub);
                                setHistoryDialogOpen(true);
                              }}
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              Ver histórico
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {sub.status !== "active" && (
                              <DropdownMenuItem
                                onClick={() => openStatusDialog(sub, "active")}
                              >
                                <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                                Marcar como ativo
                              </DropdownMenuItem>
                            )}
                            {sub.status !== "overdue" && sub.status !== "cancelled" && (
                              <DropdownMenuItem
                                onClick={() => openStatusDialog(sub, "overdue")}
                              >
                                <AlertCircle className="w-4 h-4 mr-2 text-orange-500" />
                                Marcar como inadimplente
                              </DropdownMenuItem>
                            )}
                            {sub.status !== "cancelled" && (
                              <DropdownMenuItem
                                onClick={() => openStatusDialog(sub, "cancelled")}
                                className="text-red-500"
                              >
                                <XCircle className="w-4 h-4 mr-2" />
                                Cancelar assinatura
                              </DropdownMenuItem>
                            )}
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

      {/* Status Change Dialog */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Status da Assinatura</DialogTitle>
            <DialogDescription>
              Alterando status de {selectedSubscription?.family?.name} para{" "}
              <span className="font-medium">{STATUS_CONFIG[newStatus]?.label}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Observações (opcional)</Label>
              <Textarea
                placeholder="Motivo da alteração..."
                value={statusNotes}
                onChange={(e) => setStatusNotes(e.target.value)}
                rows={3}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Esta ação será registrada no log de auditoria.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleStatusChange}
              disabled={updateStatus.isPending}
            >
              {updateStatus.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              Confirmar Alteração
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyDialogOpen} onOpenChange={setHistoryDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Histórico Financeiro</DialogTitle>
            <DialogDescription>
              {selectedSubscription?.family?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Plano Atual</p>
                <p className="font-medium">{selectedSubscription?.plan?.name}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Valor</p>
                <p className="font-medium">
                  {selectedSubscription?.plan ? formatCurrency(selectedSubscription.plan.price) : "—"}/mês
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Início</p>
                <p className="font-medium">
                  {selectedSubscription?.started_at 
                    ? format(new Date(selectedSubscription.started_at), "dd/MM/yyyy", { locale: ptBR })
                    : "—"
                  }
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Status</p>
                <p className="font-medium">
                  {STATUS_CONFIG[selectedSubscription?.status || "inactive"]?.label}
                </p>
              </div>
            </div>
            {selectedSubscription?.notes && (
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground">Observações</p>
                <p className="text-sm">{selectedSubscription.notes}</p>
              </div>
            )}
            <p className="text-xs text-muted-foreground text-center py-4">
              Histórico detalhado de pagamentos disponível na seção "Cobranças"
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
