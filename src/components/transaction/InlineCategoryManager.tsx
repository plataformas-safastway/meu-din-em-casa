/**
 * InlineCategoryManager
 * 
 * Componente para gestão inline de categorias e subcategorias
 * durante o fluxo de lançamento de transações.
 * 
 * Permite:
 * - Criar categoria
 * - Criar subcategoria
 * - Editar nome de categoria/subcategoria
 * - Excluir categoria/subcategoria (com decisão de impacto)
 */

import { useState } from "react";
import { Plus, Edit3, Trash2, ChevronRight, AlertTriangle } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { IconPicker, CategoryIcon } from "@/components/category";
import {
  useUserCategories,
  useCreateUserCategory,
  useCreateUserSubcategory,
  useRenameUserCategory,
  useArchiveUserCategory,
  useArchiveUserSubcategory,
  useCategoryTransactionCount,
  UserCategory,
  UserSubcategory,
} from "@/hooks/useUserCategories";
import { cn } from "@/lib/utils";

interface InlineCategoryManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'income' | 'expense';
  mode: 'create-category' | 'create-subcategory' | 'edit-category' | 'edit-subcategory' | 'manage-subcategories';
  selectedCategory?: UserCategory | null;
  selectedSubcategory?: UserSubcategory | null;
  onCategoryCreated?: (categoryId: string) => void;
  onSubcategoryCreated?: (subcategoryId: string) => void;
  onCategoryUpdated?: () => void;
  onSubcategoryUpdated?: () => void;
}

export function InlineCategoryManager({
  open,
  onOpenChange,
  type,
  mode,
  selectedCategory,
  selectedSubcategory,
  onCategoryCreated,
  onSubcategoryCreated,
  onCategoryUpdated,
  onSubcategoryUpdated,
}: InlineCategoryManagerProps) {
  // Form states
  const [name, setName] = useState("");
  const [iconKey, setIconKey] = useState("circle-help");
  
  // Impact decision dialog
  const [showImpactDialog, setShowImpactDialog] = useState(false);
  const [impactAction, setImpactAction] = useState<'rename' | 'delete' | null>(null);
  const [transactionCount, setTransactionCount] = useState(0);

  // Hooks
  const createCategory = useCreateUserCategory();
  const createSubcategory = useCreateUserSubcategory();
  const renameCategory = useRenameUserCategory();
  const archiveCategory = useArchiveUserCategory();
  const archiveSubcategory = useArchiveUserSubcategory();
  const getTransactionCount = useCategoryTransactionCount();

  // Reset form when mode changes
  useState(() => {
    if (mode === 'edit-category' && selectedCategory) {
      setName(selectedCategory.name);
      setIconKey(selectedCategory.icon_key);
    } else if (mode === 'edit-subcategory' && selectedSubcategory) {
      setName(selectedSubcategory.name);
    } else {
      setName("");
      setIconKey("circle-help");
    }
  });

  const handleCreateCategory = async () => {
    if (!name.trim()) return;

    const result = await createCategory.mutateAsync({
      name: name.trim(),
      icon_key: iconKey,
      type,
    });

    onOpenChange(false);
    onCategoryCreated?.(result.id);
  };

  const handleCreateSubcategory = async () => {
    if (!name.trim() || !selectedCategory) return;

    const result = await createSubcategory.mutateAsync({
      category_id: selectedCategory.id,
      name: name.trim(),
    });

    onOpenChange(false);
    onSubcategoryCreated?.(result.id);
  };

  const handleStartRename = async () => {
    if (!name.trim()) return;

    if (mode === 'edit-category' && selectedCategory) {
      const count = await getTransactionCount.mutateAsync(selectedCategory.id);
      if (count > 0) {
        setTransactionCount(count);
        setImpactAction('rename');
        setShowImpactDialog(true);
      } else {
        await handleConfirmRename(false);
      }
    }
  };

  const handleConfirmRename = async (createNewVersion: boolean) => {
    if (!selectedCategory) return;

    await renameCategory.mutateAsync({
      categoryId: selectedCategory.id,
      newName: name.trim(),
      createNewVersion,
    });

    setShowImpactDialog(false);
    onOpenChange(false);
    onCategoryUpdated?.();
  };

  const handleStartDelete = async () => {
    if (mode === 'edit-category' && selectedCategory) {
      const count = await getTransactionCount.mutateAsync(selectedCategory.id);
      if (count > 0) {
        setTransactionCount(count);
        setImpactAction('delete');
        setShowImpactDialog(true);
      } else {
        await handleConfirmDelete();
      }
    } else if (mode === 'edit-subcategory' && selectedSubcategory) {
      // For subcategory, check if has transactions
      // For now, just archive
      await archiveSubcategory.mutateAsync(selectedSubcategory.id);
      onOpenChange(false);
      onSubcategoryUpdated?.();
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedCategory) return;

    await archiveCategory.mutateAsync(selectedCategory.id);
    setShowImpactDialog(false);
    onOpenChange(false);
    onCategoryUpdated?.();
  };

  const getTitle = () => {
    switch (mode) {
      case 'create-category':
        return 'Nova Categoria';
      case 'create-subcategory':
        return `Nova Subcategoria`;
      case 'edit-category':
        return 'Editar Categoria';
      case 'edit-subcategory':
        return 'Editar Subcategoria';
      case 'manage-subcategories':
        return selectedCategory?.name || 'Subcategorias';
      default:
        return 'Gerenciar';
    }
  };

  const handleSubmit = () => {
    switch (mode) {
      case 'create-category':
        handleCreateCategory();
        break;
      case 'create-subcategory':
        handleCreateSubcategory();
        break;
      case 'edit-category':
        handleStartRename();
        break;
      default:
        break;
    }
  };

  const isLoading = createCategory.isPending || createSubcategory.isPending || renameCategory.isPending;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-auto max-h-[80vh] rounded-t-3xl">
          <SheetHeader className="pb-4">
            <SheetTitle>{getTitle()}</SheetTitle>
            {mode === 'create-subcategory' && selectedCategory && (
              <SheetDescription>
                Adicionar em <strong>{selectedCategory.name}</strong>
              </SheetDescription>
            )}
          </SheetHeader>

          <div className="space-y-6 pb-6">
            {/* Name Input */}
            <div className="space-y-2">
              <Label>Nome <span className="text-destructive">*</span></Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={mode.includes('category') ? "Ex: Streaming, Academia..." : "Ex: Netflix, Spotify..."}
                className="h-12"
                autoFocus
              />
            </div>

            {/* Icon Picker (only for categories) */}
            {(mode === 'create-category' || mode === 'edit-category') && (
              <div className="space-y-2">
                <Label>Ícone <span className="text-destructive">*</span></Label>
                <IconPicker
                  value={iconKey}
                  onChange={setIconKey}
                />
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              {(mode === 'edit-category' || mode === 'edit-subcategory') && (
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={handleStartDelete}
                  disabled={isLoading}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!name.trim() || isLoading}
                className="flex-1"
              >
                {isLoading ? 'Salvando...' : mode.includes('create') ? 'Criar' : 'Salvar'}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Impact Decision Dialog */}
      <AlertDialog open={showImpactDialog} onOpenChange={setShowImpactDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-warning" />
              {impactAction === 'rename' ? 'Categoria em uso' : 'Excluir categoria?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                Esta categoria está vinculada a <strong>{transactionCount} transações</strong>.
              </p>
              
              {impactAction === 'rename' ? (
                <div className="space-y-3 text-left">
                  <p className="font-medium text-foreground">Como deseja aplicar a mudança?</p>
                  <div className="space-y-2 text-sm">
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="font-medium">🔄 Reclassificar histórico</p>
                      <p className="text-muted-foreground">O novo nome será aplicado também às transações anteriores.</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/50">
                      <p className="font-medium">➡️ Aplicar apenas daqui para frente</p>
                      <p className="text-muted-foreground">Transações antigas mantêm a classificação anterior.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <p>
                  Ao excluir, as transações existentes manterão a categoria arquivada para histórico.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            {impactAction === 'rename' ? (
              <>
                <AlertDialogAction
                  onClick={() => handleConfirmRename(true)}
                  className="bg-secondary text-secondary-foreground hover:bg-secondary/80"
                >
                  Apenas daqui para frente
                </AlertDialogAction>
                <AlertDialogAction onClick={() => handleConfirmRename(false)}>
                  Reclassificar histórico
                </AlertDialogAction>
              </>
            ) : (
              <AlertDialogAction
                onClick={handleConfirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir categoria
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
