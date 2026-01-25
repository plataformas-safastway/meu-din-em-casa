import { useState, useMemo } from "react";
import { Filter, X, Calendar, Tag, Building2, CreditCard, Wallet, Database, Search } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { defaultCategories } from "@/data/categories";
import { useBankAccounts, useCreditCards } from "@/hooks/useBankData";
import { paymentMethodLabels, PaymentMethod } from "@/types/finance";

export interface TransactionFilters {
  // Period
  periodType: 'this-month' | 'last-month' | 'last-30' | 'last-90' | 'custom' | 'month-select' | null;
  selectedMonth?: string; // YYYY-MM format
  startDate?: string;
  endDate?: string;
  // Type
  type: 'all' | 'income' | 'expense';
  // Categories
  categoryIds: string[];
  onlyUnclassified: boolean;
  // Accounts & Cards
  bankAccountIds: string[];
  creditCardIds: string[];
  // Payment methods
  paymentMethods: PaymentMethod[];
  // Source
  sources: string[];
  // Search
  searchQuery: string;
}

export const defaultFilters: TransactionFilters = {
  periodType: null,
  type: 'all',
  categoryIds: [],
  onlyUnclassified: false,
  bankAccountIds: [],
  creditCardIds: [],
  paymentMethods: [],
  sources: [],
  searchQuery: '',
};

interface TransactionFiltersSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: TransactionFilters;
  onApply: (filters: TransactionFilters) => void;
}

const periodOptions = [
  { id: 'this-month', label: 'Este mês' },
  { id: 'last-month', label: 'Mês passado' },
  { id: 'last-30', label: 'Últimos 30 dias' },
  { id: 'last-90', label: 'Últimos 90 dias' },
];

const sourceOptions = [
  { id: 'MANUAL', label: 'Manual', icon: '✏️' },
  { id: 'UPLOAD', label: 'Upload', icon: '📤' },
  { id: 'IMPORT', label: 'Importação', icon: '📥' },
  { id: 'OCR', label: 'OCR', icon: '📷' },
  { id: 'OPEN_FINANCE', label: 'Open Finance', icon: '🏦' },
];

export function TransactionFiltersSheet({
  open,
  onOpenChange,
  filters,
  onApply,
}: TransactionFiltersSheetProps) {
  const [localFilters, setLocalFilters] = useState<TransactionFilters>(filters);
  const { data: bankAccounts = [] } = useBankAccounts();
  const { data: creditCards = [] } = useCreditCards();

  // Sync with parent filters when sheet opens
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setLocalFilters(filters);
    }
    onOpenChange(isOpen);
  };

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (localFilters.periodType) count++;
    if (localFilters.type !== 'all') count++;
    if (localFilters.categoryIds.length > 0) count++;
    if (localFilters.onlyUnclassified) count++;
    if (localFilters.bankAccountIds.length > 0) count++;
    if (localFilters.creditCardIds.length > 0) count++;
    if (localFilters.paymentMethods.length > 0) count++;
    if (localFilters.sources.length > 0) count++;
    if (localFilters.searchQuery) count++;
    return count;
  }, [localFilters]);

  const handleClearFilters = () => {
    setLocalFilters(defaultFilters);
  };

  const handleApply = () => {
    onApply(localFilters);
    onOpenChange(false);
  };

  // Toggle item in array
  const toggleArrayItem = <T,>(arr: T[], item: T): T[] => {
    return arr.includes(item) 
      ? arr.filter(i => i !== item)
      : [...arr, item];
  };

  // Get expense and income categories
  const expenseCategories = defaultCategories.filter(c => c.type === 'expense');
  const incomeCategories = defaultCategories.filter(c => c.type === 'income');

  // Get available payment methods
  const availablePaymentMethods = Object.entries(paymentMethodLabels) as [PaymentMethod, { label: string; icon: string }][];

  // Generate month options (last 12 months)
  const monthOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
      options.push({ value, label });
    }
    return options;
  }, []);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="pb-2">
          <SheetTitle className="flex items-center justify-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros
            {activeFilterCount > 0 && (
              <Badge variant="default" className="ml-2">{activeFilterCount}</Badge>
            )}
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1 h-[calc(85vh-140px)] -mx-6 px-6">
          <div className="space-y-6 pb-4">
            {/* Search */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Search className="w-4 h-4" />
                Busca por descrição
              </Label>
              <Input
                placeholder="Digite para buscar..."
                value={localFilters.searchQuery}
                onChange={(e) => setLocalFilters(prev => ({ ...prev, searchQuery: e.target.value }))}
                className="h-11 rounded-xl"
              />
            </div>

            {/* Period */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Período
              </Label>
              <div className="flex flex-wrap gap-2">
                {periodOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setLocalFilters(prev => ({ 
                      ...prev, 
                      periodType: prev.periodType === opt.id ? null : opt.id as any,
                      startDate: undefined,
                      endDate: undefined,
                      selectedMonth: undefined,
                    }))}
                    className={cn(
                      "px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      localFilters.periodType === opt.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Month selector */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Ou selecione um mês</Label>
                <div className="flex flex-wrap gap-2">
                  {monthOptions.slice(0, 6).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setLocalFilters(prev => ({ 
                        ...prev, 
                        periodType: 'month-select',
                        selectedMonth: prev.selectedMonth === opt.value ? undefined : opt.value,
                        startDate: undefined,
                        endDate: undefined,
                      }))}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors capitalize",
                        localFilters.selectedMonth === opt.value
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom date range */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Data inicial</Label>
                  <Input
                    type="date"
                    value={localFilters.startDate || ''}
                    onChange={(e) => setLocalFilters(prev => ({ 
                      ...prev, 
                      startDate: e.target.value,
                      periodType: 'custom',
                      selectedMonth: undefined,
                    }))}
                    className="h-10 rounded-lg text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Data final</Label>
                  <Input
                    type="date"
                    value={localFilters.endDate || ''}
                    onChange={(e) => setLocalFilters(prev => ({ 
                      ...prev, 
                      endDate: e.target.value,
                      periodType: 'custom',
                      selectedMonth: undefined,
                    }))}
                    className="h-10 rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Type */}
            <div className="space-y-3">
              <Label>Tipo</Label>
              <div className="flex gap-2">
                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'income', label: '💰 Receitas' },
                  { id: 'expense', label: '💸 Despesas' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setLocalFilters(prev => ({ ...prev, type: opt.id as any }))}
                    className={cn(
                      "flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      localFilters.type === opt.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Categories */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Tag className="w-4 h-4" />
                Categorias
              </Label>
              
              <div className="flex items-center gap-2 mb-2">
                <Checkbox
                  id="unclassified"
                  checked={localFilters.onlyUnclassified}
                  onCheckedChange={(checked) => setLocalFilters(prev => ({ 
                    ...prev, 
                    onlyUnclassified: !!checked,
                    categoryIds: checked ? [] : prev.categoryIds,
                  }))}
                />
                <label htmlFor="unclassified" className="text-sm cursor-pointer">
                  Somente não classificados
                </label>
              </div>

              {!localFilters.onlyUnclassified && (
                <div className="space-y-2">
                  <div className="text-xs text-muted-foreground mb-1">Despesas</div>
                  <div className="flex flex-wrap gap-1.5">
                    {expenseCategories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setLocalFilters(prev => ({ 
                          ...prev, 
                          categoryIds: toggleArrayItem(prev.categoryIds, cat.id)
                        }))}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1",
                          localFilters.categoryIds.includes(cat.id)
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/50 text-muted-foreground hover:bg-muted"
                        )}
                      >
                        <span>{cat.icon}</span>
                        <span className="max-w-[80px] truncate">{cat.name}</span>
                      </button>
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground mb-1 mt-3">Receitas</div>
                  <div className="flex flex-wrap gap-1.5">
                    {incomeCategories.map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setLocalFilters(prev => ({ 
                          ...prev, 
                          categoryIds: toggleArrayItem(prev.categoryIds, cat.id)
                        }))}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-xs font-medium transition-colors flex items-center gap-1",
                          localFilters.categoryIds.includes(cat.id)
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted/50 text-muted-foreground hover:bg-muted"
                        )}
                      >
                        <span>{cat.icon}</span>
                        <span>{cat.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bank Accounts */}
            {bankAccounts.length > 0 && (
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Contas Bancárias
                </Label>
                <div className="flex flex-wrap gap-2">
                  {bankAccounts.map((acc) => (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => setLocalFilters(prev => ({ 
                        ...prev, 
                        bankAccountIds: toggleArrayItem(prev.bankAccountIds, acc.id)
                      }))}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                        localFilters.bankAccountIds.includes(acc.id)
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {acc.nickname}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Credit Cards */}
            {creditCards.length > 0 && (
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Cartões de Crédito
                </Label>
                <div className="flex flex-wrap gap-2">
                  {creditCards.map((card) => (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => setLocalFilters(prev => ({ 
                        ...prev, 
                        creditCardIds: toggleArrayItem(prev.creditCardIds, card.id)
                      }))}
                      className={cn(
                        "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                        localFilters.creditCardIds.includes(card.id)
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted"
                      )}
                    >
                      {card.card_name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Payment Methods */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Wallet className="w-4 h-4" />
                Meio de Pagamento
              </Label>
              <div className="flex flex-wrap gap-2">
                {availablePaymentMethods.map(([id, { label, icon }]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setLocalFilters(prev => ({ 
                      ...prev, 
                      paymentMethods: toggleArrayItem(prev.paymentMethods, id)
                    }))}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1",
                      localFilters.paymentMethods.includes(id)
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <span>{icon}</span>
                    <span>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Source */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Database className="w-4 h-4" />
                Fonte
              </Label>
              <div className="flex flex-wrap gap-2">
                {sourceOptions.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setLocalFilters(prev => ({ 
                      ...prev, 
                      sources: toggleArrayItem(prev.sources, opt.id)
                    }))}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1",
                      localFilters.sources.includes(opt.id)
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <span>{opt.icon}</span>
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Footer Buttons */}
        <div className="pt-4 border-t border-border flex gap-3">
          <Button
            variant="outline"
            onClick={handleClearFilters}
            className="flex-1 h-12 rounded-xl"
            disabled={activeFilterCount === 0}
          >
            <X className="w-4 h-4 mr-2" />
            Limpar
          </Button>
          <Button
            onClick={handleApply}
            className="flex-1 h-12 rounded-xl"
          >
            <Filter className="w-4 h-4 mr-2" />
            Aplicar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
