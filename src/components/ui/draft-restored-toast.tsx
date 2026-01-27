import { useEffect } from 'react';
import { toast } from 'sonner';
import { RotateCcw, X } from 'lucide-react';

interface DraftRestoredToastProps {
  wasRestored: boolean;
  onDismiss: () => void;
  entityName?: string;
}

/**
 * Shows a subtle toast when draft data was restored
 */
export function DraftRestoredToast({ 
  wasRestored, 
  onDismiss, 
  entityName = "dados" 
}: DraftRestoredToastProps) {
  useEffect(() => {
    if (wasRestored) {
      toast.info(`Rascunho restaurado`, {
        description: `Seus ${entityName} não salvos foram recuperados.`,
        icon: <RotateCcw className="h-4 w-4" />,
        duration: 5000,
        action: {
          label: "Descartar",
          onClick: onDismiss,
        },
      });
    }
  }, [wasRestored, onDismiss, entityName]);

  return null;
}

/**
 * Simple banner version for forms
 */
export function DraftRestoredBanner({ 
  wasRestored, 
  onDismiss, 
  entityName = "dados" 
}: DraftRestoredToastProps) {
  if (!wasRestored) return null;

  return (
    <div className="flex items-center justify-between gap-2 p-2 mb-3 bg-muted/50 rounded-lg text-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <RotateCcw className="h-3.5 w-3.5" />
        <span>Rascunho de {entityName} restaurado</span>
      </div>
      <button 
        onClick={onDismiss}
        className="text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Descartar rascunho"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
