import { useState, useEffect, useRef } from "react";
import { Save, Loader2, Trash2, Lock, AlertTriangle, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { defaultCategories, getCategoryById } from "@/data/categories";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useUpdateTransaction, useDeleteTransaction, TransactionSource } from "@/hooks/useTransactions";
import { useMyPermissions } from "@/hooks/useFamilyPermissions";
import { useLogTransactionChanges, detectChanges } from "@/hooks/useTransactionChangeLogs";

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  subcategory?: string;
  date: string;
  description?: string;
  source?: TransactionSource;
  ocr_confidence?: number;
}

interface EditTransactionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
}

// Fields that can be edited based on source
const EDITABLE_FIELDS_BY_SOURCE: Record<TransactionSource, {
  date: boolean;
  amount: boolean;
  description: boolean;
  category: boolean;
  subcategory: boolean;
}> = {
  MANUAL: { date: true, amount: true, description: true, category: true, subcategory: true },
  OCR: { date: true, amount: true, description: true, category: true, subcategory: true },
  UPLOAD: { date: false, amount: false, description: true, category: true, subcategory: true },
  IMPORT: { date: false, amount: false, description: true, category: true, subcategory: true },
  OPEN_FINANCE: { date: false, amount: false, description: true, category: true, subcategory: true },
  GOAL_CONTRIBUTION: { date: false, amount: false, description: true, category: true, subcategory: true },
};

// Messages for blocked fields
const SOURCE_BLOCK_MESSAGES: Partial<Record<TransactionSource, string>> = {
  UPLOAD: "Data e valor vêm do extrato importado e não podem ser alterados.",
  IMPORT: "Data e valor vêm do extrato importado e não podem ser alterados.",
  OPEN_FINANCE: "Data e valor vêm da instituição financeira e não podem ser alterados.",
  GOAL_CONTRIBUTION: "Data e valor vêm do aporte ao objetivo e não podem ser alterados.",
};

export function EditTransactionSheet({ open, onOpenChange, transaction }: EditTransactionSheetProps) {
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [ocrConfirmed, setOcrConfirmed] = useState(false);
  
  // Store original values for change detection
  const originalValuesRef = useRef<Record<string, any>>({});

  const { data: myPermissions } = useMyPermissions();
  const updateTransaction = useUpdateTransaction();
  const deleteTransaction = useDeleteTransaction();
  const logChanges = useLogTransactionChanges();

  const canEdit = myPermissions?.can_edit_all ?? false;
  const canDelete = myPermissions?.can_delete_transactions ?? false;

  // Get source and editable fields
  const source: TransactionSource = transaction?.source || 'MANUAL';
  const editableFields = EDITABLE_FIELDS_BY_SOURCE[source];
  const blockMessage = SOURCE_BLOCK_MESSAGES[source];
  const isOcr = source === 'OCR';

  useEffect(() => {
    if (transaction) {
      setCategoryId(transaction.category);
      setDescription(transaction.description || "");
      setAmount(transaction.amount.toFixed(2).replace('.', ','));
      setDate(transaction.date);
      setOcrConfirmed(false);
      
      // Store original values for change detection
      originalValuesRef.current = {
        category_id: transaction.category,
        description: transaction.description || null,
        amount: transaction.amount,
        date: transaction.date,
      };
    }
  }, [transaction]);

  const handleAmountChange = (value: string) => {
    const cleanValue = value.replace(/[^\d,]/g, '');
    setAmount(cleanValue);
  };

  const parseAmount = (value: string): number => {
    const cleanValue = value.replace(/\./g, '').replace(',', '.');
    return parseFloat(cleanValue) || 0;
  };

  const handleSave = async () => {
    if (!transaction) return;

    if (!canEdit) {
      toast.error("Sem permissão", {
        description: "Você não tem permissão para editar lançamentos.",
      });
      return;
    }

    // For OCR, require confirmation
    if (isOcr && !ocrConfirmed) {
      toast.error("Confirme os dados", {
        description: "Marque a confirmação antes de salvar dados extraídos por OCR.",
      });
      return;
    }

    const parsedAmount = parseAmount(amount);
    if (editableFields.amount && parsedAmount <= 0) {
      toast.error("Valor inválido");
      return;
    }

    try {
      // Build update data based on editable fields
      const updateData: Record<string, unknown> = {
        category_id: categoryId,
        // Use user_description for non-manual sources
        ...(source !== 'MANUAL' 
          ? { user_description: description.trim() || null }
          : { description: description.trim() || null }
        ),
      };

      // Only include amount if editable
      if (editableFields.amount) {
        updateData.amount = parsedAmount;
      }

      // Only include date if editable
      if (editableFields.date) {
        updateData.date = date;
      }

      await updateTransaction.mutateAsync({
        id: transaction.id,
        data: updateData as any,
      });
      
      // Detect and log changes asynchronously (non-blocking)
      const newValues: Record<string, any> = {
        category_id: categoryId,
        description: description.trim() || null,
        amount: editableFields.amount ? parsedAmount : originalValuesRef.current.amount,
        date: editableFields.date ? date : originalValuesRef.current.date,
      };
      
      const changes = detectChanges(
        transaction.id,
        originalValuesRef.current,
        newValues,
        source
      );
      
      if (changes.length > 0) {
        // Fire and forget - don't await
        logChanges.mutate(changes);
      }
      
      toast.success("Transação atualizada");
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating transaction:', error);
      // Handle specific backend error messages
      if (error?.message?.includes('Cannot modify')) {
        toast.error("Operação não permitida", {
          description: error.message,
        });
      } else {
        toast.error("Erro ao atualizar transação");
      }
    }
  };

  const handleDelete = async () => {
    if (!transaction) return;

    if (!canDelete) {
      toast.error("Sem permissão", {
        description: "Você não tem permissão para excluir lançamentos.",
      });
      return;
    }

    try {
      await deleteTransaction.mutateAsync(transaction.id);
      toast.success("Transação excluída");
      setShowDeleteConfirm(false);
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting transaction:', error);
      toast.error("Erro ao excluir transação");
    }
  };

  if (!transaction) return null;

  const category = getCategoryById(transaction.category);
  const filteredCategories = defaultCategories.filter(c => c.type === transaction.type);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[85vh] rounded-t-3xl">
        <SheetHeader className="text-left">
          <SheetTitle>Editar Transação</SheetTitle>
          <SheetDescription>
            {transaction.type === 'expense' ? 'Despesa' : 'Receita'} de {formatCurrency(transaction.amount)}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 mt-6 pb-6">
          {/* OCR Warning */}
          {isOcr && (
            <Alert className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 dark:text-amber-200">
                Dados extraídos automaticamente de foto — confira antes de salvar.
                {transaction.ocr_confidence !== undefined && (
                  <span className="block text-xs mt-1">
                    Confiança: {transaction.ocr_confidence}%
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Block message for restricted sources */}
          {blockMessage && (
            <Alert className="border-muted">
              <Info className="h-4 w-4" />
              <AlertDescription className="text-muted-foreground text-sm">
                {blockMessage}
              </AlertDescription>
            </Alert>
          )}

          {/* Amount */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              Valor
              {!editableFields.amount && <Lock className="w-3 h-3 text-muted-foreground" />}
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                R$
              </span>
              <Input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                className={cn(
                  "pl-10 text-lg font-semibold h-12",
                  !editableFields.amount && "bg-muted cursor-not-allowed opacity-70"
                )}
                placeholder="0,00"
                disabled={!editableFields.amount}
                readOnly={!editableFields.amount}
              />
            </div>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              Data
              {!editableFields.date && <Lock className="w-3 h-3 text-muted-foreground" />}
            </Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={cn(
                "h-12",
                !editableFields.date && "bg-muted cursor-not-allowed opacity-70"
              )}
              disabled={!editableFields.date}
              readOnly={!editableFields.date}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Supermercado, Aluguel..."
              className="h-12"
              maxLength={255}
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label>Categoria</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Selecione uma categoria" />
              </SelectTrigger>
              <SelectContent>
                {filteredCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    <div className="flex items-center gap-2">
                      <span>{cat.icon}</span>
                      <span>{cat.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Current category preview */}
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Categoria atual</p>
            <div className="flex items-center gap-2">
              <span 
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `${getCategoryById(categoryId)?.color}20` }}
              >
                {getCategoryById(categoryId)?.icon || category?.icon}
              </span>
              <span className="font-medium">
                {getCategoryById(categoryId)?.name || category?.name}
              </span>
            </div>
          </div>

          {/* OCR Confirmation Checkbox */}
          {isOcr && (
            <label className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/30 transition-colors">
              <input
                type="checkbox"
                checked={ocrConfirmed}
                onChange={(e) => setOcrConfirmed(e.target.checked)}
                className="w-5 h-5 rounded border-primary text-primary focus:ring-primary"
              />
              <span className="text-sm">
                Confirmo que revisei os dados extraídos
              </span>
            </label>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            {canDelete && (
              <Button
                variant="outline"
                className="h-12 text-destructive border-destructive/30 hover:bg-destructive/10"
                onClick={() => setShowDeleteConfirm(true)}
                disabled={deleteTransaction.isPending}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
            <Button
              className="flex-1 h-12"
              onClick={handleSave}
              disabled={updateTransaction.isPending || !canEdit || (isOcr && !ocrConfirmed)}
            >
              {updateTransaction.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : !canEdit ? (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Sem Permissão
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </div>
        </div>
      </SheetContent>

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
    </Sheet>
  );
}
