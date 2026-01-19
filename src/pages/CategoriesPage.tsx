import { useState, useMemo } from "react";
import { ArrowLeft, Plus, ChevronRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getExpenseCategories, getIncomeCategories } from "@/data/categories";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { useTransactions } from "@/hooks/useTransactions";

interface CategoriesPageProps {
  onBack: () => void;
}

export function CategoriesPage({ onBack }: CategoriesPageProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');
  
  const expenseCategories = getExpenseCategories();
  const incomeCategories = getIncomeCategories();
  const categories = activeTab === 'expense' ? expenseCategories : incomeCategories;

  // Fetch real transactions
  const { data: transactions = [] } = useTransactions();

  // Calculate totals from real transaction data
  const totals = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    const subcategoryTotals: Record<string, Record<string, number>> = {};

    // Filter by type (expense/income)
    const relevant = transactions.filter((t: any) =>
      activeTab === "expense" ? t.type === "expense" : t.type === "income"
    );

    for (const t of relevant) {
      const catId = t.category_id;
      const subId = t.subcategory_id;
      const amount = Number(t.amount) || 0;

      categoryTotals[catId] = (categoryTotals[catId] || 0) + amount;

      if (subId) {
        subcategoryTotals[catId] = subcategoryTotals[catId] || {};
        subcategoryTotals[catId][subId] =
          (subcategoryTotals[catId][subId] || 0) + amount;
      }
    }

    return { categoryTotals, subcategoryTotals };
  }, [transactions, activeTab]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="container px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={onBack}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-lg font-semibold">Categorias</h1>
            </div>
            <Button size="sm" variant="outline" className="gap-2">
              <Plus className="w-4 h-4" />
              Nova
            </Button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="container px-4 py-4">
        <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-xl">
          <button
            onClick={() => setActiveTab('expense')}
            className={cn(
              "py-2.5 rounded-lg font-medium transition-all text-sm",
              activeTab === 'expense'
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Despesas ({expenseCategories.length})
          </button>
          <button
            onClick={() => setActiveTab('income')}
            className={cn(
              "py-2.5 rounded-lg font-medium transition-all text-sm",
              activeTab === 'income'
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Receitas ({incomeCategories.length})
          </button>
        </div>
      </div>

      {/* Categories List */}
      <main className="container px-4">
        <div className="grid gap-3">
          {categories.map((category) => {
            const categoryTotal = totals.categoryTotals[category.id] || 0;
            const isExpanded = expandedCategory === category.id;
            const hasSubcategories = category.subcategories.length > 0;
            
            return (
              <div key={category.id} className="overflow-hidden">
                {/* Main Category */}
                <button
                  onClick={() => hasSubcategories && toggleCategory(category.id)}
                  className={cn(
                    "w-full flex items-center gap-4 p-4 rounded-2xl bg-card border transition-all text-left",
                    isExpanded ? "border-primary/30 rounded-b-none" : "border-border/30 hover:shadow-md"
                  )}
                >
                  <div 
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-xl shrink-0"
                    style={{ backgroundColor: `${category.color}20` }}
                  >
                    {category.icon}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground truncate">{category.name}</p>
                      <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                        {category.code}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {category.subcategories.length} subcategorias
                    </p>
                  </div>

                  <div className="text-right shrink-0 flex items-center gap-2">
                    <p className="font-semibold text-foreground">
                      {formatCurrency(categoryTotal)}
                    </p>
                    {hasSubcategories && (
                      isExpanded ? (
                        <ChevronDown className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      )
                    )}
                  </div>
                </button>

                {/* Subcategories */}
                {isExpanded && hasSubcategories && (
                  <div className="bg-card border border-t-0 border-border/30 rounded-b-2xl">
                    {category.subcategories.map((sub, index) => {
                      const subTotal = totals.subcategoryTotals[category.id]?.[sub.id] || 0;
                      
                      return (
                        <div
                          key={sub.id}
                          className={cn(
                            "flex items-center gap-3 px-4 py-3 ml-4",
                            index !== category.subcategories.length - 1 && "border-b border-border/20"
                          )}
                        >
                          <div 
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: category.color }}
                          />
                          <span className="text-sm text-foreground flex-1">{sub.name}</span>
                          <span className="text-sm font-medium text-foreground">
                            {formatCurrency(subTotal)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Insight */}
        <div className="mt-6 p-4 rounded-2xl bg-info/10 border border-info/20">
          <p className="text-sm text-info leading-relaxed">
            💡 <strong>Dica:</strong> Categorizar seus gastos ajuda a família a identificar 
            onde o dinheiro está indo e a tomar decisões mais conscientes. As subcategorias 
            permitem um controle ainda mais detalhado!
          </p>
        </div>
      </main>
    </div>
  );
}
