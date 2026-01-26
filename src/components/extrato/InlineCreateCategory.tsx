import { useState } from "react";
import { Plus, Folder, FolderTree, ChevronLeft, Loader2, AlertCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { IconPicker, CategoryIcon } from "@/components/category";
import { useCreateUserCategory, useUserCategories } from "@/hooks/useUserCategories";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type CreateMode = 'select' | 'category' | 'subcategory';

interface InlineCreateCategoryProps {
  open: boolean;
  onClose: () => void;
  onCreated: (categoryId: string, subcategoryId: string | null, categoryName: string, subcategoryName?: string) => void;
  suggestedName?: string;
  selectedCount?: number;
  transactionDescriptions?: string[];
}

export function InlineCreateCategory({
  open,
  onClose,
  onCreated,
  suggestedName = "",
  selectedCount = 0,
  transactionDescriptions = [],
}: InlineCreateCategoryProps) {
  const { family, user } = useAuth();
  const [mode, setMode] = useState<CreateMode>('select');
  const [categoryName, setCategoryName] = useState(suggestedName);
  const [subcategoryName, setSubcategoryName] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("folder");
  const [parentCategoryId, setParentCategoryId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createCategoryMutation = useCreateUserCategory();
  const { data: userCategories = [], refetch: refetchCategories } = useUserCategories(false);

  // Reset state
  const resetState = () => {
    setMode('select');
    setCategoryName(suggestedName);
    setSubcategoryName("");
    setSelectedIcon("folder");
    setParentCategoryId(null);
    setError(null);
    setIsLoading(false);
  };

  // Handle close
  const handleClose = () => {
    resetState();
    onClose();
  };

  // Get parent category object
  const parentCategory = userCategories.find(c => c.id === parentCategoryId);

  // Check for duplicate names
  const checkDuplicateCategoryName = (name: string) => {
    return userCategories.some(
      cat => cat.name.toLowerCase().trim() === name.toLowerCase().trim()
    );
  };

  const checkDuplicateSubcategoryName = (name: string, categoryId: string) => {
    const category = userCategories.find(c => c.id === categoryId);
    return category?.subcategories?.some(
      sub => sub.name.toLowerCase().trim() === name.toLowerCase().trim()
    );
  };

  // Create category
  const handleCreateCategory = async () => {
    const trimmedName = categoryName.trim();
    if (!trimmedName) {
      setError("Nome é obrigatório");
      return;
    }

    if (!selectedIcon) {
      setError("Selecione um ícone");
      return;
    }

    if (checkDuplicateCategoryName(trimmedName)) {
      setError(`Já existe uma categoria chamada "${trimmedName}". Deseja usar a existente?`);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await createCategoryMutation.mutateAsync({
        name: trimmedName,
        icon_key: selectedIcon,
        type: 'expense',
        source: 'USER_CUSTOM',
      });

      await refetchCategories();
      onCreated(result.id, null, result.name);
      handleClose();
      toast.success(`Categoria "${trimmedName}" criada!`, {
        description: `Será aplicada em ${selectedCount} transações.`,
      });
    } catch (err) {
      console.error("Error creating category:", err);
      setError("Erro ao criar categoria");
    } finally {
      setIsLoading(false);
    }
  };

  // Create subcategory
  const handleCreateSubcategory = async () => {
    const trimmedName = subcategoryName.trim();
    if (!trimmedName) {
      setError("Nome é obrigatório");
      return;
    }

    if (!parentCategoryId) {
      setError("Selecione uma categoria pai");
      return;
    }

    if (checkDuplicateSubcategoryName(trimmedName, parentCategoryId)) {
      setError(`Já existe uma subcategoria "${trimmedName}" nessa categoria.`);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: insertError } = await supabase
        .from("user_subcategories")
        .insert({
          category_id: parentCategoryId,
          family_id: family?.id,
          name: trimmedName,
          status: 'ACTIVE',
          display_order: 100,
          created_by_user_id: user?.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Log the creation
      await supabase.from("category_change_logs").insert({
        family_id: family?.id,
        category_id: parentCategoryId,
        subcategory_id: data.id,
        action: 'SUBCATEGORY_CREATED',
        new_name: trimmedName,
        performed_by_user_id: user?.id,
        metadata: { context: 'bulk_action' },
      });

      await refetchCategories();
      onCreated(parentCategoryId, data.id, parentCategory?.name || "", trimmedName);
      handleClose();
      toast.success(`Subcategoria "${trimmedName}" criada!`, {
        description: `Será aplicada em ${selectedCount} transações.`,
      });
    } catch (err) {
      console.error("Error creating subcategory:", err);
      setError("Erro ao criar subcategoria");
    } finally {
      setIsLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="absolute inset-0 bg-background z-10 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 pb-4 border-b">
        <Button
          variant="ghost"
          size="icon"
          onClick={mode === 'select' ? handleClose : () => setMode('select')}
          className="shrink-0"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <div>
          <h3 className="font-semibold">
            {mode === 'select' && "Criar nova"}
            {mode === 'category' && "Nova categoria"}
            {mode === 'subcategory' && "Nova subcategoria"}
          </h3>
          <p className="text-xs text-muted-foreground">
            Será aplicada em {selectedCount} {selectedCount === 1 ? 'transação' : 'transações'}
          </p>
        </div>
      </div>

      <ScrollArea className="flex-1 py-4">
        {/* Mode Selection */}
        {mode === 'select' && (
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setMode('category')}
              className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-primary/50 transition-all text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Folder className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Criar categoria</p>
                <p className="text-sm text-muted-foreground">
                  Nova categoria com ícone personalizado
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setMode('subcategory')}
              className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-border hover:border-primary/50 transition-all text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-secondary/50 flex items-center justify-center">
                <FolderTree className="w-6 h-6 text-muted-foreground" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Criar subcategoria</p>
                <p className="text-sm text-muted-foreground">
                  Vincular a uma categoria existente
                </p>
              </div>
            </button>
          </div>
        )}

        {/* Create Category Form */}
        {mode === 'category' && (
          <div className="space-y-4">
            {/* Name Input */}
            <div className="space-y-2">
              <Label htmlFor="category-name">Nome da categoria</Label>
              <Input
                id="category-name"
                placeholder="Ex: Alimentação"
                value={categoryName}
                onChange={(e) => {
                  setCategoryName(e.target.value);
                  setError(null);
                }}
                className="h-12"
                autoFocus
              />
            </div>

            {/* Icon Picker */}
            <div className="space-y-2">
              <Label>Ícone</Label>
              <IconPicker
                value={selectedIcon}
                onChange={setSelectedIcon}
              />
            </div>

            {/* Error */}
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
          </div>
        )}

        {/* Create Subcategory Form */}
        {mode === 'subcategory' && (
          <div className="space-y-4">
            {/* Parent Category Selector */}
            <div className="space-y-2">
              <Label>Categoria pai</Label>
              <div className="grid grid-cols-3 gap-2 max-h-40 overflow-y-auto">
                {userCategories
                  .filter(cat => cat.type === 'expense' && cat.status === 'ACTIVE')
                  .map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => {
                        setParentCategoryId(cat.id);
                        setError(null);
                      }}
                      className={cn(
                        "flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all text-center",
                        parentCategoryId === cat.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      <CategoryIcon iconKey={cat.icon_key} className="w-5 h-5 text-primary" />
                      <span className="text-[10px] leading-tight text-muted-foreground line-clamp-2">
                        {cat.name}
                      </span>
                    </button>
                  ))}
              </div>
              {userCategories.filter(cat => cat.type === 'expense' && cat.status === 'ACTIVE').length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma categoria personalizada. Crie uma categoria primeiro.
                </p>
              )}
            </div>

            {/* Subcategory Name */}
            {parentCategoryId && (
              <div className="space-y-2">
                <Label htmlFor="subcategory-name">Nome da subcategoria</Label>
                <Input
                  id="subcategory-name"
                  placeholder="Ex: Restaurantes"
                  value={subcategoryName}
                  onChange={(e) => {
                    setSubcategoryName(e.target.value);
                    setError(null);
                  }}
                  className="h-12"
                  autoFocus
                />
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Action Buttons */}
      {mode !== 'select' && (
        <div className="flex gap-3 pt-4 border-t">
          <Button
            variant="outline"
            className="flex-1 h-12"
            onClick={() => setMode('select')}
            disabled={isLoading}
          >
            Voltar
          </Button>
          <Button
            className="flex-1 h-12 gap-2"
            onClick={mode === 'category' ? handleCreateCategory : handleCreateSubcategory}
            disabled={
              isLoading ||
              (mode === 'category' && (!categoryName.trim() || !selectedIcon)) ||
              (mode === 'subcategory' && (!parentCategoryId || !subcategoryName.trim()))
            }
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Criando...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                Criar e aplicar
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
