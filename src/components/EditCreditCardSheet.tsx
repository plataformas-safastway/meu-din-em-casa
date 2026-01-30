import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useBankAccounts, useUpdateCreditCard } from "@/hooks/useBankData";
import { useFinancialInstitutions, useCardBrands, institutionTypeLabels, type FinancialInstitution } from "@/hooks/useFinancialInstitutions";
import { toast } from "sonner";
import { Loader2, ChevronDown, Lock, CreditCard, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
    bank_id?: string | null;
    card_holder?: string | null;
    last_four_digits?: string | null;
    is_active: boolean;
  } | null;
}

export function EditCreditCardSheet({ open, onOpenChange, card }: EditCreditCardSheetProps) {
  const [cardName, setCardName] = useState("");
  const [institutionId, setInstitutionId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [closingDay, setClosingDay] = useState("10");
  const [dueDay, setDueDay] = useState("20");
  const [cardHolder, setCardHolder] = useState("");
  const [bankAccountId, setBankAccountId] = useState("");
  const [isActive, setIsActive] = useState(true);
  
  // Optional fields
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [limit, setLimit] = useState("");
  const [lastFourDigits, setLastFourDigits] = useState("");
  
  const { data: institutions = [], isLoading: loadingInstitutions } = useFinancialInstitutions(true);
  const { data: brands = [], isLoading: loadingBrands } = useCardBrands();
  const { data: bankAccounts = [] } = useBankAccounts();
  const updateCard = useUpdateCreditCard();

  // Get selected items for display
  const selectedInstitution = institutions.find(i => i.id === institutionId);
  const selectedBrand = brands.find(b => b.id === brandId);

  useEffect(() => {
    if (card && open) {
      setCardName(card.card_name);
      setInstitutionId(card.bank_id || "");
      setClosingDay(card.closing_day?.toString() || "10");
      setDueDay(card.due_day?.toString() || "20");
      setLimit(card.credit_limit?.toString() || "");
      setBankAccountId(card.bank_account_id || "");
      setCardHolder(card.card_holder || "");
      setLastFourDigits(card.last_four_digits || "");
      setIsActive(card.is_active);
      
      // Find brand by slug
      const matchedBrand = brands.find(b => b.slug === card.brand);
      setBrandId(matchedBrand?.id || "");
      
      // Show advanced if there's data
      setShowAdvanced(!!(card.credit_limit || card.last_four_digits));
    }
  }, [card, open, brands]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!card || !cardName) {
      toast.error("Dê um nome para o cartão");
      return;
    }
    
    if (!brandId) {
      toast.error("Selecione a bandeira do cartão");
      return;
    }
    
    if (!cardHolder.trim()) {
      toast.error("Informe o nome do titular do cartão");
      return;
    }
    
    // Validate last 4 digits format if provided
    if (lastFourDigits && !/^\d{4}$/.test(lastFourDigits)) {
      toast.error("Últimos 4 dígitos devem ter exatamente 4 números");
      return;
    }
    
    try {
      // Map brand ID to slug for backward compatibility
      const brandSlug = selectedBrand?.slug || 'visa';
      
      await updateCard.mutateAsync({
        id: card.id,
        card_name: cardName,
        brand: brandSlug,
        closing_day: parseInt(closingDay),
        due_day: parseInt(dueDay),
        credit_limit: limit ? parseFloat(limit.replace(",", ".")) : undefined,
        bank_account_id: bankAccountId || undefined,
        bank_id: institutionId || undefined,
        card_holder: cardHolder.trim(),
        last_four_digits: lastFourDigits || undefined,
        is_active: isActive,
      });
      toast.success("Cartão atualizado!");
      onOpenChange(false);
    } catch {
      toast.error("Erro ao atualizar cartão");
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
          <SheetTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Editar Cartão de Crédito
          </SheetTitle>
          <SheetDescription>Atualize os dados do seu cartão</SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-5 mt-6 pb-6">
          {/* Card Name */}
          <div className="space-y-2">
            <Label>Nome do cartão *</Label>
            <Input 
              value={cardName} 
              onChange={(e) => setCardName(e.target.value)} 
              placeholder="Ex: Nubank Platinum" 
              className="h-12" 
              required 
            />
          </div>
          
          {/* Issuing Bank with Logos */}
          <div className="space-y-2">
            <Label>Banco emissor</Label>
            <Select value={institutionId} onValueChange={setInstitutionId}>
              <SelectTrigger className="h-14">
                <SelectValue placeholder="Selecione o banco (opcional)">
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
                    <SelectItem value="">
                      <span className="text-muted-foreground">Não informar</span>
                    </SelectItem>
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
                              </div>
                            </SelectItem>
                          ))}
                        </div>
                      );
                    })}
                  </>
                )}
              </SelectContent>
            </Select>
          </div>
          
          {/* Brand with Logos */}
          <div className="space-y-2">
            <Label>Bandeira *</Label>
            <Select value={brandId} onValueChange={setBrandId}>
              <SelectTrigger className="h-14">
                <SelectValue placeholder="Selecione a bandeira">
                  {selectedBrand && (
                    <div className="flex items-center gap-3">
                      <img 
                        src={selectedBrand.logo_url} 
                        alt={selectedBrand.name}
                        className="w-8 h-5 object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <span>{selectedBrand.name}</span>
                    </div>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {loadingBrands ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-4 h-4 animate-spin" />
                  </div>
                ) : (
                  brands.map(brand => (
                    <SelectItem key={brand.id} value={brand.id}>
                      <div className="flex items-center gap-3">
                        <img 
                          src={brand.logo_url} 
                          alt={brand.name}
                          className="w-8 h-5 object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                        <span>{brand.name}</span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          
          {/* Card Holder - REQUIRED */}
          <div className="space-y-2">
            <Label>Titular do cartão *</Label>
            <Input 
              value={cardHolder} 
              onChange={e => setCardHolder(e.target.value)} 
              placeholder="Nome como aparece no cartão" 
              className="h-12" 
              required 
            />
          </div>
          
          {/* Billing Dates */}
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

          {/* Linked Bank Account */}
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
                  Dados adicionais (opcional)
                </span>
                <ChevronDown className={cn(
                  "w-4 h-4 transition-transform",
                  showAdvanced && "rotate-180"
                )} />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Limite do cartão</Label>
                <Input 
                  value={limit} 
                  onChange={(e) => setLimit(e.target.value)} 
                  placeholder="0,00" 
                  className="h-12" 
                  inputMode="decimal" 
                />
              </div>
              
              <div className="space-y-2">
                <Label>Últimos 4 dígitos</Label>
                <Input 
                  value={lastFourDigits} 
                  onChange={e => setLastFourDigits(e.target.value.replace(/\D/g, "").slice(0, 4))} 
                  placeholder="0000" 
                  className="h-12" 
                  maxLength={4}
                  inputMode="numeric"
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Active Status */}
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
