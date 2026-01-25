import { useRef, memo, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Transaction } from "@/types/finance";
import { getCategoryById, GOALS_CATEGORY_ID } from "@/data/categories";
import { formatCurrency, formatDate, formatFullDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { ChevronRight, MoreVertical, Trash2, Edit2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ============================================
// MEMOIZED TRANSACTION ITEM
// ============================================

interface TransactionItemProps {
  transaction: Transaction & { goalTitle?: string };
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  showActions?: boolean;
}

const TransactionItem = memo(function TransactionItem({ 
  transaction, 
  onClick,
  onEdit,
  onDelete,
  showActions = false
}: TransactionItemProps) {
  const category = getCategoryById(transaction.category);
  const isExpense = transaction.type === 'expense';
  const isGoalTransaction = transaction.category === GOALS_CATEGORY_ID;

  const displayTitle = isGoalTransaction && transaction.goalTitle 
    ? transaction.goalTitle 
    : (transaction.description || category?.name);

  const displaySubtitle = isGoalTransaction && transaction.goalTitle
    ? `Objetivos • ${transaction.goalTitle}`
    : category?.name;

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-card hover:bg-muted/50 transition-colors border border-border/30">
      <button
        onClick={onClick}
        className="flex items-center gap-3 flex-1 text-left"
      >
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
          style={{ backgroundColor: `${category?.color}20` }}
        >
          {category?.icon || "📦"}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground text-sm truncate">
            {displayTitle}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {displaySubtitle} • {formatDate(transaction.date)}
          </p>
        </div>
      </button>

      <div className="text-right flex items-center gap-2">
        <span className={cn(
          "font-semibold text-sm whitespace-nowrap",
          isExpense ? "text-destructive" : "text-success"
        )}>
          {isExpense ? "-" : "+"}{formatCurrency(transaction.amount)}
        </span>
        
        {showActions ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit2 className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-destructive focus:text-destructive"
                onClick={onDelete}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
      </div>
    </div>
  );
});

// ============================================
// DATE HEADER
// ============================================

interface DateHeaderProps {
  date: string;
}

const DateHeader = memo(function DateHeader({ date }: DateHeaderProps) {
  return (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm py-2">
      <h3 className="text-sm font-medium text-muted-foreground">
        {formatFullDate(date)}
      </h3>
    </div>
  );
});

// ============================================
// VIRTUALIZED LIST TYPES
// ============================================

interface GroupedItem {
  type: 'header' | 'transaction';
  date?: string;
  transaction?: Transaction;
}

interface VirtualizedTransactionListProps {
  transactions: Transaction[];
  onTransactionClick?: (transaction: Transaction) => void;
  onEdit?: (transaction: Transaction) => void;
  onDelete?: (id: string) => void;
  showActions?: boolean;
  hasMore?: boolean;
  isLoadingMore?: boolean;
  onLoadMore?: () => void;
}

// ============================================
// MAIN COMPONENT
// ============================================

export function VirtualizedTransactionList({
  transactions,
  onTransactionClick,
  onEdit,
  onDelete,
  showActions = false,
  hasMore = false,
  isLoadingMore = false,
  onLoadMore,
}: VirtualizedTransactionListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Group transactions by date and flatten for virtualization
  const flattenedItems = useCallback((): GroupedItem[] => {
    const grouped: Record<string, Transaction[]> = {};
    
    for (const t of transactions) {
      if (!grouped[t.date]) grouped[t.date] = [];
      grouped[t.date].push(t);
    }
    
    const sortedDates = Object.keys(grouped).sort((a, b) => 
      new Date(b).getTime() - new Date(a).getTime()
    );
    
    const items: GroupedItem[] = [];
    for (const date of sortedDates) {
      items.push({ type: 'header', date });
      for (const t of grouped[date]) {
        items.push({ type: 'transaction', transaction: t });
      }
    }
    
    return items;
  }, [transactions])();

  const rowVirtualizer = useVirtualizer({
    count: flattenedItems.length + (hasMore ? 1 : 0),
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      if (index >= flattenedItems.length) return 48; // Load more button
      return flattenedItems[index].type === 'header' ? 36 : 72;
    },
    overscan: 10,
  });

  // Trigger load more when scrolling near bottom
  const items = rowVirtualizer.getVirtualItems();
  const lastItem = items[items.length - 1];
  
  if (
    hasMore && 
    !isLoadingMore && 
    lastItem && 
    lastItem.index >= flattenedItems.length - 5
  ) {
    onLoadMore?.();
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">
          Nenhum lançamento encontrado.
        </p>
      </div>
    );
  }

  return (
    <div 
      ref={parentRef}
      className="h-[calc(100vh-280px)] overflow-auto"
    >
      <div
        className="relative w-full"
        style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualRow) => {
          const index = virtualRow.index;
          
          // Load more button
          if (index >= flattenedItems.length) {
            return (
              <div
                key="load-more"
                className="absolute top-0 left-0 w-full flex justify-center py-4"
                style={{
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {isLoadingMore ? (
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                ) : (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={onLoadMore}
                  >
                    Carregar mais
                  </Button>
                )}
              </div>
            );
          }
          
          const item = flattenedItems[index];
          
          if (item.type === 'header') {
            return (
              <div
                key={`header-${item.date}`}
                className="absolute top-0 left-0 w-full"
                style={{
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                <DateHeader date={item.date!} />
              </div>
            );
          }
          
          const transaction = item.transaction!;
          
          return (
            <div
              key={transaction.id}
              className="absolute top-0 left-0 w-full px-1 py-1"
              style={{
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <TransactionItem
                transaction={transaction}
                onClick={() => onTransactionClick?.(transaction)}
                onEdit={() => onEdit?.(transaction)}
                onDelete={() => onDelete?.(transaction.id)}
                showActions={showActions}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
