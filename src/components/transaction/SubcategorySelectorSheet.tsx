/**
 * SubcategorySelectorSheet
 * 
 * Sheet para seleção de subcategoria com opção de criar nova inline.
 * Exigido quando uma categoria é selecionada.
 */

import { useState, useMemo } from "react";
import { Check, Plus, ChevronRight, AlertCircle, Edit3, Settings } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CategoryIcon } from "@/components/category";
import { 
  useCreateUserSubcategory, 
  UserCategory, 
  UserSubcategory 
} from "@/hooks/useUserCategories";
import { Category, Subcategory } from "@/types/finance";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface SubcategorySelectorSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category | UserCategory | null;
  value: string;
  onChange: (subcategoryId: string) => void;
  onManageCategories?: () => void;
}

export function SubcategorySelectorSheet({
  open,
  onOpenChange,
  category,
  value,
  onChange,
  onManageCategories,
}: SubcategorySelectorSheetProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newSubcategoryName, setNewSubcategoryName] = useState("");

  const createSubcategory = useCreateUserSubcategory();

  // Get subcategories from category
  const subcategories = useMemo(() => {
    if (!category) return [];
    
    // Check if it's a UserCategory (has icon_key property)
    if ('icon_key' in category) {
      return (category.subcategories || []).filter(sub => sub.status === 'ACTIVE');
    }
    
    // Default category
    return category.subcategories || [];
  }, [category]);

  const isUserCategory = category && 'icon_key' in category;
  const hasSubcategories = subcategories.length > 0;

  const handleSelect = (subcategoryId: string) => {
    onChange(subcategoryId);
    onOpenChange(false);
  };

  const handleCreateSubcategory = async () => {
    if (!newSubcategoryName.trim() || !category) return;

    if (!isUserCategory) {
      toast.error("Não é possível adicionar subcategorias a categorias padrão. Use categorias personalizadas.");
      return;
    }

    try {
      const result = await createSubcategory.mutateAsync({
        category_id: category.id,
        name: newSubcategoryName.trim(),
      });

      // Auto-select the new subcategory
      onChange(result.id);
      setNewSubcategoryName("");
      setShowCreateForm(false);
      onOpenChange(false);
    } catch (error) {
      console.error("Error creating subcategory:", error);
    }
  };

  if (!category) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <button
              onClick={() => onOpenChange(false)}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground min-h-[44px] -ml-2"
            >
              <ChevronRight className="w-5 h-5 rotate-180" />
            </button>
            {'icon_key' in category ? (
              <CategoryIcon iconKey={category.icon_key} className="w-6 h-6 text-primary" />
            ) : (
              <span className="text-2xl">{category.icon}</span>
            )}
            {category.name}
          </SheetTitle>
          <SheetDescription>
            Selecione ou crie uma subcategoria
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4 pb-6">
            {/* Empty State - No Subcategories */}
            {!hasSubcategories && !showCreateForm && (
              <Alert className="border-warning bg-warning/10">
                <AlertCircle className="h-4 w-4 text-warning" />
                <AlertDescription>
                  <span className="font-medium">Esta categoria ainda não possui subcategorias.</span>
                  <br />
                  <span className="text-sm text-muted-foreground">
                    {isUserCategory 
                      ? "Crie uma subcategoria para continuar."
                      : "Use categorias personalizadas para adicionar subcategorias."}
                  </span>
                </AlertDescription>
              </Alert>
            )}

            {/* Create New Subcategory Form */}
            {showCreateForm ? (
              <div className="space-y-4 p-4 rounded-xl border-2 border-dashed border-primary/50 bg-primary/5">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nome da subcategoria</label>
                  <Input
                    value={newSubcategoryName}
                    onChange={(e) => setNewSubcategoryName(e.target.value)}
                    placeholder="Ex: Netflix, Spotify..."
                    className="h-12"
                    autoFocus
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowCreateForm(false);
                      setNewSubcategoryName("");
                    }}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleCreateSubcategory}
                    disabled={!newSubcategoryName.trim() || createSubcategory.isPending}
                    className="flex-1"
                  >
                    {createSubcategory.isPending ? "Criando..." : "Criar e selecionar"}
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {/* Add Subcategory Button */}
                {isUserCategory && (
                  <Button
                    variant="outline"
                    className="w-full h-12 border-dashed"
                    onClick={() => setShowCreateForm(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Nova Subcategoria
                  </Button>
                )}

                {/* Subcategories List */}
                {hasSubcategories && (
                  <div className="space-y-2">
                    {subcategories.map((sub) => {
                      const subId = 'id' in sub ? sub.id : '';
                      const subName = 'name' in sub ? sub.name : '';
                      
                      return (
                        <button
                          key={subId}
                          type="button"
                          onClick={() => handleSelect(subId)}
                          className={cn(
                            "w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left min-h-[52px] active:scale-[0.98]",
                            value === subId
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          <span className="font-medium text-base">{subName}</span>
                          {value === subId && <Check className="w-5 h-5 text-primary" />}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Manage Categories Link */}
                {onManageCategories && (
                  <div className="pt-4 border-t">
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-muted-foreground"
                      onClick={() => {
                        onOpenChange(false);
                        onManageCategories();
                      }}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Gerenciar categorias
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
