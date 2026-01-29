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
import { UserCategory, useCreateUserSubcategory } from "@/hooks/useUserCategories";

interface SubcategoryCreateSheetProps {
  category: UserCategory | null;
  onClose: () => void;
}

export function SubcategoryCreateSheet({ category, onClose }: SubcategoryCreateSheetProps) {
  const [name, setName] = useState('');
  
  const { mutate: createSubcategory, isPending } = useCreateUserSubcategory();

  const handleCreate = () => {
    if (!category || !name.trim()) return;

    createSubcategory({
      category_id: category.id,
      name: name.trim(),
    }, {
      onSuccess: () => {
        setName('');
        onClose();
      },
    });
  };

  return (
    <Sheet open={!!category} onOpenChange={(open) => !open && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Nova Subcategoria</SheetTitle>
          <SheetDescription>
            {category?.name && (
              <span>Adicionar subcategoria em <strong>{category.name}</strong></span>
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Name Input */}
          <div className="space-y-2">
            <Label htmlFor="new-subcategory-name">Nome</Label>
            <Input
              id="new-subcategory-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome da subcategoria"
              autoFocus
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button 
              variant="outline"
              className="flex-1"
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleCreate} 
              disabled={isPending || !name.trim()}
              className="flex-1"
            >
              {isPending ? 'Criando...' : 'Criar'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
