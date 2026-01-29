import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  UserCategory, 
  UserSubcategory,
  useArchiveUserSubcategory,
} from "@/hooks/useUserCategories";
import { useRenameSubcategory } from "@/hooks/useCategoryImport";

interface SubcategoryEditSheetProps {
  subcategory: UserSubcategory | null;
  category: UserCategory | null;
  onClose: () => void;
}

export function SubcategoryEditSheet({ subcategory, category, onClose }: SubcategoryEditSheetProps) {
  const [name, setName] = useState(subcategory?.name || '');
  
  const { mutate: archiveSubcategory, isPending: isArchiving } = useArchiveUserSubcategory();
  const { mutate: renameSubcategory, isPending: isRenaming } = useRenameSubcategory();

  const handleSave = () => {
    if (!subcategory || !name.trim()) return;

    renameSubcategory({
      subcategoryId: subcategory.id,
      newName: name.trim(),
    }, {
      onSuccess: () => {
        onClose();
      },
    });
  };

  const handleArchive = () => {
    if (!subcategory) return;
    archiveSubcategory(subcategory.id, {
      onSuccess: () => {
        onClose();
      },
    });
  };

  return (
    <Sheet open={!!subcategory} onOpenChange={(open) => !open && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Editar Subcategoria</SheetTitle>
          <SheetDescription>
            {category?.name && (
              <span>Subcategoria de <strong>{category.name}</strong></span>
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Name Input */}
          <div className="space-y-2">
            <Label htmlFor="subcategory-name">Nome</Label>
            <Input
              id="subcategory-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome da subcategoria"
            />
          </div>

          {/* Transaction Count Info */}
          {(subcategory?.transaction_count || 0) > 0 && (
            <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
              <p>
                Esta subcategoria possui <strong>{subcategory?.transaction_count}</strong> transações associadas.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-4">
            <Button 
              onClick={handleSave} 
              disabled={isRenaming || !name.trim()}
              className="w-full"
            >
              {isRenaming ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
            
            <Button 
              variant="outline" 
              className="w-full text-destructive hover:bg-destructive/10"
              onClick={handleArchive}
              disabled={isArchiving}
            >
              {isArchiving ? 'Arquivando...' : 'Arquivar Subcategoria'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
