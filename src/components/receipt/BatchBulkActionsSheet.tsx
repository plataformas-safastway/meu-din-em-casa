import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Loader2,
  Tag,
  CreditCard,
  Calendar,
  Repeat,
} from "lucide-react";
import { OCRItem, useUpdateOCRItems } from "@/hooks/useOCRBatch";
import { CategorySelector } from "@/components/transaction/CategorySelector";
import { PaymentMethodSelector } from "@/components/transaction/PaymentMethodSelector";
import { useBankAccounts, useCreditCards } from "@/hooks/useBankData";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { PaymentMethod, TransactionClassification } from "@/types/finance";

interface BatchBulkActionsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItems: OCRItem[];
}

export function BatchBulkActionsSheet({ 
  open, 
  onOpenChange, 
  selectedItems 
}: BatchBulkActionsSheetProps) {
  const { data: bankAccounts = [] } = useBankAccounts();
  const { data: creditCards = [] } = useCreditCards();
  const updateItems = useUpdateOCRItems();

  // Fields to update
  const [categoryId, setCategoryId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [bankAccountId, setBankAccountId] = useState<string>("");
  const [creditCardId, setCreditCardId] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [isRecurring, setIsRecurring] = useState<boolean>(false);

  // Track which fields should be applied
  const [applyCategory, setApplyCategory] = useState(false);
  const [applyPayment, setApplyPayment] = useState(false);
  const [applyDate, setApplyDate] = useState(false);
  const [applyRecurring, setApplyRecurring] = useState(false);

  const handleApply = async () => {
    if (selectedItems.length === 0) return;

    const updates: Parameters<typeof updateItems.mutateAsync>[0]['updates'] = {};

    if (applyCategory && categoryId) {
      updates.finalCategoryId = categoryId;
      updates.finalSubcategoryId = null;
    }

    if (applyPayment) {
      updates.finalPaymentMethod = paymentMethod || null;
      updates.finalBankAccountId = bankAccountId || null;
      updates.finalCreditCardId = creditCardId || null;
    }

    if (applyDate && date) {
      updates.normalizedDate = date;
    }

    if (applyRecurring) {
      updates.isRecurring = isRecurring;
    }

    if (Object.keys(updates).length === 0) {
      toast({
        title: "Nenhuma alteração",
        description: "Selecione pelo menos um campo para aplicar.",
      });
      return;
    }

    try {
      await updateItems.mutateAsync({
        itemIds: selectedItems.map(i => i.id),
        updates,
      });

      toast({
        title: "Alterações aplicadas",
        description: `${selectedItems.length} item(s) atualizado(s).`,
      });

      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível aplicar as alterações.",
        variant: "destructive",
      });
    }
  };

  const activeAccounts = bankAccounts.filter(a => a.is_active);
  const activeCards = creditCards.filter(c => c.is_active);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-primary" />
            Editar em Lote
          </SheetTitle>
          <SheetDescription>
            Aplicar alterações em {selectedItems.length} item(s) selecionado(s)
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Category */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Categoria
              </Label>
              <Switch
                checked={applyCategory}
                onCheckedChange={setApplyCategory}
              />
            </div>
            {applyCategory && (
              <CategorySelector
                value={categoryId}
                onChange={setCategoryId}
                classification="expense"
              />
            )}
          </div>

          {/* Payment Method */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Forma de Pagamento
              </Label>
              <Switch
                checked={applyPayment}
                onCheckedChange={setApplyPayment}
              />
            </div>
            {applyPayment && (
              <div className="space-y-3">
                <PaymentMethodSelector
                  value={paymentMethod}
                  onChange={setPaymentMethod}
                  classification="expense"
                />

                {paymentMethod === 'credit' && activeCards.length > 0 && (
                  <Select value={creditCardId} onValueChange={setCreditCardId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar cartão" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeCards.map(card => (
                        <SelectItem key={card.id} value={card.id}>
                          {card.card_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {paymentMethod && paymentMethod !== 'credit' && paymentMethod !== 'cash' && activeAccounts.length > 0 && (
                  <Select value={bankAccountId} onValueChange={setBankAccountId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar conta" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeAccounts.map(account => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.nickname}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
          </div>

          {/* Date */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Data
              </Label>
              <Switch
                checked={applyDate}
                onCheckedChange={setApplyDate}
              />
            </div>
            {applyDate && (
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            )}
          </div>

          {/* Recurring */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Repeat className="w-4 h-4" />
                Marcar como Recorrente
              </Label>
              <Switch
                checked={applyRecurring}
                onCheckedChange={setApplyRecurring}
              />
            </div>
            {applyRecurring && (
              <div className="flex items-center gap-2">
                <Switch
                  checked={isRecurring}
                  onCheckedChange={setIsRecurring}
                />
                <span className="text-sm text-muted-foreground">
                  {isRecurring ? "Recorrente" : "Não recorrente"}
                </span>
              </div>
            )}
          </div>

          {/* Apply Button */}
          <Button
            className="w-full"
            onClick={handleApply}
            disabled={updateItems.isPending || (!applyCategory && !applyPayment && !applyDate && !applyRecurring)}
          >
            {updateItems.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : null}
            Aplicar em {selectedItems.length} Item(s)
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
