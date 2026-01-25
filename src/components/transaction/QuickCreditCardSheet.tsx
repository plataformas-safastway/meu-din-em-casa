import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCreateCreditCard } from "@/hooks/useBankData";
import { toast } from "sonner";
import { Loader2, ChevronLeft, Sparkles } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (cardId: string) => void;
}

export function QuickCreditCardSheet({ open, onOpenChange, onSuccess }: Props) {
  const [cardName, setCardName] = useState("");
  const [brand, setBrand] = useState("visa");
  const [closingDay, setClosingDay] = useState("10");
  const [dueDay, setDueDay] = useState("20");
  const createCard = useCreateCreditCard();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardName) {
      toast.error("Dê um nome para o cartão");
      return;
    }
    try {
      await createCard.mutateAsync({
        card_name: cardName,
        brand: brand as any,
        closing_day: parseInt(closingDay),
        due_day: parseInt(dueDay),
      });
      toast.success("Cartão adicionado!");
      
      // Reset form
      setCardName("");
      
      onOpenChange(false);
      onSuccess?.("");
    } catch {
      toast.error("Erro ao adicionar cartão");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[75vh] rounded-t-3xl">
        <SheetHeader className="pb-2">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="absolute left-4 top-4 flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="w-5 h-5" />
            Voltar
          </button>
          <SheetTitle className="text-center flex items-center justify-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Cadastro Rápido
          </SheetTitle>
        </SheetHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <p className="text-sm text-muted-foreground text-center mb-4">
            Cadastre um cartão rapidinho e volte para o lançamento
          </p>
          
          <div className="space-y-2">
            <Label>Nome do cartão *</Label>
            <Input
              value={cardName}
              onChange={(e) => setCardName(e.target.value)}
              placeholder="Ex: Nubank Platinum"
              className="h-12 rounded-xl border-2"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label>Bandeira</Label>
            <Select value={brand} onValueChange={setBrand}>
              <SelectTrigger className="h-12 rounded-xl border-2">
                <SelectValue />
              </SelectTrigger>
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
              <Label>Fechamento</Label>
              <Input
                type="number"
                min="1"
                max="31"
                value={closingDay}
                onChange={(e) => setClosingDay(e.target.value)}
                className="h-12 rounded-xl border-2"
              />
            </div>
            <div className="space-y-2">
              <Label>Vencimento</Label>
              <Input
                type="number"
                min="1"
                max="31"
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
                className="h-12 rounded-xl border-2"
              />
            </div>
          </div>
          
          <Button
            type="submit"
            size="lg"
            className="w-full h-12 rounded-xl"
            disabled={createCard.isPending || !cardName}
          >
            {createCard.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Adicionar e continuar
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
