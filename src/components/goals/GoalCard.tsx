import { Target, Calendar, MoreVertical, Pause, Play, Check, Pencil, Trash2, PiggyBank, History, Sparkles, Trophy } from "lucide-react";
import { Goal } from "@/hooks/useGoals";
import { formatCurrency, formatPercentage } from "@/lib/formatters";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface GoalCardProps {
  goal: Goal;
  onEdit: (goal: Goal) => void;
  onDelete: (goal: Goal) => void;
  onStatusChange: (goal: Goal, status: "ACTIVE" | "PAUSED" | "COMPLETED") => void;
  onQuickContribution: (goal: Goal) => void;
  onViewHistory: (goal: Goal) => void;
}

export function GoalCard({ goal, onEdit, onDelete, onStatusChange, onQuickContribution, onViewHistory }: GoalCardProps) {
  const progress = goal.target_amount && goal.target_amount > 0
    ? Math.min((Number(goal.current_amount || 0) / Number(goal.target_amount)) * 100, 100)
    : null;

  const isNearGoal = progress !== null && progress >= 80 && progress < 90;
  const isAlmostThere = progress !== null && progress >= 90 && progress < 100;
  const isComplete = progress !== null && progress >= 100;

  const statusColors = {
    ACTIVE: "bg-success/10 text-success border-success/20",
    PAUSED: "bg-warning/10 text-warning border-warning/20",
    COMPLETED: "bg-primary/10 text-primary border-primary/20",
  };

  const statusLabels = {
    ACTIVE: "Ativo",
    PAUSED: "Pausado",
    COMPLETED: "Concluído",
  };

  const remaining = goal.target_amount ? Number(goal.target_amount) - Number(goal.current_amount || 0) : 0;

  return (
    <div className={cn(
      "p-4 rounded-2xl bg-card border transition-all",
      goal.status === "COMPLETED" && "opacity-75 border-border/30",
      isAlmostThere && goal.status !== "COMPLETED" && "border-warning/50 bg-warning/5",
      isComplete && goal.status !== "COMPLETED" && "border-success/50 bg-success/5"
    )}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
            isComplete ? "bg-success/20" : isAlmostThere ? "bg-warning/20" : "bg-primary/10"
          )}>
            {isComplete ? (
              <Trophy className="w-5 h-5 text-success" />
            ) : isAlmostThere ? (
              <Sparkles className="w-5 h-5 text-warning" />
            ) : (
              <Target className="w-5 h-5 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-foreground truncate">{goal.title}</h3>
            {goal.description && (
              <p className="text-sm text-muted-foreground truncate">{goal.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className={cn("text-xs", statusColors[goal.status])}>
            {statusLabels[goal.status]}
          </Badge>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onQuickContribution(goal)}>
                <PiggyBank className="w-4 h-4 mr-2" />
                Adicionar Aporte
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onViewHistory(goal)}>
                <History className="w-4 h-4 mr-2" />
                Histórico de Aportes
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onEdit(goal)}>
                <Pencil className="w-4 h-4 mr-2" />
                Editar
              </DropdownMenuItem>
              {goal.status === "ACTIVE" && (
                <>
                  <DropdownMenuItem onClick={() => onStatusChange(goal, "PAUSED")}>
                    <Pause className="w-4 h-4 mr-2" />
                    Pausar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onStatusChange(goal, "COMPLETED")}>
                    <Check className="w-4 h-4 mr-2" />
                    Concluir
                  </DropdownMenuItem>
                </>
              )}
              {goal.status === "PAUSED" && (
                <>
                  <DropdownMenuItem onClick={() => onStatusChange(goal, "ACTIVE")}>
                    <Play className="w-4 h-4 mr-2" />
                    Retomar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onStatusChange(goal, "COMPLETED")}>
                    <Check className="w-4 h-4 mr-2" />
                    Concluir
                  </DropdownMenuItem>
                </>
              )}
              {goal.status === "COMPLETED" && (
                <DropdownMenuItem onClick={() => onStatusChange(goal, "ACTIVE")}>
                  <Play className="w-4 h-4 mr-2" />
                  Reabrir
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDelete(goal)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Progress Alert Banner */}
      {goal.status !== "COMPLETED" && (isAlmostThere || isComplete) && (
        <div className={cn(
          "mb-3 px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-2",
          isComplete ? "bg-success/20 text-success" : "bg-warning/20 text-warning"
        )}>
          {isComplete ? (
            <>
              <Trophy className="w-4 h-4" />
              🎉 Meta atingida! Parabéns!
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              🔥 Quase lá! Faltam apenas {formatCurrency(remaining)}
            </>
          )}
        </div>
      )}

      {/* Near Goal Alert (80-89%) */}
      {goal.status !== "COMPLETED" && isNearGoal && (
        <div className="mb-3 px-3 py-2 rounded-xl text-sm bg-info/20 text-info flex items-center gap-2">
          <Target className="w-4 h-4" />
          💪 Vocês estão a {formatPercentage(progress!)} da meta!
        </div>
      )}

      {/* Progress bar */}
      {progress !== null && (
        <div className="mb-3">
          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn(
                "absolute left-0 top-0 h-full rounded-full transition-all duration-500",
                isComplete || goal.status === "COMPLETED" ? "bg-success" : 
                isAlmostThere ? "bg-warning" : "bg-primary"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5 text-sm">
            <span className="text-muted-foreground">
              Investido: {formatCurrency(Number(goal.current_amount || 0))}
            </span>
            <span className={cn(
              "font-medium",
              isComplete ? "text-success" : isAlmostThere ? "text-warning" : "text-foreground"
            )}>
              {formatPercentage(progress)}
            </span>
            <span className="text-muted-foreground">
              {formatCurrency(Number(goal.target_amount))}
            </span>
          </div>
        </div>
      )}

      {/* Due date and quick action */}
      <div className="flex items-center justify-between">
        {goal.due_date ? (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" />
            <span>Prazo: {format(new Date(goal.due_date), "dd/MM/yyyy", { locale: ptBR })}</span>
          </div>
        ) : (
          <div />
        )}
        
        {goal.status !== "COMPLETED" && !isComplete && (
          <Button 
            size="sm" 
            variant="outline"
            className="h-8 text-xs"
            onClick={() => onQuickContribution(goal)}
          >
            <PiggyBank className="w-3.5 h-3.5 mr-1" />
            + Aporte
          </Button>
        )}

        {goal.status !== "COMPLETED" && isComplete && (
          <Button 
            size="sm" 
            variant="default"
            className="h-8 text-xs bg-success hover:bg-success/90"
            onClick={() => onStatusChange(goal, "COMPLETED")}
          >
            <Check className="w-3.5 h-3.5 mr-1" />
            Marcar como concluído
          </Button>
        )}
      </div>
    </div>
  );
}
