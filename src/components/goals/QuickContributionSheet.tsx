import { useState, useEffect } from "react";
import { Goal } from "@/hooks/useGoals";
import { useCreateContribution } from "@/hooks/useGoalContributions";
import { useBankAccounts, useCreditCards } from "@/hooks/useBankData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, PiggyBank, Building2, CreditCard, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatters";
import { expensePaymentMethods, requiresBankAccount, requiresCreditCard } from "@/data/categories";
import { QuickBankAccountSheet, QuickCreditCardSheet } from "@/components/transaction";

interface QuickContributionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: Goal | null;
}

export function QuickContributionSheet({ open, onOpenChange, goal }: QuickContributionSheetProps) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState<string>("pix");
  const [bankAccountId, setBankAccountId] = useState<string>("");
  const [creditCardId, setCreditCardId] = useState<string>("");
  
  // Quick registration modals
  const [showQuickAccount, setShowQuickAccount] = useState(false);
  const [showQuickCard, setShowQuickCard] = useState(false);
  
  const createContribution = useCreateContribution();
  const { data: bankAccounts = [], refetch: refetchAccounts } = useBankAccounts();
  const { data: creditCards = [], refetch: refetchCards } = useCreditCards();

  const activeAccounts = bankAccounts.filter((a: { is_active: boolean }) => a.is_active);
  const activeCards = creditCards.filter((c: { is_active: boolean }) => c.is_active);

  // Validation helpers
  const needsAccount = requiresBankAccount(paymentMethod);
  const needsCard = requiresCreditCard(paymentMethod);
  
  const hasValidInstrument = (): boolean => {
    if (paymentMethod === 'cash') return true;
    if (needsAccount) return activeAccounts.length > 0 && !!bankAccountId;
    if (needsCard) return activeCards.length > 0 && !!creditCardId;
    return true;
  };

  const showInstrumentWarning = (): boolean => {
    if (paymentMethod === 'cash') return false;
    if (needsAccount && activeAccounts.length === 0) return true;
    if (needsCard && activeCards.length === 0) return true;
    return false;
  };

  // Reset source selection when payment method changes
  useEffect(() => {
    if (!needsCard) {
      setCreditCardId("");
    }
    if (!needsAccount) {
      setBankAccountId("");
    }
    
    // Auto-select first instrument if only one exists
    if (needsAccount && activeAccounts.length === 1 && !bankAccountId) {
      setBankAccountId(activeAccounts[0].id);
    }
    if (needsCard && activeCards.length === 1 && !creditCardId) {
      setCreditCardId(activeCards[0].id);
    }
  }, [paymentMethod, activeAccounts, activeCards, needsAccount, needsCard, bankAccountId, creditCardId]);

  // Handle quick account registration success
  const handleQuickAccountSuccess = async () => {
    await refetchAccounts();
    setTimeout(() => {
      const accounts = bankAccounts.filter((a: { is_active: boolean }) => a.is_active);
      if (accounts.length > 0) {
        setBankAccountId(accounts[0].id);
      }
    }, 500);
  };

  // Handle quick card registration success  
  const handleQuickCardSuccess = async () => {
    await refetchCards();
    setTimeout(() => {
      const cards = creditCards.filter((c: { is_active: boolean }) => c.is_active);
      if (cards.length > 0) {
        setCreditCardId(cards[0].id);
      }
    }, 500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!goal) return;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Informe um valor válido maior que zero");
      return;
    }

    if (!date) {
      toast.error("Informe a data do aporte");
      return;
    }

    // Validate instrument requirement
    if (needsAccount && !bankAccountId) {
      toast.error("Selecione uma conta bancária");
      return;
    }
    if (needsCard && !creditCardId) {
      toast.error("Selecione um cartão de crédito");
      return;
    }

    try {
      await createContribution.mutateAsync({
        goal_id: goal.id,
        amount: numAmount,
        description: description || null,
        contributed_at: new Date(date).toISOString(),
        payment_method: paymentMethod as 'pix' | 'cash' | 'transfer' | 'debit' | 'credit' | 'cheque',
        bank_account_id: bankAccountId || undefined,
        credit_card_id: creditCardId || undefined,
        goal: goal,
      });
      
      toast.success(`Aporte de ${formatCurrency(numAmount)} adicionado!`);
      resetForm();
      onOpenChange(false);
    } catch (error) {
      toast.error("Erro ao adicionar aporte");
    }
  };

  const resetForm = () => {
    setAmount("");
    setDescription("");
    setDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod("pix");
    setBankAccountId("");
    setCreditCardId("");
  };

  const progress = goal?.target_amount && goal.target_amount > 0
    ? Math.min((Number(goal.current_amount || 0) / Number(goal.target_amount)) * 100, 100)
    : null;

  const isFormValid = (): boolean => {
    if (!amount || parseFloat(amount) <= 0) return false;
    if (!date) return false;
    return hasValidInstrument();
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-auto max-h-[90vh] rounded-t-3xl overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2">
              <PiggyBank className="w-5 h-5 text-primary" />
              Adicionar Aporte
            </SheetTitle>
            <SheetDescription>
              {goal?.title}
            </SheetDescription>
          </SheetHeader>

          {goal && (
            <div className="mb-4 p-3 rounded-xl bg-muted/50">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-muted-foreground">Investido atual</span>
                <span className="font-medium">{formatCurrency(Number(goal.current_amount || 0))}</span>
              </div>
              {goal.target_amount && (
                <>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Meta</span>
                    <span className="font-medium">{formatCurrency(Number(goal.target_amount))}</span>
                  </div>
                  {progress !== null && (
                    <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="absolute left-0 top-0 h-full rounded-full bg-primary transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contribution-amount">Valor (R$) *</Label>
                <Input
                  id="contribution-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contribution-date">Data *</Label>
                <Input
                  id="contribution-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment-method">Forma de Pagamento *</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger id="payment-method">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {expensePaymentMethods.map((method) => (
                    <SelectItem key={method.id} value={method.id}>
                      <span className="flex items-center gap-2">
                        <span>{method.icon}</span>
                        <span>{method.name}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Bank Account Selector */}
            {needsAccount && (
              <div className="space-y-2">
                <Label htmlFor="bank-account" className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Conta Bancária *
                </Label>
                {activeAccounts.length > 0 ? (
                  <Select value={bankAccountId} onValueChange={setBankAccountId}>
                    <SelectTrigger id="bank-account">
                      <SelectValue placeholder="Selecione a conta" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeAccounts.map((account: { id: string; nickname: string; banks?: { name: string } | null }) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.nickname} {account.banks?.name ? `(${account.banks.name})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="p-3 rounded-xl border-2 border-dashed border-warning/50 bg-warning/5">
                    <div className="flex items-center gap-2 text-warning mb-2">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-sm font-medium">Nenhuma conta cadastrada</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setShowQuickAccount(true)}
                    >
                      <Building2 className="w-4 h-4 mr-2" />
                      Cadastrar conta agora
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Credit Card Selector */}
            {needsCard && (
              <div className="space-y-2">
                <Label htmlFor="credit-card" className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Cartão de Crédito *
                </Label>
                {activeCards.length > 0 ? (
                  <Select value={creditCardId} onValueChange={setCreditCardId}>
                    <SelectTrigger id="credit-card">
                      <SelectValue placeholder="Selecione o cartão" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeCards.map((card: { id: string; card_name: string; brand: string }) => (
                        <SelectItem key={card.id} value={card.id}>
                          {card.card_name} ({card.brand.toUpperCase()})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="p-3 rounded-xl border-2 border-dashed border-warning/50 bg-warning/5">
                    <div className="flex items-center gap-2 text-warning mb-2">
                      <AlertTriangle className="w-4 h-4" />
                      <span className="text-sm font-medium">Nenhum cartão cadastrado</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setShowQuickCard(true)}
                    >
                      <CreditCard className="w-4 h-4 mr-2" />
                      Cadastrar cartão agora
                    </Button>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="contribution-description">Observação (opcional)</Label>
              <Textarea
                id="contribution-description"
                placeholder="Ex: Salário de janeiro"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={!isFormValid() || createContribution.isPending}>
                {createContribution.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Adicionar
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      {/* Quick Registration Modals */}
      <QuickBankAccountSheet
        open={showQuickAccount}
        onOpenChange={setShowQuickAccount}
        onSuccess={handleQuickAccountSuccess}
      />
      <QuickCreditCardSheet
        open={showQuickCard}
        onOpenChange={setShowQuickCard}
        onSuccess={handleQuickCardSuccess}
      />
    </>
  );
}
