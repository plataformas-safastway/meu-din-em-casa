/**
 * Formulário para criar nova solicitação ao DPO
 */
import { useState } from 'react';
import { ArrowLeft, Send, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCreateTicket } from '@/hooks/useLgpdTickets';
import { 
  TICKET_TYPE_LABELS, 
  DATA_CATEGORY_OPTIONS,
  type LgpdTicketType 
} from '@/types/lgpdTicket';
import { toast } from 'sonner';

interface DpoTicketFormProps {
  onBack: () => void;
  onSuccess: () => void;
}

export function DpoTicketForm({ onBack, onSuccess }: DpoTicketFormProps) {
  const createTicket = useCreateTicket();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [createdProtocol, setCreatedProtocol] = useState<string | null>(null);
  
  const [ticketType, setTicketType] = useState<LgpdTicketType | ''>('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [dataCategory, setDataCategory] = useState('');

  const isValid = ticketType && subject.trim() && message.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || !ticketType) return;

    try {
      const result = await createTicket.mutateAsync({
        ticket_type: ticketType,
        subject: subject.trim(),
        message: message.trim(),
        data_category: dataCategory || undefined,
      });
      
      setCreatedProtocol(result.protocol);
      setShowConfirmation(true);
    } catch (error) {
      toast.error('Erro ao enviar solicitação. Tente novamente.');
    }
  };

  const handleConfirmationClose = () => {
    setShowConfirmation(false);
    onSuccess();
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="container px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">Nova Solicitação</h1>
              <p className="text-xs text-muted-foreground">Contato com o DPO</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Info Card */}
          <Card className="bg-muted/30 border-muted">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Info className="w-4 h-4 text-muted-foreground mt-0.5" />
                <p className="text-sm text-muted-foreground">
                  Seu pedido é registrado com protocolo e tratado com confidencialidade.
                  Para solicitações como exclusão, você também pode usar as opções do próprio app.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Ticket Type */}
          <div className="space-y-2">
            <Label htmlFor="ticketType">Tipo de solicitação *</Label>
            <Select 
              value={ticketType} 
              onValueChange={(v) => setTicketType(v as LgpdTicketType)}
            >
              <SelectTrigger id="ticketType">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TICKET_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Subject */}
          <div className="space-y-2">
            <Label htmlFor="subject">Assunto *</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Resumo da sua solicitação"
              maxLength={200}
            />
          </div>

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="message">Mensagem *</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Descreva sua dúvida ou solicitação em detalhes..."
              rows={6}
            />
          </div>

          {/* Data Category (optional) */}
          <div className="space-y-2">
            <Label htmlFor="dataCategory">Categoria do dado (opcional)</Label>
            <Select value={dataCategory} onValueChange={setDataCategory}>
              <SelectTrigger id="dataCategory">
                <SelectValue placeholder="Selecione se aplicável" />
              </SelectTrigger>
              <SelectContent>
                {DATA_CATEGORY_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Submit Button */}
          <Button 
            type="submit" 
            className="w-full gap-2" 
            size="lg"
            disabled={!isValid || createTicket.isPending}
          >
            <Send className="w-4 h-4" />
            {createTicket.isPending ? 'Enviando...' : 'Enviar Solicitação'}
          </Button>
        </form>
      </main>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmation} onOpenChange={handleConfirmationClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              ✅ Solicitação Registrada
            </DialogTitle>
            <DialogDescription className="text-left space-y-3">
              <p>Seu contato foi registrado com sucesso.</p>
              
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-xs text-muted-foreground mb-1">Protocolo</p>
                <p className="text-lg font-mono font-bold text-foreground">
                  {createdProtocol}
                </p>
              </div>

              <p className="text-sm">
                Você pode acompanhar o status desta solicitação na lista 
                "Minhas Solicitações". Você será notificado quando houver uma resposta.
              </p>
            </DialogDescription>
          </DialogHeader>
          <Button onClick={handleConfirmationClose} className="w-full">
            Entendi
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
