import { useState } from "react";
import { ArrowLeft, Plus, Building2, CreditCard, MoreVertical, Trash2, Edit, Key, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { AddBankAccountSheet } from "@/components/AddBankAccountSheet";
import { AddCreditCardSheet } from "@/components/AddCreditCardSheet";
import { EditBankAccountSheet } from "@/components/EditBankAccountSheet";
import { EditCreditCardSheet } from "@/components/EditCreditCardSheet";
import { AddPixKeySheet } from "@/components/AddPixKeySheet";
import { useBankAccounts, useCreditCards, useDeleteBankAccount, useDeleteCreditCard, usePixKeys, useDeletePixKey } from "@/hooks/useBankData";
import { formatCurrency } from "@/lib/formatters";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface BanksPageProps {
  onBack: () => void;
}

export function BanksPage({ onBack }: BanksPageProps) {
  const [activeTab, setActiveTab] = useState("accounts");
  const [isAccountSheetOpen, setIsAccountSheetOpen] = useState(false);
  const [isCardSheetOpen, setIsCardSheetOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [editingCard, setEditingCard] = useState<any>(null);
  const [pixKeyAccount, setPixKeyAccount] = useState<{ id: string; name: string } | null>(null);
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: "account" | "card" | "pix"; id: string } | null>(null);

  const { data: bankAccounts = [], isLoading: loadingAccounts } = useBankAccounts();
  const { data: creditCards = [], isLoading: loadingCards } = useCreditCards();
  const { data: pixKeys = [] } = usePixKeys();
  const deleteAccount = useDeleteBankAccount();
  const deleteCard = useDeleteCreditCard();
  const deletePixKey = useDeletePixKey();

  const toggleAccountExpand = (id: string) => {
    const newSet = new Set(expandedAccounts);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setExpandedAccounts(newSet);
  };

  const getPixKeysForAccount = (accountId: string) => {
    return pixKeys.filter((pk) => pk.bank_account_id === accountId);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      if (deleteConfirm.type === "account") {
        await deleteAccount.mutateAsync(deleteConfirm.id);
        toast.success("Conta removida com sucesso");
      } else if (deleteConfirm.type === "card") {
        await deleteCard.mutateAsync(deleteConfirm.id);
        toast.success("Cartão removido com sucesso");
      } else {
        await deletePixKey.mutateAsync(deleteConfirm.id);
        toast.success("Chave Pix removida");
      }
    } catch {
      toast.error("Erro ao remover");
    }
    setDeleteConfirm(null);
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

  const keyTypeLabels: Record<string, string> = {
    cpf: "CPF",
    cnpj: "CNPJ",
    email: "E-mail",
    phone: "Telefone",
    random: "Aleatória",
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
              Gerencie suas contas, cartões e chaves Pix
            </p>
          </div>
        </div>
      </header>

      <main className="container px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="accounts" className="gap-2">
              <Building2 className="w-4 h-4" />
              Contas ({bankAccounts.length})
            </TabsTrigger>
            <TabsTrigger value="cards" className="gap-2">
              <CreditCard className="w-4 h-4" />
              Cartões ({creditCards.length})
            </TabsTrigger>
          </TabsList>

          {/* Accounts Tab */}
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
                {bankAccounts.map((account) => {
                  const accountPixKeys = getPixKeysForAccount(account.id);
                  const isExpanded = expandedAccounts.has(account.id);

                  return (
                    <Collapsible
                      key={account.id}
                      open={isExpanded}
                      onOpenChange={() => toggleAccountExpand(account.id)}
                    >
                      <div
                        className={cn(
                          "rounded-xl border border-border bg-card overflow-hidden",
                          !account.is_active && "opacity-50"
                        )}
                      >
                        {/* Main Account Row */}
                        <div className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <Building2 className="w-5 h-5 text-primary" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <h3 className="font-semibold text-foreground truncate">
                                    {account.nickname}
                                  </h3>
                                  {!account.is_active && (
                                    <Badge variant="secondary" className="text-xs">Inativa</Badge>
                                  )}
                                </div>
                                <p className="text-sm text-muted-foreground">
                                  {account.banks?.name || account.custom_bank_name} • {accountTypeLabels[account.account_type]}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-1">
                              <CollapsibleTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  {isExpanded ? (
                                    <ChevronUp className="w-4 h-4" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4" />
                                  )}
                                </Button>
                              </CollapsibleTrigger>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <MoreVertical className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem onClick={() => setEditingAccount(account)}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Editar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setPixKeyAccount({ id: account.id, name: account.nickname })}>
                                    <Key className="w-4 h-4 mr-2" />
                                    Adicionar chave Pix
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => setDeleteConfirm({ type: "account", id: account.id })}
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Remover
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </div>

                          {/* Balance & Pix Keys count */}
                          <div className="mt-3 flex items-center gap-4 text-sm">
                            {account.initial_balance != null && account.initial_balance > 0 && (
                              <span className="text-muted-foreground">
                                Saldo inicial: {formatCurrency(Number(account.initial_balance))}
                              </span>
                            )}
                            {accountPixKeys.length > 0 && (
                              <Badge variant="outline" className="gap-1">
                                <Key className="w-3 h-3" />
                                {accountPixKeys.length} chave{accountPixKeys.length > 1 ? "s" : ""} Pix
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Expandable Content - Pix Keys */}
                        <CollapsibleContent>
                          <div className="border-t border-border p-4 bg-muted/30 space-y-2">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium">Chaves Pix</p>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => setPixKeyAccount({ id: account.id, name: account.nickname })}
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Adicionar
                              </Button>
                            </div>
                            {accountPixKeys.length === 0 ? (
                              <p className="text-sm text-muted-foreground py-2">
                                Nenhuma chave Pix cadastrada
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {accountPixKeys.map((pk) => (
                                  <div
                                    key={pk.id}
                                    className="flex items-center justify-between p-2 rounded-lg bg-background border border-border"
                                  >
                                    <div className="flex items-center gap-2">
                                      <Key className="w-4 h-4 text-muted-foreground" />
                                      <div>
                                        <p className="text-sm font-medium">{keyTypeLabels[pk.key_type]}</p>
                                        <p className="text-xs text-muted-foreground font-mono">
                                          {pk.key_value_masked}
                                        </p>
                                      </div>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-destructive hover:text-destructive"
                                      onClick={() => setDeleteConfirm({ type: "pix", id: pk.id })}
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </CollapsibleContent>
                      </div>
                    </Collapsible>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Cards Tab */}
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
                {creditCards.map((card) => {
                  const linkedAccount = bankAccounts.find((a) => a.id === card.bank_account_id);

                  return (
                    <div
                      key={card.id}
                      className={cn(
                        "p-4 rounded-xl border border-border bg-card",
                        !card.is_active && "opacity-50"
                      )}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
                            <CreditCard className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-foreground">{card.card_name}</h3>
                              {!card.is_active && (
                                <Badge variant="secondary" className="text-xs">Inativo</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {brandLabels[card.brand]} • Fecha dia {card.closing_day} • Vence dia {card.due_day}
                            </p>
                          </div>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditingCard(card)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeleteConfirm({ type: "card", id: card.id })}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Remover
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
                        {card.credit_limit && (
                          <span className="text-muted-foreground">
                            Limite: {formatCurrency(Number(card.credit_limit))}
                          </span>
                        )}
                        {linkedAccount && (
                          <Badge variant="outline" className="gap-1">
                            <Building2 className="w-3 h-3" />
                            {linkedAccount.nickname}
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Sheets */}
      <AddBankAccountSheet open={isAccountSheetOpen} onOpenChange={setIsAccountSheetOpen} />
      <AddCreditCardSheet open={isCardSheetOpen} onOpenChange={setIsCardSheetOpen} />
      <EditBankAccountSheet
        open={!!editingAccount}
        onOpenChange={(open) => !open && setEditingAccount(null)}
        account={editingAccount}
      />
      <EditCreditCardSheet
        open={!!editingCard}
        onOpenChange={(open) => !open && setEditingCard(null)}
        card={editingCard}
      />
      {pixKeyAccount && (
        <AddPixKeySheet
          open={!!pixKeyAccount}
          onOpenChange={(open) => !open && setPixKeyAccount(null)}
          bankAccountId={pixKeyAccount.id}
          bankAccountName={pixKeyAccount.name}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirm?.type === "account" && "Tem certeza que deseja remover esta conta bancária? As transações vinculadas perderão a referência."}
              {deleteConfirm?.type === "card" && "Tem certeza que deseja remover este cartão? As transações vinculadas perderão a referência."}
              {deleteConfirm?.type === "pix" && "Tem certeza que deseja remover esta chave Pix?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
