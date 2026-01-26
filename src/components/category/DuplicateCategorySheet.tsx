import { useState } from "react";
import { Copy, Check } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { IconPicker, CategoryIcon } from "./IconPicker";
import { UserCategory, UserSubcategory } from "@/hooks/useUserCategories";
import { cn } from "@/lib/utils";

interface DuplicateCategorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: UserCategory | null;
  onConfirm: (data: {
    newName: string;
    newIconKey: string;
    includeArchivedSubcategories: boolean;
  }) => void;
  isLoading?: boolean;
}

export function DuplicateCategorySheet({
  open,
  onOpenChange,
  category,
  onConfirm,
  isLoading,
}: DuplicateCategorySheetProps) {
  const [newName, setNewName] = useState("");
  const [newIconKey, setNewIconKey] = useState("");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);

  // Reset state when category changes
  const resetState = () => {
    if (category) {
      setNewName(`${category.name} (cópia)`);
      setNewIconKey(category.icon_key);
      setIncludeArchived(false);
      setShowIconPicker(false);
    }
  };

  // Reset when opening with a new category
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && category) {
      resetState();
    }
    onOpenChange(isOpen);
  };

  if (!category) return null;

  const activeSubcategories = (category.subcategories || []).filter(
    (sub) => sub.status === "ACTIVE"
  );
  const archivedSubcategories = (category.subcategories || []).filter(
    (sub) => sub.status === "ARCHIVED"
  );

  const subcategoriesToCopy = includeArchived
    ? category.subcategories || []
    : activeSubcategories;

  const handleConfirm = () => {
    onConfirm({
      newName: newName.trim(),
      newIconKey,
      includeArchivedSubcategories: includeArchived,
    });
  };

  const isValid = newName.trim().length > 0 && newIconKey.length > 0;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="text-left pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Copy className="w-5 h-5 text-primary" />
            Duplicar Categoria
          </SheetTitle>
          <SheetDescription>
            Crie uma cópia de "{category.name}" com todas as subcategorias
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(85vh-180px)] pr-4">
          <div className="space-y-6">
            {/* Name Input */}
            <div className="space-y-2">
              <Label htmlFor="duplicate-name">Nome da nova categoria</Label>
              <Input
                id="duplicate-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Digite o nome..."
                className="h-12"
              />
            </div>

            {/* Icon Selection */}
            <div className="space-y-2">
              <Label>Ícone</Label>
              {!showIconPicker ? (
                <button
                  type="button"
                  onClick={() => setShowIconPicker(true)}
                  className={cn(
                    "w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all",
                    "hover:border-primary/50 hover:bg-primary/5",
                    "border-muted bg-muted/30"
                  )}
                >
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <CategoryIcon iconKey={newIconKey} className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-medium">Ícone selecionado</p>
                    <p className="text-sm text-muted-foreground">
                      Toque para alterar
                    </p>
                  </div>
                </button>
              ) : (
                <div className="space-y-3">
                  <IconPicker
                    value={newIconKey}
                    onChange={(icon) => {
                      setNewIconKey(icon);
                      setShowIconPicker(false);
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowIconPicker(false)}
                    className="w-full"
                  >
                    Cancelar alteração
                  </Button>
                </div>
              )}
            </div>

            {/* Subcategories Preview */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Subcategorias a copiar</Label>
                <Badge variant="secondary" className="text-xs">
                  {subcategoriesToCopy.length} itens
                </Badge>
              </div>

              <div className="rounded-xl border bg-muted/30 p-3 space-y-2">
                {subcategoriesToCopy.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    Nenhuma subcategoria para copiar
                  </p>
                ) : (
                  subcategoriesToCopy.map((sub) => (
                    <div
                      key={sub.id}
                      className={cn(
                        "flex items-center gap-2 p-2 rounded-lg",
                        sub.status === "ARCHIVED"
                          ? "bg-muted/50 text-muted-foreground"
                          : "bg-background"
                      )}
                    >
                      <Check className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-sm flex-1">{sub.name}</span>
                      {sub.status === "ARCHIVED" && (
                        <Badge variant="outline" className="text-xs">
                          Arquivada
                        </Badge>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Toggle for archived subcategories */}
              {archivedSubcategories.length > 0 && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50">
                  <div className="space-y-0.5">
                    <Label
                      htmlFor="include-archived"
                      className="text-sm font-medium cursor-pointer"
                    >
                      Copiar subcategorias arquivadas
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {archivedSubcategories.length} subcategoria(s) arquivada(s)
                    </p>
                  </div>
                  <Switch
                    id="include-archived"
                    checked={includeArchived}
                    onCheckedChange={setIncludeArchived}
                  />
                </div>
              )}
            </div>

            {/* Category Type Info */}
            <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/30">
              <Badge
                variant={category.type === "income" ? "default" : "secondary"}
              >
                {category.type === "income" ? "Receita" : "Despesa"}
              </Badge>
              <span className="text-sm text-muted-foreground">
                A nova categoria terá o mesmo tipo
              </span>
            </div>
          </div>
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
            disabled={!isValid || isLoading}
          >
            <Copy className="w-4 h-4" />
            {isLoading ? "Duplicando..." : "Duplicar"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
