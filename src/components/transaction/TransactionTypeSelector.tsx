import { ArrowUpCircle, ArrowDownCircle, RefreshCw, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { TransactionClassification } from "@/types/finance";

interface TransactionTypeSelectorProps {
  value: TransactionClassification;
  onChange: (value: TransactionClassification) => void;
  showAdvanced?: boolean;
}

const mainTypes = [
  {
    id: 'income' as const,
    label: 'Receita',
    icon: ArrowUpCircle,
    activeClass: 'bg-success text-success-foreground shadow-md',
    description: 'Entrada de dinheiro',
  },
  {
    id: 'expense' as const,
    label: 'Despesa',
    icon: ArrowDownCircle,
    activeClass: 'bg-destructive text-destructive-foreground shadow-md',
    description: 'Saída de dinheiro',
  },
];

const advancedTypes = [
  {
    id: 'reimbursement' as const,
    label: 'Reembolso',
    icon: RotateCcw,
    activeClass: 'bg-info text-info-foreground shadow-md',
    description: 'Reduz despesa na categoria',
  },
  {
    id: 'transfer' as const,
    label: 'Transferência',
    icon: RefreshCw,
    activeClass: 'bg-muted text-foreground shadow-md',
    description: 'Entre contas próprias',
  },
];

export function TransactionTypeSelector({
  value,
  onChange,
  showAdvanced = true,
}: TransactionTypeSelectorProps) {
  return (
    <div className="space-y-3 animate-fade-in">
      {/* Main types - 2 columns */}
      <div className="grid grid-cols-2 gap-3 p-1.5 bg-muted/50 rounded-2xl">
        {mainTypes.map((type) => {
          const Icon = type.icon;
          const isActive = value === type.id;
          
          return (
            <button
              key={type.id}
              type="button"
              onClick={() => onChange(type.id)}
              className={cn(
                "flex items-center justify-center gap-2 py-4 rounded-xl font-semibold transition-all min-h-[56px] text-base",
                isActive
                  ? type.activeClass
                  : "text-muted-foreground hover:text-foreground active:bg-muted/80"
              )}
            >
              <Icon className="w-6 h-6" />
              {type.label}
            </button>
          );
        })}
      </div>

      {/* Advanced types - horizontal scroll */}
      {showAdvanced && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          {advancedTypes.map((type) => {
            const Icon = type.icon;
            const isActive = value === type.id;
            
            return (
              <button
                key={type.id}
                type="button"
                onClick={() => onChange(type.id)}
                className={cn(
                  "flex items-center gap-2 py-2.5 px-4 rounded-full border-2 whitespace-nowrap transition-all min-h-[44px] active:scale-[0.97] text-sm",
                  isActive
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/50"
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="font-medium">{type.label}</span>
              </button>
            );
          })}
        </div>
      )}
      
      {/* Hint text based on selection */}
      {value === 'transfer' && (
        <p className="text-xs text-muted-foreground text-center bg-muted/30 py-2 px-3 rounded-lg">
          💡 Transferências não entram no cálculo do orçamento
        </p>
      )}
      {value === 'reimbursement' && (
        <p className="text-xs text-muted-foreground text-center bg-muted/30 py-2 px-3 rounded-lg">
          💡 Reembolsos reduzem os gastos na categoria escolhida
        </p>
      )}
    </div>
  );
}