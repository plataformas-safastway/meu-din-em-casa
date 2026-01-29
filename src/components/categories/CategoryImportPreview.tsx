import { FileSpreadsheet, FolderTree, AlertTriangle } from "lucide-react";
import { ParsedCategoryData } from "@/hooks/useCategoryImport";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface CategoryImportPreviewProps {
  data: ParsedCategoryData;
}

export function CategoryImportPreview({ data }: CategoryImportPreviewProps) {
  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-lg bg-muted text-center">
          <p className="text-2xl font-bold text-foreground">{data.categories.length}</p>
          <p className="text-xs text-muted-foreground">Categorias</p>
        </div>
        <div className="p-3 rounded-lg bg-muted text-center">
          <p className="text-2xl font-bold text-foreground">{data.totalSubcategories}</p>
          <p className="text-xs text-muted-foreground">Subcategorias</p>
        </div>
        <div className="p-3 rounded-lg bg-muted text-center">
          <p className="text-2xl font-bold text-foreground">{data.totalRows}</p>
          <p className="text-xs text-muted-foreground">Linhas</p>
        </div>
      </div>

      {/* Duplicates Warning */}
      {data.duplicatesConsolidated > 0 && (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-warning/10 border border-warning/20">
          <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
          <div>
            <p className="text-sm font-medium text-warning">
              {data.duplicatesConsolidated} duplicata(s) consolidada(s)
            </p>
            <p className="text-xs text-warning/80 mt-0.5">
              Subcategorias duplicadas foram removidas automaticamente.
            </p>
          </div>
        </div>
      )}

      {/* Category List */}
      <div className="rounded-lg border border-border/30">
        <div className="flex items-center gap-2 p-3 border-b border-border/30 bg-muted/30">
          <FolderTree className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium">Estrutura detectada</span>
        </div>
        <ScrollArea className="h-[200px]">
          <div className="p-2 space-y-1">
            {data.categories.map((category, idx) => (
              <div key={idx} className="p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-2 h-2 rounded-full"
                    style={{ 
                      backgroundColor: category.type === 'RECEITA' 
                        ? 'hsl(var(--success))' 
                        : category.type === 'OBJETIVO'
                        ? 'hsl(var(--primary))'
                        : 'hsl(var(--destructive))'
                    }}
                  />
                  <span className="font-medium text-sm">{category.name}</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                    {category.type || 'DESPESA'}
                  </Badge>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {category.subcategories.length} sub
                  </span>
                </div>
                {category.subcategories.length > 0 && (
                  <div className="ml-4 mt-1 flex flex-wrap gap-1">
                    {category.subcategories.slice(0, 4).map((sub, subIdx) => (
                      <span 
                        key={subIdx}
                        className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded"
                      >
                        {sub.name}
                      </span>
                    ))}
                    {category.subcategories.length > 4 && (
                      <span className="text-xs text-muted-foreground">
                        +{category.subcategories.length - 4} mais
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
