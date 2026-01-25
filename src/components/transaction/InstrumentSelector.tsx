import { useState } from "react";
import { Building2, CreditCard, Plus, AlertCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface BankAccount {
  id: string;
  nickname: string;
  account_type: string;
  banks?: { name: string } | null;
}

interface CreditCardType {
  id: string;
  card_name: string;
  brand?: string | null;
}

interface InstrumentSelectorProps {
  paymentMethod: string;
  bankAccounts: BankAccount[];
  creditCards: CreditCardType[];
  selectedAccountId: string;
  selectedCardId: string;
  onAccountChange: (id: string) => void;
  onCardChange: (id: string) => void;
  onAddAccount: () => void;
  onAddCard: () => void;
  required?: boolean;
}

export function InstrumentSelector({
  paymentMethod,
  bankAccounts,
  creditCards,
  selectedAccountId,
  selectedCardId,
  onAccountChange,
  onCardChange,
  onAddAccount,
  onAddCard,
  required = true,
}: InstrumentSelectorProps) {
  // Determine what's needed based on payment method
  const needsBankAccount = ["pix", "transfer", "debit", "boleto", "cheque"].includes(paymentMethod);
  const needsCreditCard = paymentMethod === "credit";
  const isCash = paymentMethod === "cash";

  // Cash doesn't need any instrument
  if (isCash) {
    return null;
  }

  // Get display name for bank account
  const getBankAccountDisplay = (account: BankAccount) => {
    const typeLabel = account.account_type === "checking" ? "CC" : 
                      account.account_type === "savings" ? "Poup" : 
                      account.account_type === "digital" ? "Digital" : "Sal";
    const bankName = account.banks?.name || "";
    return `${account.nickname} ${bankName ? `• ${bankName}` : ""} (${typeLabel})`;
  };

  // Get display name for credit card
  const getCreditCardDisplay = (card: CreditCardType) => {
    const brandLabel = card.brand?.toUpperCase() || "";
    return `${card.card_name}${brandLabel ? ` • ${brandLabel}` : ""}`;
  };

  // Check if selection is missing when required
  const isMissingAccount = needsBankAccount && required && !selectedAccountId && bankAccounts.length > 0;
  const isMissingCard = needsCreditCard && required && !selectedCardId && creditCards.length > 0;

  // Bank Account Selection
  if (needsBankAccount) {
    if (bankAccounts.length === 0) {
      return (
        <div className="space-y-2 animate-fade-in">
          <Label className="flex items-center gap-2 text-base">
            <Building2 className="w-4 h-4" />
            Conta bancária {required && <span className="text-destructive">*</span>}
          </Label>
          <div className="p-4 rounded-xl border-2 border-dashed border-warning/50 bg-warning/5">
            <div className="flex items-center gap-3 mb-3">
              <AlertCircle className="w-5 h-5 text-warning flex-shrink-0" />
              <p className="text-sm text-warning-foreground">
                Você precisa cadastrar uma conta bancária para usar este meio de pagamento.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={onAddAccount}
              className="w-full h-11 border-warning/50 hover:bg-warning/10"
            >
              <Plus className="w-4 h-4 mr-2" />
              Cadastrar conta agora
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-2 animate-fade-in">
        <Label className="flex items-center gap-2 text-base">
          <Building2 className="w-4 h-4" />
          Conta bancária {required && <span className="text-destructive">*</span>}
        </Label>
        <Select value={selectedAccountId} onValueChange={onAccountChange}>
          <SelectTrigger 
            className={cn(
              "h-12 rounded-xl border-2 text-base",
              isMissingAccount && "border-destructive/50 focus:ring-destructive/30"
            )}
          >
            <SelectValue placeholder="Selecione a conta" />
          </SelectTrigger>
          <SelectContent className="bg-background border-2 shadow-xl z-50">
            {bankAccounts.map((account) => (
              <SelectItem 
                key={account.id} 
                value={account.id}
                className="py-3 text-base cursor-pointer"
              >
                {getBankAccountDisplay(account)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isMissingAccount && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Selecione uma conta para continuar
          </p>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onAddAccount}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          <Plus className="w-3 h-3 mr-1" />
          Adicionar outra conta
        </Button>
      </div>
    );
  }

  // Credit Card Selection
  if (needsCreditCard) {
    if (creditCards.length === 0) {
      return (
        <div className="space-y-2 animate-fade-in">
          <Label className="flex items-center gap-2 text-base">
            <CreditCard className="w-4 h-4" />
            Cartão de crédito {required && <span className="text-destructive">*</span>}
          </Label>
          <div className="p-4 rounded-xl border-2 border-dashed border-warning/50 bg-warning/5">
            <div className="flex items-center gap-3 mb-3">
              <AlertCircle className="w-5 h-5 text-warning flex-shrink-0" />
              <p className="text-sm text-warning-foreground">
                Você precisa cadastrar um cartão para usar este meio de pagamento.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={onAddCard}
              className="w-full h-11 border-warning/50 hover:bg-warning/10"
            >
              <Plus className="w-4 h-4 mr-2" />
              Cadastrar cartão agora
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-2 animate-fade-in">
        <Label className="flex items-center gap-2 text-base">
          <CreditCard className="w-4 h-4" />
          Cartão de crédito {required && <span className="text-destructive">*</span>}
        </Label>
        <Select value={selectedCardId} onValueChange={onCardChange}>
          <SelectTrigger 
            className={cn(
              "h-12 rounded-xl border-2 text-base",
              isMissingCard && "border-destructive/50 focus:ring-destructive/30"
            )}
          >
            <SelectValue placeholder="Selecione o cartão" />
          </SelectTrigger>
          <SelectContent className="bg-background border-2 shadow-xl z-50">
            {creditCards.map((card) => (
              <SelectItem 
                key={card.id} 
                value={card.id}
                className="py-3 text-base cursor-pointer"
              >
                {getCreditCardDisplay(card)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isMissingCard && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Selecione um cartão para continuar
          </p>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onAddCard}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          <Plus className="w-3 h-3 mr-1" />
          Adicionar outro cartão
        </Button>
      </div>
    );
  }

  return null;
}
