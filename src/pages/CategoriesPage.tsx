import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { defaultCategories } from "@/data/categories";
import { formatCurrency, formatPercentage } from "@/lib/formatters";
import { mockCategoryExpenses } from "@/data/mockData";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface CategoriesPageProps {
  onBack: () => void;
}

export function CategoriesPage({ onBack }: CategoriesPageProps) {
  const expenseCategories = defaultCategories.filter(c => c.type === 'expense');

  const getCategoryExpense = (categoryId: string) => {
    return mockCategoryExpenses.find(e => e.category === categoryId);
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

      {/* Categories Grid */}
      <main className="container px-4 py-4">
        <div className="grid gap-3">
          {expenseCategories.map((category) => {
            const expense = getCategoryExpense(category.id);
            const hasChange = expense?.change !== undefined && expense.change !== 0;
            const isPositiveChange = expense?.change && expense.change > 0;
            
            return (
              <div
                key={category.id}
                className="flex items-center gap-4 p-4 rounded-2xl bg-card border border-border/30 hover:shadow-md transition-all"
              >
                <div 
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
                  style={{ backgroundColor: `${category.color}20` }}
                >
                  {category.icon}
                </div>
                
                <div className="flex-1">
                  <p className="font-medium text-foreground">{category.name}</p>
                  {expense && (
                    <p className="text-sm text-muted-foreground">
                      {formatPercentage(expense.percentage)} do total
                    </p>
                  )}
                </div>

                <div className="text-right">
                  {expense ? (
                    <>
                      <p className="font-semibold text-foreground">
                        {formatCurrency(expense.amount)}
                      </p>
                      {hasChange && (
                        <div className={cn(
                          "flex items-center justify-end gap-1 text-xs",
                          isPositiveChange ? "text-destructive" : "text-success"
                        )}>
                          {isPositiveChange ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : (
                            <TrendingDown className="w-3 h-3" />
                          )}
                          <span>{Math.abs(expense.change || 0).toFixed(1)}%</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(0)}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Insight */}
        <div className="mt-6 p-4 rounded-2xl bg-info/10 border border-info/20">
          <p className="text-sm text-info leading-relaxed">
            💡 <strong>Dica:</strong> Categorizar seus gastos ajuda a família a identificar 
            onde o dinheiro está indo e a tomar decisões mais conscientes. Vocês podem 
            personalizar as categorias conforme a realidade de vocês!
          </p>
        </div>
      </main>
    </div>
  );
}
