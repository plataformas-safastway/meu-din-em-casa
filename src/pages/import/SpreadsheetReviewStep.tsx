import { useState, memo, useCallback } from "react";
import { Trash2, Edit2, Check, X, Loader2, AlertTriangle, TrendingUp, TrendingDown, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ParsedTransaction } from "@/hooks/useSpreadsheetImport";
import { defaultCategories, getCategoryById, getCategoryIcon } from "@/data/categories";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface SpreadsheetReviewStepProps {
  transactions: ParsedTransaction[];
  summary: {
    total: number;
    valid: number;
    errors: number;
    income: number;
    expense: number;
    balance: number;
  };
  onUpdateTransaction: (id: string, updates: Partial<ParsedTransaction>) => void;
  onRemoveTransaction: (id: string) => void;
  onImport: () => void;
  importing: boolean;
}

interface TransactionRowProps {
  transaction: ParsedTransaction;
  onUpdate: (id: string, updates: Partial<ParsedTransaction>) => void;
  onRemove: (id: string) => void;
}

const TransactionRow = memo(function TransactionRow({
  transaction,
  onUpdate,
  onRemove,
}: TransactionRowProps) {
  const [editing, setEditing] = useState(false);
  const [editValues, setEditValues] = useState({
    description: transaction.description,
    category_id: transaction.category_id,
    type: transaction.type,
  });

  const category = getCategoryById(transaction.category_id);
  const categories = transaction.type === "income"
    ? defaultCategories.filter((c) => c.type === "income")
    : defaultCategories.filter((c) => c.type === "expense");

  const handleSave = useCallback(() => {
    onUpdate(transaction.id, editValues);
    setEditing(false);
  }, [transaction.id, editValues, onUpdate]);

  const handleCancel = useCallback(() => {
    setEditValues({
      description: transaction.description,
      category_id: transaction.category_id,
      type: transaction.type,
    });
    setEditing(false);
  }, [transaction]);

  if (editing) {
    return (
      <div className="p-3 bg-muted/30 rounded-lg space-y-3 border border-primary/30">
        <Input
          value={editValues.description}
          onChange={(e) => setEditValues((prev) => ({ ...prev, description: e.target.value }))}
          placeholder="Descrição"
          className="h-10"
        />
        <div className="grid grid-cols-2 gap-2">
          <Select
            value={editValues.type}
            onValueChange={(v) => setEditValues((prev) => ({
              ...prev,
              type: v as "income" | "expense",
              category_id: v === "income" ? "rendas" : "desconhecidas",
            }))}
          >
            <SelectTrigger className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="income">Receita</SelectItem>
              <SelectItem value="expense">Despesa</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={editValues.category_id}
            onValueChange={(v) => setEditValues((prev) => ({ ...prev, category_id: v }))}
          >
            <SelectTrigger className="h-10">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleCancel} className="flex-1">
            <X className="w-4 h-4 mr-1" /> Cancelar
          </Button>
          <Button size="sm" onClick={handleSave} className="flex-1">
            <Check className="w-4 h-4 mr-1" /> Salvar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "p-3 rounded-lg border transition-colors",
        transaction.has_error
          ? "border-destructive/50 bg-destructive/5"
          : "border-border bg-card"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
            transaction.type === "income" ? "bg-success/10" : "bg-destructive/10"
          )}
        >
          {transaction.type === "income" ? (
            <TrendingUp className="w-5 h-5 text-success" />
          ) : (
            <TrendingDown className="w-5 h-5 text-destructive" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{transaction.description || "(sem descrição)"}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">{transaction.date || "Data inválida"}</span>
            {category && (
              <Badge variant="secondary" className="text-xs">
                {category.icon} {category.name}
              </Badge>
            )}
          </div>
          {transaction.has_error && (
            <p className="text-xs text-destructive mt-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              {transaction.error_message}
            </p>
          )}
        </div>

        <div className="text-right shrink-0">
          <p
            className={cn(
              "font-semibold tabular-nums",
              transaction.type === "income" ? "text-success" : "text-destructive"
            )}
          >
            {transaction.type === "income" ? "+" : "-"}
            {formatCurrency(transaction.amount)}
          </p>
        </div>

        <div className="flex gap-1 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setEditing(true)}
          >
            <Edit2 className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => onRemove(transaction.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
});

export function SpreadsheetReviewStep({
  transactions,
  summary,
  onUpdateTransaction,
  onRemoveTransaction,
  onImport,
  importing,
}: SpreadsheetReviewStepProps) {
  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-xl bg-muted/50 text-center">
          <p className="text-2xl font-bold">{summary.total}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
        <div className="p-3 rounded-xl bg-success/10 text-center">
          <p className="text-2xl font-bold text-success">{formatCurrency(summary.income)}</p>
          <p className="text-xs text-muted-foreground">Receitas</p>
        </div>
        <div className="p-3 rounded-xl bg-destructive/10 text-center">
          <p className="text-2xl font-bold text-destructive">{formatCurrency(summary.expense)}</p>
          <p className="text-xs text-muted-foreground">Despesas</p>
        </div>
      </div>

      {/* Balance */}
      <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-primary" />
          <span className="font-medium">Saldo resultante</span>
        </div>
        <span className={cn("font-bold text-lg", summary.balance >= 0 ? "text-success" : "text-destructive")}>
          {formatCurrency(summary.balance)}
        </span>
      </div>

      {/* Errors Warning */}
      {summary.errors > 0 && (
        <div className="p-3 rounded-lg bg-warning/10 border border-warning/20 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium">
              {summary.errors} lançamento{summary.errors > 1 ? "s" : ""} com erro
            </p>
            <p className="text-xs text-muted-foreground">
              Corrija ou remova antes de importar
            </p>
          </div>
        </div>
      )}

      {/* Transaction List */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Lançamentos ({transactions.length})</p>
        <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1">
          {transactions.map((tx) => (
            <TransactionRow
              key={tx.id}
              transaction={tx}
              onUpdate={onUpdateTransaction}
              onRemove={onRemoveTransaction}
            />
          ))}
        </div>
      </div>

      {/* Import Button */}
      <Button
        className="w-full h-12"
        disabled={summary.valid === 0 || importing}
        onClick={onImport}
      >
        {importing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Importando...
          </>
        ) : (
          <>
            <Check className="w-4 h-4 mr-2" />
            Importar {summary.valid} lançamento{summary.valid > 1 ? "s" : ""}
          </>
        )}
      </Button>

      {/* Privacy Note */}
      <p className="text-center text-xs text-muted-foreground">
        🔒 Seus dados são privados e não são compartilhados
      </p>
    </div>
  );
}
