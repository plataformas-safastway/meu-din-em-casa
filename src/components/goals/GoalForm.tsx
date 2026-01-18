import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Goal, GoalInput } from "@/hooks/useGoals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Loader2 } from "lucide-react";

const goalSchema = z.object({
  title: z.string().min(1, "Título é obrigatório").max(100, "Máximo 100 caracteres"),
  description: z.string().max(500, "Máximo 500 caracteres").optional(),
  target_amount: z.preprocess(
    (val) => (val === "" || val === undefined ? null : Number(val)),
    z.number().min(0, "Valor não pode ser negativo").nullable()
  ),
  current_amount: z.preprocess(
    (val) => (val === "" || val === undefined ? 0 : Number(val)),
    z.number().min(0, "Valor não pode ser negativo")
  ),
  due_date: z.string().optional(),
});

type GoalFormData = z.infer<typeof goalSchema>;

interface GoalFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: Goal | null;
  onSubmit: (data: GoalInput) => void;
  isLoading?: boolean;
}

export function GoalForm({ open, onOpenChange, goal, onSubmit, isLoading }: GoalFormProps) {
  const isEditing = !!goal;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      title: goal?.title || "",
      description: goal?.description || "",
      target_amount: goal?.target_amount ?? null,
      current_amount: goal?.current_amount ?? 0,
      due_date: goal?.due_date || "",
    },
  });

  const handleFormSubmit = (data: GoalFormData) => {
    onSubmit({
      title: data.title,
      description: data.description || null,
      target_amount: data.target_amount,
      current_amount: data.current_amount,
      due_date: data.due_date || null,
    });
    reset();
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      reset();
    }
    onOpenChange(isOpen);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle>{isEditing ? "Editar Objetivo" : "Novo Objetivo"}</SheetTitle>
          <SheetDescription>
            {isEditing 
              ? "Atualize as informações do objetivo da família."
              : "Crie um novo objetivo para a família acompanhar."
            }
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              placeholder="Ex: Viagem de férias, Reforma da casa"
              {...register("title")}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              placeholder="Descreva o objetivo (opcional)"
              rows={2}
              {...register("description")}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="target_amount">Valor Alvo (R$)</Label>
              <Input
                id="target_amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                {...register("target_amount")}
              />
              {errors.target_amount && (
                <p className="text-sm text-destructive">{errors.target_amount.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="current_amount">Valor Atual (R$)</Label>
              <Input
                id="current_amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                {...register("current_amount")}
              />
              {errors.current_amount && (
                <p className="text-sm text-destructive">{errors.current_amount.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="due_date">Data Alvo</Label>
            <Input
              id="due_date"
              type="date"
              {...register("due_date")}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => handleOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={isLoading}>
              {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isEditing ? "Salvar alterações" : "Salvar"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
