import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateCreditCard } from "@/hooks/useBankData";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Props { open: boolean; onOpenChange: (open: boolean) => void; }

export function AddCreditCardSheet({ open, onOpenChange }: Props) {
  const [cardName, setCardName] = useState("");
  const [brand, setBrand] = useState("visa");
  const [closingDay, setClosingDay] = useState("10");
  const [dueDay, setDueDay] = useState("20");
  const [limit, setLimit] = useState("");
  const createCard = useCreateCreditCard();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardName) { toast.error("Dê um nome para o cartão"); return; }
    try {
      await createCard.mutateAsync({
        card_name: cardName,
        brand: brand as any,
        closing_day: parseInt(closingDay),
        due_day: parseInt(dueDay),
        credit_limit: limit ? parseFloat(limit.replace(",", ".")) : undefined,
      });
      toast.success("Cartão adicionado!");
      onOpenChange(false);
      setCardName(""); setLimit("");
    } catch { toast.error("Erro ao adicionar cartão"); }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader><SheetTitle>Novo Cartão de Crédito</SheetTitle></SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <div className="space-y-2">
            <Label>Nome do cartão</Label>
            <Input value={cardName} onChange={e => setCardName(e.target.value)} placeholder="Ex: Nubank Platinum" className="h-12" required />
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
              <Input type="number" min="1" max="31" value={closingDay} onChange={e => setClosingDay(e.target.value)} className="h-12" />
            </div>
            <div className="space-y-2">
              <Label>Dia de vencimento</Label>
              <Input type="number" min="1" max="31" value={dueDay} onChange={e => setDueDay(e.target.value)} className="h-12" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Limite (opcional)</Label>
            <Input value={limit} onChange={e => setLimit(e.target.value)} placeholder="0,00" className="h-12" inputMode="decimal" />
          </div>
          <Button type="submit" size="lg" className="w-full h-12" disabled={createCard.isPending}>
            {createCard.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Adicionar cartão
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
