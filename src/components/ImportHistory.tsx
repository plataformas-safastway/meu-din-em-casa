import { useState } from "react";
import { FileSpreadsheet, File, Trash2, Undo2, Loader2, Calendar, CheckCircle, XCircle, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useImports, useRevertImport, useDeleteImport, Import } from "@/hooks/useImports";
import { formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
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

interface ImportHistoryProps {
  onReviewImport?: (importId: string) => void;
}

export function ImportHistory({ onReviewImport }: ImportHistoryProps) {
  const { data: imports = [], isLoading } = useImports();
  const revertImport = useRevertImport();
  const deleteImport = useDeleteImport();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogAction, setDialogAction] = useState<'revert' | 'delete'>('revert');
  const [selectedImport, setSelectedImport] = useState<Import | null>(null);

  const handleRevertClick = (imp: Import) => {
    setSelectedImport(imp);
    setDialogAction('revert');
    setDialogOpen(true);
  };

  const handleDeleteClick = (imp: Import) => {
    setSelectedImport(imp);
    setDialogAction('delete');
    setDialogOpen(true);
  };

  const confirmAction = () => {
    if (!selectedImport) return;
    
    if (dialogAction === 'revert') {
      revertImport.mutate(selectedImport.id);
    } else {
      deleteImport.mutate(selectedImport.id);
    }
    
    setDialogOpen(false);
    setSelectedImport(null);
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'completed':
        return { icon: CheckCircle, color: 'text-success', label: 'Concluído' };
      case 'review_needed':
        return { icon: Clock, color: 'text-warning', label: 'Pendente revisão' };
      case 'processing':
        return { icon: Loader2, color: 'text-primary', label: 'Processando' };
      case 'failed':
        return { icon: XCircle, color: 'text-destructive', label: 'Falhou' };
      case 'cancelled':
      case 'reverted':
        return { icon: Undo2, color: 'text-muted-foreground', label: status === 'cancelled' ? 'Cancelado' : 'Revertido' };
      default:
        return { icon: AlertCircle, color: 'text-muted-foreground', label: status };
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType === 'pdf') return File;
    return FileSpreadsheet;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (imports.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground text-sm">
          Nenhuma importação realizada ainda.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {imports.map((imp) => {
        const statusInfo = getStatusInfo(imp.status);
        const StatusIcon = statusInfo.icon;
        const FileIcon = getFileIcon(imp.file_type);
        const canRevert = imp.status === 'completed' && (imp.transactions_count || 0) > 0;
        const canReview = imp.status === 'review_needed';

        return (
          <div
            key={imp.id}
            className="p-3 rounded-xl bg-card border border-border/30"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <FileIcon className="w-5 h-5 text-muted-foreground" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground text-sm truncate">
                  {imp.file_name}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <Calendar className="w-3 h-3" />
                  <span>{formatDate(imp.created_at)}</span>
                  <span>•</span>
                  <span>{imp.transactions_count || 0} transações</span>
                </div>
                <div className={cn("flex items-center gap-1 text-xs mt-1", statusInfo.color)}>
                  <StatusIcon className={cn("w-3 h-3", imp.status === 'processing' && "animate-spin")} />
                  <span>{statusInfo.label}</span>
                </div>
              </div>

              <div className="flex gap-1">
                {canReview && onReviewImport && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => onReviewImport(imp.id)}
                  >
                    Revisar
                  </Button>
                )}
                {canRevert && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-warning"
                    onClick={() => handleRevertClick(imp)}
                    disabled={revertImport.isPending}
                  >
                    <Undo2 className="w-4 h-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => handleDeleteClick(imp)}
                  disabled={deleteImport.isPending}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        );
      })}

      <AlertDialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {dialogAction === 'revert' ? 'Reverter importação?' : 'Excluir importação?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {dialogAction === 'revert' 
                ? `Todas as ${selectedImport?.transactions_count || 0} transações desta importação serão excluídas. Esta ação não pode ser desfeita.`
                : 'O registro desta importação e suas transações serão permanentemente excluídos.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmAction}
              className={dialogAction === 'revert' 
                ? "bg-warning text-warning-foreground hover:bg-warning/90"
                : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
              }
            >
              {dialogAction === 'revert' ? 'Reverter' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
