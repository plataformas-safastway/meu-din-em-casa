import { Goal } from "@/hooks/useGoals";
import { useGoalContributions, useDeleteContribution, GoalContribution } from "@/hooks/useGoalContributions";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { Loader2, Trash2, History, PiggyBank } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface ContributionHistorySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: Goal | null;
  onAddContribution: () => void;
}

export function ContributionHistorySheet({ 
  open, 
  onOpenChange, 
  goal,
  onAddContribution 
}: ContributionHistorySheetProps) {
  const { data: contributions, isLoading } = useGoalContributions(goal?.id || null);
  const deleteContribution = useDeleteContribution();
  const [deletingContribution, setDeletingContribution] = useState<GoalContribution | null>(null);

  const handleDelete = async () => {
    if (!deletingContribution || !goal) return;

    try {
      await deleteContribution.mutateAsync({
        id: deletingContribution.id,
        goalId: goal.id,
        amount: deletingContribution.amount,
        goal: goal,
      });
      toast.success("Aporte removido");
      setDeletingContribution(null);
    } catch (error) {
      toast.error("Erro ao remover aporte");
    }
  };

  const totalContributions = contributions?.reduce((sum, c) => sum + Number(c.amount), 0) || 0;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-primary" />
              Histórico de Aportes
            </SheetTitle>
            <SheetDescription>
              {goal?.title}
            </SheetDescription>
          </SheetHeader>

          {/* Summary */}
          <div className="mb-4 p-3 rounded-xl bg-muted/50 flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">Total de aportes</p>
              <p className="text-lg font-semibold">{formatCurrency(totalContributions)}</p>
            </div>
            <Button size="sm" onClick={onAddContribution}>
              <PiggyBank className="w-4 h-4 mr-2" />
              Novo Aporte
            </Button>
          </div>

          {/* Contributions List */}
          <div className="space-y-2 overflow-y-auto max-h-[calc(85vh-200px)]">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))
            ) : contributions && contributions.length > 0 ? (
              contributions.map((contribution) => (
                <div 
                  key={contribution.id}
                  className="p-3 rounded-xl bg-card border border-border/30 flex items-center justify-between"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-success">
                        +{formatCurrency(Number(contribution.amount))}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(contribution.contributed_at), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                    </div>
                    {contribution.description && (
                      <p className="text-sm text-muted-foreground truncate">
                        {contribution.description}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => setDeletingContribution(contribution)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <PiggyBank className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum aporte registrado</p>
                <Button variant="link" onClick={onAddContribution} className="mt-2">
                  Adicionar primeiro aporte
                </Button>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingContribution} onOpenChange={(open) => !open && setDeletingContribution(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover aporte?</AlertDialogTitle>
            <AlertDialogDescription>
              O valor de {deletingContribution && formatCurrency(Number(deletingContribution.amount))} será subtraído do objetivo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteContribution.isPending}
            >
              {deleteContribution.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
