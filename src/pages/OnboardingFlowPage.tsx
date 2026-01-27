import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { BudgetProposalScreen, type BudgetItem } from "@/components/onboarding/BudgetProposalScreen";
import { useOnboardingWizard } from "@/hooks/useOnboardingWizard";
import { type OnboardingData } from "@/data/budgetModes";

type FlowStep = 'wizard' | 'budget-proposal';

export function OnboardingFlowPage() {
  const navigate = useNavigate();
  const [flowStep, setFlowStep] = useState<FlowStep>('wizard');
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const { saveOnboarding, generateAISuggestions, isLoading } = useOnboardingWizard();

  // Handle wizard completion
  const handleWizardComplete = (data: OnboardingData) => {
    setOnboardingData(data);
    setFlowStep('budget-proposal');
  };

  // Handle wizard skip
  const handleWizardSkip = () => {
    navigate("/app");
  };

  // Handle budget confirmation
  const handleBudgetConfirm = async (budgets: BudgetItem[]) => {
    if (!onboardingData) return;

    await saveOnboarding.mutateAsync({
      data: onboardingData,
      budgets,
    });

    navigate("/app");
  };

  // Handle back from budget proposal
  const handleBudgetBack = () => {
    setFlowStep('wizard');
  };

  // Handle AI generation
  const handleGenerateAI = async () => {
    // Will be implemented with edge function
    generateAISuggestions.mutate([]);
  };

  if (flowStep === 'wizard') {
    return (
      <OnboardingWizard
        onComplete={handleWizardComplete}
        onSkip={handleWizardSkip}
        initialData={onboardingData || undefined}
      />
    );
  }

  if (flowStep === 'budget-proposal' && onboardingData) {
    return (
      <BudgetProposalScreen
        data={onboardingData}
        onBack={handleBudgetBack}
        onConfirm={handleBudgetConfirm}
        onGenerateAI={handleGenerateAI}
        isGeneratingAI={generateAISuggestions.isPending}
      />
    );
  }

  return null;
}
