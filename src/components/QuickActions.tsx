import { Plus, ArrowUpCircle, ArrowDownCircle, Target, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";

interface QuickActionsProps {
  onAddIncome: () => void;
  onAddExpense: () => void;
  onAddGoal: () => void;
  onViewReceipts: () => void;
}

export function QuickActions({ onAddIncome, onAddExpense, onAddGoal, onViewReceipts }: QuickActionsProps) {
  const actions = [
    {
      id: "income",
      label: "Receita",
      icon: ArrowUpCircle,
      onClick: onAddIncome,
      className: "bg-success/10 text-success hover:bg-success/20",
    },
    {
      id: "expense",
      label: "Despesa",
      icon: ArrowDownCircle,
      onClick: onAddExpense,
      className: "bg-destructive/10 text-destructive hover:bg-destructive/20",
    },
    {
      id: "goal",
      label: "Meta",
      icon: Target,
      onClick: onAddGoal,
      className: "bg-info/10 text-info hover:bg-info/20",
    },
    {
      id: "receipts",
      label: "Recibos",
      icon: Receipt,
      onClick: onViewReceipts,
      className: "bg-warning/10 text-warning hover:bg-warning/20",
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-3 animate-fade-in">
      {actions.map((action) => {
        const Icon = action.icon;
        return (
          <button
            key={action.id}
            onClick={action.onClick}
            className={cn(
              "flex flex-col items-center gap-2 p-3 rounded-2xl transition-all duration-200 active:scale-95",
              action.className
            )}
          >
            <Icon className="w-6 h-6" />
            <span className="text-xs font-medium">{action.label}</span>
          </button>
        );
      })}
    </div>
  );
}

interface FabButtonProps {
  onClick: () => void;
}

export function FabButton({ onClick }: FabButtonProps) {
  return (
    <button
      onClick={onClick}
      className="btn-fab"
      aria-label="Adicionar lançamento"
    >
      <Plus className="w-6 h-6" />
    </button>
  );
}
