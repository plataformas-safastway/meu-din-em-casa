import { useState, useEffect, useRef } from "react";
import { Check, ChevronRight, Building2, CreditCard, Calendar, FileText } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { defaultCategories, getCategoryById } from "@/data/categories";
import { useBankAccounts, useCreditCards } from "@/hooks/useBankData";
import { TransactionType, TransactionClassification, ExpenseType, PaymentMethod } from "@/types/finance";
import { cn } from "@/lib/utils";
import {
  TransactionTypeSelector,
  PaymentMethodSelector,
  AmountInput,
} from "@/components/transaction";

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
  }) => void;
  defaultType?: TransactionType;
}

export function AddTransactionSheet({
  open,
  onOpenChange,
  onSubmit,
  defaultType = "expense",
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

  const amountInputRef = useRef<HTMLInputElement>(null);

  const { data: bankAccounts = [] } = useBankAccounts();
  const { data: creditCards = [] } = useCreditCards();

  // Derive transaction type from classification
  const type: TransactionType = classification === "income" ? "income" : "expense";
  
  const filteredCategories = defaultCategories.filter((cat) => cat.type === type);
  const selectedCategory = getCategoryById(category);

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
    // Reset to valid payment method for new type
    if (classification === "income" && (paymentMethod === "credit" || paymentMethod === "debit")) {
      setPaymentMethod("pix");
    }
    // For transfers, default to transfer payment method
    if (classification === "transfer") {
      setPaymentMethod("transfer");
    }
  }, [classification]);

  // Set classification based on defaultType when sheet opens
  useEffect(() => {
    if (open) {
      setClassification(defaultType === "income" ? "income" : "expense");
    }
  }, [open, defaultType]);

  // Reset bank/card selection and check number when payment method changes
  useEffect(() => {
    if (paymentMethod !== "credit") {
      setCreditCardId("");
    }
    if (!["debit", "pix", "transfer"].includes(paymentMethod)) {
      setBankAccountId("");
    }
    if (paymentMethod !== "cheque") {
      setCheckNumber("");
    }
  }, [paymentMethod]);

  const handleCategorySelect = (catId: string) => {
    setCategory(catId);
    const cat = getCategoryById(catId);
    if (cat && cat.subcategories.length > 0) {
      setShowSubcategories(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || !category) return;

    // Validate check number for cheque payment
    if (paymentMethod === "cheque" && !checkNumber.trim()) {
      return;
    }

    setIsSaving(true);

    try {
      await onSubmit({
        type,
        classification,
        expenseType: type === "expense" ? expenseType : undefined,
        amount: parseFloat(amount.replace(",", ".")),
        category,
        subcategory: subcategory || undefined,
        date,
        paymentMethod,
        bankAccountId: bankAccountId || undefined,
        creditCardId: creditCardId || undefined,
        description: description || undefined,
        checkNumber: paymentMethod === "cheque" ? checkNumber.trim() : undefined,
      });

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
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  const needsBankAccount = ["debit", "pix", "transfer"].includes(paymentMethod);
  const needsCreditCard = paymentMethod === "credit";
  const needsCheckNumber = paymentMethod === "cheque";

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

  return (
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
                        Número do Cheque *
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

                  {/* Bank Account Selection */}
                  {needsBankAccount && bankAccounts.length > 0 && (
                    <div className="space-y-2 animate-fade-in">
                      <Label className="flex items-center gap-2 text-base">
                        <Building2 className="w-4 h-4" />
                        Conta bancária
                      </Label>
                      <Select value={bankAccountId} onValueChange={setBankAccountId}>
                        <SelectTrigger className="h-12 rounded-xl border-2 text-base">
                          <SelectValue placeholder="Selecione (opcional)" />
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
                    </div>
                  )}

                  {/* Credit Card Selection */}
                  {needsCreditCard && creditCards.length > 0 && (
                    <div className="space-y-2 animate-fade-in">
                      <Label className="flex items-center gap-2 text-base">
                        <CreditCard className="w-4 h-4" />
                        Cartão de crédito
                      </Label>
                      <Select value={creditCardId} onValueChange={setCreditCardId}>
                        <SelectTrigger className="h-12 rounded-xl border-2 text-base">
                          <SelectValue placeholder="Selecione (opcional)" />
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
                    </div>
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

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-base text-muted-foreground">
                      Descrição <span className="text-xs">(opcional)</span>
                    </Label>
                    <Textarea
                      id="description"
                      placeholder="Ex: Supermercado, farmácia..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="resize-none rounded-xl border-2 text-base focus-visible:ring-2 focus-visible:ring-primary/30"
                      rows={2}
                    />
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
                disabled={!amount || !category || (paymentMethod === "cheque" && !checkNumber.trim()) || isSaving}
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
  );
}