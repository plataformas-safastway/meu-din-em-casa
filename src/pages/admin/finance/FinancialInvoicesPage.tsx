import { useState } from "react";
import { 
  Search, 
  Filter, 
  MoreVertical,
  FileText,
  Download,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Loader2,
  FileDown,
  RefreshCw,
  Plus
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  useInvoices, 
  useEmitInvoice,
  Invoice 
} from "@/hooks/useFinancialModule";
import { formatCurrency } from "@/lib/formatters";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  pending: { label: "Pendente", color: "bg-yellow-500/10 text-yellow-500", icon: Clock },
  processing: { label: "Processando", color: "bg-blue-500/10 text-blue-500", icon: RefreshCw },
  issued: { label: "Emitida", color: "bg-green-500/10 text-green-500", icon: CheckCircle2 },
  error: { label: "Erro", color: "bg-red-500/10 text-red-500", icon: AlertCircle },
  cancelled: { label: "Cancelada", color: "bg-gray-500/10 text-gray-500", icon: XCircle },
};

// Mask CPF/CNPJ for LGPD compliance
function maskDocument(doc: string): string {
  if (!doc) return "—";
  if (doc.length === 11) {
    // CPF: ***.***.***-XX
    return `***.***.***.${doc.slice(-2)}`;
  } else if (doc.length === 14) {
    // CNPJ: **.***.***/****.XX
    return `**.***.***/****.${doc.slice(-2)}`;
  }
  return doc.slice(0, 3) + "..." + doc.slice(-2);
}

export function FinancialInvoicesPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: invoices, isLoading } = useInvoices(
    statusFilter !== "all" ? { status: statusFilter } : undefined
  );
  const emitInvoice = useEmitInvoice();

  const filteredInvoices = (invoices || []).filter(invoice => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      invoice.customer_name?.toLowerCase().includes(searchLower) ||
      invoice.invoice_number?.toLowerCase().includes(searchLower) ||
      invoice.family?.name?.toLowerCase().includes(searchLower)
    );
  });

  // Stats
  const stats = {
    total: invoices?.length || 0,
    issued: invoices?.filter(i => i.status === 'issued').length || 0,
    pending: invoices?.filter(i => i.status === 'pending').length || 0,
    errors: invoices?.filter(i => i.status === 'error').length || 0,
  };

  const handleEmit = async (invoiceId: string) => {
    await emitInvoice.mutateAsync(invoiceId);
  };

  const handleDownload = (url: string | null, type: 'pdf' | 'xml') => {
    if (!url) {
      toast.error(`${type.toUpperCase()} não disponível`);
      return;
    }
    window.open(url, '_blank');
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
          <h2 className="text-2xl font-bold">Notas Fiscais</h2>
          <p className="text-muted-foreground">Emita e gerencie notas fiscais de serviço</p>
        </div>
        <Button disabled>
          <Plus className="w-4 h-4 mr-2" />
          Nova NF (em breve)
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
            <p className="text-sm text-muted-foreground">Emitidas</p>
            <p className="text-2xl font-bold text-green-500">{stats.issued}</p>
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
            <p className="text-sm text-muted-foreground">Com Erro</p>
            <p className="text-2xl font-bold text-red-500">{stats.errors}</p>
          </CardContent>
        </Card>
      </div>

      {/* Enotas Integration Notice */}
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 text-blue-500 mt-0.5" />
            <div>
              <p className="font-medium text-blue-500">Integração Enotas</p>
              <p className="text-sm text-muted-foreground">
                A emissão de NF-e está preparada para integração com o Enotas. 
                Configure as credenciais para habilitar a emissão automática.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, número ou família..."
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
                <SelectItem value="issued">Emitida</SelectItem>
                <SelectItem value="error">Com Erro</SelectItem>
                <SelectItem value="cancelled">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle>Notas Fiscais</CardTitle>
          <CardDescription>
            {filteredInvoices.length} registro(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>CPF/CNPJ</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Emissão</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    Nenhuma nota fiscal encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices.map((invoice) => {
                  const statusConfig = STATUS_CONFIG[invoice.status] || STATUS_CONFIG.pending;
                  const StatusIcon = statusConfig.icon;
                  
                  return (
                    <TableRow key={invoice.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                          <span className="font-mono">
                            {invoice.invoice_number || <span className="text-muted-foreground">Pendente</span>}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{invoice.customer_name}</p>
                          {invoice.customer_email && (
                            <p className="text-xs text-muted-foreground">{invoice.customer_email}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {maskDocument(invoice.customer_document)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatCurrency(invoice.amount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={statusConfig.color}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {statusConfig.label}
                        </Badge>
                        {invoice.error_message && (
                          <p className="text-xs text-red-500 mt-1" title={invoice.error_message}>
                            {invoice.error_code || "Erro"}
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        {invoice.issued_at ? (
                          format(new Date(invoice.issued_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
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
                            {invoice.status === 'pending' && (
                              <DropdownMenuItem
                                onClick={() => handleEmit(invoice.id)}
                                disabled={emitInvoice.isPending}
                              >
                                <Send className="w-4 h-4 mr-2" />
                                Emitir NF
                              </DropdownMenuItem>
                            )}
                            {invoice.status === 'error' && (
                              <DropdownMenuItem
                                onClick={() => handleEmit(invoice.id)}
                                disabled={emitInvoice.isPending}
                              >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Tentar novamente
                              </DropdownMenuItem>
                            )}
                            {invoice.status === 'issued' && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => handleDownload(invoice.pdf_url, 'pdf')}
                                >
                                  <FileDown className="w-4 h-4 mr-2" />
                                  Download PDF
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDownload(invoice.xml_url, 'xml')}
                                >
                                  <Download className="w-4 h-4 mr-2" />
                                  Download XML
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem>
                              <FileText className="w-4 h-4 mr-2" />
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
