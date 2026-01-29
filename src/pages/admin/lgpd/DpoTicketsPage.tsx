/**
 * Dashboard - Gestão de Tickets DPO (LGPD)
 */
import { useState } from 'react';
import { 
  MessageSquare, 
  Search, 
  Clock, 
  AlertTriangle,
  CheckCircle2,
  Filter,
  User,
  ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useAllTickets } from '@/hooks/useLgpdTickets';
import { 
  TICKET_STATUS_LABELS, 
  TICKET_TYPE_LABELS,
  TICKET_PRIORITY_LABELS,
  type LgpdTicket,
  type LgpdTicketStatus,
  type LgpdTicketPriority
} from '@/types/lgpdTicket';
import { formatDistanceToNow, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DpoTicketManagement } from './components/DpoTicketManagement';

export function DpoTicketsPage() {
  const [statusFilter, setStatusFilter] = useState<LgpdTicketStatus | 'ALL'>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<LgpdTicketPriority | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  const { data: tickets, isLoading } = useAllTickets({
    status: statusFilter !== 'ALL' ? statusFilter : undefined,
    priority: priorityFilter !== 'ALL' ? priorityFilter : undefined,
  });

  // Stats
  const openCount = tickets?.filter(t => t.status === 'OPEN').length ?? 0;
  const inReviewCount = tickets?.filter(t => t.status === 'IN_REVIEW').length ?? 0;
  const highPriorityCount = tickets?.filter(t => t.priority === 'HIGH' && t.status !== 'CLOSED').length ?? 0;
  const oldTickets = tickets?.filter(t => {
    if (t.status === 'CLOSED') return false;
    const days = differenceInDays(new Date(), new Date(t.created_at));
    return days > 7;
  }).length ?? 0;

  // Filter by search
  const filteredTickets = tickets?.filter(ticket => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      ticket.protocol.toLowerCase().includes(query) ||
      ticket.subject.toLowerCase().includes(query)
    );
  }) ?? [];

  const getStatusBadgeVariant = (status: LgpdTicketStatus) => {
    switch (status) {
      case 'OPEN': return 'secondary';
      case 'IN_REVIEW': return 'outline';
      case 'ANSWERED': return 'default';
      case 'CLOSED': return 'secondary';
      default: return 'secondary';
    }
  };

  const getPriorityBadgeVariant = (priority: LgpdTicketPriority) => {
    switch (priority) {
      case 'HIGH': return 'destructive';
      case 'MEDIUM': return 'outline';
      case 'LOW': return 'secondary';
      default: return 'secondary';
    }
  };

  // If ticket selected, show management view
  if (selectedTicketId) {
    return (
      <DpoTicketManagement 
        ticketId={selectedTicketId}
        onBack={() => setSelectedTicketId(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-primary" />
          Tickets DPO
        </h2>
        <p className="text-muted-foreground">
          Gestão de solicitações de privacidade e LGPD
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Abertos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{openCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              Em Análise
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{inReviewCount}</div>
          </CardContent>
        </Card>

        <Card className={highPriorityCount > 0 ? 'border-destructive/50' : ''}>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Alta Prioridade
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${highPriorityCount > 0 ? 'text-destructive' : ''}`}>
              {highPriorityCount}
            </div>
          </CardContent>
        </Card>

        <Card className={oldTickets > 0 ? 'border-amber-500/50' : ''}>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              &gt; 7 dias
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${oldTickets > 0 ? 'text-amber-600' : ''}`}>
              {oldTickets}
            </div>
            {oldTickets > 0 && (
              <p className="text-xs text-amber-600 mt-1">Requer atenção</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filtros:</span>
            </div>
            
            <div className="flex-1 min-w-[200px] max-w-sm">
              <Input
                placeholder="Buscar por protocolo ou assunto..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9"
              />
            </div>

            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="w-[150px] h-9">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos status</SelectItem>
                {Object.entries(TICKET_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as any)}>
              <SelectTrigger className="w-[150px] h-9">
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todas</SelectItem>
                {Object.entries(TICKET_PRIORITY_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tickets Table */}
      <Card>
        <CardHeader>
          <CardTitle>Solicitações</CardTitle>
          <CardDescription>
            {filteredTickets.length} ticket(s) encontrado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">
              Carregando...
            </div>
          ) : filteredTickets.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              Nenhum ticket encontrado
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Protocolo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Assunto</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Criado</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTickets.map(ticket => {
                  const daysOld = differenceInDays(new Date(), new Date(ticket.created_at));
                  const isOld = daysOld > 7 && ticket.status !== 'CLOSED';
                  
                  return (
                    <TableRow 
                      key={ticket.id}
                      className={`cursor-pointer hover:bg-muted/50 ${isOld ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}`}
                      onClick={() => setSelectedTicketId(ticket.id)}
                    >
                      <TableCell className="font-mono text-sm">
                        {ticket.protocol}
                      </TableCell>
                      <TableCell className="text-sm">
                        {TICKET_TYPE_LABELS[ticket.ticket_type]}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">
                        {ticket.subject}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(ticket.status)}>
                          {TICKET_STATUS_LABELS[ticket.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getPriorityBadgeVariant(ticket.priority)}>
                          {TICKET_PRIORITY_LABELS[ticket.priority]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(ticket.created_at), { 
                          addSuffix: true, 
                          locale: ptBR 
                        })}
                        {isOld && (
                          <span className="ml-2 text-amber-600">⚠️</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
