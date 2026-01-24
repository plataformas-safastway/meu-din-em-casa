import { cn } from "@/lib/utils";
import { PaymentMethod, TransactionClassification } from "@/types/finance";
import { expensePaymentMethods, incomePaymentMethods } from "@/data/categories";

interface PaymentMethodSelectorProps {
  value: PaymentMethod;
  onChange: (value: PaymentMethod) => void;
  classification: TransactionClassification;
}

export function PaymentMethodSelector({
  value,
  onChange,
  classification,
}: PaymentMethodSelectorProps) {
  // Determine available methods based on classification
  const isIncomeType = classification === 'income';
  const availableMethods = isIncomeType ? incomePaymentMethods : expensePaymentMethods;
  
  // Label based on classification
  const getLabel = () => {
    switch (classification) {
      case 'income':
        return 'Como recebeu?';
      case 'expense':
        return 'Como pagou?';
      case 'reimbursement':
        return 'Como recebeu o reembolso?';
      case 'transfer':
        return 'Meio da transferência';
      default:
        return 'Meio de pagamento';
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-base font-medium">{getLabel()}</label>
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
        {availableMethods.map((method) => (
          <button
            key={method.id}
            type="button"
            onClick={() => onChange(method.id as PaymentMethod)}
            className={cn(
              "flex items-center gap-2 py-3 px-4 rounded-full border-2 whitespace-nowrap transition-all min-h-[48px] active:scale-[0.97]",
              value === method.id
                ? "border-primary bg-primary/5 text-primary"
                : "border-border text-muted-foreground hover:border-primary/50"
            )}
          >
            <span className="text-lg">{method.icon}</span>
            <span className="text-sm font-medium">{method.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}