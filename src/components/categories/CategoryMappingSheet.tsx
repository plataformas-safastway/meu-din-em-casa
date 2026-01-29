import { useState, useMemo } from "react";
import { ArrowRight, Wand2, AlertCircle, Loader2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ParsedCategoryData } from "@/hooks/useCategoryImport";
import { useUserCategories } from "@/hooks/useUserCategories";

interface CategoryMappingSheetProps {
  open: boolean;
  onClose: () => void;
  parsedData: ParsedCategoryData | null;
  onComplete: (mappings: Record<string, { categoryId: string; subcategoryId?: string }>) => void;
}

export function CategoryMappingSheet({ open, onClose, parsedData, onComplete }: CategoryMappingSheetProps) {
  const { data: existingCategories = [] } = useUserCategories(true);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [isApplying, setIsApplying] = useState(false);

  // Get categories that have transactions (need mapping)
  const categoriesToMap = useMemo(() => {
    return existingCategories.filter(c => (c.transaction_count || 0) > 0);
  }, [existingCategories]);

  // Build new categories list for selection
  const newCategoryOptions = useMemo(() => {
    if (!parsedData) return [];
    return parsedData.categories.map(c => ({
      id: c.name.toLowerCase().replace(/\s+/g, '-'),
      name: c.name,
      type: c.type,
    }));
  }, [parsedData]);

  const handleSuggestMappings = () => {
    const suggestions: Record<string, string> = {};
    
    for (const oldCat of categoriesToMap) {
      // Find best match by name similarity
      const normalizedOld = oldCat.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      
      let bestMatch = '';
      let bestScore = 0;
      
      for (const newCat of newCategoryOptions) {
        const normalizedNew = newCat.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        
        // Simple matching: check if names contain each other
        if (normalizedOld.includes(normalizedNew) || normalizedNew.includes(normalizedOld)) {
          const score = Math.min(normalizedOld.length, normalizedNew.length) / Math.max(normalizedOld.length, normalizedNew.length);
          if (score > bestScore) {
            bestScore = score;
            bestMatch = newCat.id;
          }
        }
      }
      
      if (bestMatch) {
        suggestions[oldCat.id] = bestMatch;
      }
    }
    
    setMappings(prev => ({ ...prev, ...suggestions }));
  };

  const handleApply = async () => {
    setIsApplying(true);
    
    // Convert mappings to the format expected by import
    const formattedMappings: Record<string, { categoryId: string; subcategoryId?: string }> = {};
    
    for (const [oldId, newId] of Object.entries(mappings)) {
      formattedMappings[oldId] = { categoryId: newId };
    }
    
    await onComplete(formattedMappings);
    setIsApplying(false);
  };

  const allMapped = categoriesToMap.every(c => !!mappings[c.id]);

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Mapear Categorias</SheetTitle>
          <SheetDescription>
            Indique para qual nova categoria cada categoria antiga deve ser mapeada.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Auto-suggest button */}
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={handleSuggestMappings}
          >
            <Wand2 className="w-4 h-4" />
            Sugerir mapeamento automaticamente
          </Button>

          {/* Mapping List */}
          <ScrollArea className="h-[400px] pr-4">
            <div className="space-y-3">
              {categoriesToMap.map((oldCat) => (
                <div
                  key={oldCat.id}
                  className="p-3 rounded-lg border border-border/30 bg-card"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-medium text-sm">{oldCat.name}</span>
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                      {oldCat.transaction_count} transações
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    <Select
                      value={mappings[oldCat.id] || ''}
                      onValueChange={(value) => 
                        setMappings(prev => ({ ...prev, [oldCat.id]: value }))
                      }
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Selecione a nova categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {newCategoryOptions.map((opt) => (
                          <SelectItem key={opt.id} value={opt.id}>
                            {opt.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}

              {categoriesToMap.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Nenhuma categoria precisa ser mapeada.</p>
                  <p className="text-sm mt-1">Suas categorias atuais não possuem transações.</p>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Warning */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
            <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
            <p className="text-xs text-warning">
              Essa ação atualizará seus lançamentos anteriores. Revise o mapeamento com atenção antes de confirmar.
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Voltar
            </Button>
            <Button 
              className="flex-1" 
              onClick={handleApply}
              disabled={isApplying || (categoriesToMap.length > 0 && !allMapped)}
            >
              {isApplying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Aplicando...
                </>
              ) : (
                'Confirmar Reclassificação'
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
