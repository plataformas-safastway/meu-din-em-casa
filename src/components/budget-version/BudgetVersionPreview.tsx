import { motion } from "framer-motion";
import { Check, AlertTriangle, TrendingUp, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/formatters";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { getCategoryById } from "@/data/categories";
import { cn } from "@/lib/utils";

interface BudgetItem {
  category_id: string;
  subcategory_id?: string | null;
  suggested_amount: number;
  confidence?: number | null;
  rationale?: string | null;
}

interface BudgetVersionPreviewProps {
  items: BudgetItem[];
  effectiveMonth: string;
  sourceType: "onboarding_only" | "transactions_based";
  onConfirm: () => void;
  onBack: () => void;
  isLoading?: boolean;
}

export function BudgetVersionPreview({
  items,
  effectiveMonth,
  sourceType,
  onConfirm,
  onBack,
  isLoading = false,
}: BudgetVersionPreviewProps) {
  const totalBudget = items.reduce((sum, item) => sum + item.suggested_amount, 0);
  
  // Group items by category
  const groupedItems = items.reduce((acc, item) => {
    const key = item.category_id;
    if (!acc[key]) {
      acc[key] = {
        category_id: key,
        total: 0,
        items: [],
      };
    }
    acc[key].total += item.suggested_amount;
    acc[key].items.push(item);
    return acc;
  }, {} as Record<string, { category_id: string; total: number; items: BudgetItem[] }>);

  const sortedCategories = Object.values(groupedItems).sort((a, b) => b.total - a.total);

  const effectiveDate = parse(effectiveMonth, "yyyy-MM", new Date());
  const formattedMonth = format(effectiveDate, "MMMM 'de' yyyy", { locale: ptBR });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 pb-8"
    >
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold">Prévia do Orçamento Sugerido</h2>
        <p className="text-sm text-muted-foreground">
          {sourceType === "transactions_based" 
            ? "Baseado nos seus gastos reais + diagnóstico"
            : "Baseado no seu perfil financeiro"}
        </p>
      </div>

      {/* Effective Month Card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4 flex items-center gap-3">
          <Calendar className="w-10 h-10 text-primary" />
          <div>
            <p className="text-sm text-muted-foreground">Vigência a partir de</p>
            <p className="font-semibold text-lg capitalize">{formattedMonth}</p>
          </div>
        </CardContent>
      </Card>

      {/* Total Summary */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Orçamento Total</span>
            <span className="text-2xl font-bold text-primary">
              {formatCurrency(totalBudget)}
            </span>
          </div>
          <Separator className="my-3" />
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="w-4 h-4 text-success" />
            <span>{sortedCategories.length} categorias com orçamento definido</span>
          </div>
        </CardContent>
      </Card>

      {/* Category Breakdown */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground px-1">
          Distribuição por categoria
        </h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {sortedCategories.map((group, idx) => {
            const category = getCategoryById(group.category_id);
            const percentage = (group.total / totalBudget) * 100;
            
            return (
              <motion.div
                key={group.category_id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{category?.icon || "📦"}</span>
                  <div>
                    <p className="font-medium text-sm">{category?.name || group.category_id}</p>
                    <p className="text-xs text-muted-foreground">
                      {percentage.toFixed(1)}% do total
                    </p>
                  </div>
                </div>
                <span className="font-semibold">{formatCurrency(group.total)}</span>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Warning about past months */}
      <Card className="bg-warning/5 border-warning/20">
        <CardContent className="p-4 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-warning">Importante</p>
            <p className="text-muted-foreground mt-1">
              Orçamentos anteriores não serão alterados. Esta versão será aplicada 
              apenas a partir de <strong className="text-foreground capitalize">{formattedMonth}</strong>.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button 
          variant="outline" 
          onClick={onBack}
          disabled={isLoading}
          className="flex-1"
        >
          Voltar
        </Button>
        <Button 
          onClick={onConfirm}
          disabled={isLoading}
          className="flex-1 gap-2"
        >
          {isLoading ? (
            "Salvando..."
          ) : (
            <>
              <Check className="w-4 h-4" />
              Confirmar orçamento
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}
