import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Users, Target, DollarSign, Loader2 } from "lucide-react";

interface EditFamilyProfileSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const incomeRanges = [
  { value: "ate-3k", label: "Até R$ 3.000" },
  { value: "3k-6k", label: "R$ 3.000 - R$ 6.000" },
  { value: "6k-10k", label: "R$ 6.000 - R$ 10.000" },
  { value: "10k-20k", label: "R$ 10.000 - R$ 20.000" },
  { value: "acima-20k", label: "Acima de R$ 20.000" },
];

const objectives = [
  { value: "organizar", label: "Organizar as finanças", description: "Ter clareza de onde o dinheiro vai" },
  { value: "reduzir-ansiedade", label: "Reduzir ansiedade", description: "Parar de se preocupar com dinheiro" },
  { value: "planejar", label: "Planejar melhor", description: "Alcançar objetivos financeiros" },
  { value: "economizar", label: "Economizar mais", description: "Guardar dinheiro todo mês" },
];

export function EditFamilyProfileSheet({ open, onOpenChange }: EditFamilyProfileSheetProps) {
  const { family, refreshFamily } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  
  const [name, setName] = useState("");
  const [membersCount, setMembersCount] = useState(1);
  const [incomeRange, setIncomeRange] = useState("");
  const [primaryObjective, setPrimaryObjective] = useState("");

  useEffect(() => {
    if (family && open) {
      setName(family.name || "");
      setMembersCount(family.members_count || 1);
      setIncomeRange(family.income_range || "");
      setPrimaryObjective(family.primary_objective || "");
    }
  }, [family, open]);

  const handleSave = async () => {
    if (!family?.id) return;
    
    if (!name.trim()) {
      toast.error("O nome da família é obrigatório");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("families")
        .update({
          name: name.trim(),
          members_count: membersCount,
          income_range: incomeRange || null,
          primary_objective: primaryObjective || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", family.id);

      if (error) throw error;

      await refreshFamily();
      toast.success("Perfil da família atualizado!");
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating family:", error);
      toast.error("Erro ao atualizar perfil da família");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] overflow-y-auto rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Perfil da Família
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 pb-6">
          {/* Nome da Família */}
          <div className="space-y-2">
            <Label htmlFor="family-name">Nome da Família</Label>
            <Input
              id="family-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Família Silva"
              className="h-12"
            />
          </div>

          {/* Número de Membros */}
          <div className="space-y-2">
            <Label>Quantas pessoas fazem parte da família?</Label>
            <div className="flex items-center gap-4">
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setMembersCount(Math.max(1, membersCount - 1))}
                disabled={membersCount <= 1}
              >
                -
              </Button>
              <span className="text-2xl font-semibold w-12 text-center">{membersCount}</span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => setMembersCount(Math.min(20, membersCount + 1))}
                disabled={membersCount >= 20}
              >
                +
              </Button>
            </div>
          </div>

          {/* Faixa de Renda */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-muted-foreground" />
              Faixa de renda mensal aproximada
            </Label>
            <RadioGroup value={incomeRange} onValueChange={setIncomeRange}>
              <div className="grid gap-2">
                {incomeRanges.map((range) => (
                  <div
                    key={range.value}
                    className={`flex items-center space-x-3 p-3 rounded-xl border transition-colors cursor-pointer ${
                      incomeRange === range.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => setIncomeRange(range.value)}
                  >
                    <RadioGroupItem value={range.value} id={`income-${range.value}`} />
                    <Label htmlFor={`income-${range.value}`} className="cursor-pointer flex-1">
                      {range.label}
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>

          {/* Objetivo Principal */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <Target className="w-4 h-4 text-muted-foreground" />
              Objetivo principal
            </Label>
            <RadioGroup value={primaryObjective} onValueChange={setPrimaryObjective}>
              <div className="grid gap-2">
                {objectives.map((obj) => (
                  <div
                    key={obj.value}
                    className={`flex items-start space-x-3 p-3 rounded-xl border transition-colors cursor-pointer ${
                      primaryObjective === obj.value
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50"
                    }`}
                    onClick={() => setPrimaryObjective(obj.value)}
                  >
                    <RadioGroupItem value={obj.value} id={`obj-${obj.value}`} className="mt-0.5" />
                    <div className="flex-1">
                      <Label htmlFor={`obj-${obj.value}`} className="cursor-pointer font-medium">
                        {obj.label}
                      </Label>
                      <p className="text-sm text-muted-foreground">{obj.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>

          {/* Botão Salvar */}
          <Button
            onClick={handleSave}
            disabled={isLoading || !name.trim()}
            className="w-full h-12 gradient-primary text-primary-foreground"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar Alterações"
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
