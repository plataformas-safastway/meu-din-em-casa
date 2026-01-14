import { useState } from "react";
import { ArrowLeft, Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Transaction } from "@/types/finance";
import { getCategoryById } from "@/data/categories";
import { formatCurrency, formatFullDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { useFinanceStore } from "@/hooks/useFinanceStore";

interface TransactionsPageProps {
  onBack: () => void;
}

export function TransactionsPage({ onBack }: TransactionsPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  
  const { transactions } = useFinanceStore();

  const filteredTransactions = transactions.filter(t => {
    const matchesSearch = t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         getCategoryById(t.category)?.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || t.type === filterType;
    return matchesSearch && matchesType;
  });

  // Group transactions by date
  const groupedTransactions = filteredTransactions.reduce((acc, transaction) => {
    const date = transaction.date;
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(transaction);
    return acc;
  }, {} as Record<string, Transaction[]>);

  const sortedDates = Object.keys(groupedTransactions).sort((a, b) => 
    new Date(b).getTime() - new Date(a).getTime()
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="container px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-semibold">Extrato</h1>
          </div>
          
          {/* Search */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar lançamentos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 mt-4">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'income', label: 'Receitas' },
              { id: 'expense', label: 'Despesas' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id as typeof filterType)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-all",
                  filterType === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Transaction List */}
      <main className="container px-4 py-4">
        {sortedDates.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nenhum lançamento encontrado.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {sortedDates.map((date) => (
              <div key={date}>
                <h3 className="text-sm font-medium text-muted-foreground mb-3">
                  {formatFullDate(date)}
                </h3>
                <div className="space-y-2">
                  {groupedTransactions[date].map((transaction) => {
                    const category = getCategoryById(transaction.category);
                    const isExpense = transaction.type === 'expense';
                    
                    return (
                      <div
                        key={transaction.id}
                        className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border/30"
                      >
                        <div 
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-xl"
                          style={{ backgroundColor: `${category?.color}20` }}
                        >
                          {category?.icon || "📦"}
                        </div>
                        
                        <div className="flex-1">
                          <p className="font-medium text-foreground">
                            {transaction.description || category?.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {category?.name}
                          </p>
                        </div>

                        <span className={cn(
                          "font-semibold",
                          isExpense ? "text-destructive" : "text-success"
                        )}>
                          {isExpense ? "-" : "+"}{formatCurrency(transaction.amount)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
