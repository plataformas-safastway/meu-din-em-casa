import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
import { getCategoryById } from "@/data/categories";
import { formatCurrency, formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  User,
  Calendar,
  Clock,
  Edit3,
  Trash2,
  FileText,
  Upload,
  Camera,
  Link2,
  Target,
  Loader2,
  Lock,
  CreditCard,
  AlertTriangle,
  Wallet,
} from "lucide-react";
import { useDeleteTransaction } from "@/hooks/useTransactions";
import { useMyPermissions } from "@/hooks/useFamilyPermissions";
import { TransactionChangeHistory } from "@/components/transaction/TransactionChangeHistory";
import { toast } from "sonner";
import type { TransactionSource } from "@/hooks/useTransactions";

export interface TransactionDetail {
  id: string;
  type: "income" | "expense";
  amount: number;
  category: string;
  subcategory?: string;
  date: string;
  event_date?: string;      // When event occurred (cash-basis)
  cash_date?: string | null; // When money moved (cash-basis) - null for pending
  budget_month?: string | null; // YYYY-MM for budget allocation
  payment_method?: string;
  description?: string;
  created_at: string;
  // Audit fields
  source?: TransactionSource;
  created_by_user_id?: string;
  created_by_name?: string;
  last_edited_by_user_id?: string;
  last_edited_at?: string;
  // Goals
  goalId?: string;
  goalTitle?: string;
}

interface TransactionDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: TransactionDetail | null;
  onEdit?: (transaction: TransactionDetail) => void;
}

// Source display config
const sourceConfig: Record<TransactionSource, { icon: React.ReactNode; label: string; color: string }> = {
  MANUAL: { icon: <Edit3 className="w-3.5 h-3.5" />, label: "Manual", color: "text-blue-600" },
  UPLOAD: { icon: <Upload className="w-3.5 h-3.5" />, label: "Importação", color: "text-purple-600" },
  IMPORT: { icon: <FileText className="w-3.5 h-3.5" />, label: "Extrato", color: "text-orange-600" },
  OCR: { icon: <Camera className="w-3.5 h-3.5" />, label: "Foto/Recibo", color: "text-emerald-600" },
  OPEN_FINANCE: { icon: <Link2 className="w-3.5 h-3.5" />, label: "Open Finance", color: "text-teal-600" },
  GOAL_CONTRIBUTION: { icon: <Target className="w-3.5 h-3.5" />, label: "Objetivo", color: "text-amber-600" },
};

export function TransactionDetailSheet({
  open,
  onOpenChange,
  transaction,
  onEdit,
}: TransactionDetailSheetProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const deleteTransaction = useDeleteTransaction();
  const { data: myPermissions } = useMyPermissions();
  
  const canEdit = myPermissions?.can_edit_all ?? false;
  const canDelete = myPermissions?.can_delete_transactions ?? false;

  if (!transaction) return null;

  const category = getCategoryById(transaction.category);
  const isExpense = transaction.type === "expense";
  const source = (transaction.source as TransactionSource) || "MANUAL";
  const sourceInfo = sourceConfig[source];

  const handleDelete = async () => {
    if (!canDelete) {
      toast.error("Sem permissão para excluir");
      return;
    }

    try {
      await deleteTransaction.mutateAsync(transaction.id);
      toast.success("Transação excluída");
      setShowDeleteConfirm(false);
      onOpenChange(false);
    } catch (error) {
      toast.error("Erro ao excluir transação");
    }
  };

  const handleEdit = () => {
    if (!canEdit) {
      toast.error("Sem permissão para editar");
      return;
    }
    onEdit?.(transaction);
    onOpenChange(false);
  };

  // Format datetime for display
  const formatDateTime = (isoString: string) => {
    try {
      return format(new Date(isoString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return isoString;
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-auto max-h-[85vh] rounded-t-3xl">
          <SheetHeader className="text-left pb-4">
            <div className="flex items-center gap-3">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
                style={{ backgroundColor: `${category?.color}20` }}
              >
                {category?.icon || "📦"}
              </div>
              <div className="flex-1">
                <SheetTitle className="text-lg">
                  {transaction.description || category?.name || "Transação"}
                </SheetTitle>
                <SheetDescription>
                  {category?.name} • {formatDate(transaction.date)}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <div className="space-y-4 pb-6">
            {/* Amount */}
            <div className="text-center py-4 bg-muted/30 rounded-xl">
              <p className="text-3xl font-bold">
                <span className={cn(isExpense ? "text-destructive" : "text-success")}>
                  {isExpense ? "-" : "+"}
                  {formatCurrency(transaction.amount)}
                </span>
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {isExpense ? "Despesa" : "Receita"}
              </p>
            </div>

            {/* Cash-basis dates info */}
            {(transaction.payment_method === "credit" || transaction.payment_method === "cheque") && (
              <div className="bg-muted/30 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Wallet className="w-4 h-4 text-primary" />
                  <span>Regime de Caixa</span>
                </div>
                
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <p className="text-muted-foreground">Data do Evento</p>
                    <p className="font-medium">{formatDate(transaction.event_date || transaction.date)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Mês do Orçamento</p>
                    {transaction.cash_date ? (
                      <p className="font-medium">{transaction.budget_month || "—"}</p>
                    ) : (
                      <div className="flex items-center gap-1 text-warning">
                        <AlertTriangle className="w-3 h-3" />
                        <span className="font-medium">Pendente</span>
                      </div>
                    )}
                  </div>
                </div>
                
                {!transaction.cash_date && transaction.payment_method === "credit" && (
                  <p className="text-xs text-muted-foreground">
                    Compras no cartão entram no orçamento no mês do pagamento da fatura.
                  </p>
                )}
                {!transaction.cash_date && transaction.payment_method === "cheque" && (
                  <p className="text-xs text-muted-foreground">
                    Cheques entram no orçamento após informar a data de compensação.
                  </p>
                )}
              </div>
            )}

            <Separator />

            {/* Source & Author Info */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">Origem do Lançamento</h4>
              
              {/* Source Badge */}
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={cn("gap-1.5", sourceInfo.color)}>
                  {sourceInfo.icon}
                  {sourceInfo.label}
                </Badge>
              </div>

              {/* Author */}
              {transaction.created_by_name && (
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span>Inserido por <strong>{transaction.created_by_name}</strong></span>
                </div>
              )}

              {/* Created At */}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>{formatDateTime(transaction.created_at)}</span>
              </div>

              {/* Last Edited */}
              {transaction.last_edited_at && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>Editado em {formatDateTime(transaction.last_edited_at)}</span>
                </div>
              )}

              {/* Goal reference */}
              {transaction.goalTitle && (
                <div className="flex items-center gap-2 text-sm">
                  <Target className="w-4 h-4 text-amber-600" />
                  <span>Vinculado ao objetivo: <strong>{transaction.goalTitle}</strong></span>
                </div>
              )}
            </div>

            {/* Change History */}
            <TransactionChangeHistory transactionId={transaction.id} />

            <Separator />

            {/* Action Buttons */}
            <div className="flex gap-3">
              {canDelete && (
                <Button
                  variant="outline"
                  size="lg"
                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={deleteTransaction.isPending}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
              <Button
                className="flex-1"
                size="lg"
                onClick={handleEdit}
                disabled={!canEdit}
              >
                {!canEdit ? (
                  <>
                    <Lock className="w-4 h-4 mr-2" />
                    Sem Permissão
                  </>
                ) : (
                  <>
                    <Edit3 className="w-4 h-4 mr-2" />
                    Editar
                  </>
                )}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lançamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O lançamento será removido permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteTransaction.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
