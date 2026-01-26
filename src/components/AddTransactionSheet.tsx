import { useState, useEffect, useRef, useCallback } from "react";
import { Check, ChevronRight, Calendar, FileText, Sparkles, Target } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { defaultCategories, getCategoryById, requiresBankAccount, requiresCreditCard, GOALS_CATEGORY_ID, createGoalSubcategoryId } from "@/data/categories";
import { useBankAccounts, useCreditCards } from "@/hooks/useBankData";
import { useDebouncedSuggestion, useRecentCategories } from "@/hooks/useCategorySuggestion";
import { useActiveGoals } from "@/hooks/useGoals";
import { useCreateInstallmentGroup } from "@/hooks/useInstallments";
import { useBetterCardSuggestion } from "@/hooks/useBetterCardSuggestion";
import { TransactionType, TransactionClassification, ExpenseType, PaymentMethod } from "@/types/finance";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  TransactionTypeSelector,
  PaymentMethodSelector,
  AmountInput,
  SuggestionBadge,
  InstrumentSelector,
  QuickBankAccountSheet,
  QuickCreditCardSheet,
  InstallmentInput,
  BetterCardSuggestionToast,
} from "@/components/transaction";
import { GoalSelector } from "@/components/goals";
import { ChargeType } from "@/components/transaction/InstallmentInput";

interface AddTransactionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (transaction: {
    type: TransactionType;
    classification?: TransactionClassification;
    expenseType?: ExpenseType;
    amount: number;
    category: string;
    subcategory?: string;
    date: string;
    paymentMethod: PaymentMethod;
    bankAccountId?: string;
    creditCardId?: string;
    description?: string;
    checkNumber?: string;
    goalId?: string;
    // Installment fields
    cardChargeType?: ChargeType;
    installmentsTotal?: number;
  }) => Promise<string | void> | string | void; // Now can return transaction ID
  defaultType?: TransactionType;
  // Callback after transaction is created successfully (receives transaction ID)
  onTransactionCreated?: (transactionId: string, creditCardId?: string) => void;
}

export function AddTransactionSheet({
  open,
  onOpenChange,
  onSubmit,
  defaultType = "expense",
  onTransactionCreated,
}: AddTransactionSheetProps) {
  const [classification, setClassification] = useState<TransactionClassification>(
    defaultType === "income" ? "income" : "expense"
  );
  const [expenseType, setExpenseType] = useState<ExpenseType>("variable");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [bankAccountId, setBankAccountId] = useState("");
  const [creditCardId, setCreditCardId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [checkNumber, setCheckNumber] = useState("");
  const [showSubcategories, setShowSubcategories] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [suggestionApplied, setSuggestionApplied] = useState(false);
  const [suggestionSource, setSuggestionSource] = useState<'history' | 'descriptor' | 'none'>('none');
  const [linkedGoalId, setLinkedGoalId] = useState("");
  
  // Installment state
  const [cardChargeType, setCardChargeType] = useState<ChargeType>("ONE_SHOT");
  const [installmentsTotal, setInstallmentsTotal] = useState(1);
  
  // Quick registration modals
  const [showQuickAccount, setShowQuickAccount] = useState(false);
  const [showQuickCard, setShowQuickCard] = useState(false);

  const amountInputRef = useRef<HTMLInputElement>(null);

  const { data: bankAccounts = [], refetch: refetchAccounts } = useBankAccounts();
  const { data: creditCards = [], refetch: refetchCards } = useCreditCards();
  const { data: recentCategories = [] } = useRecentCategories();
  const { suggestion, updateDescription, clearSuggestion } = useDebouncedSuggestion();
  const { data: activeGoals = [] } = useActiveGoals();
  const createInstallmentGroup = useCreateInstallmentGroup();
  
  // Better card suggestion hook
  const {
    suggestion: betterCardSuggestion,
    checkAndShowSuggestion: checkBetterCard,
    switchCard,
    dismiss: dismissBetterCard,
    disablePermanently: disableBetterCardTips,
  } = useBetterCardSuggestion();
  
  // Derive transaction type from classification
  const type: TransactionType = classification === "income" ? "income" : "expense";
  
  const filteredCategories = defaultCategories.filter((cat) => cat.type === type);
  const selectedCategory = getCategoryById(category);

  // Validation helpers
  const needsAccount = requiresBankAccount(paymentMethod);
  const needsCard = requiresCreditCard(paymentMethod);
  const needsCheckNumber = paymentMethod === "cheque";
  
  // Check if instrument is valid
  const hasValidInstrument = () => {
    if (paymentMethod === "cash") return true;
    if (needsAccount) return bankAccounts.length > 0 && !!bankAccountId;
    if (needsCard) return creditCards.length > 0 && !!creditCardId;
    return true;
  };

  // Auto-focus amount input when sheet opens
  useEffect(() => {
    if (open && amountInputRef.current) {
      setTimeout(() => {
        amountInputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  // Reset subcategory when category changes
  useEffect(() => {
    setSubcategory("");
    if (category && selectedCategory && selectedCategory.subcategories.length > 0) {
      setShowSubcategories(true);
    }
  }, [category]);

  // Reset category and payment method when classification changes
  useEffect(() => {
    setCategory("");
    setSubcategory("");
    setShowSubcategories(false);
    setCheckNumber("");
    setBankAccountId("");
    setCreditCardId("");
    setLinkedGoalId("");
    // Reset to valid payment method for new type
    if (classification === "income" && (paymentMethod === "credit" || paymentMethod === "debit")) {
      setPaymentMethod("pix");
    }
    // For transfers, default to transfer payment method
    if (classification === "transfer") {
      setPaymentMethod("transfer");
    }
  }, [classification]);

  // Auto-set category when goal is linked
  useEffect(() => {
    if (linkedGoalId && linkedGoalId !== "_none") {
      const goal = activeGoals.find(g => g.id === linkedGoalId);
      if (goal) {
        setCategory(GOALS_CATEGORY_ID);
        setSubcategory(createGoalSubcategoryId(goal.title));
      }
    }
  }, [linkedGoalId, activeGoals]);

  // Set classification based on defaultType when sheet opens
  useEffect(() => {
    if (open) {
      setClassification(defaultType === "income" ? "income" : "expense");
    }
  }, [open, defaultType]);

  // Reset selections when payment method changes
  useEffect(() => {
    if (!needsCard) {
      setCreditCardId("");
      // Reset installment options when not credit card
      setCardChargeType("ONE_SHOT");
      setInstallmentsTotal(1);
    }
    if (!needsAccount) {
      setBankAccountId("");
    }
    if (paymentMethod !== "cheque") {
      setCheckNumber("");
    }
    
    // Auto-select first instrument if only one exists
    if (needsAccount && bankAccounts.length === 1 && !bankAccountId) {
      setBankAccountId(bankAccounts[0].id);
    }
    if (needsCard && creditCards.length === 1 && !creditCardId) {
      setCreditCardId(creditCards[0].id);
    }
  }, [paymentMethod, bankAccounts, creditCards, needsAccount, needsCard, bankAccountId, creditCardId]);

  // Apply category suggestion when available and user hasn't selected manually
  useEffect(() => {
    if (suggestion && suggestion.confidence > 0.5 && !category && !suggestionApplied) {
      const suggestedCat = getCategoryById(suggestion.categoryId);
      if (suggestedCat && suggestedCat.type === type) {
        setCategory(suggestion.categoryId);
        if (suggestion.subcategoryId) {
          setSubcategory(suggestion.subcategoryId);
        }
        setSuggestionApplied(true);
        setSuggestionSource(suggestion.source);
      }
    }
  }, [suggestion, category, type, suggestionApplied]);

  // Handle description change with suggestion engine
  const handleDescriptionChange = useCallback((newDescription: string) => {
    setDescription(newDescription);
    updateDescription(newDescription);
    if (!newDescription || newDescription.length < 3) {
      setSuggestionApplied(false);
      setSuggestionSource('none');
      clearSuggestion();
    }
  }, [updateDescription, clearSuggestion]);

  const handleCategorySelect = (catId: string) => {
    setCategory(catId);
    const cat = getCategoryById(catId);
    if (cat && cat.subcategories.length > 0) {
      setShowSubcategories(true);
    }
  };

  // Handle quick account registration success
  const handleQuickAccountSuccess = async () => {
    await refetchAccounts();
    // Auto-select the newly created account (will be first due to ordering)
    setTimeout(() => {
      if (bankAccounts.length > 0) {
        setBankAccountId(bankAccounts[0].id);
      }
    }, 500);
  };

  // Handle quick card registration success  
  const handleQuickCardSuccess = async () => {
    await refetchCards();
    setTimeout(() => {
      if (creditCards.length > 0) {
        setCreditCardId(creditCards[0].id);
      }
    }, 500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!amount || !category) return;
    if (paymentMethod === "cheque" && !checkNumber.trim()) return;
    
    // Validate instrument requirement
    if (needsAccount && !bankAccountId) {
      return;
    }
    if (needsCard && !creditCardId) {
      return;
    }

    setIsSaving(true);

    try {
      const parsedAmount = parseFloat(amount.replace(",", "."));
      const transactionDate = date;
      const usedCardId = creditCardId;
      
      const result = await onSubmit({
        type,
        classification,
        expenseType: type === "expense" ? expenseType : undefined,
        amount: parsedAmount,
        category,
        subcategory: subcategory || undefined,
        date,
        paymentMethod,
        bankAccountId: bankAccountId || undefined,
        creditCardId: creditCardId || undefined,
        description: description || undefined,
        checkNumber: paymentMethod === "cheque" ? checkNumber.trim() : undefined,
        goalId: linkedGoalId && linkedGoalId !== "_none" ? linkedGoalId : undefined,
        // Include installment info if credit card payment
        cardChargeType: needsCard ? cardChargeType : undefined,
        installmentsTotal: needsCard && cardChargeType === "INSTALLMENT" ? installmentsTotal : undefined,
      });

      // Check for better card suggestion if this was a credit card transaction
      if (needsCard && usedCardId && result && typeof result === 'string') {
        checkBetterCard(
          result, // transaction ID
          usedCardId,
          creditCards,
          parsedAmount,
          new Date(transactionDate + "T12:00:00")
        );
        
        // Notify callback if provided
        if (onTransactionCreated) {
          onTransactionCreated(result, usedCardId);
        }
      }

      // Reset form
      setAmount("");
      setCategory("");
      setSubcategory("");
      setDescription("");
      setExpenseType("variable");
      setBankAccountId("");
      setCreditCardId("");
      setCheckNumber("");
      setShowSubcategories(false);
      setSuggestionApplied(false);
      setSuggestionSource('none');
      setLinkedGoalId("");
      setCardChargeType("ONE_SHOT");
      setInstallmentsTotal(1);
      clearSuggestion();
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  // Get display name for bank account with more info
  const getBankAccountDisplay = (account: typeof bankAccounts[0]) => {
    const typeLabel = account.account_type === "checking" ? "CC" : 
                      account.account_type === "savings" ? "Poup" : 
                      account.account_type === "digital" ? "Digital" : "Sal";
    return `${account.nickname} (${typeLabel})`;
  };

  // Get display name for credit card with more info
  const getCreditCardDisplay = (card: typeof creditCards[0]) => {
    const brandLabel = card.brand?.toUpperCase() || "";
    return `${card.card_name}${brandLabel ? ` • ${brandLabel}` : ""}`;
  };

  // Format today's date for display
  const formatDateDisplay = (dateStr: string) => {
    const today = new Date().toISOString().split("T")[0];
    if (dateStr === today) return "Hoje";
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  };

  // Get title based on classification
  const getTitle = () => {
    if (showSubcategories && selectedCategory) {
      return (
        <button
          onClick={() => setShowSubcategories(false)}
          className="flex items-center gap-2 mx-auto text-muted-foreground hover:text-foreground min-h-[44px]"
        >
          <ChevronRight className="w-5 h-5 rotate-180" />
          <span className="text-lg font-semibold text-foreground">
            {selectedCategory.icon} {selectedCategory.name}
          </span>
        </button>
      );
    }
    
    const titles: Record<TransactionClassification, string> = {
      income: 'Nova Receita',
      expense: 'Nova Despesa',
      transfer: 'Nova Transferência',
      reimbursement: 'Novo Reembolso',
      adjustment: 'Novo Ajuste',
    };
    
    return <span className="text-xl font-bold">{titles[classification]}</span>;
  };

  // Get submit button text based on classification
  const getSubmitLabel = () => {
    const labels: Record<TransactionClassification, string> = {
      income: 'Registrar Receita',
      expense: 'Registrar Despesa',
      transfer: 'Registrar Transferência',
      reimbursement: 'Registrar Reembolso',
      adjustment: 'Registrar Ajuste',
    };
    return labels[classification];
  };

  // Check if form is valid for submission
  const isFormValid = () => {
    if (!amount || !category) return false;
    if (needsCheckNumber && !checkNumber.trim()) return false;
    if (needsAccount && bankAccounts.length > 0 && !bankAccountId) return false;
    if (needsCard && creditCards.length > 0 && !creditCardId) return false;
    // Block if instrument is required but none exist
    if (needsAccount && bankAccounts.length === 0) return false;
    if (needsCard && creditCards.length === 0) return false;
    return true;
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[92vh] rounded-t-3xl">
          <SheetHeader className="pb-3">
            <SheetTitle className="text-center">{getTitle()}</SheetTitle>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="flex flex-col h-[calc(100%-50px)]">
            <ScrollArea className="flex-1 -mx-6 px-6">
              <div className="space-y-5 pb-6">
                {/* Subcategory Selection View */}
                {showSubcategories && selectedCategory ? (
                  <div className="space-y-4 animate-fade-in">
                    <Label className="text-base">Subcategoria</Label>
                    <div className="grid gap-2">
                      {selectedCategory.subcategories.map((sub) => (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => {
                            setSubcategory(sub.id);
                            setShowSubcategories(false);
                          }}
                          className={cn(
                            "flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left min-h-[52px] active:scale-[0.98]",
                            subcategory === sub.id
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          <span className="font-medium text-base">{sub.name}</span>
                          {subcategory === sub.id && <Check className="w-5 h-5 text-primary" />}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Type Toggle - With classifications */}
                    <TransactionTypeSelector
                      value={classification}
                      onChange={setClassification}
                      showAdvanced={true}
                    />

                    {/* Amount - FIRST FIELD, BIGGER, AUTO-FOCUS */}
                    <AmountInput
                      ref={amountInputRef}
                      value={amount}
                      onChange={setAmount}
                      classification={classification}
                    />

                    {/* Expense Type (only for expenses) */}
                    {type === "expense" && classification === "expense" && (
                      <div className="space-y-2 animate-fade-in">
                        <Label className="text-base">Tipo de Despesa</Label>
                        <div className="grid grid-cols-2 gap-3">
                          <button
                            type="button"
                            onClick={() => setExpenseType("fixed")}
                            className={cn(
                              "py-3.5 px-4 rounded-xl border-2 font-medium transition-all min-h-[48px] text-base active:scale-[0.98]",
                              expenseType === "fixed"
                                ? "border-primary bg-primary/5 text-primary"
                                : "border-border text-muted-foreground hover:border-primary/50"
                            )}
                          >
                            🔒 Fixa
                          </button>
                          <button
                            type="button"
                            onClick={() => setExpenseType("variable")}
                            className={cn(
                              "py-3.5 px-4 rounded-xl border-2 font-medium transition-all min-h-[48px] text-base active:scale-[0.98]",
                              expenseType === "variable"
                                ? "border-primary bg-primary/5 text-primary"
                                : "border-border text-muted-foreground hover:border-primary/50"
                            )}
                          >
                            🔄 Variável
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Category */}
                    <div className="space-y-2">
                      <Label className="text-base">Categoria</Label>
                      <div className="grid grid-cols-3 gap-2">
                        {filteredCategories.map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => handleCategorySelect(cat.id)}
                            className={cn(
                              "relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all min-h-[72px] active:scale-[0.97]",
                              category === cat.id
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/50"
                            )}
                          >
                            <span className="text-2xl">{cat.icon}</span>
                            <span className="text-[11px] text-center leading-tight text-muted-foreground font-medium line-clamp-2">
                              {cat.name}
                            </span>
                            {category === cat.id && (
                              <div className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-sm">
                                <Check className="w-3.5 h-3.5 text-primary-foreground" />
                              </div>
                            )}
                            {cat.subcategories.length > 0 && (
                              <div className="absolute bottom-1.5 right-1.5">
                                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
                              </div>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Selected Subcategory Display */}
                    {subcategory && selectedCategory && (
                      <div className="space-y-2 animate-fade-in">
                        <Label className="text-base">Subcategoria</Label>
                        <button
                          type="button"
                          onClick={() => setShowSubcategories(true)}
                          className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-primary bg-primary/5 min-h-[52px]"
                        >
                          <span className="font-medium text-base">
                            {selectedCategory.subcategories.find((s) => s.id === subcategory)?.name}
                          </span>
                          <ChevronRight className="w-5 h-5 text-primary" />
                        </button>
                      </div>
                    )}

                    {/* Payment Method */}
                    <PaymentMethodSelector
                      value={paymentMethod}
                      onChange={setPaymentMethod}
                      classification={classification}
                    />

                    {/* Check Number (for cheque payment) */}
                    {needsCheckNumber && (
                      <div className="space-y-2 animate-fade-in">
                        <Label htmlFor="checkNumber" className="text-base flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Número do Cheque <span className="text-destructive">*</span>
                        </Label>
                        <Input
                          id="checkNumber"
                          type="text"
                          placeholder="Ex: 000123"
                          value={checkNumber}
                          onChange={(e) => setCheckNumber(e.target.value)}
                          className="h-12 text-base rounded-xl border-2 focus-visible:ring-2 focus-visible:ring-primary/30"
                          required
                        />
                      </div>
                    )}

                    {/* Financial Instrument Selector (Account/Card) */}
                    <InstrumentSelector
                      paymentMethod={paymentMethod}
                      bankAccounts={bankAccounts}
                      creditCards={creditCards}
                      selectedAccountId={bankAccountId}
                      selectedCardId={creditCardId}
                      onAccountChange={setBankAccountId}
                      onCardChange={setCreditCardId}
                      onAddAccount={() => setShowQuickAccount(true)}
                      onAddCard={() => setShowQuickCard(true)}
                      required={true}
                    />

                    {/* Installment Options (only for credit card) */}
                    {needsCard && creditCardId && (
                      <InstallmentInput
                        chargeType={cardChargeType}
                        onChargeTypeChange={setCardChargeType}
                        installmentsTotal={installmentsTotal}
                        onInstallmentsTotalChange={setInstallmentsTotal}
                        totalAmount={parseFloat(amount.replace(",", ".")) || 0}
                      />
                    )}

                    {/* Date */}
                    <div className="space-y-2">
                      <Label htmlFor="date" className="flex items-center gap-2 text-base">
                        <Calendar className="w-4 h-4" />
                        Data
                        <span className="text-xs text-muted-foreground font-normal">
                          ({formatDateDisplay(date)})
                        </span>
                      </Label>
                      <Input
                        id="date"
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="h-12 rounded-xl border-2 text-base focus-visible:ring-2 focus-visible:ring-primary/30"
                      />
                    </div>

                    {/* Goal Linking (only for expenses) */}
                    {type === "expense" && activeGoals.length > 0 && (
                      <GoalSelector
                        value={linkedGoalId}
                        onChange={(goalId) => {
                          setLinkedGoalId(goalId);
                          // Clear manual category selection if goal selected
                          if (goalId && goalId !== "_none") {
                            const goal = activeGoals.find(g => g.id === goalId);
                            if (goal) {
                              setCategory(GOALS_CATEGORY_ID);
                              setSubcategory(createGoalSubcategoryId(goal.title));
                            }
                          }
                        }}
                        showProgress={true}
                        disabled={category === GOALS_CATEGORY_ID && !!subcategory && !linkedGoalId}
                      />
                    )}

                    {/* Description */}
                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-base text-muted-foreground">
                        Descrição <span className="text-xs">(opcional)</span>
                      </Label>
                      <Textarea
                        id="description"
                        placeholder="Ex: Supermercado, farmácia..."
                        value={description}
                        onChange={(e) => handleDescriptionChange(e.target.value)}
                        className="resize-none rounded-xl border-2 text-base focus-visible:ring-2 focus-visible:ring-primary/30"
                        rows={2}
                      />
                      {/* Suggestion Badge */}
                      {suggestionApplied && suggestionSource !== 'none' && category && (
                        <div className="flex items-center gap-2">
                          <SuggestionBadge 
                            source={suggestionSource} 
                            confidence={suggestion?.confidence || 0.7}
                            matchCount={suggestion?.matchCount}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setCategory("");
                              setSubcategory("");
                              setSuggestionApplied(false);
                              setSuggestionSource('none');
                            }}
                            className="text-xs text-muted-foreground hover:text-foreground"
                          >
                            Alterar
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>

            {/* Submit Button */}
            {!showSubcategories && (
              <div className="pt-4 border-t border-border space-y-3">
                <Button
                  type="submit"
                  size="lg"
                  className={cn(
                    "w-full h-14 text-lg font-semibold rounded-xl shadow-lg transition-all duration-200",
                    isSaving 
                      ? "opacity-80" 
                      : "active:scale-[0.98] shadow-primary/20 hover:shadow-xl hover:shadow-primary/30"
                  )}
                  disabled={!isFormValid() || isSaving}
                >
                  {isSaving ? (
                    <span className="flex items-center gap-2">
                      <span className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                      Salvando...
                    </span>
                  ) : (
                    getSubmitLabel()
                  )}
                </Button>
                
                {/* Microcopy */}
                <p className="text-center text-xs text-muted-foreground/70">
                  Lançar em menos de 10 segundos 🚀
                </p>
              </div>
            )}
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
      
      {/* Better Card Suggestion Toast */}
      {betterCardSuggestion && (
        <BetterCardSuggestionToast
          usedCardName={betterCardSuggestion.usedCard.card_name}
          betterCardName={betterCardSuggestion.betterCard.card_name}
          extraDays={betterCardSuggestion.extraDaysClosing > 0 
            ? betterCardSuggestion.extraDaysClosing 
            : betterCardSuggestion.extraDaysDue}
          extraDaysType={betterCardSuggestion.extraDaysClosing > 0 ? "closing" : "due"}
          onSwitch={async () => {
            const success = await switchCard();
            if (success) {
              toast.success("Cartão trocado com sucesso!");
            }
            return success;
          }}
          onDismiss={dismissBetterCard}
          onDisablePermanently={() => {
            disableBetterCardTips();
            toast.info("Dicas de cartão desativadas");
          }}
        />
      )}
    </>
  );
}
