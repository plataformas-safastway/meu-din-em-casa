import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useBanks, useUpdateBankAccount } from "@/hooks/useBankData";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface EditBankAccountSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: {
    id: string;
    bank_id: string | null;
    custom_bank_name: string | null;
    account_type: string;
    nickname: string;
    initial_balance: number | null;
    is_active: boolean;
  } | null;
}

export function EditBankAccountSheet({ open, onOpenChange, account }: EditBankAccountSheetProps) {
  const [bankId, setBankId] = useState("");
  const [customBank, setCustomBank] = useState("");
  const [accountType, setAccountType] = useState("checking");
  const [nickname, setNickname] = useState("");
  const [balance, setBalance] = useState("");
  const [isActive, setIsActive] = useState(true);
  
  const { data: banks = [] } = useBanks();
  const updateAccount = useUpdateBankAccount();

  useEffect(() => {
    if (account && open) {
      setBankId(account.bank_id || "other");
      setCustomBank(account.custom_bank_name || "");
      setAccountType(account.account_type);
      setNickname(account.nickname);
      setBalance(account.initial_balance?.toString() || "");
      setIsActive(account.is_active);
    }
  }, [account, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account || !nickname) {
      toast.error("Dê um apelido para a conta");
      return;
    }
    try {
      await updateAccount.mutateAsync({
        id: account.id,
        bank_id: bankId !== "other" ? bankId : undefined,
        custom_bank_name: bankId === "other" ? customBank : undefined,
        account_type: accountType,
        nickname,
        initial_balance: balance ? parseFloat(balance.replace(",", ".")) : undefined,
        is_active: isActive,
      });
      toast.success("Conta atualizada!");
      onOpenChange(false);
    } catch {
      toast.error("Erro ao atualizar conta");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Editar Conta Bancária</SheetTitle>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-6 pb-6">
          <div className="space-y-2">
            <Label>Banco</Label>
            <Select value={bankId} onValueChange={setBankId}>
              <SelectTrigger className="h-12">
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
            <div className="space-y-2">
              <Label>Nome do banco</Label>
              <Input 
                value={customBank} 
                onChange={(e) => setCustomBank(e.target.value)} 
                placeholder="Digite o nome" 
                className="h-12" 
              />
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
            <Input 
              value={nickname} 
              onChange={(e) => setNickname(e.target.value)} 
              placeholder="Ex: Conta principal" 
              className="h-12" 
              required 
            />
          </div>
          
          <div className="space-y-2">
            <Label>Saldo inicial (opcional)</Label>
            <Input 
              value={balance} 
              onChange={(e) => setBalance(e.target.value)} 
              placeholder="0,00" 
              className="h-12" 
              inputMode="decimal" 
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
            <div>
              <Label className="text-base">Conta ativa</Label>
              <p className="text-sm text-muted-foreground">Desativar oculta a conta das seleções</p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
          
          <Button type="submit" size="lg" className="w-full h-12" disabled={updateAccount.isPending}>
            {updateAccount.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Salvar alterações
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
