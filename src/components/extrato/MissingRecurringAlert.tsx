import { useState } from "react";
import { AlertTriangle, Check, X, PlusCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  MissingRecurringExpense,
  useConfirmRecurringExpense,
  ConfirmationType 
} from "@/hooks/useMissingRecurringExpenses";
import { getCategoryById, getSubcategoryById } from "@/data/categories";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface MissingRecurringAlertProps {
  missingExpenses: MissingRecurringExpense[];
  onRegisterPayment: (expense: MissingRecurringExpense) => void;
}

export function MissingRecurringAlert({ 
  missingExpenses,
  onRegisterPayment 
}: MissingRecurringAlertProps) {
  const [expanded, setExpanded] = useState(true);
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const confirmMutation = useConfirmRecurringExpense();

  if (missingExpenses.length === 0) return null;

  const handleConfirm = async (
    expense: MissingRecurringExpense, 
    type: ConfirmationType
  ) => {
    const id = `${expense.categoryId}|${expense.subcategoryId || ""}`;
    setProcessingIds(prev => new Set(prev).add(id));

    try {
      await confirmMutation.mutateAsync({
        categoryId: expense.categoryId,
        subcategoryId: expense.subcategoryId,
        monthRef: expense.monthRef,
        confirmationType: type,
      });

      if (type === "no_payment") {
        toast.success("Confirmado: não houve pagamento neste mês");
      } else if (type === "ignored") {
        toast.info("Este alerta não será exibido novamente para este mês");
      }
    } catch (error) {
      toast.error("Erro ao registrar confirmação");
    } finally {
      setProcessingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  // Enrich with category names
  const enrichedExpenses = missingExpenses.map(expense => {
    const category = getCategoryById(expense.categoryId);
    const subcategory = expense.subcategoryId 
      ? getSubcategoryById(expense.categoryId, expense.subcategoryId)
      : null;
    
    return {
      ...expense,
      categoryName: category?.name || expense.categoryId,
      subcategoryName: subcategory?.name || null,
      categoryIcon: category?.icon || "📦",
      categoryColor: category?.color || "#888",
    };
  });

  // Filter out already confirmed ones
  const pendingExpenses = enrichedExpenses.filter(
    e => e.confirmationStatus === "none"
  );

  if (pendingExpenses.length === 0) return null;

  return (
    <Card className="border-warning/50 bg-warning/5">
      <CardContent className="p-4">
        {/* Header */}
        <button 
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-warning/20 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-warning" />
            </div>
            <div className="text-left">
              <p className="font-medium text-foreground">
                {pendingExpenses.length === 1 
                  ? "Despesa recorrente não registrada"
                  : `${pendingExpenses.length} despesas recorrentes não registradas`}
              </p>
              <p className="text-sm text-muted-foreground">
                Identificamos despesas que costumam aparecer todo mês
              </p>
            </div>
          </div>
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          )}
        </button>

        {/* Expandable content */}
        {expanded && (
          <div className="mt-4 space-y-3">
            {pendingExpenses.map((expense) => {
              const id = `${expense.categoryId}|${expense.subcategoryId || ""}`;
              const isProcessing = processingIds.has(id);

              return (
                <div 
                  key={id}
                  className="p-3 rounded-xl bg-card border border-border/50"
                >
                  <div className="flex items-start gap-3">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                      style={{ backgroundColor: `${expense.categoryColor}20` }}
                    >
                      {expense.categoryIcon}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-foreground">
                        {expense.subcategoryName || expense.categoryName}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {expense.subcategoryName && `${expense.categoryName} • `}
                        Média: {formatCurrency(expense.averageAmount)}
                      </p>
                      <p className="text-xs text-warning mt-1">
                        Percebemos que esta despesa não apareceu neste mês. Você confirma que não houve esse pagamento?
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs"
                      disabled={isProcessing}
                      onClick={() => handleConfirm(expense, "no_payment")}
                    >
                      <Check className="w-3.5 h-3.5 mr-1" />
                      Não houve
                    </Button>
                    <Button
                      size="sm"
                      variant="default"
                      className="flex-1 text-xs"
                      disabled={isProcessing}
                      onClick={() => onRegisterPayment(expense)}
                    >
                      <PlusCircle className="w-3.5 h-3.5 mr-1" />
                      Registrar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs text-muted-foreground"
                      disabled={isProcessing}
                      onClick={() => handleConfirm(expense, "ignored")}
                    >
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
