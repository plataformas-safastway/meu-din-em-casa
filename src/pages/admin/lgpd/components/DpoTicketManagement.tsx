/**
 * Dashboard - Gestão individual de ticket DPO
 */
import { useState } from 'react';
import { 
  ArrowLeft, 
  Send, 
  User, 
  Shield, 
  Clock,
  Lock,
  MessageSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  useTicketDetail, 
  useUpdateTicketStatus, 
  useAdminAddResponse 
} from '@/hooks/useLgpdTickets';
import { 
  TICKET_STATUS_LABELS, 
  TICKET_TYPE_LABELS,
  TICKET_PRIORITY_LABELS,
  type LgpdTicketStatus,
  type LgpdMessageAuthorRole
} from '@/types/lgpdTicket';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface DpoTicketManagementProps {
  ticketId: string;
  onBack: () => void;
}

export function DpoTicketManagement({ ticketId, onBack }: DpoTicketManagementProps) {
  const { data, isLoading, refetch } = useTicketDetail(ticketId);
  const updateStatus = useUpdateTicketStatus();
  const addResponse = useAdminAddResponse();
  
  const [newMessage, setNewMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [authorRole, setAuthorRole] = useState<'ADMIN' | 'DPO'>('ADMIN');

  const handleStatusChange = async (newStatus: LgpdTicketStatus) => {
    try {
      await updateStatus.mutateAsync({ ticketId, status: newStatus });
      refetch();
      toast.success(`Status alterado para ${TICKET_STATUS_LABELS[newStatus]}`);
    } catch (error) {
      toast.error('Erro ao alterar status');
    }
  };

  const handleSendResponse = async () => {
    if (!newMessage.trim()) return;
    
    try {
      await addResponse.mutateAsync({
        ticketId,
        message: newMessage.trim(),
        authorRole,
        isInternal,
      });
      setNewMessage('');
      refetch();
      toast.success(isInternal ? 'Nota interna adicionada' : 'Resposta enviada ao usuário');
    } catch (error) {
      toast.error('Erro ao enviar resposta');
    }
  };

  const getAuthorIcon = (role: LgpdMessageAuthorRole) => {
    switch (role) {
      case 'USER': return <User className="w-4 h-4" />;
      case 'DPO': 
      case 'ADMIN': 
        return <Shield className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const getAuthorLabel = (role: LgpdMessageAuthorRole, name: string | null) => {
    switch (role) {
      case 'USER': return name || 'Usuário';
      case 'DPO': return 'DPO';
      case 'ADMIN': return 'Equipe OIK';
      case 'SYSTEM': return 'Sistema';
      default: return 'Desconhecido';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!data?.ticket) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Ticket não encontrado</div>
      </div>
    );
  }

  const { ticket, messages } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-muted-foreground">
              {ticket.protocol}
            </span>
            <Badge variant={ticket.priority === 'HIGH' ? 'destructive' : 'outline'}>
              {TICKET_PRIORITY_LABELS[ticket.priority]}
            </Badge>
          </div>
          <h2 className="text-xl font-bold">{ticket.subject}</h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Messages */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Conversa
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-4">
                  {/* Initial Message */}
                  <div className="p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Usuário</span>
                      <span className="text-xs text-muted-foreground ml-auto">
                        {format(new Date(ticket.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{ticket.message}</p>
                  </div>

                  {/* Thread Messages */}
                  {messages.map(msg => (
                    <div 
                      key={msg.id} 
                      className={`p-4 rounded-lg ${
                        msg.is_internal 
                          ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800' 
                          : msg.author_role === 'USER'
                            ? 'bg-muted/50'
                            : 'bg-primary/5 border border-primary/20'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {getAuthorIcon(msg.author_role)}
                        <span className="text-sm font-medium">
                          {getAuthorLabel(msg.author_role, msg.author_name)}
                        </span>
                        {msg.is_internal && (
                          <Badge variant="outline" className="text-xs">
                            <Lock className="w-3 h-3 mr-1" />
                            Nota interna
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground ml-auto">
                          {format(new Date(msg.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                        </span>
                      </div>
                      <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Reply Form */}
              {ticket.status !== 'CLOSED' && (
                <div className="mt-4 pt-4 border-t space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Switch
                        id="internal"
                        checked={isInternal}
                        onCheckedChange={setIsInternal}
                      />
                      <Label htmlFor="internal" className="text-sm cursor-pointer">
                        Nota interna (não visível ao usuário)
                      </Label>
                    </div>
                    
                    <Select value={authorRole} onValueChange={(v) => setAuthorRole(v as any)}>
                      <SelectTrigger className="w-[120px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ADMIN">Equipe OIK</SelectItem>
                        <SelectItem value="DPO">DPO</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-2">
                    <Textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder={isInternal ? "Adicionar nota interna..." : "Responder ao usuário..."}
                      rows={3}
                      className="flex-1 resize-none"
                    />
                    <Button 
                      onClick={handleSendResponse}
                      disabled={!newMessage.trim() || addResponse.isPending}
                      className="h-auto"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Enviar
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Ticket Info */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground">Tipo</Label>
                <p className="font-medium">{TICKET_TYPE_LABELS[ticket.ticket_type]}</p>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Categoria</Label>
                <p className="font-medium">{ticket.data_category || 'Não especificada'}</p>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Criado em</Label>
                <p className="font-medium">
                  {format(new Date(ticket.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                </p>
              </div>

              {ticket.last_response_at && (
                <div>
                  <Label className="text-xs text-muted-foreground">Última resposta</Label>
                  <p className="font-medium">
                    {format(new Date(ticket.last_response_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              )}

              {ticket.closed_at && (
                <div>
                  <Label className="text-xs text-muted-foreground">Encerrado em</Label>
                  <p className="font-medium">
                    {format(new Date(ticket.closed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Status Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Status</CardTitle>
              <CardDescription>
                Atual: <Badge>{TICKET_STATUS_LABELS[ticket.status]}</Badge>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {ticket.status !== 'IN_REVIEW' && ticket.status !== 'CLOSED' && (
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => handleStatusChange('IN_REVIEW')}
                  disabled={updateStatus.isPending}
                >
                  Marcar como Em Análise
                </Button>
              )}
              
              {ticket.status !== 'ANSWERED' && ticket.status !== 'CLOSED' && (
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => handleStatusChange('ANSWERED')}
                  disabled={updateStatus.isPending}
                >
                  Marcar como Respondido
                </Button>
              )}

              {ticket.status !== 'CLOSED' && (
                <Button 
                  variant="outline" 
                  className="w-full justify-start text-destructive hover:text-destructive"
                  onClick={() => handleStatusChange('CLOSED')}
                  disabled={updateStatus.isPending}
                >
                  Encerrar Ticket
                </Button>
              )}

              {ticket.status === 'CLOSED' && (
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => handleStatusChange('OPEN')}
                  disabled={updateStatus.isPending}
                >
                  Reabrir Ticket
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
