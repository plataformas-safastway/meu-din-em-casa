import { useState, useMemo } from "react";
import { Tag, Check, ChevronRight, Loader2, AlertCircle } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { defaultCategories, getCategoryById } from "@/data/categories";
import { useUserCategories } from "@/hooks/useUserCategories";
import { CategoryIcon } from "@/components/category";
import { cn } from "@/lib/utils";

interface BulkCategoryChangeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  onConfirm: (categoryId: string, subcategoryId: string | null) => void;
  isLoading?: boolean;
}

export function BulkCategoryChangeSheet({
  open,
  onOpenChange,
  selectedCount,
  onConfirm,
  isLoading,
}: BulkCategoryChangeSheetProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
  const [step, setStep] = useState<'category' | 'subcategory'>('category');

  // Get user custom categories
  const { data: userCategories = [] } = useUserCategories(false);

  // Reset state when opening
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setSelectedCategory(null);
      setSelectedSubcategory(null);
      setStep('category');
    }
    onOpenChange(isOpen);
  };

  // Merge default and user categories (expense type only for bulk actions)
  const allCategories = useMemo(() => {
    const defaults = defaultCategories.filter((cat) => cat.type === 'expense');
    const customs = userCategories
      .filter(cat => cat.type === 'expense' && cat.status === 'ACTIVE')
      .map(cat => ({
        id: cat.id,
        name: cat.name,
        code: cat.name.substring(0, 3).toUpperCase(),
        icon: '',
        iconKey: cat.icon_key,
        color: cat.color || 'hsl(var(--primary))',
        type: cat.type as 'income' | 'expense',
        isDefault: false,
        subcategories: (cat.subcategories || []).map(sub => ({
          id: sub.id,
          name: sub.name,
        })),
      }));
    
    return [...customs, ...defaults];
  }, [userCategories]);

  // Get selected category object
  const categoryObj = useMemo(() => {
    if (!selectedCategory) return null;
    return allCategories.find(c => c.id === selectedCategory) || getCategoryById(selectedCategory);
  }, [selectedCategory, allCategories]);

  // Handle category selection
  const handleCategorySelect = (categoryId: string) => {
    setSelectedCategory(categoryId);
    setSelectedSubcategory(null);
    
    const cat = allCategories.find(c => c.id === categoryId) || getCategoryById(categoryId);
    if (cat && cat.subcategories.length > 0) {
      setStep('subcategory');
    }
  };

  // Handle subcategory selection
  const handleSubcategorySelect = (subcategoryId: string) => {
    setSelectedSubcategory(subcategoryId);
  };

  // Handle confirm
  const handleConfirm = () => {
    if (!selectedCategory) return;
    
    // If category has subcategories, require one to be selected
    if (categoryObj && categoryObj.subcategories.length > 0 && !selectedSubcategory) {
      return;
    }
    
    onConfirm(selectedCategory, selectedSubcategory);
  };

  // Go back to category selection
  const handleBack = () => {
    setStep('category');
    setSelectedSubcategory(null);
  };

  const canConfirm = selectedCategory && 
    (categoryObj && categoryObj.subcategories.length === 0 || selectedSubcategory);

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="text-left pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-primary" />
            Alterar Categoria
          </SheetTitle>
          <SheetDescription>
            Alterar categoria de {selectedCount} {selectedCount === 1 ? 'transação' : 'transações'}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(85vh-200px)] pr-4">
          {step === 'category' ? (
            <div className="space-y-4">
              {/* Impact Preview */}
              <div className="p-3 rounded-xl bg-info/10 border border-info/20 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-info mt-0.5 shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Você está alterando <strong>{selectedCount}</strong> {selectedCount === 1 ? 'transação' : 'transações'}.
                  {' '}Esta ação será registrada no histórico.
                </p>
              </div>

              {/* Category Grid */}
              <div className="grid grid-cols-3 gap-2">
                {allCategories.map((cat) => {
                  const isCustom = 'iconKey' in cat;
                  const isSelected = selectedCategory === cat.id;
                  
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleCategorySelect(cat.id)}
                      className={cn(
                        "relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all min-h-[72px]",
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      {isCustom ? (
                        <CategoryIcon iconKey={(cat as any).iconKey} className="w-6 h-6 text-primary" />
                      ) : (
                        <span className="text-2xl">{cat.icon}</span>
                      )}
                      <span className="text-[11px] text-center leading-tight text-muted-foreground font-medium line-clamp-2">
                        {cat.name}
                      </span>
                      {isSelected && (
                        <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-primary rounded-full flex items-center justify-center shadow-sm">
                          <Check className="w-3 h-3 text-primary-foreground" />
                        </div>
                      )}
                      {cat.subcategories.length > 0 && (
                        <div className="absolute bottom-1.5 right-1.5">
                          <ChevronRight className="w-3 h-3 text-muted-foreground/60" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Back to categories */}
              <button
                type="button"
                onClick={handleBack}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronRight className="w-5 h-5 rotate-180" />
                <span className="text-lg font-semibold text-foreground">
                  {categoryObj?.icon} {categoryObj?.name}
                </span>
              </button>

              <p className="text-sm font-medium text-muted-foreground">
                Escolha uma subcategoria
              </p>

              {/* Subcategory List */}
              <div className="space-y-2">
                {categoryObj?.subcategories.map((sub) => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => handleSubcategorySelect(sub.id)}
                    className={cn(
                      "w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left",
                      selectedSubcategory === sub.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <span className="font-medium">{sub.name}</span>
                    {selectedSubcategory === sub.id && (
                      <Check className="w-5 h-5 text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </ScrollArea>

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4 border-t mt-4">
          <Button
            variant="outline"
            className="flex-1 h-12"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            className="flex-1 h-12 gap-2"
            onClick={handleConfirm}
            disabled={!canConfirm || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Alterando...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Confirmar
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
