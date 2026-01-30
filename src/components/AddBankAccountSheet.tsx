import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { useCreateBankAccount } from "@/hooks/useBankData";
import { useFinancialInstitutions, institutionTypeLabels, type FinancialInstitution } from "@/hooks/useFinancialInstitutions";
import { toast } from "sonner";
import { Loader2, ChevronDown, Lock, Users, User, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props { 
  open: boolean; 
  onOpenChange: (open: boolean) => void; 
}

export function AddBankAccountSheet({ open, onOpenChange }: Props) {
  // Institution selection
  const [institutionId, setInstitutionId] = useState("");
  const [customBank, setCustomBank] = useState("");
  
  // Account type and nickname
  const [accountType, setAccountType] = useState("checking");
  const [nickname, setNickname] = useState("");
  const [balance, setBalance] = useState("");
  
  // Ownership (REQUIRED)
  const [ownershipType, setOwnershipType] = useState<"individual" | "joint">("individual");
  const [titleholder, setTitleholder] = useState("");
  const [jointTitleholders, setJointTitleholders] = useState<string[]>([""]);
  
  // Optional account details (security-conscious - not required for manual entry)
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [agency, setAgency] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountDigit, setAccountDigit] = useState("");
  
  const { data: institutions = [], isLoading: loadingInstitutions } = useFinancialInstitutions(true);
  const createAccount = useCreateBankAccount();

  // Get selected institution for display
  const selectedInstitution = institutions.find(i => i.id === institutionId);

  const resetForm = () => {
    setInstitutionId("");
    setCustomBank("");
    setAccountType("checking");
    setNickname("");
    setBalance("");
    setOwnershipType("individual");
    setTitleholder("");
    setJointTitleholders([""]);
    setShowAdvanced(false);
    setAgency("");
    setAccountNumber("");
    setAccountDigit("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nickname) { 
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
      
      await createAccount.mutateAsync({
        bank_id: institutionId && institutionId !== "other" ? institutionId : undefined,
        custom_bank_name: institutionId === "other" ? customBank : undefined,
        account_type: accountType,
        nickname,
        initial_balance: balance ? parseFloat(balance.replace(",", ".")) : undefined,
        ownership_type: ownershipType,
        titleholders,
        agency: agency || undefined,
        account_number: accountNumber || undefined,
        account_digit: accountDigit || undefined,
      });
      
      toast.success("Conta adicionada!");
      onOpenChange(false);
      resetForm();
    } catch { 
      toast.error("Erro ao adicionar conta"); 
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

  // Group institutions by type for better UX
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
          <SheetTitle>Nova Conta Bancária</SheetTitle>
          <SheetDescription>
            Adicione uma conta para rastrear seus saldos e transações
          </SheetDescription>
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
                                    e.currentTarget.src = '';
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
                onChange={e => setCustomBank(e.target.value)} 
                placeholder="Digite o nome do banco ou instituição" 
                className="h-12" 
              />
            </div>
          )}
          
          {/* Account Type */}
          <div className="space-y-2">
            <Label>Tipo de conta</Label>
            <Select value={accountType} onValueChange={setAccountType}>
              <SelectTrigger className="h-12">
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
          
          {/* Nickname */}
          <div className="space-y-2">
            <Label>Apelido da conta *</Label>
            <Input 
              value={nickname} 
              onChange={e => setNickname(e.target.value)} 
              placeholder="Ex: Conta principal, Reserva emergência" 
              className="h-12" 
              required 
            />
          </div>
          
          {/* Ownership Type - REQUIRED */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              Titularidade da conta *
            </Label>
            <RadioGroup 
              value={ownershipType} 
              onValueChange={(v) => setOwnershipType(v as "individual" | "joint")}
              className="grid grid-cols-2 gap-3"
            >
              <Label 
                htmlFor="individual" 
                className={cn(
                  "flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-all",
                  ownershipType === "individual" 
                    ? "border-primary bg-primary/5 ring-1 ring-primary" 
                    : "border-border hover:border-primary/50"
                )}
              >
                <RadioGroupItem value="individual" id="individual" />
                <User className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">Individual</span>
              </Label>
              
              <Label 
                htmlFor="joint" 
                className={cn(
                  "flex items-center gap-3 p-4 border rounded-xl cursor-pointer transition-all",
                  ownershipType === "joint" 
                    ? "border-primary bg-primary/5 ring-1 ring-primary" 
                    : "border-border hover:border-primary/50"
                )}
              >
                <RadioGroupItem value="joint" id="joint" />
                <Users className="w-5 h-5 text-muted-foreground" />
                <span className="font-medium">Conjunta</span>
              </Label>
            </RadioGroup>
          </div>
          
          {/* Titleholder(s) - REQUIRED */}
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
              onChange={e => setBalance(e.target.value)} 
              placeholder="0,00" 
              className="h-12" 
              inputMode="decimal" 
            />
          </div>
          
          {/* Advanced/Optional Fields - Security Conscious */}
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
              <p className="text-xs text-muted-foreground px-1">
                Estes dados são opcionais para cadastro manual. Serão preenchidos automaticamente 
                em importações e Open Finance.
              </p>
              
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
          
          {/* Submit Button */}
          <Button 
            type="submit" 
            size="lg" 
            className="w-full h-12" 
            disabled={createAccount.isPending}
          >
            {createAccount.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : null}
            Adicionar conta
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
