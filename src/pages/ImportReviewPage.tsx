import { useState, useEffect } from "react";
import { ArrowLeft, Check, X, Edit2, Trash2, Loader2, AlertTriangle, ChevronDown, Save, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { defaultCategories, getCategoryById } from "@/data/categories";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
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

interface ImportReviewPageProps {
  importId: string;
  onBack: () => void;
  onComplete: () => void;
}

interface PendingTransaction {
  id: string;
  date: string;
  original_date: string | null;
  amount: number;
  type: 'income' | 'expense';
  description: string | null;
  category_id: string;
  subcategory_id: string | null;
  is_duplicate: boolean;
  duplicate_of: string | null;
}

interface ImportInfo {
  id: string;
  file_name: string;
  file_type: string;
  import_type: string;
  status: string;
  transactions_count: number | null;
  created_at: string;
}

export function ImportReviewPage({ importId, onBack, onComplete }: ImportReviewPageProps) {
  const [transactions, setTransactions] = useState<PendingTransaction[]>([]);
  const [importInfo, setImportInfo] = useState<ImportInfo | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTargetIds, setDeleteTargetIds] = useState<string[]>([]);
  const queryClient = useQueryClient();

  useEffect(() => {
    loadImportData();
  }, [importId]);

  const loadImportData = async () => {
    setLoading(true);
    try {
      // Load import info
      const { data: importData, error: importError } = await supabase
        .from('imports')
        .select('*')
        .eq('id', importId)
        .maybeSingle();

      if (importError || !importData) {
        toast.error("Importação não encontrada");
        onBack();
        return;
      }

      setImportInfo(importData as ImportInfo);

      // Load transactions from this import
      const { data: txData, error: txError } = await supabase
        .from('transactions')
        .select('id, date, original_date, amount, type, description, category_id, subcategory_id')
        .eq('import_id', importId)
        .order('date', { ascending: false });

      if (txError) throw txError;

      // Check for potential duplicates
      const transactionsWithDuplicates = await checkDuplicates(txData || []);
      setTransactions(transactionsWithDuplicates);

      // Pre-select non-duplicate transactions
      const nonDuplicateIds = new Set(
        transactionsWithDuplicates
          .filter(t => !t.is_duplicate)
          .map(t => t.id)
      );
      setSelectedIds(nonDuplicateIds);

    } catch (error) {
      console.error('Error loading import data:', error);
      toast.error("Erro ao carregar dados da importação");
    } finally {
      setLoading(false);
    }
  };

  const checkDuplicates = async (txList: any[]): Promise<PendingTransaction[]> => {
    // Get all transactions for the family (last 90 days) to check duplicates
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    
    const { data: existingTx } = await supabase
      .from('transactions')
      .select('id, date, amount, description, type')
      .gte('date', ninetyDaysAgo.toISOString().split('T')[0])
      .neq('import_id', importId);

    const existingSet = new Map<string, string>();
    (existingTx || []).forEach(tx => {
      // Create a hash for duplicate detection: date + amount + type
      const key = `${tx.date}|${tx.amount}|${tx.type}`;
      existingSet.set(key, tx.id);
    });

    return txList.map(tx => {
      const key = `${tx.date}|${tx.amount}|${tx.type}`;
      const duplicateId = existingSet.get(key);
      
      return {
        id: tx.id,
        date: tx.date,
        original_date: tx.original_date,
        amount: Number(tx.amount),
        type: tx.type as 'income' | 'expense',
        description: tx.description,
        category_id: tx.category_id,
        subcategory_id: tx.subcategory_id,
        is_duplicate: !!duplicateId,
        duplicate_of: duplicateId || null,
      };
    });
  };

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

  const updateCategory = async (transactionId: string, categoryId: string) => {
    try {
      const { error } = await supabase
        .from('transactions')
        .update({ category_id: categoryId, subcategory_id: null })
        .eq('id', transactionId);

      if (error) throw error;

      setTransactions(prev => 
        prev.map(t => t.id === transactionId 
          ? { ...t, category_id: categoryId, subcategory_id: null }
          : t
        )
      );
      setEditingId(null);
      toast.success("Categoria atualizada");
    } catch (error) {
      toast.error("Erro ao atualizar categoria");
    }
  };

  const handleDeleteClick = (ids: string[]) => {
    setDeleteTargetIds(ids);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    try {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .in('id', deleteTargetIds);

      if (error) throw error;

      setTransactions(prev => prev.filter(t => !deleteTargetIds.includes(t.id)));
      setSelectedIds(prev => {
        const newSet = new Set(prev);
        deleteTargetIds.forEach(id => newSet.delete(id));
        return newSet;
      });
      
      toast.success(`${deleteTargetIds.length} transação(ões) excluída(s)`);
    } catch (error) {
      toast.error("Erro ao excluir transações");
    } finally {
      setShowDeleteDialog(false);
      setDeleteTargetIds([]);
    }
  };

  const confirmImport = async () => {
    if (selectedIds.size === 0) {
      toast.error("Selecione pelo menos uma transação para confirmar");
      return;
    }

    setSaving(true);
    try {
      // Delete unselected transactions
      const unselectedIds = transactions
        .filter(t => !selectedIds.has(t.id))
        .map(t => t.id);

      if (unselectedIds.length > 0) {
        const { error: deleteError } = await supabase
          .from('transactions')
          .delete()
          .in('id', unselectedIds);

        if (deleteError) throw deleteError;
      }

      // Update import status to completed
      const { error: updateError } = await supabase
        .from('imports')
        .update({ 
          status: 'completed',
          transactions_count: selectedIds.size,
          processed_at: new Date().toISOString(),
        })
        .eq('id', importId);

      if (updateError) throw updateError;

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['finance-summary'] });

      toast.success(`${selectedIds.size} transações confirmadas!`);
      onComplete();
    } catch (error) {
      console.error('Error confirming import:', error);
      toast.error("Erro ao confirmar importação");
    } finally {
      setSaving(false);
    }
  };

  const cancelImport = async () => {
    setSaving(true);
    try {
      // Delete all transactions from this import
      const { error: deleteError } = await supabase
        .from('transactions')
        .delete()
        .eq('import_id', importId);

      if (deleteError) throw deleteError;

      // Update import status to cancelled
      const { error: updateError } = await supabase
        .from('imports')
        .update({ 
          status: 'cancelled',
          transactions_count: 0,
          processed_at: new Date().toISOString(),
        })
        .eq('id', importId);

      if (updateError) throw updateError;

      toast.info("Importação cancelada");
      onBack();
    } catch (error) {
      console.error('Error cancelling import:', error);
      toast.error("Erro ao cancelar importação");
    } finally {
      setSaving(false);
    }
  };

  const duplicateCount = transactions.filter(t => t.is_duplicate).length;
  const selectedCount = selectedIds.size;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="container px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-lg font-semibold">Revisar Importação</h1>
              <p className="text-xs text-muted-foreground">
                {importInfo?.file_name}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="flex gap-3 mt-4 overflow-x-auto pb-2">
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
                <p className="text-xs text-muted-foreground">Possíveis duplicatas</p>
                <p className="font-semibold text-warning">{duplicateCount}</p>
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="flex gap-2 mt-3">
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
        </div>
      </header>

      {/* Transaction List */}
      <main className="container px-4 py-4">
        {duplicateCount > 0 && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20 mb-4">
            <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-warning">
                {duplicateCount} transação(ões) podem ser duplicata(s)
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Transações com mesma data, valor e tipo já existentes. Revise antes de confirmar.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          {transactions.map((transaction) => {
            const category = getCategoryById(transaction.category_id);
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
                  transaction.is_duplicate && "border-warning/50"
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
                        {transaction.description || category?.name}
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
                          value={transaction.category_id}
                          onValueChange={(value) => updateCategory(transaction.id, value)}
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

                      {transaction.is_duplicate && (
                        <p className="text-xs text-warning mt-1 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Possível duplicata
                        </p>
                      )}
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

        {transactions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nenhuma transação para revisar.</p>
          </div>
        )}
      </main>

      {/* Fixed Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-lg border-t border-border">
        <div className="container flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={cancelImport}
            disabled={saving}
          >
            <X className="w-4 h-4 mr-2" />
            Cancelar tudo
          </Button>
          <Button
            className="flex-1"
            onClick={confirmImport}
            disabled={saving || selectedCount === 0}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Check className="w-4 h-4 mr-2" />
            )}
            Confirmar ({selectedCount})
          </Button>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir transação?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTargetIds.length === 1 
                ? "Esta ação não pode ser desfeita."
                : `${deleteTargetIds.length} transações serão excluídas. Esta ação não pode ser desfeita.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
