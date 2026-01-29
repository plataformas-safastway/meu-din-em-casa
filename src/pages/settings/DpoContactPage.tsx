/**
 * Contato com o DPO - Página principal (App)
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Shield, MessageSquare, FileText, Lock, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useUserTickets, useUnreadTicketsCount } from '@/hooks/useLgpdTickets';
import { TICKET_STATUS_LABELS, TICKET_TYPE_LABELS } from '@/types/lgpdTicket';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DpoTicketForm } from '@/components/settings/lgpd/DpoTicketForm';
import { DpoTicketDetail } from '@/components/settings/lgpd/DpoTicketDetail';

export function DpoContactPage() {
  const navigate = useNavigate();
  const { data: tickets, isLoading } = useUserTickets();
  const { data: unreadCount } = useUnreadTicketsCount();
  const [showForm, setShowForm] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);

  // If showing detail, render detail view
  if (selectedTicketId) {
    return (
      <DpoTicketDetail 
        ticketId={selectedTicketId} 
        onBack={() => setSelectedTicketId(null)} 
      />
    );
  }

  // If showing form, render form
  if (showForm) {
    return (
      <DpoTicketForm 
        onBack={() => setShowForm(false)} 
        onSuccess={() => setShowForm(false)}
      />
    );
  }

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'OPEN': return 'secondary';
      case 'IN_REVIEW': return 'outline';
      case 'ANSWERED': return 'default';
      case 'CLOSED': return 'secondary';
      default: return 'secondary';
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="container px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">Contato com o DPO</h1>
              <p className="text-xs text-muted-foreground">Privacidade e proteção de dados</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container px-4 py-6 space-y-6">
        {/* Info Banner */}
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <p className="font-medium text-primary">Encarregado de Proteção de Dados (DPO)</p>
                <p className="text-sm text-muted-foreground">
                  Aqui você pode tirar dúvidas sobre seus dados e privacidade, 
                  solicitar acesso, correção ou exclusão de informações.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Privacy Highlights */}
        <div className="grid grid-cols-1 gap-3">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
            <Lock className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">Seus dados são segregados por família</span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
            <Shield className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">Acesso controlado por perfis e permissões</span>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">Logs e auditoria para segurança</span>
          </div>
        </div>

        {/* New Request Button */}
        <Button 
          className="w-full gap-2" 
          size="lg"
          onClick={() => setShowForm(true)}
        >
          <Plus className="w-4 h-4" />
          Nova Solicitação
        </Button>

        {/* My Tickets */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Minhas Solicitações</h2>
            {unreadCount && unreadCount > 0 ? (
              <Badge variant="default">{unreadCount} nova(s)</Badge>
            ) : null}
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="h-20 bg-muted/50 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : tickets && tickets.length > 0 ? (
            <div className="space-y-3">
              {tickets.map(ticket => (
                <Card 
                  key={ticket.id} 
                  className={`cursor-pointer transition-all hover:border-primary/50 ${
                    ticket.unread_by_user ? 'ring-2 ring-primary/30' : ''
                  }`}
                  onClick={() => setSelectedTicketId(ticket.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-muted-foreground">
                            {ticket.protocol}
                          </span>
                          {ticket.unread_by_user && (
                            <Badge variant="default" className="text-xs px-1.5 py-0">
                              Nova resposta
                            </Badge>
                          )}
                        </div>
                        <p className="font-medium truncate">{ticket.subject}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {TICKET_TYPE_LABELS[ticket.ticket_type]}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <Badge variant={getStatusBadgeVariant(ticket.status)}>
                          {TICKET_STATUS_LABELS[ticket.status]}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(ticket.created_at), { 
                            addSuffix: true, 
                            locale: ptBR 
                          })}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <MessageSquare className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground">Nenhuma solicitação ainda</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Suas solicitações ao DPO aparecerão aqui
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Protocol Info */}
        <p className="text-xs text-center text-muted-foreground">
          Cada solicitação recebe um protocolo único para acompanhamento.
          <br />
          Seu pedido é tratado com confidencialidade.
        </p>
      </main>
    </div>
  );
}
