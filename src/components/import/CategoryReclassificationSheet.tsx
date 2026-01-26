import { useState, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Loader2, Check, ChevronRight, AlertTriangle, Sparkles } from "lucide-react";
import { defaultCategories } from "@/data/categories";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatters";

interface TransactionToReclassify {
  id: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  originalCategory: string;
  suggestedCategoryId: string;
  suggestedSubcategoryId?: string;
  confidence: number;
}

interface ReclassificationResult {
  transactionId: string;
  newCategoryId: string;
  newSubcategoryId?: string;
}

interface CategoryReclassificationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactions: TransactionToReclassify[];
  onConfirm: (results: ReclassificationResult[]) => void;
  loading?: boolean;
}

export function CategoryReclassificationSheet({
  open,
  onOpenChange,
  transactions,
  onConfirm,
  loading = false,
}: CategoryReclassificationSheetProps) {
  const [classifications, setClassifications] = useState<Map<string, ReclassificationResult>>(() => {
    // Initialize with suggestions
    const initial = new Map<string, ReclassificationResult>();
    transactions.forEach((tx) => {
      initial.set(tx.id, {
        transactionId: tx.id,
        newCategoryId: tx.suggestedCategoryId,
        newSubcategoryId: tx.suggestedSubcategoryId,
      });
    });
    return initial;
  });

  const categories = useMemo(() => ({
    income: defaultCategories.filter((c) => c.type === "income"),
    expense: defaultCategories.filter((c) => c.type === "expense"),
  }), []);

  const updateClassification = (txId: string, categoryId: string, subcategoryId?: string) => {
    setClassifications((prev) => {
      const next = new Map(prev);
      next.set(txId, {
        transactionId: txId,
        newCategoryId: categoryId,
        newSubcategoryId: subcategoryId,
      });
      return next;
    });
  };

  const handleConfirm = () => {
    onConfirm(Array.from(classifications.values()));
  };

  // Stats
  const highConfidenceCount = transactions.filter((tx) => tx.confidence >= 0.8).length;
  const confidencePercent = Math.round((highConfidenceCount / transactions.length) * 100);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl flex flex-col">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            Reclassificação assistida
          </SheetTitle>
          <SheetDescription>
            O OIK sugeriu categorias com base nas descrições. Revise e ajuste se necessário.
          </SheetDescription>
        </SheetHeader>

        {/* Progress */}
        <div className="py-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Confiança das sugestões</span>
            <span className="font-medium">{confidencePercent}%</span>
          </div>
          <Progress value={confidencePercent} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {highConfidenceCount} de {transactions.length} transações com alta confiança
          </p>
        </div>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-3 pb-4">
            {transactions.map((tx) => {
              const classification = classifications.get(tx.id);
              const selectedCategory = defaultCategories.find((c) => c.id === classification?.newCategoryId);
              const availableCategories = tx.type === "income" ? categories.income : categories.expense;
              const isLowConfidence = tx.confidence < 0.5;

              return (
                <div
                  key={tx.id}
                  className={cn(
                    "p-4 rounded-xl border space-y-3",
                    isLowConfidence ? "border-warning/50 bg-warning/5" : "border-border bg-card"
                  )}
                >
                  {/* Transaction Info */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{tx.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          Era: {tx.originalCategory}
                        </Badge>
                        {isLowConfidence && (
                          <Badge variant="outline" className="text-xs text-warning border-warning/50">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Revisar
                          </Badge>
                        )}
                      </div>
                    </div>
                    <span className={cn(
                      "font-semibold text-sm tabular-nums shrink-0",
                      tx.type === "income" ? "text-success" : "text-destructive"
                    )}>
                      {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount)}
                    </span>
                  </div>

                  {/* Category Selection */}
                  <div className="flex items-center gap-2">
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    
                    <Select
                      value={classification?.newCategoryId || ""}
                      onValueChange={(v) => updateClassification(tx.id, v)}
                    >
                      <SelectTrigger className="flex-1 h-10">
                        <SelectValue>
                          {selectedCategory ? (
                            <span className="flex items-center gap-2">
                              <span>{selectedCategory.icon}</span>
                              <span>{selectedCategory.name}</span>
                            </span>
                          ) : (
                            "Selecionar categoria"
                          )}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {availableCategories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            <span className="flex items-center gap-2">
                              <span>{cat.icon}</span>
                              <span>{cat.name}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    {/* Subcategory if available */}
                    {selectedCategory && selectedCategory.subcategories.length > 0 && (
                      <Select
                        value={classification?.newSubcategoryId || ""}
                        onValueChange={(v) => updateClassification(tx.id, classification!.newCategoryId, v)}
                      >
                        <SelectTrigger className="w-36 h-10">
                          <SelectValue placeholder="Subcategoria" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">Nenhuma</SelectItem>
                          {selectedCategory.subcategories.map((sub) => (
                            <SelectItem key={sub.id} value={sub.id}>
                              {sub.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <div className="pt-4 border-t border-border space-y-3">
          <Button
            className="w-full h-12"
            disabled={loading}
            onClick={handleConfirm}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Reclassificando...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Confirmar reclassificação
              </>
            )}
          </Button>
          
          <p className="text-center text-xs text-muted-foreground">
            O histórico original será preservado para auditoria
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
