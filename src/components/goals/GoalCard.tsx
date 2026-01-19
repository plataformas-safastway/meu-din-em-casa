import { Target, Calendar, MoreVertical, Pause, Play, Check, Pencil, Trash2 } from "lucide-react";
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
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface GoalCardProps {
  goal: Goal;
  onEdit: (goal: Goal) => void;
  onDelete: (goal: Goal) => void;
  onStatusChange: (goal: Goal, status: "ACTIVE" | "PAUSED" | "COMPLETED") => void;
}

export function GoalCard({ goal, onEdit, onDelete, onStatusChange }: GoalCardProps) {
  const progress = goal.target_amount && goal.target_amount > 0
    ? Math.min((Number(goal.current_amount || 0) / Number(goal.target_amount)) * 100, 100)
    : null;

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

  return (
    <div className={cn(
      "p-4 rounded-2xl bg-card border border-border/30 transition-all",
      goal.status === "COMPLETED" && "opacity-75"
    )}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Target className="w-5 h-5 text-primary" />
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

      {/* Progress bar */}
      {progress !== null && (
        <div className="mb-3">
          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn(
                "absolute left-0 top-0 h-full rounded-full transition-all duration-500",
                goal.status === "COMPLETED" ? "bg-success" : "bg-primary"
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5 text-sm">
            <span className="text-muted-foreground">
              Investido: {formatCurrency(Number(goal.current_amount || 0))}
            </span>
            <span className="font-medium text-foreground">
              {formatPercentage(progress)}
            </span>
            <span className="text-muted-foreground">
              {formatCurrency(Number(goal.target_amount))}
            </span>
          </div>
        </div>
      )}

      {/* Due date */}
      {goal.due_date && (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Calendar className="w-3.5 h-3.5" />
          <span>Prazo: {format(new Date(goal.due_date), "dd/MM/yyyy", { locale: ptBR })}</span>
        </div>
      )}
    </div>
  );
}
