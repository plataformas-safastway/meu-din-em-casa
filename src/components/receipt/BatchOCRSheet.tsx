import { useState, useRef, useCallback, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { 
  Camera, 
  Image as ImageIcon, 
  Loader2, 
  AlertCircle,
  Upload,
  X,
  Check,
  RefreshCw,
  Trash2,
  ChevronRight,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useOCRBatchFlow, OCRItem } from "@/hooks/useOCRBatch";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BatchReviewSheet } from "./BatchReviewSheet";

interface BatchOCRSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MAX_FILES = 10;

export function BatchOCRSheet({ open, onOpenChange }: BatchOCRSheetProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showReview, setShowReview] = useState(false);
  
  const {
    batch,
    items,
    readyItems,
    errorItems,
    processingItems,
    pendingItems,
    isLoading,
    createBatch,
    addImages,
    processBatch,
    processItem,
    removeItem,
    deleteBatch,
    refetchBatch,
  } = useOCRBatchFlow();

  // Auto-create batch when sheet opens if none exists
  useEffect(() => {
    if (open && !batch && !isLoading && !createBatch.isPending) {
      createBatch.mutate();
    }
  }, [open, batch, isLoading, createBatch]);

  const handleFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    if (!batch) {
      toast({
        title: "Erro",
        description: "Aguarde a inicialização do lote.",
        variant: "destructive",
      });
      return;
    }

    const remainingSlots = MAX_FILES - items.length;
    if (files.length > remainingSlots) {
      toast({
        title: "Limite de fotos",
        description: `Você pode adicionar no máximo ${remainingSlots} foto(s) neste lote.`,
      });
    }

    const filesToAdd = files.slice(0, remainingSlots);
    if (filesToAdd.length === 0) return;

    try {
      await addImages.mutateAsync({ batchId: batch.id, files: filesToAdd });
      toast({
        title: "Fotos adicionadas",
        description: `${filesToAdd.length} foto(s) adicionada(s) ao lote.`,
      });
    } catch (error) {
      toast({
        title: "Erro ao adicionar",
        description: "Não foi possível adicionar as fotos.",
        variant: "destructive",
      });
    }

    event.target.value = '';
  }, [batch, items.length, addImages]);

  const handleStartProcessing = useCallback(async () => {
    if (!batch || pendingItems.length === 0) return;

    try {
      await processBatch.mutateAsync(batch.id);
    } catch (error) {
      console.error("Processing error:", error);
    }
  }, [batch, pendingItems.length, processBatch]);

  const handleReprocess = useCallback(async (itemId: string) => {
    // Reset status to pending first
    try {
      await processItem.mutateAsync(itemId);
    } catch (error) {
      console.error("Reprocess error:", error);
    }
  }, [processItem]);

  const handleRemove = useCallback(async (itemId: string) => {
    try {
      await removeItem.mutateAsync(itemId);
      toast({
        title: "Foto removida",
        description: "A foto foi removida do lote.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível remover a foto.",
        variant: "destructive",
      });
    }
  }, [removeItem]);

  const handleCancel = useCallback(async () => {
    if (!batch) return;
    
    try {
      await deleteBatch.mutateAsync(batch.id);
      onOpenChange(false);
      toast({
        title: "Lote cancelado",
        description: "O lote foi cancelado e as fotos removidas.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível cancelar o lote.",
        variant: "destructive",
      });
    }
  }, [batch, deleteBatch, onOpenChange]);

  const handleGoToReview = useCallback(() => {
    setShowReview(true);
  }, []);

  const progress = items.length > 0 
    ? ((readyItems.length + errorItems.length) / items.length) * 100 
    : 0;

  const isProcessing = processBatch.isPending || processingItems.length > 0;
  const canProcess = pendingItems.length > 0 && !isProcessing;
  const canReview = readyItems.length > 0 && !isProcessing;

  if (showReview) {
    return (
      <BatchReviewSheet
        open={open}
        onOpenChange={(v) => {
          if (!v) {
            setShowReview(false);
            onOpenChange(false);
          }
        }}
        onBack={() => setShowReview(false)}
      />
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col h-full p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            OCR em Lote
          </SheetTitle>
          <SheetDescription>
            Adicione até {MAX_FILES} fotos de recibos, notas ou comprovantes
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Progress Bar */}
          {items.length > 0 && (
            <div className="px-6 py-3 border-b bg-muted/30">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-muted-foreground">
                  {isProcessing ? "Processando..." : "Progresso"}
                </span>
                <span className="font-medium">
                  {readyItems.length + errorItems.length}/{items.length}
                </span>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                {readyItems.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Check className="w-3 h-3 text-green-500" />
                    {readyItems.length} pronto(s)
                  </span>
                )}
                {errorItems.length > 0 && (
                  <span className="flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 text-destructive" />
                    {errorItems.length} erro(s)
                  </span>
                )}
                {processingItems.length > 0 && (
                  <span className="flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {processingItems.length} processando
                  </span>
                )}
                {pendingItems.length > 0 && (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    {pendingItems.length} pendente(s)
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Items List */}
          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <ImageIcon className="w-16 h-16 text-muted-foreground/30 mb-4" />
                  <p className="text-muted-foreground mb-2">
                    Nenhuma foto adicionada
                  </p>
                  <p className="text-sm text-muted-foreground/70">
                    Toque no botão abaixo para adicionar fotos
                  </p>
                </div>
              ) : (
                items.map((item) => (
                  <BatchItemCard
                    key={item.id}
                    item={item}
                    onRemove={handleRemove}
                    onReprocess={handleReprocess}
                    isReprocessing={processItem.isPending && processItem.variables === item.id}
                  />
                ))
              )}
            </div>
          </ScrollArea>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Action Buttons */}
          <div className="p-4 border-t bg-background space-y-3">
            {items.length < MAX_FILES && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => fileInputRef.current?.click()}
                disabled={addImages.isPending || isProcessing}
              >
                {addImages.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 mr-2" />
                )}
                {items.length === 0 ? "Adicionar Fotos" : "Adicionar Mais"}
              </Button>
            )}

            {canProcess && (
              <Button
                className="w-full"
                onClick={handleStartProcessing}
                disabled={processBatch.isPending}
              >
                {processBatch.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Iniciar Processamento ({pendingItems.length})
              </Button>
            )}

            {canReview && (
              <Button
                className="w-full"
                onClick={handleGoToReview}
              >
                Revisar Lote ({readyItems.length})
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            )}

            {items.length > 0 && (
              <Button
                variant="ghost"
                className="w-full text-destructive hover:text-destructive"
                onClick={handleCancel}
                disabled={deleteBatch.isPending}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Cancelar Lote
              </Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

interface BatchItemCardProps {
  item: OCRItem;
  onRemove: (id: string) => void;
  onReprocess: (id: string) => void;
  isReprocessing: boolean;
}

function BatchItemCard({ item, onRemove, onReprocess, isReprocessing }: BatchItemCardProps) {
  const statusConfig = {
    pending: { label: "Pendente", color: "bg-muted text-muted-foreground" },
    processing: { label: "Processando", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
    ready: { label: "Pronto", color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
    error: { label: "Erro", color: "bg-destructive/10 text-destructive" },
  };

  const status = statusConfig[item.status];

  return (
    <div className={cn(
      "flex items-start gap-3 p-3 rounded-lg border",
      item.status === 'error' && "border-destructive/50 bg-destructive/5",
      item.isDuplicateSuspect && "border-yellow-500/50 bg-yellow-50 dark:bg-yellow-900/20"
    )}>
      {/* Thumbnail */}
      <div className="w-16 h-16 rounded-md overflow-hidden bg-muted flex-shrink-0">
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
          <div>
            <Badge variant="secondary" className={cn("text-xs", status.color)}>
              {item.status === 'processing' && (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              )}
              {status.label}
            </Badge>
            {item.isDuplicateSuspect && (
              <Badge variant="outline" className="ml-1 text-xs border-yellow-500 text-yellow-600">
                Duplicado?
              </Badge>
            )}
          </div>
          
          <div className="flex gap-1">
            {item.status === 'error' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onReprocess(item.id)}
                disabled={isReprocessing}
              >
                {isReprocessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={() => onRemove(item.id)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Extracted info */}
        {item.status === 'ready' && (
          <div className="mt-1 text-sm space-y-0.5">
            {item.normalizedAmount !== null && (
              <p className="font-medium">
                R$ {item.normalizedAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            )}
            {item.normalizedDate && (
              <p className="text-muted-foreground text-xs">
                {new Date(item.normalizedDate + 'T12:00:00').toLocaleDateString('pt-BR')}
              </p>
            )}
            {item.normalizedMerchant && (
              <p className="text-muted-foreground text-xs truncate">
                {item.normalizedMerchant}
              </p>
            )}
          </div>
        )}

        {/* Error message */}
        {item.status === 'error' && item.errorMessage && (
          <p className="mt-1 text-xs text-destructive truncate">
            {item.errorMessage}
          </p>
        )}

        {/* Confidence indicator */}
        {item.status === 'ready' && item.confidence < 70 && (
          <p className="mt-1 text-xs text-yellow-600 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            Confiança baixa ({item.confidence}%)
          </p>
        )}
      </div>
    </div>
  );
}
