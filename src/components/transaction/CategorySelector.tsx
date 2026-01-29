import { useState, useMemo } from "react";
import { Check, ChevronRight, Settings, Plus, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Category, Subcategory, TransactionClassification } from "@/types/finance";
import { defaultCategories, getCategoryById } from "@/data/categories";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CategoryManagerSheet, CategoryIcon } from "@/components/category";
import { useUserCategories, UserCategory } from "@/hooks/useUserCategories";
import { SubcategorySelectorSheet } from "./SubcategorySelectorSheet";
import { InlineCategoryManager } from "./InlineCategoryManager";

interface CategorySelectorProps {
  value: string;
  onChange: (categoryId: string) => void;
  subcategoryValue: string;
  onSubcategoryChange: (subcategoryId: string) => void;
  classification: TransactionClassification;
  recentCategories?: string[];
  required?: boolean;
}

export function CategorySelector({
  value,
  onChange,
  subcategoryValue,
  onSubcategoryChange,
  classification,
  recentCategories = [],
  required = true,
}: CategorySelectorProps) {
  const [showManager, setShowManager] = useState(false);
  const [showSubcategorySheet, setShowSubcategorySheet] = useState(false);
  const [showInlineManager, setShowInlineManager] = useState(false);
  const [inlineMode, setInlineMode] = useState<'create-category' | 'create-subcategory'>('create-category');
  
  // Map classification to transaction type for filtering
  const transactionType = classification === 'income' ? 'income' : 'expense';
  
  // Get user custom categories
  const { data: userCategories = [] } = useUserCategories(false);
  
  // Merge default and user categories
  const allCategories = useMemo(() => {
    const defaults = defaultCategories.filter((cat) => cat.type === transactionType);
    const customs = userCategories
      .filter(cat => cat.type === transactionType && cat.status === 'ACTIVE')
      .map(cat => ({
        id: cat.id,
        name: cat.name,
        code: cat.name.substring(0, 3).toUpperCase(),
        icon: '', // Will use CategoryIcon component
        iconKey: cat.icon_key,
        color: cat.color || 'hsl(var(--primary))',
        type: cat.type,
        isDefault: false,
        isUserCategory: true,
        subcategories: (cat.subcategories || []).map(sub => ({
          id: sub.id,
          name: sub.name,
          categoryId: cat.id,
        })),
        originalCategory: cat,
      }));
    
    return [...customs, ...defaults];
  }, [transactionType, userCategories]);
  
  const filteredCategories = useMemo(() => {
    // Sort: recent categories first
    if (recentCategories.length > 0) {
      const recentSet = new Set(recentCategories);
      return [
        ...allCategories.filter(c => recentSet.has(c.id)),
        ...allCategories.filter(c => !recentSet.has(c.id)),
      ];
    }
    
    return allCategories;
  }, [allCategories, recentCategories]);

  // Get selected category (either default or user)
  const selectedCategory = useMemo(() => {
    if (!value) return null;
    
    // Check user categories first
    const userCat = userCategories.find(c => c.id === value);
    if (userCat) return userCat;
    
    // Fallback to default
    return getCategoryById(value);
  }, [value, userCategories]);

  // Get subcategories of selected category
  const selectedCategorySubcategories = useMemo(() => {
    if (!selectedCategory) return [];
    
    if ('icon_key' in selectedCategory) {
      return (selectedCategory.subcategories || []).filter(s => s.status === 'ACTIVE');
    }
    
    return selectedCategory.subcategories || [];
  }, [selectedCategory]);

  // Check if category has subcategories
  const hasSubcategories = selectedCategorySubcategories.length > 0;
  const isUserCategory = selectedCategory && 'icon_key' in selectedCategory;
  const needsSubcategory = required && value && !subcategoryValue;

  // Handle category selection
  const handleCategorySelect = (catId: string) => {
    onChange(catId);
    onSubcategoryChange(""); // Reset subcategory
    
    // Check if category has subcategories
    const cat = allCategories.find(c => c.id === catId);
    if (cat && cat.subcategories.length > 0) {
      // Auto-open subcategory selector
      setTimeout(() => setShowSubcategorySheet(true), 100);
    } else if (cat && 'isUserCategory' in cat && cat.isUserCategory) {
      // User category without subcategories - prompt to create
      setInlineMode('create-subcategory');
      setTimeout(() => setShowSubcategorySheet(true), 100);
    }
  };

  // Handle inline category creation
  const handleInlineCreate = (mode: 'create-category' | 'create-subcategory') => {
    setInlineMode(mode);
    setShowInlineManager(true);
  };

  // Get selected subcategory name for display
  const getSubcategoryName = () => {
    if (!subcategoryValue || !selectedCategory) return null;
    
    if ('icon_key' in selectedCategory) {
      const sub = selectedCategory.subcategories?.find(s => s.id === subcategoryValue);
      return sub?.name;
    }
    
    const sub = selectedCategory.subcategories?.find(s => s.id === subcategoryValue);
    return sub?.name;
  };

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-base font-medium">
            Categoria <span className="text-destructive">*</span>
          </label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-muted-foreground"
            onClick={() => setShowManager(true)}
          >
            <Settings className="w-3.5 h-3.5 mr-1" />
            Gerenciar
          </Button>
        </div>
        
        {/* Recent categories hint */}
        {recentCategories.length > 0 && (
          <p className="text-xs text-muted-foreground">
            ⭐ Suas categorias mais usadas aparecem primeiro
          </p>
        )}
        
        <div className="grid grid-cols-3 gap-2">
          {/* Add Category Button */}
          <button
            type="button"
            onClick={() => handleInlineCreate('create-category')}
            className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border-2 border-dashed border-muted-foreground/30 hover:border-primary/50 transition-all min-h-[72px]"
          >
            <Plus className="w-6 h-6 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground font-medium">Nova</span>
          </button>
          
          {filteredCategories.map((cat, index) => {
            const isRecent = recentCategories.includes(cat.id);
            const isCustom = 'iconKey' in cat;
            
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategorySelect(cat.id)}
                className={cn(
                  "relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all min-h-[72px] active:scale-[0.97]",
                  value === cat.id
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50",
                  isRecent && index < 3 && "ring-2 ring-primary/20"
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

        {/* Selected Subcategory or Prompt */}
        {value && (
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-base font-medium">
                Subcategoria <span className="text-destructive">*</span>
              </label>
              {isUserCategory && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-muted-foreground"
                  onClick={() => handleInlineCreate('create-subcategory')}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Nova
                </Button>
              )}
            </div>

            {subcategoryValue && getSubcategoryName() ? (
              <button
                type="button"
                onClick={() => setShowSubcategorySheet(true)}
                className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-primary bg-primary/5 min-h-[52px]"
              >
                <span className="font-medium text-base">{getSubcategoryName()}</span>
                <ChevronRight className="w-5 h-5 text-primary" />
              </button>
            ) : hasSubcategories ? (
              <button
                type="button"
                onClick={() => setShowSubcategorySheet(true)}
                className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-dashed border-warning bg-warning/5 min-h-[52px]"
              >
                <span className="font-medium text-base text-warning">Selecione uma subcategoria</span>
                <ChevronRight className="w-5 h-5 text-warning" />
              </button>
            ) : (
              <Alert className="border-warning bg-warning/10">
                <AlertCircle className="h-4 w-4 text-warning" />
                <AlertDescription className="text-sm">
                  Esta categoria não possui subcategorias.
                  {isUserCategory && (
                    <Button
                      type="button"
                      variant="link"
                      className="h-auto p-0 ml-1 text-primary"
                      onClick={() => handleInlineCreate('create-subcategory')}
                    >
                      Criar subcategoria
                    </Button>
                  )}
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </div>
      
      {/* Category Manager Sheet (full management) */}
      <CategoryManagerSheet
        open={showManager}
        onOpenChange={setShowManager}
        defaultType={transactionType}
      />

      {/* Subcategory Selector Sheet */}
      <SubcategorySelectorSheet
        open={showSubcategorySheet}
        onOpenChange={setShowSubcategorySheet}
        category={selectedCategory}
        value={subcategoryValue}
        onChange={onSubcategoryChange}
        onManageCategories={() => {
          setShowSubcategorySheet(false);
          setShowManager(true);
        }}
      />

      {/* Inline Category/Subcategory Manager */}
      <InlineCategoryManager
        open={showInlineManager}
        onOpenChange={setShowInlineManager}
        type={transactionType}
        mode={inlineMode}
        selectedCategory={isUserCategory ? selectedCategory as UserCategory : null}
        onCategoryCreated={(catId) => {
          onChange(catId);
          onSubcategoryChange("");
          // Prompt to create subcategory immediately
          setInlineMode('create-subcategory');
        }}
        onSubcategoryCreated={(subId) => {
          onSubcategoryChange(subId);
        }}
      />
    </>
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