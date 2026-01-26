import { useState, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Plus, Check, Loader2 } from "lucide-react";
import { defaultCategories } from "@/data/categories";
import { cn } from "@/lib/utils";

interface ImportedCategory {
  name: string;
  type: "income" | "expense";
  subcategories: string[];
}

interface CategoryMergeSelection {
  oikCategoryId: string;
  action: "add_new" | "add_as_subcategory";
  targetImportedCategoryName?: string;
}

interface CategoryMergeSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  importedCategories: ImportedCategory[];
  onConfirm: (selections: CategoryMergeSelection[]) => void;
  loading?: boolean;
}

export function CategoryMergeSheet({
  open,
  onOpenChange,
  importedCategories,
  onConfirm,
  loading = false,
}: CategoryMergeSheetProps) {
  const [selections, setSelections] = useState<Map<string, CategoryMergeSelection>>(new Map());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

  // Get OIK categories organized by type
  const oikCategories = useMemo(() => ({
    income: defaultCategories.filter((c) => c.type === "income"),
    expense: defaultCategories.filter((c) => c.type === "expense"),
  }), []);

  // Get imported category names for dropdown
  const importedCategoryNames = useMemo(() => 
    importedCategories.map((c) => c.name),
  [importedCategories]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const toggleSelection = (categoryId: string, checked: boolean) => {
    setSelections((prev) => {
      const next = new Map(prev);
      if (checked) {
        next.set(categoryId, { oikCategoryId: categoryId, action: "add_new" });
      } else {
        next.delete(categoryId);
      }
      return next;
    });
  };

  const updateAction = (categoryId: string, action: "add_new" | "add_as_subcategory", target?: string) => {
    setSelections((prev) => {
      const next = new Map(prev);
      next.set(categoryId, {
        oikCategoryId: categoryId,
        action,
        targetImportedCategoryName: target,
      });
      return next;
    });
  };

  const handleConfirm = () => {
    onConfirm(Array.from(selections.values()));
  };

  const selectedCount = selections.size;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col">
        <SheetHeader>
          <SheetTitle>Adicionar categorias do OIK</SheetTitle>
          <SheetDescription>
            Selecione categorias do OIK para adicionar ou mesclar com suas categorias
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 -mx-6 px-6 mt-4">
          <div className="space-y-6 pb-4">
            {/* Expense Categories */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Despesas
              </h3>
              
              {oikCategories.expense.map((category) => {
                const isSelected = selections.has(category.id);
                const selection = selections.get(category.id);
                const isExpanded = expandedCategories.has(category.id);

                return (
                  <Collapsible
                    key={category.id}
                    open={isExpanded && isSelected}
                    onOpenChange={() => isSelected && toggleCategory(category.id)}
                  >
                    <div
                      className={cn(
                        "rounded-lg border p-3 transition-colors",
                        isSelected ? "border-primary bg-primary/5" : "border-border"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) => toggleSelection(category.id, !!checked)}
                        />
                        
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-lg">{category.icon}</span>
                          <span className="font-medium truncate">{category.name}</span>
                          {category.subcategories.length > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              {category.subcategories.length} sub
                            </Badge>
                          )}
                        </div>

                        {isSelected && (
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </Button>
                          </CollapsibleTrigger>
                        )}
                      </div>

                      <CollapsibleContent className="mt-3 pt-3 border-t border-border space-y-3">
                        {/* Action Selection */}
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-muted-foreground">
                            Como adicionar:
                          </p>
                          
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant={selection?.action === "add_new" ? "default" : "outline"}
                              size="sm"
                              onClick={() => updateAction(category.id, "add_new")}
                            >
                              <Plus className="w-3 h-3 mr-1" />
                              Nova categoria
                            </Button>
                            
                            <Button
                              variant={selection?.action === "add_as_subcategory" ? "default" : "outline"}
                              size="sm"
                              onClick={() => updateAction(category.id, "add_as_subcategory")}
                            >
                              Subcategoria de...
                            </Button>
                          </div>

                          {selection?.action === "add_as_subcategory" && (
                            <Select
                              value={selection.targetImportedCategoryName || ""}
                              onValueChange={(v) => updateAction(category.id, "add_as_subcategory", v)}
                            >
                              <SelectTrigger className="h-10">
                                <SelectValue placeholder="Selecione a categoria destino" />
                              </SelectTrigger>
                              <SelectContent>
                                {importedCategoryNames
                                  .filter((name) => {
                                    const cat = importedCategories.find((c) => c.name === name);
                                    return cat?.type === category.type;
                                  })
                                  .map((name) => (
                                    <SelectItem key={name} value={name}>
                                      {name}
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                );
              })}
            </div>

            {/* Income Categories */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Receitas
              </h3>
              
              {oikCategories.income.map((category) => {
                const isSelected = selections.has(category.id);

                return (
                  <div
                    key={category.id}
                    className={cn(
                      "rounded-lg border p-3 transition-colors",
                      isSelected ? "border-primary bg-primary/5" : "border-border"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={(checked) => toggleSelection(category.id, !!checked)}
                      />
                      
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-lg">{category.icon}</span>
                        <span className="font-medium truncate">{category.name}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </ScrollArea>

        <div className="pt-4 border-t border-border space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {selectedCount} categoria{selectedCount !== 1 ? "s" : ""} selecionada{selectedCount !== 1 ? "s" : ""}
            </span>
          </div>

          <Button
            className="w-full h-12"
            disabled={loading}
            onClick={handleConfirm}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Confirmar
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
