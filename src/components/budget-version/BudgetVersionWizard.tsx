import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Loader2, Sparkles, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { format, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  INCOME_BANDS, 
  getBandById,
  type SubBand 
} from "@/data/budgetTemplates";
import { 
  BUDGET_MODES,
  INCOME_TYPES,
  FINANCIAL_STAGES,
  HOUSEHOLD_STRUCTURES,
  NON_MONTHLY_PLANNING_LEVELS,
  ONBOARDING_TIPS,
  type OnboardingData
} from "@/data/budgetModes";

interface BudgetVersionWizardProps {
  onComplete: (data: OnboardingData, effectiveMonth: string) => void;
  onCancel: () => void;
  initialData?: Partial<OnboardingData>;
  isLoading?: boolean;
}

type WizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export function BudgetVersionWizard({ 
  onComplete, 
  onCancel, 
  initialData,
  isLoading = false
}: BudgetVersionWizardProps) {
  const [step, setStep] = useState<WizardStep>(1);
  const [showTip, setShowTip] = useState(false);

  // Form state
  const [incomeBandId, setIncomeBandId] = useState(initialData?.incomeBandId || '');
  const [incomeAnchorValue, setIncomeAnchorValue] = useState(initialData?.incomeAnchorValue || 0);
  const [incomeType, setIncomeType] = useState(initialData?.incomeType || '');
  const [financialStage, setFinancialStage] = useState(initialData?.financialStage || '');
  const [budgetMode, setBudgetMode] = useState(initialData?.budgetMode || '');
  const [householdStructure, setHouseholdStructure] = useState(initialData?.householdStructure || '');
  const [hasPets, setHasPets] = useState(initialData?.hasPets || false);
  const [nonMonthlyPlanningLevel, setNonMonthlyPlanningLevel] = useState(initialData?.nonMonthlyPlanningLevel || '');
  const [effectiveMonth, setEffectiveMonth] = useState(format(addMonths(new Date(), 1), "yyyy-MM"));

  const selectedBand = incomeBandId ? getBandById(incomeBandId) : null;
  const needsAnchor = selectedBand && selectedBand.subBands.length > 1;

  const hasDependents = HOUSEHOLD_STRUCTURES.find(h => h.id === householdStructure)?.hasDependents || false;

  const totalSteps = 9;
  const progressPercent = (step / totalSteps) * 100;

  // Get tip key for current step
  const getTipKey = useCallback((stepNum: WizardStep): string => {
    const tipKeys: Record<WizardStep, string> = {
      1: 'income_band',
      2: 'income_anchor',
      3: 'income_type',
      4: 'financial_stage',
      5: 'budget_mode',
      6: 'household_structure',
      7: 'pets',
      8: 'non_monthly_planning',
      9: 'effective_month',
    };
    return tipKeys[stepNum];
  }, []);

  const currentTip = ONBOARDING_TIPS[getTipKey(step)];

  // Handle step completion with tip display
  const handleStepComplete = useCallback((nextStep: WizardStep) => {
    setShowTip(true);
    setTimeout(() => {
      setShowTip(false);
      setStep(nextStep);
    }, 1500);
  }, []);

  // Handle income band selection
  const handleIncomeBandSelect = (bandId: string) => {
    setIncomeBandId(bandId);
    const band = getBandById(bandId);
    
    if (band && band.subBands.length === 1) {
      setIncomeAnchorValue(band.subBands[0].midpoint);
      handleStepComplete(3);
    } else {
      handleStepComplete(2);
    }
  };

  const handleAnchorSelect = (subBand: SubBand) => {
    setIncomeAnchorValue(subBand.midpoint);
    handleStepComplete(3);
  };

  const handleIncomeTypeSelect = (typeId: string) => {
    setIncomeType(typeId);
    handleStepComplete(4);
  };

  const handleFinancialStageSelect = (stageId: string) => {
    setFinancialStage(stageId);
    handleStepComplete(5);
  };

  const handleBudgetModeSelect = (modeId: string) => {
    setBudgetMode(modeId);
    handleStepComplete(6);
  };

  const handleHouseholdSelect = (structureId: string) => {
    setHouseholdStructure(structureId);
    handleStepComplete(7);
  };

  const handlePetsSelect = (value: boolean) => {
    setHasPets(value);
    handleStepComplete(8);
  };

  const handleNonMonthlySelect = (levelId: string) => {
    setNonMonthlyPlanningLevel(levelId);
    handleStepComplete(9);
  };

  // Handle final step and submit
  const handleSubmit = async () => {
    const data: OnboardingData = {
      incomeBandId,
      incomeAnchorValue,
      incomeType,
      financialStage,
      budgetMode,
      householdStructure,
      hasPets,
      hasDependents,
      nonMonthlyPlanningLevel,
    };

    onComplete(data, effectiveMonth);
  };

  const goBack = () => {
    if (step === 1) {
      onCancel();
    } else if (step === 3 && !needsAnchor) {
      setStep(1);
    } else {
      setStep((step - 1) as WizardStep);
    }
  };

  // Option button component
  const OptionButton = ({ 
    selected, 
    onClick, 
    children, 
    description,
    icon,
  }: { 
    selected: boolean; 
    onClick: () => void; 
    children: React.ReactNode;
    description?: string;
    icon?: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 p-4 rounded-xl transition-all duration-300 text-left",
        selected
          ? "bg-primary text-primary-foreground shadow-lg scale-[1.02]"
          : "bg-secondary/50 hover:bg-secondary hover:scale-[1.01]"
      )}
    >
      {icon && <span className="text-xl">{icon}</span>}
      <div className="flex-1 min-w-0">
        <span className="font-medium text-sm block">{children}</span>
        {description && (
          <span className={cn(
            "text-xs block mt-0.5",
            selected ? "text-primary-foreground/80" : "text-muted-foreground"
          )}>
            {description}
          </span>
        )}
      </div>
      {selected && <Check className="w-5 h-5 flex-shrink-0" />}
    </button>
  );

  // Tip card component
  const TipCard = ({ tip, emoji }: { tip: string; emoji: string }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed inset-x-4 bottom-24 md:bottom-32 z-50"
    >
      <div className="max-w-sm mx-auto p-4 rounded-2xl bg-primary/10 border border-primary/20 backdrop-blur-sm">
        <div className="flex gap-3">
          <span className="text-2xl">{emoji}</span>
          <p className="text-sm text-foreground leading-relaxed">{tip}</p>
        </div>
      </div>
    </motion.div>
  );

  // Month options for step 9
  const monthOptions = [
    { value: format(new Date(), "yyyy-MM"), label: `${format(new Date(), "MMMM 'de' yyyy", { locale: ptBR })} (mês atual)` },
    { value: format(addMonths(new Date(), 1), "yyyy-MM"), label: format(addMonths(new Date(), 1), "MMMM 'de' yyyy", { locale: ptBR }) },
    { value: format(addMonths(new Date(), 2), "yyyy-MM"), label: format(addMonths(new Date(), 2), "MMMM 'de' yyyy", { locale: ptBR }) },
  ];

  return (
    <div className="min-h-full flex flex-col">
      {/* Header */}
      <header className="p-4 flex items-center justify-between">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={goBack}
          disabled={isLoading}
          className="text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        
        <div className="flex-1 mx-4">
          <Progress value={progressPercent} className="h-1.5" />
          <p className="text-xs text-muted-foreground text-center mt-1">
            {step} de {totalSteps}
          </p>
        </div>
        
        <div className="w-10" />
      </header>

      {/* Content */}
      <main className="flex-1 flex flex-col justify-center px-6 pb-8 overflow-y-auto">
        <AnimatePresence mode="wait">
          {/* Steps 1-8 are similar to OnboardingWizard */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-sm mx-auto w-full space-y-6"
            >
              <div className="text-center">
                <h1 className="text-xl font-semibold mb-2">
                  Qual é a renda mensal total da sua família?
                </h1>
                <p className="text-sm text-muted-foreground">
                  Não precisa ser exato. É só para calibrar seu orçamento.
                </p>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto">
                {INCOME_BANDS.map((band) => (
                  <OptionButton
                    key={band.id}
                    selected={incomeBandId === band.id}
                    onClick={() => handleIncomeBandSelect(band.id)}
                  >
                    {band.label}
                  </OptionButton>
                ))}
              </div>
            </motion.div>
          )}

          {step === 2 && selectedBand && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-sm mx-auto w-full space-y-6"
            >
              <div className="text-center">
                <h1 className="text-xl font-semibold mb-2">
                  Qual valor mais se aproxima da sua realidade?
                </h1>
                <p className="text-sm text-muted-foreground">
                  Faixa: {selectedBand.label}
                </p>
              </div>

              <div className="space-y-2">
                {selectedBand.subBands.map((subBand) => (
                  <OptionButton
                    key={subBand.id}
                    selected={incomeAnchorValue === subBand.midpoint}
                    onClick={() => handleAnchorSelect(subBand)}
                  >
                    {subBand.label}
                  </OptionButton>
                ))}
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-sm mx-auto w-full space-y-6"
            >
              <div className="text-center">
                <h1 className="text-xl font-semibold mb-2">
                  Como essa renda acontece?
                </h1>
                <p className="text-sm text-muted-foreground">
                  Isso ajuda a calibrar suas reservas.
                </p>
              </div>

              <div className="space-y-2">
                {INCOME_TYPES.map((type) => (
                  <OptionButton
                    key={type.id}
                    selected={incomeType === type.id}
                    onClick={() => handleIncomeTypeSelect(type.id)}
                    description={type.description}
                  >
                    {type.label}
                  </OptionButton>
                ))}
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-sm mx-auto w-full space-y-6"
            >
              <div className="text-center">
                <h1 className="text-xl font-semibold mb-2">
                  Qual frase mais representa sua situação hoje?
                </h1>
                <p className="text-sm text-muted-foreground">
                  Seja honesto — isso é privado.
                </p>
              </div>

              <div className="space-y-2">
                {FINANCIAL_STAGES.map((stage) => (
                  <OptionButton
                    key={stage.id}
                    selected={financialStage === stage.id}
                    onClick={() => handleFinancialStageSelect(stage.id)}
                    description={stage.description}
                  >
                    {stage.label}
                  </OptionButton>
                ))}
              </div>
            </motion.div>
          )}

          {step === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-sm mx-auto w-full space-y-6"
            >
              <div className="text-center">
                <h1 className="text-xl font-semibold mb-2">
                  O que você mais busca com seu dinheiro agora?
                </h1>
                <p className="text-sm text-muted-foreground">
                  Isso define o perfil do seu orçamento.
                </p>
              </div>

              <div className="space-y-2">
                {BUDGET_MODES.map((mode) => (
                  <OptionButton
                    key={mode.id}
                    selected={budgetMode === mode.id}
                    onClick={() => handleBudgetModeSelect(mode.id)}
                    description={mode.description}
                    icon={mode.icon}
                  >
                    {mode.label}
                  </OptionButton>
                ))}
              </div>
            </motion.div>
          )}

          {step === 6 && (
            <motion.div
              key="step6"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-sm mx-auto w-full space-y-6"
            >
              <div className="text-center">
                <h1 className="text-xl font-semibold mb-2">
                  Quem depende dessa renda?
                </h1>
                <p className="text-sm text-muted-foreground">
                  Ajuda a ativar categorias como Filhos e Família.
                </p>
              </div>

              <div className="space-y-2">
                {HOUSEHOLD_STRUCTURES.map((structure) => (
                  <OptionButton
                    key={structure.id}
                    selected={householdStructure === structure.id}
                    onClick={() => handleHouseholdSelect(structure.id)}
                  >
                    {structure.label}
                  </OptionButton>
                ))}
              </div>
            </motion.div>
          )}

          {step === 7 && (
            <motion.div
              key="step7"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-sm mx-auto w-full space-y-6"
            >
              <div className="text-center">
                <h1 className="text-xl font-semibold mb-2">
                  Você tem pet?
                </h1>
                <p className="text-sm text-muted-foreground">
                  Pets também entram no orçamento.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <OptionButton
                  selected={hasPets === true}
                  onClick={() => handlePetsSelect(true)}
                  icon="🐕"
                >
                  Sim
                </OptionButton>
                <OptionButton
                  selected={hasPets === false && step === 7}
                  onClick={() => handlePetsSelect(false)}
                  icon="🚫"
                >
                  Não
                </OptionButton>
              </div>
            </motion.div>
          )}

          {step === 8 && (
            <motion.div
              key="step8"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-sm mx-auto w-full space-y-6"
            >
              <div className="text-center">
                <h1 className="text-xl font-semibold mb-2">
                  Você considera despesas não mensais no orçamento?
                </h1>
                <p className="text-sm text-muted-foreground">
                  IPTU, seguro, manutenção, viagens, troca de carro...
                </p>
              </div>

              <div className="space-y-2">
                {NON_MONTHLY_PLANNING_LEVELS.map((level) => (
                  <OptionButton
                    key={level.id}
                    selected={nonMonthlyPlanningLevel === level.id}
                    onClick={() => handleNonMonthlySelect(level.id)}
                  >
                    {level.label}
                  </OptionButton>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 9: Effective Month */}
          {step === 9 && (
            <motion.div
              key="step9"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-sm mx-auto w-full space-y-6"
            >
              <div className="text-center">
                <Calendar className="w-12 h-12 text-primary mx-auto mb-4" />
                <h1 className="text-xl font-semibold mb-2">
                  A partir de quando esse orçamento vale?
                </h1>
                <p className="text-sm text-muted-foreground">
                  O orçamento será aplicado a partir do mês escolhido. Meses anteriores não serão alterados.
                </p>
              </div>

              <div className="space-y-2">
                {monthOptions.map((option) => (
                  <OptionButton
                    key={option.value}
                    selected={effectiveMonth === option.value}
                    onClick={() => setEffectiveMonth(option.value)}
                    icon="📅"
                  >
                    {option.label}
                  </OptionButton>
                ))}
              </div>

              <Button 
                onClick={handleSubmit} 
                className="w-full gap-2 mt-4"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Gerando orçamento...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Gerar novo orçamento
                  </>
                )}
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tip overlay */}
        <AnimatePresence>
          {showTip && currentTip && (
            <TipCard tip={currentTip.tip} emoji={currentTip.emoji} />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
