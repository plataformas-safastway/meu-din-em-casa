import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBanks, useCreateBankAccount } from "@/hooks/useBankData";
import { toast } from "sonner";
import { Loader2, ChevronLeft, Sparkles } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (accountId: string) => void;
}

export function QuickBankAccountSheet({ open, onOpenChange, onSuccess }: Props) {
  const [bankId, setBankId] = useState("");
  const [customBank, setCustomBank] = useState("");
  const [accountType, setAccountType] = useState("checking");
  const [nickname, setNickname] = useState("");
  const { data: banks = [] } = useBanks();
  const createAccount = useCreateBankAccount();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname) {
      toast.error("Dê um apelido para a conta");
      return;
    }
    try {
      await createAccount.mutateAsync({
        bank_id: bankId || undefined,
        custom_bank_name: customBank || undefined,
        account_type: accountType as any,
        nickname,
      });
      toast.success("Conta adicionada!");
      
      // Reset form
      setBankId("");
      setCustomBank("");
      setNickname("");
      
      onOpenChange(false);
      
      // Note: We can't easily get the new ID from the mutation, 
      // but the query will refetch and the parent can use the first account
      onSuccess?.("");
    } catch {
      toast.error("Erro ao adicionar conta");
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
            Cadastre uma conta rapidinho e volte para o lançamento
          </p>
          
          <div className="space-y-2">
            <Label>Banco</Label>
            <Select value={bankId} onValueChange={setBankId}>
              <SelectTrigger className="h-12 rounded-xl border-2">
                <SelectValue placeholder="Selecione um banco" />
              </SelectTrigger>
              <SelectContent>
                {banks.map((b) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
                <SelectItem value="other">Outro banco</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {bankId === "other" && (
            <div className="space-y-2 animate-fade-in">
              <Label>Nome do banco</Label>
              <Input
                value={customBank}
                onChange={(e) => setCustomBank(e.target.value)}
                placeholder="Digite o nome"
                className="h-12 rounded-xl border-2"
              />
            </div>
          )}
          
          <div className="space-y-2">
            <Label>Tipo de conta</Label>
            <Select value={accountType} onValueChange={setAccountType}>
              <SelectTrigger className="h-12 rounded-xl border-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="checking">Conta Corrente</SelectItem>
                <SelectItem value="savings">Poupança</SelectItem>
                <SelectItem value="digital">Conta Digital</SelectItem>
                <SelectItem value="salary">Conta Salário</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Apelido da conta *</Label>
            <Input
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Ex: Conta principal"
              className="h-12 rounded-xl border-2"
              required
            />
          </div>
          
          <Button
            type="submit"
            size="lg"
            className="w-full h-12 rounded-xl"
            disabled={createAccount.isPending || !nickname}
          >
            {createAccount.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Adicionar e continuar
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
