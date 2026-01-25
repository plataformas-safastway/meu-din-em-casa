import { useState, useMemo, useCallback, useEffect } from "react";
import { ArrowLeft, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCategoryById } from "@/data/categories";
import { cn } from "@/lib/utils";
import { useDeleteTransaction } from "@/hooks/useTransactions";
import { useTransactionsPaginated, flattenPaginatedTransactions } from "@/hooks/useTransactionsPaginated";
import { VirtualizedTransactionList } from "@/components/VirtualizedTransactionList";
import { EditTransactionSheet } from "@/components/EditTransactionSheet";
import { TransactionDetailSheet, TransactionDetail } from "@/components/TransactionDetailSheet";
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

interface TransactionsPageProps {
  onBack: () => void;
}

export function TransactionsPage({ onBack }: TransactionsPageProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState<string | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<TransactionDetail | null>(null);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<TransactionDetail | null>(null);
  
  // Use paginated query with cursor-based pagination
  const { 
    data: paginatedData, 
    isLoading, 
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useTransactionsPaginated(filterType);
  
  const deleteTransaction = useDeleteTransaction();

  // Debounce search to avoid re-filtering on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Transform and filter transactions (memoized)
  const transactions = useMemo(() => {
    const rawTransactions = flattenPaginatedTransactions(paginatedData?.pages);
    
    return rawTransactions
      .map(t => ({
        id: t.id,
        type: t.type as 'income' | 'expense',
        amount: Number(t.amount),
        category: t.category_id,
        subcategory: t.subcategory_id || undefined,
        date: t.date,
        paymentMethod: t.payment_method as any,
        description: t.description || undefined,
        createdAt: t.created_at, // For Transaction type compatibility
        created_at: t.created_at,
        // Audit fields
        source: t.source as TransactionDetail['source'],
        created_by_user_id: t.created_by_user_id || undefined,
        created_by_name: t.created_by_name || undefined,
        last_edited_by_user_id: t.last_edited_by_user_id || undefined,
        last_edited_at: t.last_edited_at || undefined,
        // Goal
        goalId: t.goal_id || undefined,
        goalTitle: (t as any).goals?.title || undefined,
      }))
      .filter(t => {
        if (!debouncedSearch) return true;
        const searchLower = debouncedSearch.toLowerCase();
        const matchesDesc = t.description?.toLowerCase().includes(searchLower);
        const matchesCat = getCategoryById(t.category)?.name.toLowerCase().includes(searchLower);
        return matchesDesc || matchesCat;
      });
  }, [paginatedData?.pages, debouncedSearch]);

  // Click on transaction opens detail sheet
  const handleTransactionClick = useCallback((transaction: any) => {
    setSelectedTransaction(transaction as TransactionDetail);
    setDetailSheetOpen(true);
  }, []);

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

  if (isLoading) {
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
            <h1 className="text-lg font-semibold">Extrato</h1>
          </div>
          
          {/* Search */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar lançamentos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 mt-4">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'income', label: 'Receitas' },
              { id: 'expense', label: 'Despesas' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id as typeof filterType)}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-all",
                  filterType === tab.id
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

      {/* Virtualized Transaction List */}
      <main className="container px-4 py-4">
        <VirtualizedTransactionList
          transactions={transactions}
          onTransactionClick={handleTransactionClick}
          onEdit={handleEditFromDetail}
          onDelete={handleDeleteClick}
          showActions
          hasMore={!!hasNextPage && !debouncedSearch}
          isLoadingMore={isFetchingNextPage}
          onLoadMore={handleLoadMore}
        />
      </main>

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
          date: transactionToEdit.date,
          description: transactionToEdit.description,
          source: transactionToEdit.source,
        } : null}
      />
    </div>
  );
}
