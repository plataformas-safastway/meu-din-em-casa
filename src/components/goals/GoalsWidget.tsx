import { useState } from "react";
import { Plus, Target, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Goal, GoalInput, useActiveGoals, useCreateGoal, useUpdateGoal, useDeleteGoal } from "@/hooks/useGoals";
import { GoalCard } from "./GoalCard";
import { GoalForm } from "./GoalForm";
import { QuickContributionSheet } from "./QuickContributionSheet";
import { ContributionHistorySheet } from "./ContributionHistorySheet";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface GoalsWidgetProps {
  onViewAll?: () => void;
}

export function GoalsWidget({ onViewAll }: GoalsWidgetProps) {
  const { data: goals = [], isLoading } = useActiveGoals();
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [deletingGoal, setDeletingGoal] = useState<Goal | null>(null);
  const [contributionGoal, setContributionGoal] = useState<Goal | null>(null);
  const [historyGoal, setHistoryGoal] = useState<Goal | null>(null);

  const displayedGoals = goals.slice(0, 3);
  const hasMore = goals.length > 3;

  const handleCreate = async (data: GoalInput) => {
    try {
      await createGoal.mutateAsync(data);
      toast.success("Objetivo criado.");
      setIsFormOpen(false);
    } catch (error) {
      toast.error("Erro ao criar objetivo.");
    }
  };

  const handleUpdate = async (data: GoalInput) => {
    if (!editingGoal) return;
    try {
      await updateGoal.mutateAsync({ id: editingGoal.id, data });
      toast.success("Objetivo atualizado.");
      setEditingGoal(null);
    } catch (error) {
      toast.error("Erro ao atualizar objetivo.");
    }
  };

  const handleDelete = async () => {
    if (!deletingGoal) return;
    try {
      await deleteGoal.mutateAsync(deletingGoal.id);
      toast.success("Objetivo excluído.");
      setDeletingGoal(null);
    } catch (error) {
      toast.error("Erro ao excluir objetivo.");
    }
  };

  const handleStatusChange = async (goal: Goal, status: "ACTIVE" | "PAUSED" | "COMPLETED") => {
    try {
      await updateGoal.mutateAsync({ id: goal.id, data: { status } });
      const messages = {
        ACTIVE: "Objetivo reativado.",
        PAUSED: "Objetivo pausado.",
        COMPLETED: "Objetivo concluído! 🎉",
      };
      toast.success(messages[status]);
    } catch (error) {
      toast.error("Erro ao atualizar status.");
    }
  };

  if (isLoading) {
    return (
      <div className="stat-card animate-pulse">
        <div className="h-6 bg-muted rounded w-1/3 mb-4" />
        <div className="space-y-3">
          <div className="h-20 bg-muted rounded-xl" />
          <div className="h-20 bg-muted rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="stat-card animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Target className="w-4 h-4 text-primary" />
            </div>
            <h3 className="font-semibold text-foreground">Objetivos</h3>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            className="gap-1 h-8"
            onClick={() => setIsFormOpen(true)}
          >
            <Plus className="w-4 h-4" />
            Objetivo
          </Button>
        </div>

        {displayedGoals.length === 0 ? (
          <div className="text-center py-6">
            <Target className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm mb-3">
              Vocês ainda não criaram objetivos.<br />
              Que tal começar por um?
            </p>
            <Button size="sm" onClick={() => setIsFormOpen(true)}>
              Criar objetivo
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {displayedGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onEdit={setEditingGoal}
                onDelete={setDeletingGoal}
                onStatusChange={handleStatusChange}
                onQuickContribution={setContributionGoal}
                onViewHistory={setHistoryGoal}
              />
            ))}

            {hasMore && onViewAll && (
              <Button 
                variant="ghost" 
                className="w-full gap-2"
                onClick={onViewAll}
              >
                Ver todos os objetivos
                <ChevronRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Create Form */}
      <GoalForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleCreate}
        isLoading={createGoal.isPending}
      />

      {/* Edit Form */}
      <GoalForm
        open={!!editingGoal}
        onOpenChange={(open) => !open && setEditingGoal(null)}
        goal={editingGoal}
        onSubmit={handleUpdate}
        isLoading={updateGoal.isPending}
      />

      {/* Quick Contribution Sheet */}
      <QuickContributionSheet
        open={!!contributionGoal}
        onOpenChange={(open) => !open && setContributionGoal(null)}
        goal={contributionGoal}
      />

      {/* Contribution History Sheet */}
      <ContributionHistorySheet
        open={!!historyGoal}
        onOpenChange={(open) => !open && setHistoryGoal(null)}
        goal={historyGoal}
        onAddContribution={() => {
          const goal = historyGoal;
          setHistoryGoal(null);
          setTimeout(() => setContributionGoal(goal), 100);
        }}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingGoal} onOpenChange={(open) => !open && setDeletingGoal(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir objetivo?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o objetivo "{deletingGoal?.title}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
