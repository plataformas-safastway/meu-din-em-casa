import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon, CheckCircle2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { useRegisterChequeCompensation } from "@/hooks/useCashBasisOperations";
import { toast } from "sonner";

interface ChequeCompensationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: {
    id: string;
    description?: string | null;
    amount: number;
    date: string;
  } | null;
  onSuccess?: () => void;
}

export function ChequeCompensationDialog({
  open,
  onOpenChange,
  transaction,
  onSuccess,
}: ChequeCompensationDialogProps) {
  const [compensationDate, setCompensationDate] = useState<Date | undefined>(
    new Date()
  );
  const registerCompensation = useRegisterChequeCompensation();

  const handleSubmit = async () => {
    if (!transaction || !compensationDate) return;

    try {
      await registerCompensation.mutateAsync({
        transactionId: transaction.id,
        compensationDate: format(compensationDate, "yyyy-MM-dd"),
      });
      toast.success("Compensação registrada!", {
        description: `O cheque entrará no orçamento de ${format(compensationDate, "MMMM/yyyy", { locale: ptBR })}`,
      });
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      toast.error("Erro ao registrar compensação");
    }
  };

  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-success" />
            Registrar Compensação
          </DialogTitle>
          <DialogDescription>
            Informe a data em que o cheque foi compensado. A partir dessa data,
            o valor entrará no orçamento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Transaction info */}
          <div className="bg-muted/30 rounded-lg p-3 space-y-1">
            <p className="font-medium text-sm">
              {transaction.description || "Cheque"}
            </p>
            <p className="text-sm text-muted-foreground">
              Emitido em: {formatDate(transaction.date)}
            </p>
            <p className="text-lg font-semibold text-destructive">
              -{formatCurrency(transaction.amount)}
            </p>
          </div>

          {/* Date picker */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Data de compensação</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !compensationDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {compensationDate ? (
                    format(compensationDate, "dd 'de' MMMM 'de' yyyy", {
                      locale: ptBR,
                    })
                  ) : (
                    <span>Selecione a data</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={compensationDate}
                  onSelect={setCompensationDate}
                  initialFocus
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              O cheque entrará no mês do orçamento correspondente a esta data.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!compensationDate || registerCompensation.isPending}
          >
            {registerCompensation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <CheckCircle2 className="w-4 h-4 mr-2" />
            )}
            Confirmar Compensação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
