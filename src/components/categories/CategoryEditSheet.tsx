import { useState } from "react";
import { Pencil, Check, X, Plus } from "lucide-react";
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
  useRenameUserCategory,
  useArchiveUserCategory,
} from "@/hooks/useUserCategories";
import { iconOptions, getIconByKey } from "./categoryIcons";
import { cn } from "@/lib/utils";

interface CategoryEditSheetProps {
  category: UserCategory | null;
  onClose: () => void;
}

export function CategoryEditSheet({ category, onClose }: CategoryEditSheetProps) {
  const [name, setName] = useState(category?.name || '');
  const [selectedIcon, setSelectedIcon] = useState(category?.icon_key || 'package');
  const [showIconPicker, setShowIconPicker] = useState(false);
  
  const { mutate: renameCategory, isPending: isRenaming } = useRenameUserCategory();
  const { mutate: archiveCategory, isPending: isArchiving } = useArchiveUserCategory();

  const handleSave = () => {
    if (!category || !name.trim()) return;

    const hasTransactions = (category.transaction_count || 0) > 0;
    
    renameCategory({
      categoryId: category.id,
      newName: name.trim(),
      createNewVersion: hasTransactions,
    }, {
      onSuccess: () => {
        onClose();
      },
    });
  };

  const handleArchive = () => {
    if (!category) return;
    archiveCategory(category.id, {
      onSuccess: () => {
        onClose();
      },
    });
  };

  const IconComponent = getIconByKey(selectedIcon);

  return (
    <Sheet open={!!category} onOpenChange={(open) => !open && onClose()}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Editar Categoria</SheetTitle>
          <SheetDescription>
            Altere o nome ou ícone da categoria.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Icon Selection */}
          <div className="space-y-2">
            <Label>Ícone</Label>
            <button
              onClick={() => setShowIconPicker(!showIconPicker)}
              className="w-16 h-16 rounded-xl border-2 border-dashed border-border flex items-center justify-center hover:border-primary transition-colors"
              style={{ 
                backgroundColor: category?.color ? `${category.color}20` : undefined 
              }}
            >
              <IconComponent 
                className="w-8 h-8" 
                style={{ color: category?.color || undefined }}
              />
            </button>
            
            {showIconPicker && (
              <div className="grid grid-cols-5 gap-2 p-3 rounded-lg border border-border bg-background">
                {iconOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.key}
                      onClick={() => {
                        setSelectedIcon(option.key);
                        setShowIconPicker(false);
                      }}
                      className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
                        selectedIcon === option.key
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      )}
                      title={option.label}
                    >
                      <Icon className="w-5 h-5" />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Name Input */}
          <div className="space-y-2">
            <Label htmlFor="category-name">Nome</Label>
            <Input
              id="category-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome da categoria"
            />
          </div>

          {/* Transaction Count Info */}
          {(category?.transaction_count || 0) > 0 && (
            <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
              <p>
                Esta categoria possui <strong>{category?.transaction_count}</strong> transações.
                Ao renomear, uma nova versão será criada e as transações antigas
                manterão a classificação original.
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
              {isArchiving ? 'Arquivando...' : 'Arquivar Categoria'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
