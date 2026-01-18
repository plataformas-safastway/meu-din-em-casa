import { useState, useMemo } from "react";
import { Check, X, Edit2, Trash2, Loader2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { defaultCategories, getCategoryById } from "@/data/categories";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { 
  usePendingTransactions, 
  useConfirmImport, 
  useCancelImport,
  useUpdatePendingTransaction,
  useDeletePendingTransactions
} from "@/hooks/useImport";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ImportReviewStepProps {
  importId: string;
  onComplete: (data: { importedCount: number; skippedCount: number }) => void;
  onCancel: () => void;
}

export function ImportReviewStep({ importId, onComplete, onCancel }: ImportReviewStepProps) {
  const { data: transactions = [], isLoading } = usePendingTransactions(importId);
  const confirmImport = useConfirmImport();
  const cancelImport = useCancelImport();
  const updateTransaction = useUpdatePendingTransaction();
  const deleteTransactions = useDeletePendingTransactions();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [categoryUpdates, setCategoryUpdates] = useState<Record<string, { categoryId: string; subcategoryId: string | null }>>({});
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTargetIds, setDeleteTargetIds] = useState<string[]>([]);

  // Initialize selected IDs when transactions load
  useMemo(() => {
    if (transactions.length > 0 && selectedIds.size === 0) {
      const nonDuplicateIds = new Set(
        transactions.filter(t => !t.is_duplicate).map(t => t.id)
      );
      setSelectedIds(nonDuplicateIds);
    }
  }, [transactions]);

  const duplicateCount = transactions.filter(t => t.is_duplicate).length;
  const selectedCount = selectedIds.size;
  const needsReviewCount = transactions.filter(t => t.needs_review).length;

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    setSelectedIds(new Set(transactions.map(t => t.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const selectNonDuplicates = () => {
    setSelectedIds(new Set(transactions.filter(t => !t.is_duplicate).map(t => t.id)));
  };

  const handleCategoryChange = (transactionId: string, categoryId: string) => {
    setCategoryUpdates(prev => ({
      ...prev,
      [transactionId]: { categoryId, subcategoryId: null }
    }));
    updateTransaction.mutate({ id: transactionId, categoryId, subcategoryId: null });
    setEditingId(null);
  };

  const handleDeleteClick = (ids: string[]) => {
    setDeleteTargetIds(ids);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    deleteTransactions.mutate(deleteTargetIds, {
      onSuccess: () => {
        setSelectedIds(prev => {
          const newSet = new Set(prev);
          deleteTargetIds.forEach(id => newSet.delete(id));
          return newSet;
        });
      }
    });
    setShowDeleteDialog(false);
    setDeleteTargetIds([]);
  };

  const handleConfirm = () => {
    if (selectedIds.size === 0) {
      return;
    }

    confirmImport.mutate(
      { 
        importId, 
        selectedIds: Array.from(selectedIds),
        categoryUpdates 
      },
      {
        onSuccess: (data) => {
          onComplete({
            importedCount: data.count,
            skippedCount: transactions.length - data.count,
          });
        }
      }
    );
  };

  const handleCancel = () => {
    setShowCancelDialog(true);
  };

  const confirmCancel = () => {
    cancelImport.mutate(importId, {
      onSuccess: () => {
        onCancel();
      }
    });
    setShowCancelDialog(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Nenhuma transação encontrada neste arquivo.</p>
        <Button variant="outline" onClick={onCancel} className="mt-4">
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        <div className="flex-shrink-0 px-3 py-2 rounded-lg bg-muted">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="font-semibold">{transactions.length}</p>
        </div>
        <div className="flex-shrink-0 px-3 py-2 rounded-lg bg-primary/10">
          <p className="text-xs text-muted-foreground">Selecionados</p>
          <p className="font-semibold text-primary">{selectedCount}</p>
        </div>
        {duplicateCount > 0 && (
          <div className="flex-shrink-0 px-3 py-2 rounded-lg bg-warning/10">
            <p className="text-xs text-muted-foreground">Duplicatas</p>
            <p className="font-semibold text-warning">{duplicateCount}</p>
          </div>
        )}
        {needsReviewCount > 0 && (
          <div className="flex-shrink-0 px-3 py-2 rounded-lg bg-orange-500/10">
            <p className="text-xs text-muted-foreground">Revisar</p>
            <p className="font-semibold text-orange-500">{needsReviewCount}</p>
          </div>
        )}
      </div>

      {/* Quick actions */}
      <div className="flex gap-2 flex-wrap">
        <Button variant="outline" size="sm" onClick={selectAll}>
          Selecionar todos
        </Button>
        <Button variant="outline" size="sm" onClick={deselectAll}>
          Limpar seleção
        </Button>
        {duplicateCount > 0 && (
          <Button variant="outline" size="sm" onClick={selectNonDuplicates}>
            Ignorar duplicatas
          </Button>
        )}
      </div>

      {/* Duplicate Warning */}
      {duplicateCount > 0 && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
          <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-warning">
              {duplicateCount} transação(ões) podem já existir
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Elas não estão selecionadas por padrão. Revise antes de confirmar.
            </p>
          </div>
        </div>
      )}

      {/* Transaction List */}
      <div className="space-y-2">
        {transactions.map((transaction) => {
          const effectiveCategoryId = categoryUpdates[transaction.id]?.categoryId || transaction.category_id;
          const category = getCategoryById(effectiveCategoryId);
          const isSelected = selectedIds.has(transaction.id);
          const isEditing = editingId === transaction.id;
          const isExpense = transaction.type === 'expense';

          return (
            <div
              key={transaction.id}
              className={cn(
                "flex items-start gap-3 p-3 rounded-xl border transition-all",
                isSelected 
                  ? "bg-primary/5 border-primary/30" 
                  : "bg-card border-border/30",
                transaction.is_duplicate && "border-warning/50",
                transaction.needs_review && !transaction.is_duplicate && "border-orange-500/50"
              )}
            >
              <Checkbox
                checked={isSelected}
                onCheckedChange={() => toggleSelect(transaction.id)}
                className="mt-1"
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-start gap-2">
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
                    style={{ backgroundColor: `${category?.color}20` }}
                  >
                    {category?.icon || "📦"}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">
                      {transaction.description || category?.name || 'Transação'}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatDate(transaction.date)}</span>
                      {transaction.original_date && transaction.original_date !== transaction.date && (
                        <span className="text-primary">
                          (compra: {formatDate(transaction.original_date)})
                        </span>
                      )}
                    </div>

                    {/* Category selector */}
                    {isEditing ? (
                      <Select
                        value={effectiveCategoryId}
                        onValueChange={(value) => handleCategoryChange(transaction.id, value)}
                      >
                        <SelectTrigger className="h-8 mt-2 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {defaultCategories
                            .filter(c => c.type === transaction.type)
                            .map(cat => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.icon} {cat.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <button
                        onClick={() => setEditingId(transaction.id)}
                        className="flex items-center gap-1 mt-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <span 
                          className="px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: `${category?.color}20` }}
                        >
                          {category?.icon} {category?.name}
                        </span>
                        <Edit2 className="w-3 h-3" />
                      </button>
                    )}

                    {/* Status badges */}
                    <div className="flex gap-1 mt-1">
                      {transaction.is_duplicate && (
                        <span className="text-xs text-warning flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Possível duplicata
                        </span>
                      )}
                      {transaction.needs_review && !transaction.is_duplicate && (
                        <span className="text-xs text-orange-500 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Revisar
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={cn(
                  "font-semibold text-sm whitespace-nowrap",
                  isExpense ? "text-destructive" : "text-success"
                )}>
                  {isExpense ? "-" : "+"}{formatCurrency(transaction.amount)}
                </span>
                
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDeleteClick([transaction.id])}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Fixed Bottom Actions */}
      <div className="fixed bottom-20 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t border-border">
        <div className="container max-w-lg mx-auto flex gap-3">
          <Button 
            variant="outline" 
            onClick={handleCancel}
            disabled={confirmImport.isPending || cancelImport.isPending}
            className="flex-1"
          >
            Cancelar tudo
          </Button>
          <Button 
            onClick={handleConfirm}
            disabled={selectedIds.size === 0 || confirmImport.isPending}
            className="flex-1"
          >
            {confirmImport.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4 mr-2" />
            )}
            Confirmar ({selectedCount})
          </Button>
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar importação?</AlertDialogTitle>
            <AlertDialogDescription>
              Todas as transações processadas serão descartadas. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmCancel}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cancelar importação
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover transação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta transação será removida da importação.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
