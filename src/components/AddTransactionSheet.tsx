import { useState } from "react";
import { X, ArrowUpCircle, ArrowDownCircle, Check } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { defaultCategories, paymentMethods } from "@/data/categories";
import { Transaction, TransactionType, ExpenseType, PaymentMethod } from "@/types/finance";
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
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');

  const filteredCategories = defaultCategories.filter(cat => cat.type === type);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!amount || !category) return;

    onSubmit({
      type,
      expenseType: type === 'expense' ? expenseType : undefined,
      amount: parseFloat(amount.replace(',', '.')),
      category,
      date,
      paymentMethod,
      description: description || undefined,
    });

    // Reset form
    setAmount('');
    setCategory('');
    setDescription('');
    setExpenseType('variable');
    onOpenChange(false);
  };

  const formatAmount = (value: string) => {
    // Remove non-numeric characters except comma
    const cleaned = value.replace(/[^\d,]/g, '');
    setAmount(cleaned);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-center">Novo Lançamento</SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-6 overflow-y-auto pb-safe">
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
            <div className="grid grid-cols-4 gap-2">
              {filteredCategories.slice(0, 8).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={cn(
                    "flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all",
                    category === cat.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  )}
                >
                  <span className="text-xl">{cat.icon}</span>
                  <span className="text-[10px] text-center leading-tight text-muted-foreground">
                    {cat.name.split(' ')[0]}
                  </span>
                  {category === cat.id && (
                    <Check className="w-4 h-4 text-primary absolute -top-1 -right-1" />
                  )}
                </button>
              ))}
            </div>
          </div>

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

          {/* Submit Button */}
          <Button 
            type="submit" 
            size="lg" 
            className="w-full h-14 text-base font-semibold"
            disabled={!amount || !category}
          >
            Salvar Lançamento
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
