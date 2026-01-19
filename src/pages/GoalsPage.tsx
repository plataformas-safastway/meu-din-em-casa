import { useState } from "react";
import { ArrowLeft, Plus, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Goal, GoalInput, useGoals, useCreateGoal, useUpdateGoal, useDeleteGoal } from "@/hooks/useGoals";
import { GoalCard } from "@/components/goals/GoalCard";
import { GoalForm } from "@/components/goals/GoalForm";
import { QuickContributionSheet } from "@/components/goals/QuickContributionSheet";
import { ContributionHistorySheet } from "@/components/goals/ContributionHistorySheet";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface GoalsPageProps {
  onBack: () => void;
}

export function GoalsPage({ onBack }: GoalsPageProps) {
  const { data: goals = [], isLoading } = useGoals();
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [deletingGoal, setDeletingGoal] = useState<Goal | null>(null);
  const [contributionGoal, setContributionGoal] = useState<Goal | null>(null);
  const [historyGoal, setHistoryGoal] = useState<Goal | null>(null);

  const activeGoals = goals.filter(g => g.status === "ACTIVE");
  const pausedGoals = goals.filter(g => g.status === "PAUSED");
  const completedGoals = goals.filter(g => g.status === "COMPLETED");

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

  const renderGoalsList = (goalsList: Goal[]) => {
    if (goalsList.length === 0) {
      return (
        <div className="text-center py-8">
          <Target className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm">
            Nenhum objetivo nesta categoria.
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {goalsList.map((goal) => (
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
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="container px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={onBack}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="text-lg font-semibold">Objetivos</h1>
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              className="gap-2"
              onClick={() => setIsFormOpen(true)}
            >
              <Plus className="w-4 h-4" />
              Novo
            </Button>
          </div>
        </div>
      </header>

      <main className="container px-4 py-4 space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="w-full">
              <TabsTrigger value="active" className="flex-1">
                Ativos ({activeGoals.length})
              </TabsTrigger>
              <TabsTrigger value="paused" className="flex-1">
                Pausados ({pausedGoals.length})
              </TabsTrigger>
              <TabsTrigger value="completed" className="flex-1">
                Concluídos ({completedGoals.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="mt-4">
              {renderGoalsList(activeGoals)}
            </TabsContent>

            <TabsContent value="paused" className="mt-4">
              {renderGoalsList(pausedGoals)}
            </TabsContent>

            <TabsContent value="completed" className="mt-4">
              {renderGoalsList(completedGoals)}
            </TabsContent>
          </Tabs>
        )}

        {/* Tip */}
        <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20">
          <p className="text-sm text-primary leading-relaxed">
            🎯 <strong>Dica:</strong> Objetivos claros ajudam a família a se manter focada. 
            Vocês podem criar quantos objetivos quiserem e acompanhar o progresso de cada um.
          </p>
        </div>
      </main>

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
    </div>
  );
}
