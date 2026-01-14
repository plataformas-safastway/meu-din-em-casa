import { Transaction } from "@/types/finance";
import { getCategoryById } from "@/data/categories";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

interface TransactionItemProps {
  transaction: Transaction;
  onClick?: () => void;
}

function TransactionItem({ transaction, onClick }: TransactionItemProps) {
  const category = getCategoryById(transaction.category);
  const isExpense = transaction.type === 'expense';

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-xl bg-card hover:bg-muted/50 transition-colors border border-border/30"
    >
      <div 
        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
        style={{ backgroundColor: `${category?.color}20` }}
      >
        {category?.icon || "📦"}
      </div>
      
      <div className="flex-1 text-left">
        <p className="font-medium text-foreground text-sm">
          {transaction.description || category?.name}
        </p>
        <p className="text-xs text-muted-foreground">
          {category?.name} • {formatDate(transaction.date)}
        </p>
      </div>

      <div className="text-right flex items-center gap-2">
        <span className={cn(
          "font-semibold text-sm",
          isExpense ? "text-destructive" : "text-success"
        )}>
          {isExpense ? "-" : "+"}{formatCurrency(transaction.amount)}
        </span>
        <ChevronRight className="w-4 h-4 text-muted-foreground" />
      </div>
    </button>
  );
}

interface TransactionListProps {
  transactions: Transaction[];
  limit?: number;
  onTransactionClick?: (transaction: Transaction) => void;
}

export function TransactionList({ transactions, limit = 5, onTransactionClick }: TransactionListProps) {
  const displayTransactions = transactions.slice(0, limit);

  return (
    <div className="space-y-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-foreground">Últimos Lançamentos</h3>
        <button className="text-sm text-primary hover:text-primary/80 font-medium transition-colors">
          Ver extrato
        </button>
      </div>
      
      <div className="space-y-2">
        {displayTransactions.map((transaction, index) => (
          <div 
            key={transaction.id} 
            className="animate-slide-up"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <TransactionItem 
              transaction={transaction} 
              onClick={() => onTransactionClick?.(transaction)}
            />
          </div>
        ))}
      </div>

      {transactions.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground text-sm">
            Nenhum lançamento ainda. Comece registrando suas receitas e despesas!
          </p>
        </div>
      )}
    </div>
  );
}
