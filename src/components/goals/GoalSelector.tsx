import { Target, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useActiveGoals, Goal } from "@/hooks/useGoals";
import { formatCurrency } from "@/lib/formatters";

interface GoalSelectorProps {
  value: string;
  onChange: (goalId: string) => void;
  label?: string;
  placeholder?: string;
  showProgress?: boolean;
  disabled?: boolean;
}

export function GoalSelector({
  value,
  onChange,
  label = "Vincular a Objetivo",
  placeholder = "Nenhum objetivo selecionado",
  showProgress = true,
  disabled = false,
}: GoalSelectorProps) {
  const { data: goals = [], isLoading } = useActiveGoals();

  const selectedGoal = goals.find((g) => g.id === value);

  const getProgress = (goal: Goal) => {
    if (!goal.target_amount || goal.target_amount <= 0) return null;
    return Math.min(
      ((Number(goal.current_amount) || 0) / Number(goal.target_amount)) * 100,
      100
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-2 animate-pulse">
        <div className="h-4 w-32 bg-muted rounded" />
        <div className="h-12 bg-muted rounded-xl" />
      </div>
    );
  }

  if (goals.length === 0) {
    return null; // Don't show if no active goals
  }

  return (
    <div className="space-y-2">
      <Label className="text-base flex items-center gap-2">
        <Target className="w-4 h-4 text-primary" />
        {label}
        <span className="text-xs text-muted-foreground font-normal">(opcional)</span>
      </Label>
      
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className="h-12 rounded-xl border-2 text-base focus-visible:ring-2 focus-visible:ring-primary/30">
          <SelectValue placeholder={placeholder}>
            {selectedGoal && (
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                <span className="truncate">{selectedGoal.title}</span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="_none">
            <span className="text-muted-foreground">Sem vínculo</span>
          </SelectItem>
          {goals.map((goal) => {
            const progress = getProgress(goal);
            return (
              <SelectItem key={goal.id} value={goal.id}>
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-primary" />
                    <span>{goal.title}</span>
                  </div>
                  {showProgress && goal.target_amount && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground ml-6">
                      <span>
                        {formatCurrency(Number(goal.current_amount) || 0)} / {formatCurrency(Number(goal.target_amount))}
                      </span>
                      {progress !== null && (
                        <span className="font-medium">
                          ({progress.toFixed(0)}%)
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
      
      {/* Selected goal preview */}
      {selectedGoal && showProgress && selectedGoal.target_amount && (
        <div className="p-2 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-muted-foreground">Progresso</span>
            <span className="font-medium">
              {formatCurrency(Number(selectedGoal.current_amount) || 0)} / {formatCurrency(Number(selectedGoal.target_amount))}
            </span>
          </div>
          <div className="relative h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-primary transition-all duration-500"
              style={{ width: `${getProgress(selectedGoal) || 0}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
