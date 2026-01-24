import { useState, useEffect } from "react";
import { Save, Loader2, Trash2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
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
import { useUpdateTransaction, useDeleteTransaction } from "@/hooks/useTransactions";
import { useMyPermissions } from "@/hooks/useFamilyPermissions";

interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  subcategory?: string;
  date: string;
  description?: string;
}

interface EditTransactionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
}

export function EditTransactionSheet({ open, onOpenChange, transaction }: EditTransactionSheetProps) {
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: myPermissions } = useMyPermissions();
  const updateTransaction = useUpdateTransaction();
  const deleteTransaction = useDeleteTransaction();

  const canEdit = myPermissions?.can_edit_all ?? false;
  const canDelete = myPermissions?.can_delete_transactions ?? false;

  useEffect(() => {
    if (transaction) {
      setCategoryId(transaction.category);
      setDescription(transaction.description || "");
      setAmount(transaction.amount.toFixed(2).replace('.', ','));
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

    const parsedAmount = parseAmount(amount);
    if (parsedAmount <= 0) {
      toast.error("Valor inválido");
      return;
    }

    try {
      await updateTransaction.mutateAsync({
        id: transaction.id,
        data: {
          category_id: categoryId,
          description: description.trim() || null,
          amount: parsedAmount,
        },
      });
      toast.success("Transação atualizada");
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating transaction:', error);
      toast.error("Erro ao atualizar transação");
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
          {/* Amount */}
          <div className="space-y-2">
            <Label>Valor</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                R$
              </span>
              <Input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                className="pl-10 text-lg font-semibold h-12"
                placeholder="0,00"
              />
            </div>
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
              disabled={updateTransaction.isPending || !canEdit}
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
