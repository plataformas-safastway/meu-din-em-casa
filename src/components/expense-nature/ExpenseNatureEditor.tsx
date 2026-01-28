import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { 
  ExpenseNature,
  getExpenseNatureLabel,
  getExpenseNatureColor
} from "@/lib/expenseNature";
import { useSaveExpenseNatureOverride } from "@/hooks/useExpenseNature";
import { Edit2, Lock, Activity, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface ExpenseNatureEditorProps {
  categoryId: string;
  subcategoryId?: string;
  merchantKey?: string;
  currentNature: ExpenseNature;
  currentSource?: 'USER' | 'SYSTEM_RULE' | 'AI_INFERENCE';
  onChanged?: () => void;
  trigger?: React.ReactNode;
}

const natureOptions: { value: ExpenseNature; label: string; description: string; icon: typeof Lock }[] = [
  {
    value: 'FIXED',
    label: 'Despesa Fixa',
    description: 'Ocorre independente de decisões de consumo (ex: aluguel, plano de saúde)',
    icon: Lock,
  },
  {
    value: 'VARIABLE',
    label: 'Despesa Variável',
    description: 'Depende de decisões de consumo no mês (ex: alimentação, lazer)',
    icon: Activity,
  },
  {
    value: 'EVENTUAL',
    label: 'Despesa Eventual',
    description: 'Não é recorrente, acontece esporadicamente (ex: reformas, viagens)',
    icon: Sparkles,
  },
];

export function ExpenseNatureEditor({
  categoryId,
  subcategoryId,
  merchantKey,
  currentNature,
  currentSource,
  onChanged,
  trigger,
}: ExpenseNatureEditorProps) {
  const [open, setOpen] = useState(false);
  const [selectedNature, setSelectedNature] = useState<ExpenseNature>(currentNature);
  const { mutate: saveOverride, isPending } = useSaveExpenseNatureOverride();
  
  const handleSave = () => {
    saveOverride(
      {
        categoryId,
        subcategoryId,
        merchantKey,
        expenseNature: selectedNature,
      },
      {
        onSuccess: () => {
          setOpen(false);
          onChanged?.();
        },
      }
    );
  };
  
  const isUserOverride = currentSource === 'USER';
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button 
            variant="ghost" 
            size="sm"
            className="h-6 px-2 text-xs"
          >
            <Edit2 className="w-3 h-3 mr-1" />
            Corrigir
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Classificar natureza da despesa</DialogTitle>
          <DialogDescription>
            {isUserOverride 
              ? 'Você já definiu esta classificação. Deseja alterá-la?'
              : 'Defina se esta despesa é fixa, variável ou eventual. Sua escolha será aplicada a transações futuras semelhantes.'}
          </DialogDescription>
        </DialogHeader>
        
        <RadioGroup
          value={selectedNature}
          onValueChange={(v) => setSelectedNature(v as ExpenseNature)}
          className="space-y-3 mt-4"
        >
          {natureOptions.map((option) => {
            const Icon = option.icon;
            const colorClass = getExpenseNatureColor(option.value);
            
            return (
              <div key={option.value} className="flex items-start space-x-3">
                <RadioGroupItem 
                  value={option.value} 
                  id={option.value}
                  className="mt-1"
                />
                <Label 
                  htmlFor={option.value}
                  className="flex-1 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium",
                      colorClass
                    )}>
                      <Icon className="w-3 h-3" />
                      {option.label}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {option.description}
                  </p>
                </Label>
              </div>
            );
          })}
        </RadioGroup>
        
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isPending || selectedNature === currentNature}
          >
            {isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
