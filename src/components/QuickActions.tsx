import { Plus, ArrowUpCircle, ArrowDownCircle, Target, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface QuickActionsProps {
  onAddIncome: () => void;
  onAddExpense: () => void;
  onAddGoal?: () => void;
}

export function QuickActions({ onAddIncome, onAddExpense, onAddGoal }: QuickActionsProps) {
  const navigate = useNavigate();

  const handleImportClick = () => {
    navigate("/app/import");
  };

  const handleGoalClick = () => {
    if (onAddGoal) {
      onAddGoal();
    } else {
      // Fallback: navigate directly to goals page
      navigate("/app/goals");
    }
  };

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
      onClick: handleGoalClick,
      className: "bg-info/10 text-info hover:bg-info/20",
    },
    {
      id: "import",
      label: "Importar",
      icon: Upload,
      onClick: handleImportClick,
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
      className="fixed right-4 bottom-20 z-50 w-14 h-14 min-w-[56px] min-h-[56px] bg-primary text-primary-foreground rounded-full shadow-xl shadow-primary/30 flex items-center justify-center transition-all duration-200 active:scale-95 hover:shadow-2xl hover:shadow-primary/40 focus:outline-none focus:ring-4 focus:ring-primary/30"
      aria-label="Adicionar receita ou despesa"
    >
      <Plus className="w-7 h-7" strokeWidth={2.5} />
    </button>
  );
}
