import { useState, useMemo } from "react";
import { ArrowLeft, Plus, ChevronRight, ChevronDown, TrendingUp, TrendingDown, Minus, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getExpenseCategories, getIncomeCategories } from "@/data/categories";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { useTransactions, useTransactionsLast6Months } from "@/hooks/useTransactions";
import { MonthSelector } from "@/components/MonthSelector";
import { CategoryEvolutionSection } from "@/components/CategoryEvolutionChart";

interface CategoriesPageProps {
  onBack: () => void;
}

export function CategoriesPage({ onBack }: CategoriesPageProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'expense' | 'income'>('expense');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showChart, setShowChart] = useState(false);
  
  const selectedMonth = selectedDate.getMonth();
  const selectedYear = selectedDate.getFullYear();
  
  // Calculate previous month
  const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
  const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
  
  const expenseCategories = getExpenseCategories();
  const incomeCategories = getIncomeCategories();
  const categories = activeTab === 'expense' ? expenseCategories : incomeCategories;

  // Fetch real transactions for selected month, previous month, and last 6 months
  const { data: transactions = [] } = useTransactions(selectedMonth, selectedYear);
  const { data: prevTransactions = [] } = useTransactions(prevMonth, prevYear);
  const { data: last6MonthsTransactions = [] } = useTransactionsLast6Months();

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

  // Calculate previous month totals for comparison
  const prevTotals = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    const subcategoryTotals: Record<string, Record<string, number>> = {};

    const relevant = prevTransactions.filter((t: any) =>
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
  }, [prevTransactions, activeTab]);

  // Calculate percentage variation
  const getVariation = (current: number, previous: number) => {
    if (previous === 0 && current === 0) return { percent: 0, trend: 'neutral' as const };
    if (previous === 0) return { percent: 100, trend: 'up' as const };
    
    const percent = ((current - previous) / previous) * 100;
    
    if (Math.abs(percent) < 0.5) return { percent: 0, trend: 'neutral' as const };
    return { 
      percent: Math.abs(percent), 
      trend: percent > 0 ? 'up' as const : 'down' as const 
    };
  };

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
            <Button size="sm" variant="outline" className="gap-2" onClick={() => setShowChart(!showChart)}>
              <BarChart3 className="w-4 h-4" />
              {showChart ? 'Lista' : 'Gráfico'}
            </Button>
          </div>
        </div>
      </header>

      {/* Month Selector */}
      <div className="container px-4 py-4">
        <MonthSelector selectedDate={selectedDate} onMonthChange={setSelectedDate} />
      </div>

      {/* Tabs */}
      <div className="container px-4 pb-4">
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

      {/* Categories Content */}
      <main className="container px-4">
        {showChart ? (
          /* Chart View */
          <CategoryEvolutionSection
            categories={categories}
            allTransactions={last6MonthsTransactions}
            type={activeTab}
          />
        ) : (
          /* List View */
          <div className="grid gap-3">
          {categories.map((category) => {
            const categoryTotal = totals.categoryTotals[category.id] || 0;
            const prevCategoryTotal = prevTotals.categoryTotals[category.id] || 0;
            const variation = getVariation(categoryTotal, prevCategoryTotal);
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

                  <div className="text-right shrink-0 flex flex-col items-end gap-1">
                    <div className="flex items-center gap-2">
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
                    {/* Variation indicator */}
                    {(categoryTotal > 0 || prevCategoryTotal > 0) && (
                      <div className={cn(
                        "flex items-center gap-1 text-xs",
                        variation.trend === 'up' && activeTab === 'expense' && "text-destructive",
                        variation.trend === 'down' && activeTab === 'expense' && "text-success",
                        variation.trend === 'up' && activeTab === 'income' && "text-success",
                        variation.trend === 'down' && activeTab === 'income' && "text-destructive",
                        variation.trend === 'neutral' && "text-muted-foreground"
                      )}>
                        {variation.trend === 'up' && <TrendingUp className="w-3 h-3" />}
                        {variation.trend === 'down' && <TrendingDown className="w-3 h-3" />}
                        {variation.trend === 'neutral' && <Minus className="w-3 h-3" />}
                        <span>
                          {variation.trend === 'neutral' 
                            ? 'Sem variação' 
                            : `${variation.percent.toFixed(0)}%`}
                        </span>
                      </div>
                    )}
                  </div>
                </button>

                {/* Subcategories */}
                {isExpanded && hasSubcategories && (
                  <div className="bg-card border border-t-0 border-border/30 rounded-b-2xl">
                    {category.subcategories.map((sub, index) => {
                      const subTotal = totals.subcategoryTotals[category.id]?.[sub.id] || 0;
                      const prevSubTotal = prevTotals.subcategoryTotals[category.id]?.[sub.id] || 0;
                      const subVariation = getVariation(subTotal, prevSubTotal);
                      
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
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="text-sm font-medium text-foreground">
                              {formatCurrency(subTotal)}
                            </span>
                            {(subTotal > 0 || prevSubTotal > 0) && (
                              <div className={cn(
                                "flex items-center gap-0.5 text-[10px]",
                                subVariation.trend === 'up' && activeTab === 'expense' && "text-destructive",
                                subVariation.trend === 'down' && activeTab === 'expense' && "text-success",
                                subVariation.trend === 'up' && activeTab === 'income' && "text-success",
                                subVariation.trend === 'down' && activeTab === 'income' && "text-destructive",
                                subVariation.trend === 'neutral' && "text-muted-foreground"
                              )}>
                                {subVariation.trend === 'up' && <TrendingUp className="w-2.5 h-2.5" />}
                                {subVariation.trend === 'down' && <TrendingDown className="w-2.5 h-2.5" />}
                                {subVariation.trend === 'neutral' && <Minus className="w-2.5 h-2.5" />}
                                <span>
                                  {subVariation.trend === 'neutral' 
                                    ? '=' 
                                    : `${subVariation.percent.toFixed(0)}%`}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        )}

        {/* Insight */}
        <div className="mt-6 p-4 rounded-2xl bg-info/10 border border-info/20">
          <p className="text-sm text-info leading-relaxed">
            💡 <strong>Dica:</strong> {showChart 
              ? 'Os gráficos mostram a evolução de gastos/receitas por categoria nos últimos 6 meses.'
              : 'A variação percentual compara com o mês anterior. Para despesas: 🔴 aumento, 🟢 redução. Para receitas: 🟢 aumento, 🔴 redução.'}
          </p>
        </div>
      </main>
    </div>
  );
}
