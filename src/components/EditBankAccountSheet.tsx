import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useUpdateBankAccount } from "@/hooks/useBankData";
import { useFinancialInstitutions, institutionTypeLabels, type FinancialInstitution } from "@/hooks/useFinancialInstitutions";
import { toast } from "sonner";
import { Loader2, ChevronDown, Lock, Users, User, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
    agency?: string | null;
    account_number?: string | null;
    account_digit?: string | null;
    ownership_type?: 'individual' | 'joint' | null;
    titleholders?: string[] | null;
  } | null;
}

export function EditBankAccountSheet({ open, onOpenChange, account }: EditBankAccountSheetProps) {
  const [institutionId, setInstitutionId] = useState("");
  const [customBank, setCustomBank] = useState("");
  const [accountType, setAccountType] = useState("checking");
  const [nickname, setNickname] = useState("");
  const [balance, setBalance] = useState("");
  const [isActive, setIsActive] = useState(true);
  
  // Ownership
  const [ownershipType, setOwnershipType] = useState<"individual" | "joint">("individual");
  const [titleholder, setTitleholder] = useState("");
  const [jointTitleholders, setJointTitleholders] = useState<string[]>([""]);
  
  // Optional account details
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [agency, setAgency] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountDigit, setAccountDigit] = useState("");
  
  const { data: institutions = [], isLoading: loadingInstitutions } = useFinancialInstitutions(true);
  const updateAccount = useUpdateBankAccount();

  // Get selected institution for display
  const selectedInstitution = institutions.find(i => i.id === institutionId);

  useEffect(() => {
    if (account && open) {
      setInstitutionId(account.bank_id || "other");
      setCustomBank(account.custom_bank_name || "");
      setAccountType(account.account_type);
      setNickname(account.nickname);
      setBalance(account.initial_balance?.toString() || "");
      setIsActive(account.is_active);
      
      // New fields
      setOwnershipType(account.ownership_type || "individual");
      setAgency(account.agency || "");
      setAccountNumber(account.account_number || "");
      setAccountDigit(account.account_digit || "");
      
      // Titleholders
      const holders = account.titleholders || [];
      if (account.ownership_type === "joint" && holders.length > 1) {
        setJointTitleholders(holders);
        setTitleholder("");
      } else {
        setTitleholder(holders[0] || "");
        setJointTitleholders([""]);
      }
      
      // Show advanced if there's data
      setShowAdvanced(!!(account.agency || account.account_number));
    }
  }, [account, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!account || !nickname) {
      toast.error("Dê um apelido para a conta");
      return;
    }
    
    // Validate titleholder
    if (ownershipType === "individual" && !titleholder.trim()) {
      toast.error("Informe o nome do titular da conta");
      return;
    }
    
    if (ownershipType === "joint") {
      const validTitleholders = jointTitleholders.filter(t => t.trim());
      if (validTitleholders.length < 2) {
        toast.error("Conta conjunta precisa de pelo menos 2 titulares");
        return;
      }
    }
    
    try {
      const titleholders = ownershipType === "individual" 
        ? [titleholder.trim()]
        : jointTitleholders.filter(t => t.trim());
      
      await updateAccount.mutateAsync({
        id: account.id,
        bank_id: institutionId !== "other" ? institutionId : undefined,
        custom_bank_name: institutionId === "other" ? customBank : undefined,
        account_type: accountType,
        nickname,
        initial_balance: balance ? parseFloat(balance.replace(",", ".")) : undefined,
        is_active: isActive,
        ownership_type: ownershipType,
        titleholders,
        agency: agency || undefined,
        account_number: accountNumber || undefined,
        account_digit: accountDigit || undefined,
      });
      toast.success("Conta atualizada!");
      onOpenChange(false);
    } catch {
      toast.error("Erro ao atualizar conta");
    }
  };

  const addJointTitleholder = () => {
    if (jointTitleholders.length < 4) {
      setJointTitleholders([...jointTitleholders, ""]);
    }
  };

  const updateJointTitleholder = (index: number, value: string) => {
    const updated = [...jointTitleholders];
    updated[index] = value;
    setJointTitleholders(updated);
  };

  const removeJointTitleholder = (index: number) => {
    if (jointTitleholders.length > 1) {
      setJointTitleholders(jointTitleholders.filter((_, i) => i !== index));
    }
  };

  // Group institutions by type
  const groupedInstitutions = institutions.reduce((acc, inst) => {
    const type = inst.type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(inst);
    return acc;
  }, {} as Record<string, FinancialInstitution[]>);

  const typeOrder: Array<keyof typeof institutionTypeLabels> = [
    'retail_bank', 'digital_bank', 'investment_bank', 'cooperative', 'international'
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Editar Conta Bancária</SheetTitle>
          <SheetDescription>Atualize os dados da sua conta</SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-5 mt-6 pb-6">
          {/* Institution Selection with Logos */}
          <div className="space-y-2">
            <Label>Banco ou Instituição</Label>
            <Select value={institutionId} onValueChange={setInstitutionId}>
              <SelectTrigger className="h-14">
                <SelectValue placeholder="Selecione uma instituição">
                  {selectedInstitution && (
                    <div className="flex items-center gap-3">
                      <img 
                        src={selectedInstitution.logo_url} 
                        alt={selectedInstitution.name}
                        className="w-6 h-6 object-contain rounded"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <span>{selectedInstitution.name}</span>
                      {selectedInstitution.code && (
                        <span className="text-muted-foreground text-xs">({selectedInstitution.code})</span>
                      )}
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                {loadingInstitutions ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                ) : (
                  <>
                    {typeOrder.map(type => {
                      const items = groupedInstitutions[type];
                      if (!items?.length) return null;
                      
                      return (
                        <div key={type}>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50">
                            {institutionTypeLabels[type]}
                          </div>
                          {items.map(inst => (
                            <SelectItem key={inst.id} value={inst.id}>
                              <div className="flex items-center gap-3">
                                <img 
                                  src={inst.logo_url} 
                                  alt={inst.name}
                                  className="w-5 h-5 object-contain rounded"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                                <span>{inst.name}</span>
                                {inst.code && (
                                  <span className="text-muted-foreground text-xs">({inst.code})</span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </div>
                      );
                    })}
                    <SelectItem value="other">
                      <div className="flex items-center gap-3">
                        <Building2 className="w-5 h-5 text-muted-foreground" />
                        <span>Outra instituição</span>
                      </div>
                    </SelectItem>
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
          
          {institutionId === "other" && (
            <div className="space-y-2">
              <Label>Nome da instituição</Label>
              <Input 
                value={customBank} 
                onChange={(e) => setCustomBank(e.target.value)} 
                placeholder="Digite o nome" 
                className="h-12" 
              />
            </div>
          )}
          
          {/* Account Type */}
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
          
          {/* Nickname */}
          <div className="space-y-2">
            <Label>Apelido da conta *</Label>
            <Input 
              value={nickname} 
              onChange={(e) => setNickname(e.target.value)} 
              placeholder="Ex: Conta principal" 
              className="h-12" 
              required 
            />
          </div>
          
          {/* Ownership Type */}
          <div className="space-y-3">
            <Label>Titularidade da conta *</Label>
            <RadioGroup 
              value={ownershipType} 
              onValueChange={(v) => setOwnershipType(v as "individual" | "joint")}
              className="grid grid-cols-2 gap-3"
            >
              <Label 
                htmlFor="edit-individual" 
                className={cn(
                  "flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-all",
                  ownershipType === "individual" 
                    ? "border-primary bg-primary/5 ring-1 ring-primary" 
                    : "border-border hover:border-primary/50"
                )}
              >
                <RadioGroupItem value="individual" id="edit-individual" />
                <User className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">Individual</span>
              </Label>
              
              <Label 
                htmlFor="edit-joint" 
                className={cn(
                  "flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-all",
                  ownershipType === "joint" 
                    ? "border-primary bg-primary/5 ring-1 ring-primary" 
                    : "border-border hover:border-primary/50"
                )}
              >
                <RadioGroupItem value="joint" id="edit-joint" />
                <Users className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">Conjunta</span>
              </Label>
            </RadioGroup>
          </div>
          
          {/* Titleholder(s) */}
          {ownershipType === "individual" ? (
            <div className="space-y-2">
              <Label>Nome do titular *</Label>
              <Input 
                value={titleholder} 
                onChange={e => setTitleholder(e.target.value)} 
                placeholder="Ex: Thiago" 
                className="h-12" 
                required 
              />
            </div>
          ) : (
            <div className="space-y-3">
              <Label>Titulares da conta *</Label>
              {jointTitleholders.map((holder, index) => (
                <div key={index} className="flex gap-2">
                  <Input 
                    value={holder} 
                    onChange={e => updateJointTitleholder(index, e.target.value)} 
                    placeholder={`Titular ${index + 1}`} 
                    className="h-12 flex-1" 
                  />
                  {jointTitleholders.length > 1 && (
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon" 
                      className="h-12 w-12"
                      onClick={() => removeJointTitleholder(index)}
                    >
                      ×
                    </Button>
                  )}
                </div>
              ))}
              {jointTitleholders.length < 4 && (
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  onClick={addJointTitleholder}
                  className="w-full"
                >
                  + Adicionar titular
                </Button>
              )}
            </div>
          )}
          
          {/* Initial Balance */}
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
          
          {/* Advanced/Optional Fields */}
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Button 
                type="button" 
                variant="ghost" 
                className="w-full flex items-center justify-between h-12 px-4 text-muted-foreground"
              >
                <span className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Dados bancários (opcional)
                </span>
                <ChevronDown className={cn(
                  "w-4 h-4 transition-transform",
                  showAdvanced && "rotate-180"
                )} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Agência</Label>
                  <Input 
                    value={agency} 
                    onChange={e => setAgency(e.target.value)} 
                    placeholder="0000" 
                    className="h-12" 
                    maxLength={10}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Conta</Label>
                  <div className="flex gap-2">
                    <Input 
                      value={accountNumber} 
                      onChange={e => setAccountNumber(e.target.value)} 
                      placeholder="00000" 
                      className="h-12 flex-1" 
                      maxLength={20}
                    />
                    <Input 
                      value={accountDigit} 
                      onChange={e => setAccountDigit(e.target.value)} 
                      placeholder="-0" 
                      className="h-12 w-16" 
                      maxLength={2}
                    />
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Active Status */}
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
