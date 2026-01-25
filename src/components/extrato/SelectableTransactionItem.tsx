import { memo } from "react";
import { Transaction } from "@/types/finance";
import { getCategoryById, GOALS_CATEGORY_ID } from "@/data/categories";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Check } from "lucide-react";

interface SelectableTransactionItemProps {
  transaction: Transaction & { goalTitle?: string };
  isSelected: boolean;
  isSelectionMode: boolean;
  onSelect: (id: string) => void;
  onClick?: () => void;
}

export const SelectableTransactionItem = memo(function SelectableTransactionItem({
  transaction,
  isSelected,
  isSelectionMode,
  onSelect,
  onClick,
}: SelectableTransactionItemProps) {
  const category = getCategoryById(transaction.category);
  const isExpense = transaction.type === 'expense';
  const isGoalTransaction = transaction.category === GOALS_CATEGORY_ID;

  const displayTitle = isGoalTransaction && transaction.goalTitle 
    ? transaction.goalTitle 
    : (transaction.description || category?.name);

  const displaySubtitle = isGoalTransaction && transaction.goalTitle
    ? `Objetivos • ${transaction.goalTitle}`
    : category?.name;

  const handleClick = () => {
    if (isSelectionMode) {
      onSelect(transaction.id);
    } else {
      onClick?.();
    }
  };

  const handleLongPress = () => {
    if (!isSelectionMode) {
      onSelect(transaction.id);
    }
  };

  return (
    <div
      onClick={handleClick}
      onContextMenu={(e) => {
        e.preventDefault();
        handleLongPress();
      }}
      className={cn(
        "flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer border",
        isSelected 
          ? "bg-primary/10 border-primary/30" 
          : "bg-card border-border/30 hover:bg-muted/50"
      )}
    >
      {/* Selection checkbox */}
      {isSelectionMode && (
        <div 
          className="flex-shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(transaction.id);
          }}
        >
          <div 
            className={cn(
              "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors",
              isSelected 
                ? "bg-primary border-primary" 
                : "border-muted-foreground/30"
            )}
          >
            {isSelected && <Check className="w-3.5 h-3.5 text-primary-foreground" />}
          </div>
        </div>
      )}

      {/* Category icon */}
      <div 
        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
        style={{ backgroundColor: `${category?.color}20` }}
      >
        {category?.icon || "📦"}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground text-sm truncate">
          {displayTitle}
        </p>
        <p className="text-xs text-muted-foreground truncate">
          {displaySubtitle} • {formatDate(transaction.date)}
        </p>
      </div>

      {/* Amount */}
      <div className="text-right">
        <span className={cn(
          "font-semibold text-sm whitespace-nowrap",
          isExpense ? "text-destructive" : "text-success"
        )}>
          {isExpense ? "-" : "+"}{formatCurrency(transaction.amount)}
        </span>
      </div>
    </div>
  );
});
