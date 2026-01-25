import { useState, useMemo, useCallback, useEffect } from "react";
import { ArrowLeft, Search, Loader2, Filter, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getCategoryById } from "@/data/categories";
import { cn } from "@/lib/utils";
import { useDeleteTransaction } from "@/hooks/useTransactions";
import { 
  useTransactionsPaginated, 
  flattenPaginatedTransactions,
  useBulkDeleteTransactions,
} from "@/hooks/useTransactionsPaginated";
import { EditTransactionSheet } from "@/components/EditTransactionSheet";
import { TransactionDetailSheet, TransactionDetail } from "@/components/TransactionDetailSheet";
import { 
  TransactionFiltersSheet, 
  defaultFilters, 
  TransactionFilters,
  BulkActionsBar,
  SelectableTransactionItem,
} from "@/components/extrato";
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
import { formatFullDate } from "@/lib/formatters";
import { toast } from "sonner";

interface TransactionsPageProps {
  onBack: () => void;
}

export function TransactionsPage({ onBack }: TransactionsPageProps) {
  const [filters, setFilters] = useState<TransactionFilters>(defaultFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionDetail | null>(null);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<TransactionDetail | null>(null);
  
  // Selection mode
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  // Use paginated query with filters
  const { 
    data: paginatedData, 
    isLoading, 
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useTransactionsPaginated(undefined, filters);
  
  const deleteTransaction = useDeleteTransaction();
  const bulkDelete = useBulkDeleteTransactions();

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.periodType) count++;
    if (filters.type !== 'all') count++;
    if (filters.categoryIds.length > 0) count++;
    if (filters.onlyUnclassified) count++;
    if (filters.bankAccountIds.length > 0) count++;
    if (filters.creditCardIds.length > 0) count++;
    if (filters.paymentMethods.length > 0) count++;
    if (filters.sources.length > 0) count++;
    if (filters.searchQuery) count++;
    return count;
  }, [filters]);

  // Transform transactions (memoized)
  const transactions = useMemo(() => {
    const rawTransactions = flattenPaginatedTransactions(paginatedData?.pages);
    
    return rawTransactions.map(t => ({
      id: t.id,
      type: t.type as 'income' | 'expense',
      amount: Number(t.amount),
      category: t.category_id,
      subcategory: t.subcategory_id || undefined,
      date: t.date,
      paymentMethod: t.payment_method as any,
      description: t.description || undefined,
      createdAt: t.created_at,
      created_at: t.created_at,
      source: t.source as TransactionDetail['source'],
      created_by_user_id: t.created_by_user_id || undefined,
      created_by_name: t.created_by_name || undefined,
      last_edited_by_user_id: t.last_edited_by_user_id || undefined,
      last_edited_at: t.last_edited_at || undefined,
      goalId: t.goal_id || undefined,
      goalTitle: (t as any).goals?.title || undefined,
    }));
  }, [paginatedData?.pages]);

  // Group transactions by date
  const groupedTransactions = useMemo(() => {
    const grouped: Record<string, typeof transactions> = {};
    for (const t of transactions) {
      if (!grouped[t.date]) grouped[t.date] = [];
      grouped[t.date].push(t);
    }
    return Object.entries(grouped).sort((a, b) => 
      new Date(b[0]).getTime() - new Date(a[0]).getTime()
    );
  }, [transactions]);

  // Calculate selected amount
  const selectedAmount = useMemo(() => {
    return transactions
      .filter(t => selectedIds.has(t.id))
      .reduce((sum, t) => sum + (t.type === 'expense' ? -t.amount : t.amount), 0);
  }, [transactions, selectedIds]);

  // Handle transaction click
  const handleTransactionClick = useCallback((transaction: any) => {
    if (!isSelectionMode) {
      setSelectedTransaction(transaction as TransactionDetail);
      setDetailSheetOpen(true);
    }
  }, [isSelectionMode]);

  // Handle selection
  const handleSelect = useCallback((id: string) => {
    if (!isSelectionMode) {
      setIsSelectionMode(true);
    }
    setSelectedIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, [isSelectionMode]);

  // Select all
  const handleSelectAll = useCallback(() => {
    const allIds = new Set(transactions.map(t => t.id));
    setSelectedIds(allIds);
  }, [transactions]);

  // Deselect all
  const handleDeselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Cancel selection mode
  const handleCancelSelection = useCallback(() => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  // Handle bulk delete
  const handleBulkDelete = useCallback(async () => {
    const idsToDelete = Array.from(selectedIds);
    try {
      await bulkDelete.mutateAsync(idsToDelete);
      toast.success(`${idsToDelete.length} transações excluídas`);
      handleCancelSelection();
    } catch (error) {
      toast.error("Erro ao excluir transações");
    }
  }, [selectedIds, bulkDelete, handleCancelSelection]);

  // Exit selection mode if no items selected
  useEffect(() => {
    if (isSelectionMode && selectedIds.size === 0) {
      // Allow a brief moment before exiting (for UX)
      const timer = setTimeout(() => {
        if (selectedIds.size === 0) {
          setIsSelectionMode(false);
        }
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isSelectionMode, selectedIds.size]);

  const handleDeleteClick = useCallback((id: string) => {
    setTransactionToDelete(id);
    setDeleteDialogOpen(true);
  }, []);

  const handleEditFromDetail = useCallback((transaction: any) => {
    setTransactionToEdit(transaction as TransactionDetail);
    setEditSheetOpen(true);
  }, []);

  const confirmDelete = useCallback(() => {
    if (transactionToDelete) {
      deleteTransaction.mutate(transactionToDelete);
    }
    setDeleteDialogOpen(false);
    setTransactionToDelete(null);
  }, [transactionToDelete, deleteTransaction]);

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const handleApplyFilters = useCallback((newFilters: TransactionFilters) => {
    setFilters(newFilters);
    handleCancelSelection(); // Clear selection when filters change
  }, [handleCancelSelection]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className={cn(
      "min-h-screen bg-background",
      isSelectionMode ? "pb-36" : "pb-24"
    )}>
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="container px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={onBack}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-lg font-semibold">Extrato</h1>
            </div>

            <div className="flex items-center gap-2">
              {/* Selection mode toggle */}
              {!isSelectionMode && transactions.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsSelectionMode(true)}
                  className="text-muted-foreground"
                >
                  <CheckSquare className="w-4 h-4 mr-1" />
                  Selecionar
                </Button>
              )}

              {/* Filter button */}
              <Button
                variant={activeFilterCount > 0 ? "default" : "outline"}
                size="sm"
                onClick={() => setFiltersOpen(true)}
                className="relative"
              >
                <Filter className="w-4 h-4 mr-1" />
                Filtrar
                {activeFilterCount > 0 && (
                  <Badge 
                    variant="secondary" 
                    className="ml-1.5 h-5 w-5 p-0 flex items-center justify-center text-xs"
                  >
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </div>
          </div>

          {/* Quick search (when filters have search) */}
          {filters.searchQuery && (
            <div className="mt-3 flex items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <Search className="w-3 h-3" />
                "{filters.searchQuery}"
              </Badge>
              <button
                onClick={() => setFilters(prev => ({ ...prev, searchQuery: '' }))}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Limpar
              </button>
            </div>
          )}

          {/* Type filter tabs */}
          <div className="flex gap-2 mt-4">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'income', label: 'Receitas' },
              { id: 'expense', label: 'Despesas' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilters(prev => ({ ...prev, type: tab.id as any }))}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-all",
                  filters.type === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Transaction List */}
      <main className="container px-4 py-4">
        {transactions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              Nenhum lançamento encontrado.
            </p>
            {activeFilterCount > 0 && (
              <Button
                variant="link"
                onClick={() => setFilters(defaultFilters)}
                className="mt-2"
              >
                Limpar filtros
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {groupedTransactions.map(([date, dayTransactions]) => (
              <div key={date}>
                {/* Date header */}
                <div className="sticky top-[140px] z-10 bg-background/95 backdrop-blur-sm py-2">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    {formatFullDate(date)}
                  </h3>
                </div>

                {/* Transactions for this date */}
                <div className="space-y-2">
                  {dayTransactions.map((transaction) => (
                    <SelectableTransactionItem
                      key={transaction.id}
                      transaction={transaction}
                      isSelected={selectedIds.has(transaction.id)}
                      isSelectionMode={isSelectionMode}
                      onSelect={handleSelect}
                      onClick={() => handleTransactionClick(transaction)}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* Load more */}
            {hasNextPage && (
              <div className="flex justify-center py-4">
                {isFetchingNextPage ? (
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLoadMore}
                  >
                    Carregar mais
                  </Button>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Bulk Actions Bar */}
      {isSelectionMode && (
        <BulkActionsBar
          selectedCount={selectedIds.size}
          totalFilteredCount={transactions.length}
          selectedAmount={selectedAmount}
          isAllSelected={selectedIds.size === transactions.length && transactions.length > 0}
          onSelectAll={handleSelectAll}
          onDeselectAll={handleDeselectAll}
          onCancel={handleCancelSelection}
          onDelete={handleBulkDelete}
          isDeleting={bulkDelete.isPending}
        />
      )}

      {/* Filters Sheet */}
      <TransactionFiltersSheet
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        filters={filters}
        onApply={handleApplyFilters}
      />

      {/* Transaction Detail Sheet */}
      <TransactionDetailSheet
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
        transaction={selectedTransaction}
        onEdit={handleEditFromDetail}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir transação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A transação será permanentemente excluída.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Transaction Sheet */}
      <EditTransactionSheet
        open={editSheetOpen}
        onOpenChange={setEditSheetOpen}
        transaction={transactionToEdit ? {
          id: transactionToEdit.id,
          type: transactionToEdit.type,
          amount: transactionToEdit.amount,
          category: transactionToEdit.category,
          subcategory: transactionToEdit.subcategory,
          date: transactionToDelete,
          description: transactionToEdit.description,
          source: transactionToEdit.source,
        } : null}
      />
    </div>
  );
}
