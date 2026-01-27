import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { 
  Loader2,
  Save,
  CreditCard,
  Calendar,
  Repeat,
  Tag,
  DollarSign,
  FileText,
  AlertCircle,
} from "lucide-react";
import { OCRItem, useUpdateOCRItems } from "@/hooks/useOCRBatch";
import { CategorySelector } from "@/components/transaction/CategorySelector";
import { PaymentMethodSelector } from "@/components/transaction/PaymentMethodSelector";
import { useBankAccounts, useCreditCards } from "@/hooks/useBankData";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { PaymentMethod } from "@/types/finance";

interface BatchItemDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: OCRItem;
}

export function BatchItemDetailSheet({ 
  open, 
  onOpenChange, 
  item 
}: BatchItemDetailSheetProps) {
  const { data: bankAccounts = [] } = useBankAccounts();
  const { data: creditCards = [] } = useCreditCards();
  const updateItems = useUpdateOCRItems();

  // Local state
  const [amount, setAmount] = useState<string>(item.normalizedAmount?.toString().replace('.', ',') || "0,00");
  const [date, setDate] = useState<string>(item.normalizedDate || "");
  const [description, setDescription] = useState<string>(item.normalizedDescription || item.normalizedMerchant || "");
  const [categoryId, setCategoryId] = useState<string>(item.finalCategoryId || "");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>((item.finalPaymentMethod?.toLowerCase() as PaymentMethod) || "pix");
  const [bankAccountId, setBankAccountId] = useState<string>(item.finalBankAccountId || "");
  const [creditCardId, setCreditCardId] = useState<string>(item.finalCreditCardId || "");
  const [isRecurring, setIsRecurring] = useState<boolean>(item.isRecurring);

  // Reset state when item changes
  useEffect(() => {
    setAmount(item.normalizedAmount?.toString().replace('.', ',') || "0,00");
    setDate(item.normalizedDate || "");
    setDescription(item.normalizedDescription || item.normalizedMerchant || "");
    setCategoryId(item.finalCategoryId || "");
    setPaymentMethod((item.finalPaymentMethod?.toLowerCase() as PaymentMethod) || "pix");
    setBankAccountId(item.finalBankAccountId || "");
    setCreditCardId(item.finalCreditCardId || "");
    setIsRecurring(item.isRecurring);
  }, [item]);

  const handleSave = async () => {
    // Parse amount
    const parsedAmount = parseFloat(amount.replace(',', '.')) || 0;

    try {
      await updateItems.mutateAsync({
        itemIds: [item.id],
        updates: {
          normalizedAmount: parsedAmount,
          normalizedDate: date || null,
          normalizedDescription: description || null,
          finalCategoryId: categoryId || null,
          finalSubcategoryId: null,
          finalPaymentMethod: paymentMethod || null,
          finalBankAccountId: bankAccountId || null,
          finalCreditCardId: creditCardId || null,
          isRecurring,
        },
      });

      toast({
        title: "Item atualizado",
        description: "As alterações foram salvas.",
      });

      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive",
      });
    }
  };

  const activeAccounts = bankAccounts.filter(a => a.is_active);
  const activeCards = creditCards.filter(c => c.is_active);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Editar Item</SheetTitle>
          <SheetDescription>
            Corrija os dados extraídos do comprovante
          </SheetDescription>
        </SheetHeader>

        {/* Image preview */}
        <div className="mt-4 rounded-lg overflow-hidden border">
          <img
            src={item.imageUrl}
            alt="Receipt"
            className="w-full max-h-48 object-contain bg-muted"
          />
        </div>

        {/* Confidence warning */}
        {item.confidence < 70 && (
          <div className="mt-3 p-2 rounded-lg bg-warning/10 border border-warning/30">
            <p className="text-sm text-warning flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Confiança baixa ({item.confidence}%). Verifique os dados.
            </p>
          </div>
        )}

        {/* Duplicate warning */}
        {item.isDuplicateSuspect && (
          <div className="mt-3 p-2 rounded-lg bg-warning/10 border border-warning/30">
            <p className="text-sm text-warning flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {item.duplicateReason || "Possível duplicado"}
            </p>
          </div>
        )}

        <div className="space-y-4 mt-6">
          {/* Amount */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Valor
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                R$
              </span>
              <Input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d,]/g, ""))}
                className="pl-10 text-lg font-semibold"
                placeholder="0,00"
              />
            </div>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Data
            </Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Descrição
            </Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição do lançamento"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Tag className="w-4 h-4" />
              Categoria
            </Label>
            <CategorySelector
              value={categoryId}
              onChange={setCategoryId}
              classification="expense"
            />
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
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

          {/* Recurring */}
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Repeat className="w-4 h-4" />
              Lançamento Recorrente
            </Label>
            <Switch
              checked={isRecurring}
              onCheckedChange={setIsRecurring}
            />
          </div>

          {/* Save Button */}
          <Button
            className="w-full"
            onClick={handleSave}
            disabled={updateItems.isPending}
          >
            {updateItems.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Salvar Alterações
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
