import { cn } from "@/lib/utils";

export type TransactionClassification = 
  | "income" 
  | "expense" 
  | "transfer" 
  | "reimbursement" 
  | "adjustment";

export interface ClassificationSelectorProps {
  value: TransactionClassification;
  onChange: (classification: TransactionClassification) => void;
  direction?: "credit" | "debit";
  disabled?: boolean;
}

const CLASSIFICATION_OPTIONS = [
  { 
    value: "income" as const, 
    label: "Receita", 
    shortLabel: "Rec",
    description: "Entrada de dinheiro",
    color: "bg-success/15 text-success border-success/30",
    activeColor: "bg-success text-success-foreground border-success",
  },
  { 
    value: "expense" as const, 
    label: "Despesa", 
    shortLabel: "Desp",
    description: "Saída de dinheiro",
    color: "bg-destructive/15 text-destructive border-destructive/30",
    activeColor: "bg-destructive text-destructive-foreground border-destructive",
  },
  { 
    value: "reimbursement" as const, 
    label: "Reembolso", 
    shortLabel: "Reemb",
    description: "Devolução de despesa",
    color: "bg-blue-500/15 text-blue-600 border-blue-500/30",
    activeColor: "bg-blue-500 text-white border-blue-500",
  },
  { 
    value: "transfer" as const, 
    label: "Transf.", 
    shortLabel: "Transf",
    description: "Movimentação entre contas",
    color: "bg-muted/50 text-muted-foreground border-border",
    activeColor: "bg-muted text-foreground border-border",
  },
  { 
    value: "adjustment" as const, 
    label: "Ajuste", 
    shortLabel: "Ajuste",
    description: "Correção de valores",
    color: "bg-orange-500/15 text-orange-600 border-orange-500/30",
    activeColor: "bg-orange-500 text-white border-orange-500",
  },
];

export function ClassificationSelector({
  value,
  onChange,
  direction,
  disabled = false,
}: ClassificationSelectorProps) {
  return (
    <div className="flex flex-wrap gap-1">
      {CLASSIFICATION_OPTIONS.map((option) => {
        const isActive = value === option.value;
        
        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "px-2 py-1 text-xs rounded-full border transition-all",
              "touch-manipulation min-h-[32px] min-w-[56px]",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              isActive ? option.activeColor : option.color,
              !isActive && "hover:opacity-80"
            )}
            title={option.description}
          >
            {option.shortLabel}
          </button>
        );
      })}
    </div>
  );
}

export function getClassificationLabel(classification: TransactionClassification): string {
  return CLASSIFICATION_OPTIONS.find(o => o.value === classification)?.label || classification;
}

export function getClassificationColor(classification: TransactionClassification): string {
  return CLASSIFICATION_OPTIONS.find(o => o.value === classification)?.color || "";
}
