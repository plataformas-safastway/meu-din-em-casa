import { useState, useMemo, useEffect } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { 
  ArrowLeft, Check, X, Edit2, Trash2, Loader2, AlertTriangle, 
  CheckCircle2, RefreshCw, Upload, Clock, AlertCircle, Copy,
  MessageCircle, FileWarning, HelpCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { defaultCategories, getCategoryById } from "@/data/categories";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { ScreenLoader } from "@/components/ui/money-loader";
import {
  useImportBatch,
  useImportPolling,
  usePendingImports,
  useConfirmImportBatch,
  useCancelImportBatch,
  useUpdateImportItem,
  useDeleteImportItems,
  useRetryImport,
  getPendingImportId,
  clearPendingImportId,
  IMPORT_ERROR_CODES,
} from "@/hooks/useImportFlow";
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
import { DetectedSourceHandler } from "@/components/import/DetectedSourceHandler";
import { toast } from "sonner";

// ============================================
// WHATSAPP SUPPORT HELPER
// ============================================

const WHATSAPP_SUPPORT_NUMBER = "5548988483333";
const getWhatsAppUrl = (errorCode: string | null, importId: string | null) => {
  const message = encodeURIComponent(
    `Olá! Preciso de ajuda com uma importação no OIK.\n\nCódigo do erro: ${errorCode || 'N/A'}\nID da importação: ${importId || 'N/A'}`
  );
  return `https://wa.me/${WHATSAPP_SUPPORT_NUMBER}?text=${message}`;
};

// ============================================
// COPY ERROR CODE HELPER
// ============================================

function copyErrorCode(code: string | null, importId: string | null) {
  const text = `Código: ${code || 'N/A'} | ImportID: ${importId || 'N/A'}`;
  navigator.clipboard.writeText(text);
  toast.success("Código copiado para a área de transferência");
}

// ============================================
// PROCESSING STATE COMPONENT
// ============================================

function ProcessingState({ 
  onRefresh, 
  isRefreshing,
  batch
}: { 
  onRefresh: () => void; 
  isRefreshing: boolean;
  batch?: { detected_bank?: string | null; file_name?: string } | null;
}) {
  const [progress, setProgress] = useState(0);
  const [step, setStep] = useState(0);
  
  const steps = [
    "Detectando banco...",
    "Abrindo arquivo...",
    "Extraindo lançamentos...",
    "Categorizando...",
  ];

  useEffect(() => {
    const progressInterval = setInterval(() => {
      setProgress(p => Math.min(p + 3, 90));
    }, 500);

    const stepInterval = setInterval(() => {
      setStep(s => (s + 1) % steps.length);
    }, 2000);

    return () => {
      clearInterval(progressInterval);
      clearInterval(stepInterval);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6 relative">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
        <div 
          className="absolute inset-0 rounded-full border-4 border-primary/20"
          style={{
            background: `conic-gradient(hsl(var(--primary)) ${progress}%, transparent ${progress}%)`
          }}
        />
      </div>
      
      <h2 className="text-lg font-semibold text-foreground mb-2">
        Processando importação...
      </h2>
      
      <p className="text-sm text-primary font-medium mb-2 animate-pulse">
        {steps[step]}
      </p>
      
      {batch?.detected_bank && (
        <p className="text-xs text-muted-foreground mb-4">
          Banco detectado: <span className="font-medium">{batch.detected_bank}</span>
        </p>
      )}
      
      <p className="text-xs text-muted-foreground mb-6 max-w-sm">
        Isso geralmente leva menos de 30 segundos. A página atualiza automaticamente.
      </p>
      
      <Button 
        variant="outline" 
        onClick={onRefresh}
        disabled={isRefreshing}
        size="sm"
      >
        {isRefreshing ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <RefreshCw className="w-4 h-4 mr-2" />
        )}
        Atualizar agora
      </Button>
    </div>
  );
}

// ============================================
// EMPTY STATE COMPONENT
// ============================================

function EmptyState({ 
  onRetry, 
  onNewImport,
  errorCode,
  importId
}: { 
  onRetry: () => void; 
  onNewImport: () => void;
  errorCode: string | null;
  importId: string | null;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <FileWarning className="w-8 h-8 text-muted-foreground" />
      </div>
      <h2 className="text-lg font-semibold text-foreground mb-2">
        Nenhum lançamento encontrado
      </h2>
      <p className="text-sm text-muted-foreground mb-4 max-w-sm">
        Não encontramos transações neste arquivo. Pode estar vazio ou em formato não suportado.
      </p>
      
      {errorCode && (
        <button
          onClick={() => copyErrorCode(errorCode, importId)}
          className="flex items-center gap-1 text-xs text-muted-foreground mb-6 hover:text-foreground transition-colors"
        >
          <span className="font-mono">{errorCode}</span>
          <Copy className="w-3 h-3" />
        </button>
      )}
      
      <div className="flex gap-3">
        <Button variant="outline" onClick={onRetry}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Tentar novamente
        </Button>
        <Button onClick={onNewImport}>
          <Upload className="w-4 h-4 mr-2" />
          Novo arquivo
        </Button>
      </div>
      
      <a 
        href="/app?tab=help&article=import-files"
        className="mt-4 text-xs text-primary hover:underline flex items-center gap-1"
      >
        <HelpCircle className="w-3 h-3" />
        Ver dicas de importação
      </a>
    </div>
  );
}

// ============================================
// ERROR STATE COMPONENT (FAILED)
// ============================================

function FailedState({ 
  error,
  errorMessage,
  errorCode,
  importId,
  onRetry, 
  onNewImport,
  isRetrying
}: { 
  error: Error | null;
  errorMessage: string | null;
  errorCode: string | null;
  importId: string | null;
  onRetry: () => void; 
  onNewImport: () => void;
  isRetrying: boolean;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
        <AlertTriangle className="w-8 h-8 text-destructive" />
      </div>
      <h2 className="text-lg font-semibold text-foreground mb-2">
        Erro ao processar arquivo
      </h2>
      <p className="text-sm text-muted-foreground mb-2 max-w-sm">
        {errorMessage || error?.message || "Não foi possível processar o arquivo. Tente novamente."}
      </p>
      
      {errorCode && (
        <button
          onClick={() => copyErrorCode(errorCode, importId)}
          className="flex items-center gap-2 text-xs text-muted-foreground mb-6 hover:text-foreground transition-colors bg-muted/50 px-3 py-1.5 rounded-full"
        >
          <span className="font-mono">{errorCode}</span>
          <Copy className="w-3 h-3" />
        </button>
      )}
      
      <div className="flex flex-col gap-2 w-full max-w-xs">
        <Button onClick={onRetry} disabled={isRetrying}>
          {isRetrying ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-2" />
          )}
          Tentar novamente
        </Button>
        
        <Button variant="outline" onClick={onNewImport}>
          <Upload className="w-4 h-4 mr-2" />
          Enviar outro arquivo
        </Button>
        
        <a 
          href={getWhatsAppUrl(errorCode, importId)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md text-sm font-medium border border-border hover:bg-accent transition-colors"
        >
          <MessageCircle className="w-4 h-4" />
          Falar com suporte
        </a>
      </div>
    </div>
  );
}

// ============================================
// EXPIRED STATE COMPONENT
// ============================================

function ExpiredState({ 
  onNewImport,
  errorCode,
  importId
}: { 
  onNewImport: () => void;
  errorCode: string | null;
  importId: string | null;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center mb-4">
        <Clock className="w-8 h-8 text-warning" />
      </div>
      <h2 className="text-lg font-semibold text-foreground mb-2">
        Importação expirada
      </h2>
      <p className="text-sm text-muted-foreground mb-4 max-w-sm">
        Esta importação expirou após 24 horas. Por segurança, os dados foram removidos automaticamente.
      </p>
      
      {errorCode && (
        <button
          onClick={() => copyErrorCode(errorCode, importId)}
          className="flex items-center gap-1 text-xs text-muted-foreground mb-6 hover:text-foreground transition-colors"
        >
          <span className="font-mono">{errorCode}</span>
          <Copy className="w-3 h-3" />
        </button>
      )}
      
      <Button onClick={onNewImport}>
        <Upload className="w-4 h-4 mr-2" />
        Enviar novo arquivo
      </Button>
    </div>
  );
}

// ============================================
// NOT FOUND STATE COMPONENT
// ============================================

function NotFoundState({ 
  onNewImport,
  importId
}: { 
  onNewImport: () => void;
  importId: string | null;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
        <AlertCircle className="w-8 h-8 text-muted-foreground" />
      </div>
      <h2 className="text-lg font-semibold text-foreground mb-2">
        Importação não encontrada
      </h2>
      <p className="text-sm text-muted-foreground mb-4 max-w-sm">
        Esta importação não existe ou você não tem permissão para acessá-la.
      </p>
      
      {importId && (
        <p className="text-xs text-muted-foreground mb-6 font-mono">
          ID: {importId.substring(0, 8)}...
        </p>
      )}
      
      <Button onClick={onNewImport}>
        <Upload className="w-4 h-4 mr-2" />
        Iniciar nova importação
      </Button>
    </div>
  );
}

// ============================================
// NETWORK ERROR STATE
// ============================================

function NetworkErrorState({
  error,
  onRetry,
  onNewImport,
  errorCode,
  importId
}: {
  error: Error | null;
  onRetry: () => void;
  onNewImport: () => void;
  errorCode: string | null;
  importId: string | null;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
        <AlertTriangle className="w-8 h-8 text-destructive" />
      </div>
      <h2 className="text-lg font-semibold text-foreground mb-2">
        Erro de conexão
      </h2>
      <p className="text-sm text-muted-foreground mb-2 max-w-sm">
        Não foi possível carregar os dados. Verifique sua conexão e tente novamente.
      </p>
      
      {errorCode && (
        <button
          onClick={() => copyErrorCode(errorCode, importId)}
          className="flex items-center gap-1 text-xs text-muted-foreground mb-6 hover:text-foreground transition-colors"
        >
          <span className="font-mono">{errorCode}</span>
          <Copy className="w-3 h-3" />
        </button>
      )}
      
      <div className="flex gap-3">
        <Button variant="outline" onClick={onRetry}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Tentar novamente
        </Button>
        <Button onClick={onNewImport}>
          <Upload className="w-4 h-4 mr-2" />
          Novo arquivo
        </Button>
      </div>
    </div>
  );
}

// ============================================
// PAGE HEADER COMPONENT
// ============================================

function PageHeader({
  title,
  subtitle,
  onBack,
  onRefresh,
  isRefreshing
}: {
  title: string;
  subtitle?: string;
  onBack: () => void;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}) {
  return (
    <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border/50">
      <div className="container px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold">{title}</h1>
              {subtitle && (
                <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {onRefresh && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={onRefresh}
              disabled={isRefreshing}
            >
              <RefreshCw className={cn("w-4 h-4", isRefreshing && "animate-spin")} />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function ImportReviewPage() {
  const navigate = useNavigate();
  const { importId: routeImportId } = useParams<{ importId: string }>();
  const [searchParams] = useSearchParams();
  
  // Try to get importId from route first, then query params, then localStorage
  const importId = routeImportId || searchParams.get('id') || getPendingImportId();
  
  // Fetch import data - 100% backend-driven
  const { 
    batch, 
    items: transactions, 
    isLoading, 
    isError, 
    error,
    errorCode,
    isEmpty, 
    isExpired,
    isProcessing,
    isFailed,
    isReviewing,
    summary,
    refetch 
  } = useImportBatch(importId);

  // Auto-poll when processing
  useImportPolling(importId, isProcessing, refetch);
  
  const confirmImport = useConfirmImportBatch();
  const cancelImport = useCancelImportBatch();
  const updateTransaction = useUpdateImportItem();
  const deleteTransactions = useDeleteImportItems();
  const retryImport = useRetryImport();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [categoryUpdates, setCategoryUpdates] = useState<Record<string, { categoryId: string; subcategoryId: string | null }>>({});
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteTargetIds, setDeleteTargetIds] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Initialize selected IDs when transactions load
  useEffect(() => {
    if (transactions.length > 0 && selectedIds.size === 0) {
      const nonDuplicateIds = new Set(
        transactions.filter(t => !t.is_duplicate).map(t => t.id)
      );
      setSelectedIds(nonDuplicateIds);
    }
  }, [transactions]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleNewImport = () => {
    clearPendingImportId();
    navigate('/app/import');
  };

  const handleBack = () => {
    navigate('/app');
  };

  const handleRetry = () => {
    if (importId) {
      retryImport.mutate(importId);
    }
  };

  // ==========================================
  // RENDER STATES (NEVER BLANK)
  // ==========================================

  // 1. NO IMPORT ID - Show not found
  if (!importId) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Revisar Importação" onBack={handleBack} />
        <main className="container px-4 py-6">
          <NotFoundState onNewImport={handleNewImport} importId={null} />
        </main>
      </div>
    );
  }

  // 2. LOADING - Show loader
  if (isLoading) {
    return <ScreenLoader label="Carregando importação..." />;
  }

  // 3. NETWORK ERROR - Show error with retry
  if (isError && !batch) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader 
          title="Revisar Importação" 
          onBack={handleBack}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />
        <main className="container px-4 py-6">
          <NetworkErrorState 
            error={error} 
            onRetry={handleRefresh} 
            onNewImport={handleNewImport}
            errorCode={errorCode}
            importId={importId}
          />
        </main>
      </div>
    );
  }

  // 4. BATCH NOT FOUND - Show not found
  if (!batch) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Revisar Importação" onBack={handleBack} />
        <main className="container px-4 py-6">
          <NotFoundState onNewImport={handleNewImport} importId={importId} />
        </main>
      </div>
    );
  }

  // 5. PROCESSING - Show progress with auto-refresh
  if (isProcessing) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader 
          title="Processando..." 
          subtitle={batch.file_name}
          onBack={handleBack}
        />
        <main className="container px-4 py-6">
          <ProcessingState 
            onRefresh={handleRefresh} 
            isRefreshing={isRefreshing}
            batch={batch}
          />
        </main>
      </div>
    );
  }

  // 6. EXPIRED - Show expired state
  if (isExpired) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Importação Expirada" onBack={handleBack} />
        <main className="container px-4 py-6">
          <ExpiredState 
            onNewImport={handleNewImport} 
            errorCode={errorCode}
            importId={importId}
          />
        </main>
      </div>
    );
  }

  // 7. FAILED - Show error with retry
  if (isFailed) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader 
          title="Erro na Importação" 
          subtitle={batch.file_name}
          onBack={handleBack}
        />
        <main className="container px-4 py-6">
          <FailedState 
            error={error}
            errorMessage={batch.error_message}
            errorCode={errorCode}
            importId={importId}
            onRetry={handleRetry}
            onNewImport={handleNewImport}
            isRetrying={retryImport.isPending}
          />
        </main>
      </div>
    );
  }

  // 8. EMPTY (REVIEWING but no items) - Show empty state
  if (isEmpty) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader 
          title="Revisar Importação" 
          subtitle={batch.file_name}
          onBack={handleBack}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
        />
        <main className="container px-4 py-6">
          <EmptyState 
            onRetry={handleRefresh} 
            onNewImport={handleNewImport}
            errorCode={errorCode}
            importId={importId}
          />
        </main>
      </div>
    );
  }

  // ==========================================
  // 9. REVIEWING with items - Main review UI
  // ==========================================

  const { total, duplicateCount, needsReviewCount } = summary;
  const selectedCount = selectedIds.size;

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => setSelectedIds(new Set(transactions.map(t => t.id)));
  const deselectAll = () => setSelectedIds(new Set());
  const selectNonDuplicates = () => setSelectedIds(new Set(transactions.filter(t => !t.is_duplicate).map(t => t.id)));

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
    if (selectedIds.size === 0) return;

    confirmImport.mutate(
      { 
        importId, 
        selectedIds: Array.from(selectedIds),
        categoryUpdates 
      },
      {
        onSuccess: (data) => {
          navigate('/app', { 
            state: { 
              importSuccess: true, 
              importedCount: data.count,
              skippedCount: transactions.length - data.count,
            } 
          });
        }
      }
    );
  };

  const handleCancel = () => setShowCancelDialog(true);

  const confirmCancel = () => {
    cancelImport.mutate(importId, {
      onSuccess: () => navigate('/app'),
    });
    setShowCancelDialog(false);
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* Header */}
      <PageHeader
        title="Revisar Importação"
        subtitle={batch.file_name}
        onBack={handleBack}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
      />

      <main className="container px-4 py-6">
        <div className="space-y-4 max-w-lg mx-auto">
          {/* Detected Sources Handler */}
          <DetectedSourceHandler importId={importId} />
          
          {/* Summary Stats */}
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            <div className="flex-shrink-0 px-3 py-2 rounded-lg bg-muted">
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="font-semibold">{total}</p>
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
                            <SelectContent className="bg-background border-2 shadow-xl z-50">
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
        </div>
      </main>

      {/* Fixed Bottom Actions */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur border-t border-border safe-area-inset-bottom">
        <div className="container max-w-lg mx-auto flex gap-3">
          <Button 
            variant="outline" 
            onClick={handleCancel}
            disabled={confirmImport.isPending || cancelImport.isPending}
            className="flex-1"
          >
            Cancelar
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
