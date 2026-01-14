import { useState, useEffect } from "react";
import { ArrowLeft, Plus, Building2, CreditCard, MoreVertical, Trash2, Edit, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AddBankAccountSheet } from "@/components/AddBankAccountSheet";
import { AddCreditCardSheet } from "@/components/AddCreditCardSheet";
import { useBankAccounts, useCreditCards, useDeleteBankAccount, useDeleteCreditCard } from "@/hooks/useBankData";
import { formatCurrency } from "@/lib/formatters";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface BanksPageProps {
  onBack: () => void;
}

export function BanksPage({ onBack }: BanksPageProps) {
  const [activeTab, setActiveTab] = useState("accounts");
  const [isAccountSheetOpen, setIsAccountSheetOpen] = useState(false);
  const [isCardSheetOpen, setIsCardSheetOpen] = useState(false);

  const { data: bankAccounts = [], isLoading: loadingAccounts } = useBankAccounts();
  const { data: creditCards = [], isLoading: loadingCards } = useCreditCards();
  const deleteAccount = useDeleteBankAccount();
  const deleteCard = useDeleteCreditCard();

  const handleDeleteAccount = async (id: string) => {
    try {
      await deleteAccount.mutateAsync(id);
      toast.success("Conta removida com sucesso");
    } catch (error) {
      toast.error("Erro ao remover conta");
    }
  };

  const handleDeleteCard = async (id: string) => {
    try {
      await deleteCard.mutateAsync(id);
      toast.success("Cartão removido com sucesso");
    } catch (error) {
      toast.error("Erro ao remover cartão");
    }
  };

  const accountTypeLabels: Record<string, string> = {
    checking: "Conta Corrente",
    savings: "Poupança",
    digital: "Conta Digital",
    salary: "Conta Salário",
  };

  const brandLabels: Record<string, string> = {
    visa: "Visa",
    mastercard: "Mastercard",
    elo: "Elo",
    amex: "American Express",
    hipercard: "Hipercard",
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="container flex items-center gap-4 px-4 py-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Bancos e Cartões</h1>
            <p className="text-sm text-muted-foreground">
              Gerencie suas contas e cartões
            </p>
          </div>
        </div>
      </header>

      <main className="container px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="accounts" className="gap-2">
              <Building2 className="w-4 h-4" />
              Contas
            </TabsTrigger>
            <TabsTrigger value="cards" className="gap-2">
              <CreditCard className="w-4 h-4" />
              Cartões
            </TabsTrigger>
          </TabsList>

          <TabsContent value="accounts" className="space-y-4">
            <Button
              variant="outline"
              className="w-full h-14 border-dashed gap-2"
              onClick={() => setIsAccountSheetOpen(true)}
            >
              <Plus className="w-5 h-5" />
              Adicionar conta bancária
            </Button>

            {loadingAccounts ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />
                ))}
              </div>
            ) : bankAccounts.length === 0 ? (
              <div className="text-center py-12">
                <Building2 className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-semibold text-foreground mb-1">Nenhuma conta cadastrada</h3>
                <p className="text-sm text-muted-foreground">
                  Adicione suas contas bancárias para organizar melhor
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {bankAccounts.map((account) => (
                  <div
                    key={account.id}
                    className={cn(
                      "p-4 rounded-xl border border-border bg-card",
                      !account.is_active && "opacity-50"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Building2 className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">
                            {account.nickname}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {account.banks?.name || account.custom_bank_name} • {accountTypeLabels[account.account_type]}
                          </p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => handleDeleteAccount(account.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Remover
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {account.initial_balance && account.initial_balance > 0 && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <p className="text-sm text-muted-foreground">
                          Saldo inicial: {formatCurrency(Number(account.initial_balance))}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="cards" className="space-y-4">
            <Button
              variant="outline"
              className="w-full h-14 border-dashed gap-2"
              onClick={() => setIsCardSheetOpen(true)}
            >
              <Plus className="w-5 h-5" />
              Adicionar cartão de crédito
            </Button>

            {loadingCards ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />
                ))}
              </div>
            ) : creditCards.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="font-semibold text-foreground mb-1">Nenhum cartão cadastrado</h3>
                <p className="text-sm text-muted-foreground">
                  Adicione seus cartões para acompanhar os gastos
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {creditCards.map((card) => (
                  <div
                    key={card.id}
                    className={cn(
                      "p-4 rounded-xl border border-border bg-card",
                      !card.is_active && "opacity-50"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-accent/50 flex items-center justify-center">
                          <CreditCard className="w-5 h-5 text-accent-foreground" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">
                            {card.card_name}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {brandLabels[card.brand]} • Fecha dia {card.closing_day}
                          </p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            className="text-destructive"
                            onClick={() => handleDeleteCard(card.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Remover
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    {card.credit_limit && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <p className="text-sm text-muted-foreground">
                          Limite: {formatCurrency(Number(card.credit_limit))}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <AddBankAccountSheet 
        open={isAccountSheetOpen} 
        onOpenChange={setIsAccountSheetOpen} 
      />
      <AddCreditCardSheet 
        open={isCardSheetOpen} 
        onOpenChange={setIsCardSheetOpen} 
      />
    </div>
  );
}
