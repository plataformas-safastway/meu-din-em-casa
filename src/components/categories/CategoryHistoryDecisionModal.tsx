import { History, ArrowRight, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { UserCategory, UserSubcategory } from "@/hooks/useUserCategories";

interface CategoryHistoryDecisionModalProps {
  open: boolean;
  onClose: () => void;
  onDecision?: (decision: 'reclassify' | 'forward_only') => void;
  action?: {
    type: 'archive' | 'rename';
    category?: UserCategory;
    subcategory?: UserSubcategory;
    newName?: string;
  } | null;
  isImport?: boolean;
}

export function CategoryHistoryDecisionModal({
  open,
  onClose,
  onDecision,
  action,
  isImport = false,
}: CategoryHistoryDecisionModalProps) {
  const handleDecision = (decision: 'reclassify' | 'forward_only') => {
    if (onDecision) {
      onDecision(decision);
    }
    // Don't close here - let parent handle the flow
  };

  const title = isImport 
    ? 'Como deseja aplicar essa mudança?'
    : action?.type === 'archive'
    ? 'Como deseja arquivar esta categoria?'
    : 'Como deseja aplicar a renomeação?';

  const description = isImport
    ? 'Escolha como tratar suas transações existentes após a importação.'
    : action?.type === 'archive'
    ? `A categoria "${action.category?.name}" possui transações associadas.`
    : `A categoria "${action?.category?.name}" será renomeada para "${action?.newName}".`;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-2">
          {/* Option A: Reclassify History */}
          <button
            onClick={() => handleDecision('reclassify')}
            className={cn(
              "w-full p-4 rounded-xl border-2 text-left transition-all",
              "border-primary/30 hover:border-primary hover:bg-primary/5"
            )}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <History className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">
                  Reclassificar histórico
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {isImport
                    ? 'As categorias antigas serão substituídas também nos lançamentos anteriores. Você poderá revisar o mapeamento antes de aplicar.'
                    : 'As transações antigas serão atualizadas para refletir as novas categorias.'}
                </p>
              </div>
            </div>
          </button>

          {/* Option B: Forward Only */}
          <button
            onClick={() => handleDecision('forward_only')}
            className={cn(
              "w-full p-4 rounded-xl border-2 text-left transition-all",
              "border-border hover:border-primary/50 hover:bg-muted/50"
            )}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <ArrowRight className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">
                  Aplicar apenas daqui para frente
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {isImport
                    ? 'Seus lançamentos antigos permanecem como estão. As novas categorias serão usadas apenas nos próximos registros.'
                    : 'Transações anteriores mantêm a classificação original. Apenas novos lançamentos usarão a nova estrutura.'}
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Info */}
        <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 mt-2">
          <AlertCircle className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            {isImport
              ? 'Caso escolha reclassificar, você poderá mapear as categorias antigas para as novas antes de confirmar.'
              : 'Esta ação será registrada no histórico de alterações e poderá ser revertida se necessário.'}
          </p>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
