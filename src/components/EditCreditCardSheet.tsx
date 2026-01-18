import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useBankAccounts, useUpdateCreditCard } from "@/hooks/useBankData";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface EditCreditCardSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: {
    id: string;
    card_name: string;
    brand: string;
    closing_day: number | null;
    due_day: number | null;
    credit_limit: number | null;
    bank_account_id: string | null;
    is_active: boolean;
  } | null;
}

export function EditCreditCardSheet({ open, onOpenChange, card }: EditCreditCardSheetProps) {
  const [cardName, setCardName] = useState("");
  const [brand, setBrand] = useState("visa");
  const [closingDay, setClosingDay] = useState("10");
  const [dueDay, setDueDay] = useState("20");
  const [limit, setLimit] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [isActive, setIsActive] = useState(true);
  
  const { data: bankAccounts = [] } = useBankAccounts();
  const updateCard = useUpdateCreditCard();

  useEffect(() => {
    if (card && open) {
      setCardName(card.card_name);
      setBrand(card.brand);
      setClosingDay(card.closing_day?.toString() || "10");
      setDueDay(card.due_day?.toString() || "20");
      setLimit(card.credit_limit?.toString() || "");
      setBankAccountId(card.bank_account_id || "");
      setIsActive(card.is_active);
    }
  }, [card, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!card || !cardName) {
      toast.error("Dê um nome para o cartão");
      return;
    }
    try {
      await updateCard.mutateAsync({
        id: card.id,
        card_name: cardName,
        brand,
        closing_day: parseInt(closingDay),
        due_day: parseInt(dueDay),
        credit_limit: limit ? parseFloat(limit.replace(",", ".")) : undefined,
        bank_account_id: bankAccountId || undefined,
        is_active: isActive,
      });
      toast.success("Cartão atualizado!");
      onOpenChange(false);
    } catch {
      toast.error("Erro ao atualizar cartão");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Editar Cartão de Crédito</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-6 pb-6">
          <div className="space-y-2">
            <Label>Nome do cartão</Label>
            <Input 
              value={cardName} 
              onChange={(e) => setCardName(e.target.value)} 
              placeholder="Ex: Nubank Platinum" 
              className="h-12" 
              required 
            />
          </div>
          
          <div className="space-y-2">
            <Label>Bandeira</Label>
            <Select value={brand} onValueChange={setBrand}>
              <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="visa">Visa</SelectItem>
                <SelectItem value="mastercard">Mastercard</SelectItem>
                <SelectItem value="elo">Elo</SelectItem>
                <SelectItem value="amex">American Express</SelectItem>
                <SelectItem value="hipercard">Hipercard</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Dia de fechamento</Label>
              <Input 
                type="number" 
                min="1" 
                max="31" 
                value={closingDay} 
                onChange={(e) => setClosingDay(e.target.value)} 
                className="h-12" 
              />
            </div>
            <div className="space-y-2">
              <Label>Dia de vencimento</Label>
              <Input 
                type="number" 
                min="1" 
                max="31" 
                value={dueDay} 
                onChange={(e) => setDueDay(e.target.value)} 
                className="h-12" 
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Limite (opcional)</Label>
            <Input 
              value={limit} 
              onChange={(e) => setLimit(e.target.value)} 
              placeholder="0,00" 
              className="h-12" 
              inputMode="decimal" 
            />
          </div>

          <div className="space-y-2">
            <Label>Conta para débito da fatura (opcional)</Label>
            <Select value={bankAccountId} onValueChange={setBankAccountId}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Selecione uma conta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Nenhuma</SelectItem>
                {bankAccounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.nickname}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
            <div>
              <Label className="text-base">Cartão ativo</Label>
              <p className="text-sm text-muted-foreground">Desativar oculta o cartão das seleções</p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
          
          <Button type="submit" size="lg" className="w-full h-12" disabled={updateCard.isPending}>
            {updateCard.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Salvar alterações
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
