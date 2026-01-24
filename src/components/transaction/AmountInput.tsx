import { forwardRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { TransactionClassification } from "@/types/finance";

interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
  classification?: TransactionClassification;
  className?: string;
  autoFocus?: boolean;
}

export const AmountInput = forwardRef<HTMLInputElement, AmountInputProps>(
  ({ value, onChange, classification = 'expense', className, autoFocus }, ref) => {
    const formatAmount = (inputValue: string) => {
      const cleaned = inputValue.replace(/[^\d,]/g, "");
      onChange(cleaned);
    };

    // Color based on classification
    const getIndicatorColor = () => {
      switch (classification) {
        case 'income':
          return 'text-success';
        case 'expense':
          return 'text-destructive';
        case 'reimbursement':
          return 'text-info';
        case 'transfer':
          return 'text-muted-foreground';
        default:
          return 'text-muted-foreground';
      }
    };

    return (
      <div className="space-y-2">
        <label className="text-base font-medium">Valor</label>
        <div className="relative">
          <span className={cn(
            "absolute left-4 top-1/2 -translate-y-1/2 text-xl font-semibold transition-colors",
            getIndicatorColor()
          )}>
            R$
          </span>
          <Input
            ref={ref}
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            value={value}
            onChange={(e) => formatAmount(e.target.value)}
            className={cn(
              "pl-14 text-3xl font-bold h-16 text-center rounded-xl border-2 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:border-primary",
              className
            )}
            required
            autoComplete="off"
            autoFocus={autoFocus}
          />
        </div>
      </div>
    );
  }
);

AmountInput.displayName = "AmountInput";