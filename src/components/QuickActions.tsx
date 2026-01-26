import { Plus, ArrowUpCircle, ArrowDownCircle, Upload, Lock, Camera } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useHasPermission } from "@/hooks/useFamilyPermissions";
import { toast } from "sonner";

interface QuickActionsProps {
  onAddIncome: () => void;
  onAddExpense: () => void;
  onPhotoCapture?: () => void;
  onImport?: () => void;
}

export function QuickActions({ onAddIncome, onAddExpense, onPhotoCapture, onImport }: QuickActionsProps) {
  const { hasPermission: canInsert } = useHasPermission("can_insert_transactions");

  const handleBlockedAction = () => {
    toast.error("Sem permissão", {
      description: "Você não tem permissão para inserir lançamentos.",
    });
  };

  const actions = [
    {
      id: "income",
      label: "Receita",
      icon: ArrowUpCircle,
      onClick: canInsert ? onAddIncome : handleBlockedAction,
      className: canInsert 
        ? "bg-success/10 text-success hover:bg-success/20 active:bg-success/30"
        : "bg-muted/50 text-muted-foreground cursor-not-allowed",
      iconBg: canInsert ? "bg-success/20" : "bg-muted",
      disabled: !canInsert,
    },
    {
      id: "expense",
      label: "Despesa",
      icon: ArrowDownCircle,
      onClick: canInsert ? onAddExpense : handleBlockedAction,
      className: canInsert
        ? "bg-destructive/10 text-destructive hover:bg-destructive/20 active:bg-destructive/30"
        : "bg-muted/50 text-muted-foreground cursor-not-allowed",
      iconBg: canInsert ? "bg-destructive/20" : "bg-muted",
      disabled: !canInsert,
    },
    {
      id: "photo",
      label: "Foto",
      icon: Camera,
      onClick: canInsert && onPhotoCapture ? onPhotoCapture : handleBlockedAction,
      className: canInsert
        ? "bg-primary/10 text-primary hover:bg-primary/20 active:bg-primary/30"
        : "bg-muted/50 text-muted-foreground cursor-not-allowed",
      iconBg: canInsert ? "bg-primary/20" : "bg-muted",
      disabled: !canInsert || !onPhotoCapture,
    },
    {
      id: "import",
      label: "Importar",
      icon: Upload,
      onClick: onImport || (() => {}),
      className: "bg-warning/10 text-warning hover:bg-warning/20 active:bg-warning/30",
      iconBg: "bg-warning/20",
      disabled: false,
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
        const Icon = action.disabled ? Lock : action.icon;
        return (
          <motion.button
            key={action.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, delay: index * 0.05 }}
            whileTap={{ scale: action.disabled ? 1 : 0.95 }}
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
