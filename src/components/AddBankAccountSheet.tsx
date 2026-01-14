import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useBanks, useCreateBankAccount } from "@/hooks/useBankData";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface Props { open: boolean; onOpenChange: (open: boolean) => void; }

export function AddBankAccountSheet({ open, onOpenChange }: Props) {
  const [bankId, setBankId] = useState("");
  const [customBank, setCustomBank] = useState("");
  const [accountType, setAccountType] = useState("checking");
  const [nickname, setNickname] = useState("");
  const [balance, setBalance] = useState("");
  const { data: banks = [] } = useBanks();
  const createAccount = useCreateBankAccount();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname) { toast.error("Dê um apelido para a conta"); return; }
    try {
      await createAccount.mutateAsync({
        bank_id: bankId || undefined,
        custom_bank_name: customBank || undefined,
        account_type: accountType as any,
        nickname,
        initial_balance: balance ? parseFloat(balance.replace(",", ".")) : undefined,
      });
      toast.success("Conta adicionada!");
      onOpenChange(false);
      setBankId(""); setCustomBank(""); setNickname(""); setBalance("");
    } catch { toast.error("Erro ao adicionar conta"); }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader><SheetTitle>Nova Conta Bancária</SheetTitle></SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <div className="space-y-2">
            <Label>Banco</Label>
            <Select value={bankId} onValueChange={setBankId}>
              <SelectTrigger className="h-12"><SelectValue placeholder="Selecione um banco" /></SelectTrigger>
              <SelectContent>
                {banks.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                <SelectItem value="other">Outro banco</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {bankId === "other" && (
            <div className="space-y-2">
              <Label>Nome do banco</Label>
              <Input value={customBank} onChange={e => setCustomBank(e.target.value)} placeholder="Digite o nome" className="h-12" />
            </div>
          )}
          <div className="space-y-2">
            <Label>Tipo de conta</Label>
            <Select value={accountType} onValueChange={setAccountType}>
              <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="checking">Conta Corrente</SelectItem>
                <SelectItem value="savings">Poupança</SelectItem>
                <SelectItem value="digital">Conta Digital</SelectItem>
                <SelectItem value="salary">Conta Salário</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Apelido da conta</Label>
            <Input value={nickname} onChange={e => setNickname(e.target.value)} placeholder="Ex: Conta principal" className="h-12" required />
          </div>
          <div className="space-y-2">
            <Label>Saldo inicial (opcional)</Label>
            <Input value={balance} onChange={e => setBalance(e.target.value)} placeholder="0,00" className="h-12" inputMode="decimal" />
          </div>
          <Button type="submit" size="lg" className="w-full h-12" disabled={createAccount.isPending}>
            {createAccount.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Adicionar conta
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
