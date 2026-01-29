import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useCreateUserCategory } from "@/hooks/useUserCategories";
import { iconOptions, getIconByKey } from "./categoryIcons";
import { cn } from "@/lib/utils";

interface CategoryCreateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultType?: 'expense' | 'income';
}

export function CategoryCreateModal({ open, onOpenChange, defaultType = 'expense' }: CategoryCreateModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<'expense' | 'income'>(defaultType);
  const [selectedIcon, setSelectedIcon] = useState('package');
  const [showIconPicker, setShowIconPicker] = useState(false);
  
  const { mutate: createCategory, isPending } = useCreateUserCategory();

  const handleCreate = () => {
    if (!name.trim()) return;

    createCategory({
      name: name.trim(),
      type,
      icon_key: selectedIcon,
      source: 'USER_CUSTOM',
    }, {
      onSuccess: () => {
        setName('');
        setSelectedIcon('package');
        onOpenChange(false);
      },
    });
  };

  const handleClose = () => {
    setName('');
    setSelectedIcon('package');
    setShowIconPicker(false);
    onOpenChange(false);
  };

  const IconComponent = getIconByKey(selectedIcon);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Categoria</DialogTitle>
          <DialogDescription>
            Crie uma categoria personalizada para organizar suas finanças.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 mt-2">
          {/* Icon Selection */}
          <div className="space-y-2">
            <Label>Ícone</Label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowIconPicker(!showIconPicker)}
                className="w-14 h-14 rounded-xl border-2 border-dashed border-border flex items-center justify-center hover:border-primary transition-colors"
              >
                <IconComponent className="w-7 h-7" />
              </button>
              <span className="text-sm text-muted-foreground">
                Clique para escolher
              </span>
            </div>
            
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
            <Label htmlFor="new-category-name">Nome</Label>
            <Input
              id="new-category-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome da categoria"
            />
          </div>

          {/* Type Selection */}
          <div className="space-y-2">
            <Label>Tipo</Label>
            <RadioGroup
              value={type}
              onValueChange={(v) => setType(v as 'expense' | 'income')}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="expense" id="type-expense" />
                <Label htmlFor="type-expense" className="cursor-pointer">
                  Despesa
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="income" id="type-income" />
                <Label htmlFor="type-income" className="cursor-pointer">
                  Receita
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <Button 
              variant="outline"
              className="flex-1"
              onClick={handleClose}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleCreate} 
              disabled={isPending || !name.trim()}
              className="flex-1"
            >
              {isPending ? 'Criando...' : 'Criar Categoria'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
