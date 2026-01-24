import { Plus, ArrowUpCircle, ArrowDownCircle, Target, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

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
      navigate("/app/goals");
    }
  };

  const actions = [
    {
      id: "income",
      label: "Receita",
      icon: ArrowUpCircle,
      onClick: onAddIncome,
      className: "bg-success/10 text-success hover:bg-success/20 active:bg-success/30",
      iconBg: "bg-success/20",
    },
    {
      id: "expense",
      label: "Despesa",
      icon: ArrowDownCircle,
      onClick: onAddExpense,
      className: "bg-destructive/10 text-destructive hover:bg-destructive/20 active:bg-destructive/30",
      iconBg: "bg-destructive/20",
    },
    {
      id: "goal",
      label: "Meta",
      icon: Target,
      onClick: handleGoalClick,
      className: "bg-info/10 text-info hover:bg-info/20 active:bg-info/30",
      iconBg: "bg-info/20",
    },
    {
      id: "import",
      label: "Importar",
      icon: Upload,
      onClick: handleImportClick,
      className: "bg-warning/10 text-warning hover:bg-warning/20 active:bg-warning/30",
      iconBg: "bg-warning/20",
    },
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="grid grid-cols-4 gap-3"
    >
      {actions.map((action, index) => {
        const Icon = action.icon;
        return (
          <motion.button
            key={action.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, delay: index * 0.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={action.onClick}
            className={cn(
              "flex flex-col items-center gap-2 p-3 rounded-2xl transition-all duration-200 min-h-[80px] touch-target",
              action.className
            )}
          >
            <div className={cn("p-2 rounded-xl", action.iconBg)}>
              <Icon className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold">{action.label}</span>
          </motion.button>
        );
      })}
    </motion.div>
  );
}


interface FabButtonProps {
  onClick: () => void;
}

export function FabButton({ onClick }: FabButtonProps) {
  return (
    <motion.button
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.3 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="fixed right-4 bottom-20 z-50 w-14 h-14 min-w-[56px] min-h-[56px] bg-primary text-primary-foreground rounded-full shadow-xl shadow-primary/30 flex items-center justify-center focus:outline-none focus:ring-4 focus:ring-primary/30"
      aria-label="Adicionar receita ou despesa"
    >
      <Plus className="w-7 h-7" strokeWidth={2.5} />
    </motion.button>
  );
}