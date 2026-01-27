import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ChevronRight, 
  ChevronLeft, 
  DollarSign, 
  PawPrint, 
  Baby, 
  CheckCircle2,
  Wallet,
  TrendingUp,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useBudgetTemplate } from "@/hooks/useBudgetTemplate";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { INCOME_BANDS, type IncomeBand, type SubBand } from "@/data/budgetTemplates";
import { defaultCategories, getCategoryById } from "@/data/categories";

interface IncomeBandSelectorProps {
  onComplete: () => void;
  onSkip?: () => void;
  showSkip?: boolean;
}

type Step = "band" | "subband" | "options" | "preview" | "confirm";

export function IncomeBandSelector({ onComplete, onSkip, showSkip = true }: IncomeBandSelectorProps) {
  const [step, setStep] = useState<Step>("band");
  const [selectedBand, setSelectedBand] = useState<IncomeBand | null>(null);
  const [selectedSubBand, setSelectedSubBand] = useState<SubBand | null>(null);
  const [hasPets, setHasPets] = useState(false);
  const [hasDependents, setHasDependents] = useState(false);

  const { applyBudgetTemplate, previewBudget, isLoading } = useBudgetTemplate();

  const preview = selectedBand && selectedSubBand
    ? previewBudget({
        incomeBandId: selectedBand.id,
        incomeSubBandId: selectedSubBand.id,
        hasPets,
        hasDependents,
      })
    : null;

  const handleSelectBand = (band: IncomeBand) => {
    setSelectedBand(band);
    setSelectedSubBand(null);
    setStep("subband");
  };

  const handleSelectSubBand = (subBand: SubBand) => {
    setSelectedSubBand(subBand);
    setStep("options");
  };

  const handleContinueToPreview = () => {
    setStep("preview");
  };

  const handleBack = () => {
    if (step === "subband") setStep("band");
    else if (step === "options") setStep("subband");
    else if (step === "preview") setStep("options");
    else if (step === "confirm") setStep("preview");
  };

  const handleApplyTemplate = async () => {
    if (!selectedBand || !selectedSubBand) return;

    try {
      await applyBudgetTemplate.mutateAsync({
        incomeBandId: selectedBand.id,
        incomeSubBandId: selectedSubBand.id,
        hasPets,
        hasDependents,
        createBudgets: true,
      });
      onComplete();
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const getStepProgress = () => {
    switch (step) {
      case "band": return 20;
      case "subband": return 40;
      case "options": return 60;
      case "preview": return 80;
      case "confirm": return 100;
      default: return 0;
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Configuração do orçamento</span>
          <span>{getStepProgress()}%</span>
        </div>
        <Progress value={getStepProgress()} className="h-1" />
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1: Select Income Band */}
        {step === "band" && (
          <motion.div
            key="band"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-primary">
                <DollarSign className="w-5 h-5" />
                <h2 className="text-lg font-semibold">Qual é a renda mensal da família?</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Não armazenamos o valor exato — apenas a faixa para personalizar seu orçamento.
              </p>
            </div>

            <div className="space-y-2">
              {INCOME_BANDS.map((band) => (
                <Card
                  key={band.id}
                  className={cn(
                    "cursor-pointer transition-all hover:border-primary/50",
                    selectedBand?.id === band.id && "border-primary bg-primary/5"
                  )}
                  onClick={() => handleSelectBand(band)}
                >
                  <CardContent className="flex items-center justify-between p-4">
                    <span className="font-medium">{band.label}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              ))}
            </div>

            {showSkip && (
              <Button variant="ghost" onClick={onSkip} className="w-full">
                Pular por agora
              </Button>
            )}
          </motion.div>
        )}

        {/* Step 2: Select Sub-Band */}
        {step === "subband" && selectedBand && (
          <motion.div
            key="subband"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-primary">
                <TrendingUp className="w-5 h-5" />
                <h2 className="text-lg font-semibold">Pode refinar um pouco mais?</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Dentro de <strong>{selectedBand.label}</strong>, qual faixa se aproxima mais?
              </p>
            </div>

            <div className="space-y-2">
              {selectedBand.subBands.map((subBand) => (
                <Card
                  key={subBand.id}
                  className={cn(
                    "cursor-pointer transition-all hover:border-primary/50",
                    selectedSubBand?.id === subBand.id && "border-primary bg-primary/5"
                  )}
                  onClick={() => handleSelectSubBand(subBand)}
                >
                  <CardContent className="flex items-center justify-between p-4">
                    <span className="font-medium">{subBand.label}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              ))}
            </div>

            <Button variant="ghost" onClick={handleBack} className="w-full gap-2">
              <ChevronLeft className="w-4 h-4" />
              Voltar
            </Button>
          </motion.div>
        )}

        {/* Step 3: Additional Options */}
        {step === "options" && (
          <motion.div
            key="options"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-primary">
                <Sparkles className="w-5 h-5" />
                <h2 className="text-lg font-semibold">Mais algumas informações</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Isso ajuda a personalizar ainda mais o seu orçamento.
              </p>
            </div>

            <Card>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Baby className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <Label htmlFor="dependents" className="font-medium">Filhos ou dependentes</Label>
                      <p className="text-xs text-muted-foreground">Inclui categoria de gastos com filhos</p>
                    </div>
                  </div>
                  <Switch
                    id="dependents"
                    checked={hasDependents}
                    onCheckedChange={setHasDependents}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <PawPrint className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <Label htmlFor="pets" className="font-medium">Pets</Label>
                      <p className="text-xs text-muted-foreground">Inclui categoria de gastos com animais</p>
                    </div>
                  </div>
                  <Switch
                    id="pets"
                    checked={hasPets}
                    onCheckedChange={setHasPets}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleBack} className="flex-1 gap-2">
                <ChevronLeft className="w-4 h-4" />
                Voltar
              </Button>
              <Button onClick={handleContinueToPreview} className="flex-1 gap-2">
                Continuar
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 4: Preview */}
        {step === "preview" && preview && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-primary">
                <Wallet className="w-5 h-5" />
                <h2 className="text-lg font-semibold">Seu orçamento sugerido</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                Baseado na faixa <strong>{preview.subBand.label}</strong>
              </p>
            </div>

            <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
              <CardContent className="p-4">
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-1">Orçamento mensal estimado</p>
                  <p className="text-2xl font-bold text-primary">
                    {formatCurrency(preview.totalBudgeted)}
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {preview.items.map((item) => {
                const category = getCategoryById(item.categoryId);
                return (
                  <Card key={item.code} className="bg-card/50">
                    <CardContent className="flex items-center justify-between p-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{category?.icon || "📦"}</span>
                        <div>
                          <p className="font-medium text-sm">{item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.percentage.toFixed(0)}% do total
                          </p>
                        </div>
                      </div>
                      <span className="font-semibold">
                        {formatCurrency(item.amount)}
                      </span>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleBack} className="flex-1 gap-2">
                <ChevronLeft className="w-4 h-4" />
                Ajustar
              </Button>
              <Button 
                onClick={handleApplyTemplate} 
                className="flex-1 gap-2"
                disabled={applyBudgetTemplate.isPending}
              >
                {applyBudgetTemplate.isPending ? (
                  "Criando..."
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    Criar orçamento
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
