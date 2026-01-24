import { Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Category, Subcategory, TransactionClassification } from "@/types/finance";
import { defaultCategories, getCategoryById } from "@/data/categories";
import { useMemo } from "react";

interface CategorySelectorProps {
  value: string;
  onChange: (categoryId: string) => void;
  classification: TransactionClassification;
  recentCategories?: string[];
}

export function CategorySelector({
  value,
  onChange,
  classification,
  recentCategories = [],
}: CategorySelectorProps) {
  // Map classification to transaction type for filtering
  const transactionType = classification === 'income' ? 'income' : 'expense';
  
  const filteredCategories = useMemo(() => {
    const allCategories = defaultCategories.filter((cat) => cat.type === transactionType);
    
    // Sort: recent categories first
    if (recentCategories.length > 0) {
      const recentSet = new Set(recentCategories);
      return [
        ...allCategories.filter(c => recentSet.has(c.id)),
        ...allCategories.filter(c => !recentSet.has(c.id)),
      ];
    }
    
    return allCategories;
  }, [transactionType, recentCategories]);

  const selectedCategory = value ? getCategoryById(value) : null;

  return (
    <div className="space-y-2">
      <label className="text-base font-medium">Categoria</label>
      
      {/* Recent categories hint */}
      {recentCategories.length > 0 && (
        <p className="text-xs text-muted-foreground">
          ⭐ Suas categorias mais usadas aparecem primeiro
        </p>
      )}
      
      <div className="grid grid-cols-3 gap-2">
        {filteredCategories.map((cat, index) => {
          const isRecent = recentCategories.includes(cat.id);
          
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onChange(cat.id)}
              className={cn(
                "relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all min-h-[72px] active:scale-[0.97]",
                value === cat.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50",
                isRecent && index < 3 && "ring-2 ring-primary/20"
              )}
            >
              <span className="text-2xl">{cat.icon}</span>
              <span className="text-[11px] text-center leading-tight text-muted-foreground font-medium line-clamp-2">
                {cat.name}
              </span>
              {value === cat.id && (
                <div className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-sm">
                  <Check className="w-3.5 h-3.5 text-primary-foreground" />
                </div>
              )}
              {cat.subcategories.length > 0 && (
                <div className="absolute bottom-1.5 right-1.5">
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/60" />
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface SubcategorySelectorProps {
  category: Category;
  value: string;
  onChange: (subcategoryId: string) => void;
  onBack: () => void;
}

export function SubcategorySelector({
  category,
  value,
  onChange,
  onBack,
}: SubcategorySelectorProps) {
  return (
    <div className="space-y-4 animate-fade-in">
      {/* Back button with category name */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground min-h-[44px] transition-colors"
      >
        <ChevronRight className="w-5 h-5 rotate-180" />
        <span className="text-lg font-semibold text-foreground">
          {category.icon} {category.name}
        </span>
      </button>
      
      <label className="text-base font-medium block">Subcategoria</label>
      
      <div className="grid gap-2">
        {category.subcategories.map((sub) => (
          <button
            key={sub.id}
            type="button"
            onClick={() => onChange(sub.id)}
            className={cn(
              "flex items-center justify-between p-4 rounded-xl border-2 transition-all text-left min-h-[52px] active:scale-[0.98]",
              value === sub.id
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            )}
          >
            <span className="font-medium text-base">{sub.name}</span>
            {value === sub.id && <Check className="w-5 h-5 text-primary" />}
          </button>
        ))}
      </div>
    </div>
  );
}