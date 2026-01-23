import { Clock, PieChart, Target, TrendingUp, BookOpen, Settings, Wallet, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface HomeShortcutsProps {
  onNavigate: (tab: string) => void;
}

const shortcuts = [
  { id: "transactions", label: "Extrato", icon: Clock, className: "bg-info/10 text-info" },
  { id: "categories", label: "Categorias", icon: PieChart, className: "bg-primary/10 text-primary" },
  { id: "objectives", label: "Metas", icon: Target, className: "bg-success/10 text-success" },
  { id: "projection", label: "Projeção", icon: TrendingUp, className: "bg-warning/10 text-warning" },
  { id: "goals", label: "Orçamentos", icon: Wallet, className: "bg-secondary/10 text-secondary-foreground" },
  { id: "education", label: "Educação", icon: BookOpen, className: "bg-accent/10 text-accent-foreground" },
  { id: "help", label: "Ajuda", icon: HelpCircle, className: "bg-muted text-muted-foreground" },
  { id: "settings", label: "Config", icon: Settings, className: "bg-muted text-muted-foreground" },
];

export function HomeShortcuts({ onNavigate }: HomeShortcutsProps) {
  return (
    <div className="grid grid-cols-4 gap-2 animate-fade-in">
      {shortcuts.map((shortcut) => {
        const Icon = shortcut.icon;
        return (
          <button
            key={shortcut.id}
            onClick={() => onNavigate(shortcut.id)}
            className={cn(
              "flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl transition-all duration-200 active:scale-95 min-h-[72px]",
              shortcut.className
            )}
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] font-medium leading-tight text-center">{shortcut.label}</span>
          </button>
        );
      })}
    </div>
  );
}
