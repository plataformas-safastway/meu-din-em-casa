import { useState, useCallback, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft,
  Check,
  CheckCheck,
  Filter,
  Loader2,
  Save,
  Tag,
  AlertCircle,
  CreditCard,
  Calendar,
  Repeat,
} from "lucide-react";
import { useOCRBatchFlow, OCRItem } from "@/hooks/useOCRBatch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { BatchBulkActionsSheet } from "./BatchBulkActionsSheet";
import { BatchItemDetailSheet } from "./BatchItemDetailSheet";

interface BatchReviewSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBack: () => void;
}

type FilterType = 'all' | 'no-category' | 'error' | 'duplicate';

export function BatchReviewSheet({ open, onOpenChange, onBack }: BatchReviewSheetProps) {
  const {
    batch,
    items,
    selectedIds,
    selectedItems,
    readyItems,
    errorItems,
    duplicateItems,
    noCategoryItems,
    toggleSelection,
    selectAll,
    clearSelection,
    detectDuplicates,
    saveTransactions,
  } = useOCRBatchFlow();

  const [filter, setFilter] = useState<FilterType>('all');
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [detailItem, setDetailItem] = useState<OCRItem | null>(null);

  // Filter items
  const filteredItems = useMemo(() => {
    switch (filter) {
      case 'no-category':
        return noCategoryItems;
      case 'error':
        return errorItems;
      case 'duplicate':
        return duplicateItems;
      default:
        return readyItems;
    }
  }, [filter, readyItems, noCategoryItems, errorItems, duplicateItems]);

  // Auto-detect duplicates on mount
  useState(() => {
    if (batch) {
      detectDuplicates.mutate(batch.id);
    }
  });

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredItems.length) {
      clearSelection();
    } else {
      filteredItems.forEach(item => {
        if (!selectedIds.has(item.id)) {
          toggleSelection(item.id);
        }
      });
    }
  }, [selectedIds, filteredItems, clearSelection, toggleSelection]);

  const handleSave = useCallback(async () => {
    if (!batch) return;

    const itemsToSave = selectedIds.size > 0 
      ? Array.from(selectedIds) 
      : readyItems.map(i => i.id);

    if (itemsToSave.length === 0) {
      return;
    }

    try {
      await saveTransactions.mutateAsync({
        batchId: batch.id,
        itemIds: itemsToSave,
      });
      
      // Close if all saved
      if (itemsToSave.length === readyItems.length) {
        onOpenChange(false);
      }
    } catch (error) {
      console.error("Save error:", error);
    }
  }, [batch, selectedIds, readyItems, saveTransactions, onOpenChange]);

  const allSelected = filteredItems.length > 0 && selectedIds.size === filteredItems.length;
  const someSelected = selectedIds.size > 0;
  const canSave = readyItems.length > 0 && !saveTransactions.isPending;
  
  const itemsWithoutCategory = noCategoryItems.length;
  const savingCount = selectedIds.size > 0 ? selectedIds.size : readyItems.length;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg flex flex-col h-full p-0">
          <SheetHeader className="px-6 pt-6 pb-4 border-b">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 -ml-2"
                onClick={onBack}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
              <div>
                <SheetTitle>Revisar Lote</SheetTitle>
                <SheetDescription>
                  {readyItems.length} item(s) pronto(s) para salvar
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-hidden flex flex-col">
            {/* Toolbar */}
            <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  aria-label="Selecionar todos"
                />
                <span className="text-sm text-muted-foreground">
                  {selectedIds.size > 0 
                    ? `${selectedIds.size} selecionado(s)`
                    : "Selecionar"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Filter dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8">
                      <Filter className="w-4 h-4 mr-1" />
                      Filtro
                      {filter !== 'all' && (
                        <Badge variant="secondary" className="ml-1 h-5 px-1">
                          1
                        </Badge>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setFilter('all')}>
                      <Check className={cn("w-4 h-4 mr-2", filter !== 'all' && "opacity-0")} />
                      Todos ({readyItems.length})
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilter('no-category')}>
                      <Check className={cn("w-4 h-4 mr-2", filter !== 'no-category' && "opacity-0")} />
                      Sem categoria ({noCategoryItems.length})
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setFilter('duplicate')}>
                      <Check className={cn("w-4 h-4 mr-2", filter !== 'duplicate' && "opacity-0")} />
                      Duplicados ({duplicateItems.length})
                    </DropdownMenuItem>
                    {errorItems.length > 0 && (
                      <DropdownMenuItem onClick={() => setFilter('error')}>
                        <Check className={cn("w-4 h-4 mr-2", filter !== 'error' && "opacity-0")} />
                        Erros ({errorItems.length})
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Bulk actions */}
                {someSelected && (
                  <Button
                    variant="default"
                    size="sm"
                    className="h-8"
                    onClick={() => setShowBulkActions(true)}
                  >
                    <Tag className="w-4 h-4 mr-1" />
                    Editar em Lote
                  </Button>
                )}
              </div>
            </div>

            {/* Warning for items without category */}
            {itemsWithoutCategory > 0 && (
              <div className="px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
                <p className="text-sm text-yellow-700 dark:text-yellow-300 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  {itemsWithoutCategory} item(s) sem categoria definida
                </p>
              </div>
            )}

            {/* Items List */}
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-2">
                {filteredItems.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    Nenhum item encontrado com este filtro
                  </div>
                ) : (
                  filteredItems.map((item) => (
                    <ReviewItemCard
                      key={item.id}
                      item={item}
                      selected={selectedIds.has(item.id)}
                      onSelect={() => toggleSelection(item.id)}
                      onEdit={() => setDetailItem(item)}
                    />
                  ))
                )}
              </div>
            </ScrollArea>

            {/* Save Button */}
            <div className="p-4 border-t bg-background space-y-3">
              {/* Summary */}
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Total a salvar:</span>
                <span className="font-medium text-foreground">{savingCount} transação(ões)</span>
              </div>

              <Button
                className="w-full"
                size="lg"
                onClick={handleSave}
                disabled={!canSave}
              >
                {saveTransactions.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Salvar {savingCount} Transação(ões)
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Bulk Actions Sheet */}
      <BatchBulkActionsSheet
        open={showBulkActions}
        onOpenChange={setShowBulkActions}
        selectedItems={selectedItems}
      />

      {/* Item Detail Sheet */}
      {detailItem && (
        <BatchItemDetailSheet
          open={!!detailItem}
          onOpenChange={(v) => !v && setDetailItem(null)}
          item={detailItem}
        />
      )}
    </>
  );
}

interface ReviewItemCardProps {
  item: OCRItem;
  selected: boolean;
  onSelect: () => void;
  onEdit: () => void;
}

function ReviewItemCard({ item, selected, onSelect, onEdit }: ReviewItemCardProps) {
  return (
    <div 
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
        selected && "bg-primary/5 border-primary",
        item.isDuplicateSuspect && !selected && "border-yellow-500/50 bg-yellow-50 dark:bg-yellow-900/10",
        !item.finalCategoryId && !selected && "border-dashed"
      )}
      onClick={onEdit}
    >
      {/* Checkbox */}
      <div onClick={(e) => { e.stopPropagation(); onSelect(); }}>
        <Checkbox checked={selected} />
      </div>

      {/* Thumbnail */}
      <div className="w-12 h-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
        <img
          src={item.imageUrl}
          alt="Receipt"
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            {/* Amount */}
            <p className="font-semibold">
              {item.normalizedAmount !== null 
                ? `R$ ${item.normalizedAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                : "Valor não identificado"
              }
            </p>

            {/* Merchant/Description */}
            <p className="text-sm text-muted-foreground truncate">
              {item.normalizedMerchant || item.normalizedDescription || "Sem descrição"}
            </p>

            {/* Badges */}
            <div className="flex flex-wrap gap-1">
              {item.normalizedDate && (
                <Badge variant="outline" className="text-xs font-normal">
                  <Calendar className="w-3 h-3 mr-1" />
                  {new Date(item.normalizedDate + 'T12:00:00').toLocaleDateString('pt-BR')}
                </Badge>
              )}
              {item.finalCategoryId ? (
                <Badge variant="secondary" className="text-xs">
                  <Tag className="w-3 h-3 mr-1" />
                  Categorizado
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs border-dashed text-muted-foreground">
                  <Tag className="w-3 h-3 mr-1" />
                  Sem categoria
                </Badge>
              )}
              {item.finalPaymentMethod && (
                <Badge variant="outline" className="text-xs font-normal">
                  <CreditCard className="w-3 h-3 mr-1" />
                  {item.finalPaymentMethod}
                </Badge>
              )}
              {item.isRecurring && (
                <Badge variant="outline" className="text-xs font-normal">
                  <Repeat className="w-3 h-3 mr-1" />
                  Recorrente
                </Badge>
              )}
              {item.isDuplicateSuspect && (
                <Badge variant="outline" className="text-xs border-yellow-500 text-yellow-600">
                  Duplicado?
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
