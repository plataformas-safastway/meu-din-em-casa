import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CalendarIcon,
  CreditCard,
  Loader2,
  Receipt,
  Wallet,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatters";
import { useCreditCards, useBankAccounts } from "@/hooks/useBankData";
import { useCreateInvoicePayment } from "@/hooks/useCashBasisOperations";
import { toast } from "sonner";

interface InvoicePaymentSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preselectedCardId?: string;
  suggestedAmount?: number;
  onSuccess?: () => void;
}

const paymentMethods = [
  { id: "pix", name: "PIX", icon: "⚡" },
  { id: "debit", name: "Débito", icon: "💳" },
  { id: "transfer", name: "Transferência", icon: "🔄" },
  { id: "boleto", name: "Boleto", icon: "📄" },
];

export function InvoicePaymentSheet({
  open,
  onOpenChange,
  preselectedCardId,
  suggestedAmount,
  onSuccess,
}: InvoicePaymentSheetProps) {
  const { data: creditCards = [] } = useCreditCards();
  const { data: bankAccounts = [] } = useBankAccounts();
  const createPayment = useCreateInvoicePayment();

  const [selectedCardId, setSelectedCardId] = useState(preselectedCardId || "");
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState<Date>(new Date());
  const [paymentMethod, setPaymentMethod] = useState<string>("pix");
  const [bankAccountId, setBankAccountId] = useState("");
  const [referenceMonth, setReferenceMonth] = useState("");
  const [notes, setNotes] = useState("");

  // Update card selection when preselected changes
  useEffect(() => {
    if (preselectedCardId) {
      setSelectedCardId(preselectedCardId);
    }
  }, [preselectedCardId]);

  // Update amount when suggested changes
  useEffect(() => {
    if (suggestedAmount) {
      setAmount(suggestedAmount.toString());
    }
  }, [suggestedAmount]);

  const selectedCard = creditCards.find((c) => c.id === selectedCardId);
  const activeAccounts = bankAccounts.filter((a: any) => a.is_active !== false);

  const handleSubmit = async () => {
    if (!selectedCardId || !amount || !paymentMethod) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const numericAmount = parseFloat(amount.replace(",", "."));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast.error("Informe um valor válido");
      return;
    }

    try {
      await createPayment.mutateAsync({
        creditCardId: selectedCardId,
        cardName: selectedCard?.card_name || "Cartão",
        amount: numericAmount,
        paymentDate: format(paymentDate, "yyyy-MM-dd"),
        paymentMethod: paymentMethod as "pix" | "debit" | "transfer" | "boleto",
        bankAccountId: bankAccountId || undefined,
        referenceMonth: referenceMonth || undefined,
        notes: notes || undefined,
      });

      toast.success("Pagamento de fatura registrado!", {
        description: `${formatCurrency(numericAmount)} entrará no orçamento de ${format(paymentDate, "MMMM/yyyy", { locale: ptBR })}`,
      });

      // Reset form
      setAmount("");
      setNotes("");
      setReferenceMonth("");
      
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      toast.error("Erro ao registrar pagamento");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[90vh] rounded-t-3xl">
        <SheetHeader className="text-left pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Receipt className="w-6 h-6 text-primary" />
            </div>
            <div>
              <SheetTitle>Pagamento de Fatura</SheetTitle>
              <SheetDescription>
                Registre o pagamento da fatura do cartão
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-4 pb-4 overflow-y-auto max-h-[60vh]">
          {/* Credit Card Selection */}
          <div className="space-y-2">
            <Label>Cartão de crédito *</Label>
            <Select value={selectedCardId} onValueChange={setSelectedCardId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o cartão" />
              </SelectTrigger>
              <SelectContent>
                {creditCards.map((card: any) => (
                  <SelectItem key={card.id} value={card.id}>
                    <div className="flex items-center gap-2">
                      <CreditCard className="w-4 h-4" />
                      {card.card_name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label>Valor da fatura *</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                R$
              </span>
              <Input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0,00"
                className="pl-10"
                type="text"
                inputMode="decimal"
              />
            </div>
          </div>

          {/* Payment Date */}
          <div className="space-y-2">
            <Label>Data do pagamento *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !paymentDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {paymentDate ? (
                    format(paymentDate, "dd 'de' MMMM 'de' yyyy", {
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
                  selected={paymentDate}
                  onSelect={(date) => date && setPaymentDate(date)}
                  initialFocus
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
            <p className="text-xs text-muted-foreground">
              Este é o mês em que o valor entrará no seu orçamento (regime de caixa).
            </p>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label>Forma de pagamento *</Label>
            <div className="grid grid-cols-2 gap-2">
              {paymentMethods.map((method) => (
                <Button
                  key={method.id}
                  type="button"
                  variant={paymentMethod === method.id ? "default" : "outline"}
                  className="justify-start"
                  onClick={() => setPaymentMethod(method.id)}
                >
                  <span className="mr-2">{method.icon}</span>
                  {method.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Bank Account */}
          <div className="space-y-2">
            <Label>Conta bancária</Label>
            <Select value={bankAccountId} onValueChange={setBankAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a conta (opcional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Nenhuma</SelectItem>
                {activeAccounts.map((account: any) => (
                  <SelectItem key={account.id} value={account.id}>
                    <div className="flex items-center gap-2">
                      <Wallet className="w-4 h-4" />
                      {account.nickname}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Reference Month */}
          <div className="space-y-2">
            <Label>Mês de referência da fatura</Label>
            <Input
              value={referenceMonth}
              onChange={(e) => setReferenceMonth(e.target.value)}
              placeholder="ex: 01/2026"
              maxLength={7}
            />
            <p className="text-xs text-muted-foreground">
              Opcional: identifica a qual período a fatura se refere.
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observações adicionais..."
              rows={2}
            />
          </div>

          {/* Info box */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
            <p className="text-sm text-primary">
              <strong>Regime de caixa:</strong> O pagamento da fatura representa
              o momento em que o dinheiro efetivamente sai da sua conta. Este
              valor entrará no orçamento do mês selecionado.
            </p>
          </div>
        </div>

        <SheetFooter className="flex-row gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!selectedCardId || !amount || createPayment.isPending}
            className="flex-1"
          >
            {createPayment.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <Receipt className="w-4 h-4 mr-2" />
            )}
            Registrar Pagamento
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
