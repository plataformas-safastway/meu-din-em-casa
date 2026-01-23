import { cn } from "@/lib/utils";
import { ArrowDownCircle, ArrowUpCircle, ArrowLeftRight, RotateCcw, Settings2 } from "lucide-react";

export type TransactionClassification = 
  | 'income' 
  | 'expense' 
  | 'transfer' 
  | 'reimbursement' 
  | 'adjustment';

interface ClassificationOption {
  value: TransactionClassification;
  label: string;
  shortLabel: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  description: string;
}

const classificationOptions: ClassificationOption[] = [
  {
    value: 'income',
    label: 'Receita',
    shortLabel: 'Receita',
    icon: ArrowUpCircle,
    color: 'text-success',
    bgColor: 'bg-success/10',
    description: 'Dinheiro recebido (salário, vendas, etc.)',
  },
  {
    value: 'expense',
    label: 'Despesa',
    shortLabel: 'Despesa',
    icon: ArrowDownCircle,
    color: 'text-destructive',
    bgColor: 'bg-destructive/10',
    description: 'Dinheiro gasto (compras, contas, etc.)',
  },
  {
    value: 'reimbursement',
    label: 'Reembolso',
    shortLabel: 'Reemb.',
    icon: RotateCcw,
    color: 'text-warning',
    bgColor: 'bg-warning/10',
    description: 'Devolução de despesa anterior',
  },
  {
    value: 'transfer',
    label: 'Transferência',
    shortLabel: 'Transf.',
    icon: ArrowLeftRight,
    color: 'text-info',
    bgColor: 'bg-info/10',
    description: 'Movimentação entre contas (não entra no orçamento)',
  },
  {
    value: 'adjustment',
    label: 'Ajuste',
    shortLabel: 'Ajuste',
    icon: Settings2,
    color: 'text-muted-foreground',
    bgColor: 'bg-muted',
    description: 'Correção ou ajuste contábil',
  },
];

interface ClassificationSelectorProps {
  value: TransactionClassification;
  onChange: (classification: TransactionClassification) => void;
  direction: 'credit' | 'debit';
  compact?: boolean;
}

export function ClassificationSelector({ 
  value, 
  onChange, 
  direction,
  compact = false 
}: ClassificationSelectorProps) {
  // Filter options based on direction - suggest appropriate defaults
  // but allow all options for flexibility
  const sortedOptions = [...classificationOptions].sort((a, b) => {
    // Prioritize contextual options
    if (direction === 'credit') {
      // For credits, prioritize: income, reimbursement, transfer, adjustment, expense
      const order = { income: 0, reimbursement: 1, transfer: 2, adjustment: 3, expense: 4 };
      return order[a.value] - order[b.value];
    } else {
      // For debits, prioritize: expense, transfer, adjustment, reimbursement, income
      const order = { expense: 0, transfer: 1, adjustment: 2, reimbursement: 3, income: 4 };
      return order[a.value] - order[b.value];
    }
  });

  if (compact) {
    return (
      <div className="flex gap-1 flex-wrap">
        {sortedOptions.map((option) => {
          const Icon = option.icon;
          const isSelected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all",
                isSelected 
                  ? `${option.bgColor} ${option.color} ring-1 ring-current` 
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
            >
              <Icon className="w-3 h-3" />
              <span>{option.shortLabel}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Classificação</p>
      <div className="grid grid-cols-3 gap-2">
        {sortedOptions.slice(0, 3).map((option) => {
          const Icon = option.icon;
          const isSelected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={cn(
                "flex flex-col items-center gap-1 p-2 rounded-lg text-xs font-medium transition-all",
                isSelected 
                  ? `${option.bgColor} ${option.color} ring-2 ring-current` 
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{option.shortLabel}</span>
            </button>
          );
        })}
      </div>
      <div className="grid grid-cols-2 gap-2">
        {sortedOptions.slice(3).map((option) => {
          const Icon = option.icon;
          const isSelected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              className={cn(
                "flex items-center justify-center gap-1 p-2 rounded-lg text-xs font-medium transition-all",
                isSelected 
                  ? `${option.bgColor} ${option.color} ring-2 ring-current` 
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
            >
              <Icon className="w-4 h-4" />
              <span>{option.shortLabel}</span>
            </button>
          );
        })}
      </div>
      
      {/* Microcopy for reimbursement */}
      {value === 'reimbursement' && (
        <p className="text-xs text-warning bg-warning/10 px-2 py-1.5 rounded-md">
          💡 Reembolso entra na categoria para ajustar o realizado.
        </p>
      )}
      
      {value === 'transfer' && (
        <p className="text-xs text-info bg-info/10 px-2 py-1.5 rounded-md">
          ↔️ Transferências não entram no orçamento (receitas/despesas).
        </p>
      )}
    </div>
  );
}

export { classificationOptions };
export type { ClassificationOption };
