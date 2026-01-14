import { useState, useEffect } from "react";
import { X, ArrowUpCircle, ArrowDownCircle, Check, ChevronRight } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { defaultCategories, paymentMethods, getCategoryById } from "@/data/categories";
import { Transaction, TransactionType, ExpenseType, PaymentMethod, Category, Subcategory } from "@/types/finance";
import { cn } from "@/lib/utils";

interface AddTransactionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (transaction: Omit<Transaction, 'id' | 'createdAt'>) => void;
  defaultType?: TransactionType;
}

export function AddTransactionSheet({ 
  open, 
  onOpenChange, 
  onSubmit,
  defaultType = 'expense' 
}: AddTransactionSheetProps) {
  const [type, setType] = useState<TransactionType>(defaultType);
  const [expenseType, setExpenseType] = useState<ExpenseType>('variable');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [subcategory, setSubcategory] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [showSubcategories, setShowSubcategories] = useState(false);

  const filteredCategories = defaultCategories.filter(cat => cat.type === type);
  const selectedCategory = getCategoryById(category);

  // Reset subcategory when category changes
  useEffect(() => {
    setSubcategory('');
    if (category && selectedCategory && selectedCategory.subcategories.length > 0) {
      setShowSubcategories(true);
    }
  }, [category]);

  // Reset category when type changes
  useEffect(() => {
    setCategory('');
    setSubcategory('');
    setShowSubcategories(false);
  }, [type]);

  const handleCategorySelect = (catId: string) => {
    setCategory(catId);
    const cat = getCategoryById(catId);
    if (cat && cat.subcategories.length > 0) {
      setShowSubcategories(true);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || !category) return;

    onSubmit({
      type,
      expenseType: type === 'expense' ? expenseType : undefined,
      amount: parseFloat(amount.replace(',', '.')),
      category,
      subcategory: subcategory || undefined,
      date,
      paymentMethod,
      description: description || undefined,
    });

    // Reset form
    setAmount('');
    setCategory('');
    setSubcategory('');
    setDescription('');
    setExpenseType('variable');
    setShowSubcategories(false);
    onOpenChange(false);
  };

  const formatAmount = (value: string) => {
    const cleaned = value.replace(/[^\d,]/g, '');
    setAmount(cleaned);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-center">
            {showSubcategories && selectedCategory ? (
              <button 
                onClick={() => setShowSubcategories(false)}
                className="flex items-center gap-2 mx-auto text-muted-foreground hover:text-foreground"
              >
                <ChevronRight className="w-4 h-4 rotate-180" />
                <span className="text-lg font-semibold text-foreground">
                  {selectedCategory.icon} {selectedCategory.name}
                </span>
              </button>
            ) : (
              "Novo Lançamento"
            )}
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="flex flex-col h-[calc(100%-60px)]">
          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-6 pb-6">
              {/* Subcategory Selection View */}
              {showSubcategories && selectedCategory ? (
                <div className="space-y-4">
                  <Label>Subcategoria</Label>
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
                          "flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left",
                          subcategory === sub.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        )}
                      >
                        <span className="font-medium">{sub.name}</span>
                        {subcategory === sub.id && (
                          <Check className="w-5 h-5 text-primary" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {/* Type Toggle */}
                  <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-xl">
                    <button
                      type="button"
                      onClick={() => setType('income')}
                      className={cn(
                        "flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all",
                        type === 'income' 
                          ? "bg-success text-success-foreground shadow-sm" 
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <ArrowUpCircle className="w-5 h-5" />
                      Receita
                    </button>
                    <button
                      type="button"
                      onClick={() => setType('expense')}
                      className={cn(
                        "flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all",
                        type === 'expense' 
                          ? "bg-destructive text-destructive-foreground shadow-sm" 
                          : "text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <ArrowDownCircle className="w-5 h-5" />
                      Despesa
                    </button>
                  </div>

                  {/* Amount */}
                  <div className="space-y-2">
                    <Label htmlFor="amount">Valor</Label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                        R$
                      </span>
                      <Input
                        id="amount"
                        type="text"
                        inputMode="decimal"
                        placeholder="0,00"
                        value={amount}
                        onChange={(e) => formatAmount(e.target.value)}
                        className="pl-12 text-2xl font-bold h-14 text-center"
                        required
                      />
                    </div>
                  </div>

                  {/* Expense Type (only for expenses) */}
                  {type === 'expense' && (
                    <div className="space-y-2">
                      <Label>Tipo de Despesa</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setExpenseType('fixed')}
                          className={cn(
                            "py-3 px-4 rounded-xl border-2 font-medium transition-all",
                            expenseType === 'fixed'
                              ? "border-primary bg-primary/5 text-primary"
                              : "border-border text-muted-foreground hover:border-primary/50"
                          )}
                        >
                          🔒 Fixa
                        </button>
                        <button
                          type="button"
                          onClick={() => setExpenseType('variable')}
                          className={cn(
                            "py-3 px-4 rounded-xl border-2 font-medium transition-all",
                            expenseType === 'variable'
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
                    <Label>Categoria</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {filteredCategories.map((cat) => (
                        <button
                          key={cat.id}
                          type="button"
                          onClick={() => handleCategorySelect(cat.id)}
                          className={cn(
                            "relative flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all",
                            category === cat.id
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          <span className="text-2xl">{cat.icon}</span>
                          <span className="text-[10px] text-center leading-tight text-muted-foreground font-medium">
                            {cat.name}
                          </span>
                          {category === cat.id && (
                            <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                              <Check className="w-3 h-3 text-primary-foreground" />
                            </div>
                          )}
                          {cat.subcategories.length > 0 && (
                            <div className="absolute bottom-1 right-1">
                              <ChevronRight className="w-3 h-3 text-muted-foreground" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Selected Subcategory Display */}
                  {subcategory && selectedCategory && (
                    <div className="space-y-2">
                      <Label>Subcategoria selecionada</Label>
                      <button
                        type="button"
                        onClick={() => setShowSubcategories(true)}
                        className="w-full flex items-center justify-between p-3 rounded-xl border-2 border-primary bg-primary/5"
                      >
                        <span className="font-medium">
                          {selectedCategory.subcategories.find(s => s.id === subcategory)?.name}
                        </span>
                        <ChevronRight className="w-4 h-4 text-primary" />
                      </button>
                    </div>
                  )}

                  {/* Payment Method */}
                  <div className="space-y-2">
                    <Label>Forma de Pagamento</Label>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {paymentMethods.map((method) => (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() => setPaymentMethod(method.id as PaymentMethod)}
                          className={cn(
                            "flex items-center gap-2 py-2 px-4 rounded-full border-2 whitespace-nowrap transition-all",
                            paymentMethod === method.id
                              ? "border-primary bg-primary/5 text-primary"
                              : "border-border text-muted-foreground hover:border-primary/50"
                          )}
                        >
                          <span>{method.icon}</span>
                          <span className="text-sm font-medium">{method.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Date */}
                  <div className="space-y-2">
                    <Label htmlFor="date">Data</Label>
                    <Input
                      id="date"
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="h-12"
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description">Observações (opcional)</Label>
                    <Textarea
                      id="description"
                      placeholder="Ex: Compras do mês no supermercado"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="resize-none"
                      rows={2}
                    />
                  </div>
                </>
              )}
            </div>
          </ScrollArea>

          {/* Submit Button - Fixed at bottom */}
          {!showSubcategories && (
            <div className="pt-4 border-t border-border">
              <Button 
                type="submit" 
                size="lg" 
                className="w-full h-14 text-base font-semibold"
                disabled={!amount || !category}
              >
                Salvar Lançamento
              </Button>
            </div>
          )}
        </form>
      </SheetContent>
    </Sheet>
  );
}
