import { useState } from "react";
import { ChevronRight, ChevronDown, Pencil, Trash2, Plus, MoreVertical, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { UserCategory, UserSubcategory } from "@/hooks/useUserCategories";
import { CategoryEditSheet } from "./CategoryEditSheet";
import { SubcategoryEditSheet } from "./SubcategoryEditSheet";
import { SubcategoryCreateSheet } from "./SubcategoryCreateSheet";
import { CategoryHistoryDecisionModal } from "./CategoryHistoryDecisionModal";
import { categoryIcons } from "./categoryIcons";

interface CategoryListProps {
  categories: UserCategory[];
  type: 'expense' | 'income';
}

export function CategoryList({ categories, type }: CategoryListProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<UserCategory | null>(null);
  const [editingSubcategory, setEditingSubcategory] = useState<{ sub: UserSubcategory; category: UserCategory } | null>(null);
  const [addingSubcategoryTo, setAddingSubcategoryTo] = useState<UserCategory | null>(null);
  const [pendingAction, setPendingAction] = useState<{
    type: 'archive' | 'rename';
    category?: UserCategory;
    subcategory?: UserSubcategory;
    newName?: string;
  } | null>(null);

  const toggleExpand = (categoryId: string) => {
    setExpandedCategory(prev => prev === categoryId ? null : categoryId);
  };

  const getIcon = (iconKey: string) => {
    return categoryIcons[iconKey] || categoryIcons['package'];
  };

  const handleArchiveCategory = (category: UserCategory) => {
    // Check if category has transactions
    if ((category.transaction_count || 0) > 0) {
      setPendingAction({ type: 'archive', category });
    } else {
      // Direct archive without confirmation
      // TODO: Call archive mutation
    }
  };

  if (categories.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Nenhuma categoria de {type === 'expense' ? 'despesa' : 'receita'} encontrada.</p>
        <p className="text-sm mt-2">Importe uma planilha ou crie manualmente.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {categories.map((category) => {
          const isExpanded = expandedCategory === category.id;
          const IconComponent = getIcon(category.icon_key);
          const hasSubcategories = (category.subcategories?.length || 0) > 0;
          
          return (
            <div key={category.id} className="rounded-xl border border-border/30 bg-card overflow-hidden">
              {/* Category Row */}
              <div className="flex items-center gap-3 p-3">
                {/* Expand Button */}
                <button
                  onClick={() => hasSubcategories && toggleExpand(category.id)}
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                    hasSubcategories ? "hover:bg-muted cursor-pointer" : "cursor-default opacity-50"
                  )}
                  disabled={!hasSubcategories}
                >
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
                
                {/* Icon */}
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ 
                    backgroundColor: category.color ? `${category.color}20` : 'hsl(var(--muted))'
                  }}
                >
                  <IconComponent 
                    className="w-5 h-5" 
                    style={{ color: category.color || 'hsl(var(--foreground))' }}
                  />
                </div>
                
                {/* Name and Count */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground truncate">{category.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {category.subcategories?.length || 0} subcategorias
                    {(category.transaction_count || 0) > 0 && (
                      <span className="ml-2">• {category.transaction_count} transações</span>
                    )}
                  </p>
                </div>
                
                {/* Actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="shrink-0">
                      <MoreVertical className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setEditingCategory(category)}>
                      <Pencil className="w-4 h-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setAddingSubcategoryTo(category)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar subcategoria
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="text-destructive"
                      onClick={() => handleArchiveCategory(category)}
                    >
                      <Archive className="w-4 h-4 mr-2" />
                      Arquivar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              
              {/* Subcategories */}
              {isExpanded && hasSubcategories && (
                <div className="border-t border-border/30 bg-muted/30">
                  {category.subcategories?.map((sub, index) => (
                    <div
                      key={sub.id}
                      className={cn(
                        "flex items-center gap-3 px-4 py-2.5 ml-8",
                        index !== (category.subcategories?.length || 0) - 1 && "border-b border-border/20"
                      )}
                    >
                      <div 
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: category.color || 'hsl(var(--foreground))' }}
                      />
                      <span className="flex-1 text-sm text-foreground truncate">
                        {sub.name}
                      </span>
                      {(sub.transaction_count || 0) > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {sub.transaction_count} transações
                        </span>
                      )}
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-7 w-7"
                        onClick={() => setEditingSubcategory({ sub, category })}
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                  
                  {/* Add subcategory button */}
                  <button
                    className="flex items-center gap-2 px-4 py-2.5 ml-8 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
                    onClick={() => setAddingSubcategoryTo(category)}
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar subcategoria
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Edit Category Sheet */}
      <CategoryEditSheet
        category={editingCategory}
        onClose={() => setEditingCategory(null)}
      />

      {/* Edit Subcategory Sheet */}
      <SubcategoryEditSheet
        subcategory={editingSubcategory?.sub || null}
        category={editingSubcategory?.category || null}
        onClose={() => setEditingSubcategory(null)}
      />

      {/* Create Subcategory Sheet */}
      <SubcategoryCreateSheet
        category={addingSubcategoryTo}
        onClose={() => setAddingSubcategoryTo(null)}
      />

      {/* History Decision Modal */}
      <CategoryHistoryDecisionModal
        open={!!pendingAction}
        onClose={() => setPendingAction(null)}
        action={pendingAction}
      />
    </>
  );
}
