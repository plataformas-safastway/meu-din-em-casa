import { useState } from "react";
import { X, Trash2, Tag, CheckSquare, Square, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatters";

interface BulkActionsBarProps {
  selectedCount: number;
  totalFilteredCount: number;
  selectedAmount: number;
  isAllSelected: boolean;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onCancel: () => void;
  onDelete: () => void;
  onChangeCategory: () => void;
  isDeleting?: boolean;
  isChangingCategory?: boolean;
}

export function BulkActionsBar({
  selectedCount,
  totalFilteredCount,
  selectedAmount,
  isAllSelected,
  onSelectAll,
  onDeselectAll,
  onCancel,
  onDelete,
  onChangeCategory,
  isDeleting = false,
  isChangingCategory = false,
}: BulkActionsBarProps) {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const handleDeleteClick = () => {
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    setDeleteConfirmOpen(false);
    onDelete();
  };

  const isProcessing = isDeleting || isChangingCategory;

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border shadow-lg animate-slide-up">
        <div className="container px-4 py-3">
          {/* Selection info */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={onCancel}
                className="h-8 w-8"
                disabled={isProcessing}
              >
                <X className="w-4 h-4" />
              </Button>
              <div>
                <span className="font-semibold text-sm">
                  {selectedCount} {selectedCount === 1 ? 'selecionada' : 'selecionadas'}
                </span>
                <span className="text-xs text-muted-foreground ml-2">
                  ({formatCurrency(Math.abs(selectedAmount))})
                </span>
              </div>
            </div>

            {/* Select all checkbox */}
            <div className="flex items-center gap-2">
              <button
                onClick={isAllSelected ? onDeselectAll : onSelectAll}
                disabled={isProcessing}
                className={cn(
                  "flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors",
                  isProcessing && "opacity-50 cursor-not-allowed"
                )}
              >
                {isAllSelected ? (
                  <>
                    <CheckSquare className="w-4 h-4" />
                    <span className="hidden sm:inline">Desmarcar todos</span>
                  </>
                ) : (
                  <>
                    <Square className="w-4 h-4" />
                    <span className="hidden sm:inline">Selecionar todos ({totalFilteredCount})</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            {/* Change Category Button */}
            <Button
              variant="outline"
              className="flex-1 h-11 rounded-xl"
              onClick={onChangeCategory}
              disabled={selectedCount === 0 || isProcessing}
            >
              {isChangingCategory ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Tag className="w-4 h-4 mr-2" />
              )}
              {isChangingCategory ? 'Alterando...' : 'Categoria'}
            </Button>

            {/* Delete Button */}
            <Button
              variant="destructive"
              className="flex-1 h-11 rounded-xl"
              onClick={handleDeleteClick}
              disabled={selectedCount === 0 || isProcessing}
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </Button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <AlertDialogTitle className="text-left">
                Excluir {selectedCount} {selectedCount === 1 ? 'transação' : 'transações'}?
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-left space-y-2">
              <p>
                Esta ação não pode ser desfeita. As transações serão permanentemente excluídas.
              </p>
              <div className="p-3 bg-destructive/5 rounded-lg border border-destructive/20">
                <p className="text-sm font-medium text-destructive">
                  ⚠️ Impacto: Saldos e relatórios serão alterados
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Total: {formatCurrency(Math.abs(selectedAmount))}
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="flex-1">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="flex-1 bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmar exclusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
