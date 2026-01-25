import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import {
  Lock,
  Calendar as CalendarIcon,
  Eye,
  Clock,
  Shield,
  Loader2,
} from "lucide-react";
import { useMarkTransactionPrivate } from "@/hooks/useTransactionPrivacy";
import { format, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface MarkPrivateSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionId: string;
  transactionDescription?: string;
}

type RevealOption = 'now' | 'date' | 'max';

export function MarkPrivateSheet({
  open,
  onOpenChange,
  transactionId,
  transactionDescription,
}: MarkPrivateSheetProps) {
  const [revealOption, setRevealOption] = useState<RevealOption>('max');
  const [revealDate, setRevealDate] = useState<Date | undefined>();
  const [reason, setReason] = useState("");
  const [maxDays, setMaxDays] = useState(30);

  const markPrivate = useMarkTransactionPrivate();

  const handleSubmit = () => {
    let revealAt: string | null = null;

    if (revealOption === 'date' && revealDate) {
      revealAt = revealDate.toISOString();
    } else if (revealOption === 'max') {
      revealAt = addDays(new Date(), maxDays).toISOString();
    }

    markPrivate.mutate(
      {
        transactionId,
        revealAt,
        reason: reason || undefined,
        maxPrivacyDays: maxDays,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setRevealOption('max');
          setRevealDate(undefined);
          setReason("");
        },
      }
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Marcar como Privada
          </SheetTitle>
          <SheetDescription>
            Esta despesa impactará o saldo, mas os detalhes ficarão ocultos para outros membros.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Transaction info */}
          {transactionDescription && (
            <div className="p-3 rounded-lg bg-muted/50 border">
              <p className="text-sm font-medium truncate">{transactionDescription}</p>
              <Badge variant="secondary" className="mt-2 text-xs">
                Open Finance
              </Badge>
            </div>
          )}

          {/* Privacy notice */}
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium">O que fica oculto?</p>
                <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                  <li>• Descrição e categoria</li>
                  <li>• Valor da transação</li>
                  <li>• Origem (estabelecimento)</li>
                </ul>
                <p className="text-xs text-muted-foreground mt-2">
                  <strong>Importante:</strong> O impacto no saldo e projeções permanece visível.
                </p>
              </div>
            </div>
          </div>

          {/* Reveal options */}
          <div className="space-y-4">
            <Label>Quando revelar?</Label>
            <RadioGroup 
              value={revealOption} 
              onValueChange={(v) => setRevealOption(v as RevealOption)}
              className="space-y-3"
            >
              <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="max" id="max" />
                <Label htmlFor="max" className="flex-1 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <span>Prazo máximo ({maxDays} dias)</span>
                    <Clock className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Revelação automática em {format(addDays(new Date(), maxDays), "dd/MM/yyyy")}
                  </p>
                </Label>
              </div>

              <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="date" id="date" />
                <Label htmlFor="date" className="flex-1 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <span>Escolher data</span>
                    <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Definir uma data específica para revelação
                  </p>
                </Label>
              </div>

              <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                <RadioGroupItem value="now" id="now" />
                <Label htmlFor="now" className="flex-1 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <span>Revelar manualmente</span>
                    <Eye className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Você decide quando revelar
                  </p>
                </Label>
              </div>
            </RadioGroup>

            {/* Date picker for custom date */}
            {revealOption === 'date' && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !revealDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {revealDate ? format(revealDate, "PPP", { locale: ptBR }) : "Selecionar data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={revealDate}
                    onSelect={setRevealDate}
                    disabled={(date) => date < new Date() || date > addDays(new Date(), 90)}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            )}
          </div>

          {/* Private reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Anotação privada (opcional)</Label>
            <Textarea
              id="reason"
              placeholder="Ex: Presente de aniversário, surpresa..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="resize-none"
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              Só você verá esta anotação.
            </p>
          </div>

          {/* Info box */}
          <div className="p-3 rounded-lg bg-secondary/50 text-sm">
            <p className="text-muted-foreground">
              💡 <strong>Transparência é o padrão.</strong> Privacidade é temporária e consciente.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1"
              disabled={markPrivate.isPending || (revealOption === 'date' && !revealDate)}
            >
              {markPrivate.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Lock className="w-4 h-4 mr-2" />
              )}
              Marcar Privada
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
