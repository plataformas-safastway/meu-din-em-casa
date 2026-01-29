/**
 * Detalhe de um ticket DPO (visualização do usuário)
 */
import { useState } from 'react';
import { ArrowLeft, Send, User, Shield, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTicketDetail, useAddTicketMessage } from '@/hooks/useLgpdTickets';
import { 
  TICKET_STATUS_LABELS, 
  TICKET_TYPE_LABELS,
  TICKET_PRIORITY_LABELS,
  type LgpdMessageAuthorRole
} from '@/types/lgpdTicket';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface DpoTicketDetailProps {
  ticketId: string;
  onBack: () => void;
}

export function DpoTicketDetail({ ticketId, onBack }: DpoTicketDetailProps) {
  const { data, isLoading, refetch } = useTicketDetail(ticketId);
  const addMessage = useAddTicketMessage();
  const [newMessage, setNewMessage] = useState('');

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    
    try {
      await addMessage.mutateAsync({
        ticket_id: ticketId,
        message: newMessage.trim(),
      });
      setNewMessage('');
      refetch();
      toast.success('Mensagem enviada');
    } catch (error) {
      toast.error('Erro ao enviar mensagem');
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'OPEN': return 'secondary';
      case 'IN_REVIEW': return 'outline';
      case 'ANSWERED': return 'default';
      case 'CLOSED': return 'secondary';
      default: return 'secondary';
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
      case 'USER': return name || 'Você';
      case 'DPO': return 'DPO - Equipe OIK';
      case 'ADMIN': return 'Equipe OIK';
      case 'SYSTEM': return 'Sistema';
      default: return 'Desconhecido';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  if (!data?.ticket) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Ticket não encontrado</div>
      </div>
    );
  }

  const { ticket, messages } = data;
  const isClosed = ticket.status === 'CLOSED';

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="container px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground">
                  {ticket.protocol}
                </span>
                <Badge variant={getStatusBadgeVariant(ticket.status)}>
                  {TICKET_STATUS_LABELS[ticket.status]}
                </Badge>
              </div>
              <p className="font-medium truncate">{ticket.subject}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Ticket Info */}
      <div className="container px-4 py-4 border-b border-border/50">
        <div className="flex flex-wrap gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">Tipo: </span>
            <span>{TICKET_TYPE_LABELS[ticket.ticket_type]}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Prioridade: </span>
            <Badge variant={ticket.priority === 'HIGH' ? 'destructive' : 'outline'}>
              {TICKET_PRIORITY_LABELS[ticket.priority]}
            </Badge>
          </div>
          <div>
            <span className="text-muted-foreground">Criado em: </span>
            <span>{format(new Date(ticket.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 px-4 py-4">
        <div className="space-y-4">
          {/* Initial Message */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Você</span>
                <span className="text-xs text-muted-foreground ml-auto">
                  {format(new Date(ticket.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{ticket.message}</p>
            </CardContent>
          </Card>

          {/* Thread Messages */}
          {messages.map(msg => (
            <Card 
              key={msg.id} 
              className={msg.author_role === 'USER' 
                ? 'bg-primary/5 border-primary/20' 
                : 'bg-muted/50'
              }
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  {getAuthorIcon(msg.author_role)}
                  <span className="text-sm font-medium">
                    {getAuthorLabel(msg.author_role, msg.author_name)}
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {format(new Date(msg.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>

      {/* Reply Input */}
      {!isClosed ? (
        <div className="sticky bottom-0 bg-background border-t border-border p-4">
          <div className="flex gap-2">
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Digite sua mensagem..."
              rows={2}
              className="flex-1 resize-none"
            />
            <Button 
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || addMessage.isPending}
              size="icon"
              className="h-auto"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="sticky bottom-0 bg-muted/50 border-t border-border p-4">
          <p className="text-center text-sm text-muted-foreground">
            Este ticket foi encerrado
          </p>
        </div>
      )}
    </div>
  );
}
