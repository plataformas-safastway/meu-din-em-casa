import { useState } from "react";
import { ArrowLeft, Target, Plus, Trash2, Edit2, AlertTriangle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useBudgets, useCreateBudget, useUpdateBudget, useDeleteBudget, useBudgetAlerts } from "@/hooks/useBudgets";
import { defaultCategories, getCategoryById, getExpenseCategories } from "@/data/categories";
import { formatCurrency } from "@/lib/formatters";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface BudgetsPageProps {
  onBack: () => void;
}

export function BudgetsPage({ onBack }: BudgetsPageProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [monthlyLimit, setMonthlyLimit] = useState("");

  const { data: budgets, isLoading: loadingBudgets } = useBudgets();
  const { data: alerts, isLoading: loadingAlerts } = useBudgetAlerts();
  const createBudget = useCreateBudget();
  const updateBudget = useUpdateBudget();
  const deleteBudget = useDeleteBudget();

  const expenseCategories = getExpenseCategories();
  const selectedCategory = getCategoryById(categoryId);

  const handleSubmit = async () => {
    if (!categoryId || !monthlyLimit) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const limit = parseFloat(monthlyLimit);
    if (isNaN(limit) || limit <= 0) {
      toast.error("Informe um valor válido");
      return;
    }

    try {
      if (editingId) {
        await updateBudget.mutateAsync({
          id: editingId,
          data: {
            category_id: categoryId,
            subcategory_id: subcategoryId || null,
            monthly_limit: limit,
          },
        });
        toast.success("Meta atualizada!");
      } else {
        await createBudget.mutateAsync({
          category_id: categoryId,
          subcategory_id: subcategoryId || null,
          monthly_limit: limit,
        });
        toast.success("Meta criada!");
      }
      resetForm();
      setIsSheetOpen(false);
    } catch (error) {
      toast.error("Erro ao salvar meta");
    }
  };

  const handleEdit = (budget: any) => {
    setEditingId(budget.id);
    setCategoryId(budget.category_id);
    setSubcategoryId(budget.subcategory_id || "");
    setMonthlyLimit(budget.monthly_limit.toString());
    setIsSheetOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteBudget.mutateAsync(id);
      toast.success("Meta removida");
    } catch (error) {
      toast.error("Erro ao remover meta");
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setCategoryId("");
    setSubcategoryId("");
    setMonthlyLimit("");
  };

  // Separate alerts by status
  const exceededAlerts = alerts?.filter((a) => a.status === "exceeded") || [];
  const warningAlerts = alerts?.filter((a) => a.status === "warning") || [];
  const okAlerts = alerts?.filter((a) => a.status === "ok") || [];

  const isLoading = loadingBudgets || loadingAlerts;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

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
              <h1 className="text-lg font-semibold">Metas de Orçamento</h1>
            </div>
            <Sheet open={isSheetOpen} onOpenChange={(open) => {
              setIsSheetOpen(open);
              if (!open) resetForm();
            }}>
              <SheetTrigger asChild>
                <Button size="sm" className="gap-1">
                  <Plus className="w-4 h-4" />
                  Nova Meta
                </Button>
              </SheetTrigger>
              <SheetContent>
                <SheetHeader>
                  <SheetTitle>{editingId ? "Editar Meta" : "Nova Meta"}</SheetTitle>
                </SheetHeader>
                <div className="space-y-4 mt-6">
                  <div className="space-y-2">
                    <Label>Categoria *</Label>
                    <Select value={categoryId} onValueChange={(v) => {
                      setCategoryId(v);
                      setSubcategoryId("");
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        {expenseCategories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            <span className="flex items-center gap-2">
                              <span>{cat.icon}</span>
                              <span>{cat.name}</span>
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedCategory && selectedCategory.subcategories.length > 0 && (
                    <div className="space-y-2">
                      <Label>Subcategoria (opcional)</Label>
                      <Select value={subcategoryId} onValueChange={setSubcategoryId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Todas as subcategorias" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Todas</SelectItem>
                          {selectedCategory.subcategories.map((sub) => (
                            <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Limite Mensal (R$) *</Label>
                    <Input
                      type="number"
                      placeholder="0,00"
                      value={monthlyLimit}
                      onChange={(e) => setMonthlyLimit(e.target.value)}
                      min="0"
                      step="0.01"
                    />
                  </div>

                  <Button 
                    onClick={handleSubmit} 
                    className="w-full"
                    disabled={createBudget.isPending || updateBudget.isPending}
                  >
                    {(createBudget.isPending || updateBudget.isPending) ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      editingId ? "Atualizar" : "Criar Meta"
                    )}
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <main className="container px-4 py-4 space-y-6">
        {/* Exceeded Alerts */}
        {exceededAlerts.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-destructive flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              LIMITES EXCEDIDOS
            </h2>
            {exceededAlerts.map((alert) => {
              const category = getCategoryById(alert.budget.category_id);
              return (
                <Card key={alert.budget.id} className="border-destructive/30 bg-destructive/5">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{category?.icon || "📦"}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium">{category?.name || alert.budget.category_id}</p>
                          <span className="text-sm text-destructive font-bold">{alert.percentage.toFixed(0)}%</span>
                        </div>
                        <Progress value={100} className="h-2 mb-2" />
                        <p className="text-sm text-muted-foreground">
                          Vocês já usaram <strong className="text-destructive">{formatCurrency(alert.spent)}</strong> de{" "}
                          <strong>{formatCurrency(alert.budget.monthly_limit)}</strong>.
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          A categoria passou do limite. Querem ajustar o orçamento ou revisar os lançamentos?
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(alert.budget)}>
                        <Edit2 className="w-3 h-3 mr-1" />
                        Ajustar
                      </Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleDelete(alert.budget.id)}>
                        <Trash2 className="w-3 h-3 mr-1" />
                        Remover
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Warning Alerts */}
        {warningAlerts.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-warning flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              LIMITE PRÓXIMO
            </h2>
            {warningAlerts.map((alert) => {
              const category = getCategoryById(alert.budget.category_id);
              return (
                <Card key={alert.budget.id} className="border-warning/30 bg-warning/5">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{category?.icon || "📦"}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium">{category?.name || alert.budget.category_id}</p>
                          <span className="text-sm text-warning font-bold">{alert.percentage.toFixed(0)}%</span>
                        </div>
                        <Progress value={Math.min(alert.percentage, 100)} className="h-2 mb-2" />
                        <p className="text-sm text-muted-foreground">
                          Vocês já usaram <strong>{formatCurrency(alert.spent)}</strong> de{" "}
                          <strong>{formatCurrency(alert.budget.monthly_limit)}</strong>. Ainda restam{" "}
                          <strong className="text-success">{formatCurrency(alert.remaining)}</strong> para este mês.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button size="sm" variant="outline" onClick={() => handleEdit(alert.budget)}>
                        <Edit2 className="w-3 h-3 mr-1" />
                        Editar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* OK Alerts */}
        {okAlerts.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-success flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              DENTRO DO ORÇAMENTO
            </h2>
            {okAlerts.map((alert) => {
              const category = getCategoryById(alert.budget.category_id);
              return (
                <Card key={alert.budget.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{category?.icon || "📦"}</span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium">{category?.name || alert.budget.category_id}</p>
                          <span className="text-sm text-muted-foreground">{alert.percentage.toFixed(0)}%</span>
                        </div>
                        <Progress value={alert.percentage} className="h-2 mb-2" />
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(alert.spent)} de {formatCurrency(alert.budget.monthly_limit)}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => handleEdit(alert.budget)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => handleDelete(alert.budget.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {(!budgets || budgets.length === 0) && (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center">
              <Target className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">Nenhuma meta definida</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Definam limites de gastos por categoria para acompanhar o orçamento da família.
              </p>
              <Button onClick={() => setIsSheetOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeira Meta
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
