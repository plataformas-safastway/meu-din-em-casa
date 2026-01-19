import { useState } from "react";
import { Goal } from "@/hooks/useGoals";
import { useCreateContribution } from "@/hooks/useGoalContributions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Loader2, PiggyBank } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/formatters";

interface QuickContributionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: Goal | null;
}

export function QuickContributionSheet({ open, onOpenChange, goal }: QuickContributionSheetProps) {
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const createContribution = useCreateContribution();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!goal) return;

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Informe um valor válido maior que zero");
      return;
    }

    try {
      await createContribution.mutateAsync({
        goal_id: goal.id,
        amount: numAmount,
        description: description || null,
      });
      
      toast.success(`Aporte de ${formatCurrency(numAmount)} adicionado!`);
      setAmount("");
      setDescription("");
      onOpenChange(false);
    } catch (error) {
      toast.error("Erro ao adicionar aporte");
    }
  };

  const progress = goal?.target_amount && goal.target_amount > 0
    ? Math.min((Number(goal.current_amount || 0) / Number(goal.target_amount)) * 100, 100)
    : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <PiggyBank className="w-5 h-5 text-primary" />
            Adicionar Aporte
          </SheetTitle>
          <SheetDescription>
            {goal?.title}
          </SheetDescription>
        </SheetHeader>

        {goal && (
          <div className="mb-4 p-3 rounded-xl bg-muted/50">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-muted-foreground">Investido atual</span>
              <span className="font-medium">{formatCurrency(Number(goal.current_amount || 0))}</span>
            </div>
            {goal.target_amount && (
              <>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Meta</span>
                  <span className="font-medium">{formatCurrency(Number(goal.target_amount))}</span>
                </div>
                {progress !== null && (
                  <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="absolute left-0 top-0 h-full rounded-full bg-primary transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="contribution-amount">Valor do Aporte (R$) *</Label>
            <Input
              id="contribution-amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0,00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contribution-description">Observação (opcional)</Label>
            <Textarea
              id="contribution-description"
              placeholder="Ex: Salário de janeiro"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={createContribution.isPending}>
              {createContribution.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Adicionar
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
