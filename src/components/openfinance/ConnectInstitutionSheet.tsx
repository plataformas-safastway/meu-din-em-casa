import { useState, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { usePluggyInstitutions, useCreateConnection, useStartConsentFlow, PluggyInstitution } from "@/hooks/useOpenFinance";
import { useFinancialInstitutions, institutionTypeLabels } from "@/hooks/useFinancialInstitutions";
import { Search, Building2, Loader2, ChevronRight, Shield, Eye, CreditCard, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface ConnectInstitutionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'search' | 'consent' | 'connecting';

const CONSENT_SCOPES = [
  { id: 'accounts', label: 'Ler contas e saldos', description: 'Visualizar suas contas bancárias e saldos atuais', icon: Building2 },
  { id: 'transactions', label: 'Ler transações', description: 'Importar histórico de movimentações', icon: Eye },
  { id: 'credit_cards', label: 'Ler cartões e faturas', description: 'Visualizar cartões de crédito e faturas (quando disponível)', icon: CreditCard },
];

export function ConnectInstitutionSheet({ open, onOpenChange }: ConnectInstitutionSheetProps) {
  const [step, setStep] = useState<Step>('search');
  const [search, setSearch] = useState("");
  const [selectedInstitution, setSelectedInstitution] = useState<PluggyInstitution | null>(null);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [selectedScopes, setSelectedScopes] = useState<string[]>(['accounts', 'transactions', 'credit_cards']);

  const { data: institutionsData, isLoading } = usePluggyInstitutions();
  const { data: localInstitutions = [] } = useFinancialInstitutions(false);
  const createConnectionMutation = useCreateConnection();
  const startConsentMutation = useStartConsentFlow();

  const filteredInstitutions = useMemo(() => {
    if (!institutionsData?.connectors) return [];
    
    const searchLower = search.toLowerCase();
    return institutionsData.connectors
      .filter(inst => inst.name.toLowerCase().includes(searchLower))
      .map(inst => {
        // Try to find matching local institution for logo
        const localMatch = localInstitutions.find(
          li => li.name.toLowerCase().includes(inst.name.toLowerCase()) || 
                (li.code && inst.name.includes(li.code))
        );
        return {
          ...inst,
          enrichedLogoUrl: localMatch?.logo_url || inst.imageUrl,
          institutionType: localMatch?.type,
        };
      });
  }, [institutionsData, search, localInstitutions]);

  const handleSelectInstitution = (institution: PluggyInstitution) => {
    setSelectedInstitution(institution);
    setStep('consent');
  };

  const handleBack = () => {
    if (step === 'consent') {
      setStep('search');
      setSelectedInstitution(null);
    }
  };

  const handleConnect = async () => {
    if (!selectedInstitution || !agreedToTerms) return;

    setStep('connecting');

    try {
      // 1. Criar conexão no banco
      const connection = await createConnectionMutation.mutateAsync({
        institutionId: String(selectedInstitution.id),
        institutionName: selectedInstitution.name,
        institutionLogoUrl: selectedInstitution.imageUrl,
        scopes: selectedScopes,
      });

      // 2. Iniciar fluxo de consentimento
      const consentData = await startConsentMutation.mutateAsync({
        connectionId: connection.id,
        institutionId: String(selectedInstitution.id),
      });

      // 3. Abrir URL do Pluggy Connect em nova janela
      if (consentData.connectUrl) {
        window.open(consentData.connectUrl, '_blank', 'width=500,height=700');
        toast.info("Complete a conexão na janela do banco");
      }

      // Fechar sheet
      handleClose();
    } catch (error) {
      setStep('consent');
    }
  };

  const handleClose = () => {
    setStep('search');
    setSearch("");
    setSelectedInstitution(null);
    setAgreedToTerms(false);
    setSelectedScopes(['accounts', 'transactions', 'credit_cards']);
    onOpenChange(false);
  };

  const toggleScope = (scopeId: string) => {
    setSelectedScopes(prev => 
      prev.includes(scopeId) 
        ? prev.filter(s => s !== scopeId)
        : [...prev, scopeId]
    );
  };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl">
        <SheetHeader className="text-left pb-4">
          <div className="flex items-center gap-3">
            {step !== 'search' && (
              <Button variant="ghost" size="icon" onClick={handleBack}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
            <div>
              <SheetTitle>
                {step === 'search' && "Conectar Instituição"}
                {step === 'consent' && selectedInstitution?.name}
                {step === 'connecting' && "Conectando..."}
              </SheetTitle>
              <SheetDescription>
                {step === 'search' && "Escolha o banco ou instituição financeira"}
                {step === 'consent' && "Revise as permissões e aceite os termos"}
                {step === 'connecting' && "Aguarde enquanto preparamos a conexão"}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {step === 'search' && (
          <>
            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar banco ou instituição..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Institutions List */}
            <ScrollArea className="h-[calc(90vh-200px)]">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : filteredInstitutions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  {search ? "Nenhuma instituição encontrada" : "Carregando instituições..."}
                </div>
              ) : (
                <div className="space-y-2 pr-4">
                  {filteredInstitutions.map((institution) => (
                    <button
                      key={institution.id}
                      className="w-full flex items-center gap-4 p-4 rounded-xl bg-card border border-border/30 hover:border-primary/30 transition-colors text-left"
                      onClick={() => handleSelectInstitution(institution)}
                    >
                      {institution.enrichedLogoUrl ? (
                        <img 
                          src={institution.enrichedLogoUrl} 
                          alt={institution.name}
                          className="w-10 h-10 rounded-lg object-contain bg-white p-1 border border-border/50"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center ${institution.enrichedLogoUrl ? 'hidden' : ''}`}>
                        <Building2 className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium truncate">{institution.name}</h3>
                        <div className="flex items-center gap-2">
                          <p className="text-sm text-muted-foreground capitalize">{institution.type}</p>
                          {institution.institutionType && (
                            <Badge variant="outline" className="text-xs">
                              {institutionTypeLabels[institution.institutionType]}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </>
        )}

        {step === 'consent' && selectedInstitution && (
          <div className="space-y-6 overflow-y-auto max-h-[calc(90vh-220px)] pb-6">
            {/* Institution header */}
            <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/30 border border-border/30">
              {selectedInstitution.imageUrl ? (
                <img 
                  src={selectedInstitution.imageUrl} 
                  alt={selectedInstitution.name}
                  className="w-12 h-12 rounded-lg object-contain bg-white p-1"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
              )}
              <div>
                <h3 className="font-medium">{selectedInstitution.name}</h3>
                <p className="text-sm text-muted-foreground">Conexão somente leitura</p>
              </div>
            </div>

            {/* Scopes */}
            <div className="space-y-3">
              <h3 className="font-medium text-sm">Permissões solicitadas</h3>
              {CONSENT_SCOPES.map((scope) => {
                const Icon = scope.icon;
                const isSelected = selectedScopes.includes(scope.id);
                
                return (
                  <div 
                    key={scope.id}
                    className={`flex items-start gap-4 p-4 rounded-xl border transition-colors cursor-pointer ${
                      isSelected 
                        ? 'bg-primary/5 border-primary/30' 
                        : 'bg-card border-border/30 hover:border-primary/20'
                    }`}
                    onClick={() => toggleScope(scope.id)}
                  >
                    <Checkbox 
                      checked={isSelected}
                      onCheckedChange={() => toggleScope(scope.id)}
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-primary" />
                        <span className="font-medium text-sm">{scope.label}</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{scope.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Security note */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
              <Shield className="w-5 h-5 text-green-500 mt-0.5" />
              <div>
                <h4 className="font-medium text-sm text-green-600">Conexão segura</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Não armazenamos suas senhas. A conexão é feita diretamente com o banco 
                  através do Pluggy, regulado pelo Banco Central.
                </p>
              </div>
            </div>

            {/* Terms */}
            <div 
              className="flex items-start gap-3 p-4 rounded-xl border border-border/30 cursor-pointer"
              onClick={() => setAgreedToTerms(!agreedToTerms)}
            >
              <Checkbox 
                checked={agreedToTerms} 
                onCheckedChange={(checked) => setAgreedToTerms(checked as boolean)}
              />
              <p className="text-sm text-muted-foreground">
                Li e concordo com os{" "}
                <a href="#" className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                  Termos de Uso
                </a>{" "}
                e{" "}
                <a href="#" className="text-primary hover:underline" onClick={(e) => e.stopPropagation()}>
                  Política de Privacidade
                </a>
              </p>
            </div>

            {/* Connect button */}
            <Button 
              className="w-full" 
              onClick={handleConnect}
              disabled={!agreedToTerms || selectedScopes.length === 0}
            >
              Continuar para o banco
            </Button>
          </div>
        )}

        {step === 'connecting' && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <div className="text-center">
              <h3 className="font-medium">Preparando conexão...</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Você será redirecionado para o banco
              </p>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
