import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { BudgetProposalScreen, type BudgetItem } from "@/components/onboarding/BudgetProposalScreen";
import { useOnboardingWizard } from "@/hooks/useOnboardingWizard";
import { type OnboardingData } from "@/data/budgetModes";
import { useDraftPersistence } from "@/hooks/useDraftPersistence";
import { DraftRestoredToast } from "@/components/ui/draft-restored-toast";

type FlowStep = 'wizard' | 'budget-proposal';

export function OnboardingFlowPage() {
  const navigate = useNavigate();
  const [flowStep, setFlowStep] = useState<FlowStep>('wizard');
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const { saveOnboarding, generateAISuggestions, isLoading } = useOnboardingWizard();
  
  // Draft persistence for onboarding data
  const { 
    restoredDraft, 
    wasRestored, 
    saveDraft, 
    clearDraft, 
    dismissRestoreNotice 
  } = useDraftPersistence<{ data: OnboardingData | null; step: FlowStep }>('onboarding_wizard');
  
  // Restore draft on mount
  useEffect(() => {
    if (restoredDraft && !onboardingData) {
      if (restoredDraft.data) {
        setOnboardingData(restoredDraft.data);
      }
      if (restoredDraft.step) {
        setFlowStep(restoredDraft.step);
      }
    }
  }, [restoredDraft, onboardingData]);
  
  // Save draft on changes
  useEffect(() => {
    if (onboardingData || flowStep !== 'wizard') {
      saveDraft({ data: onboardingData, step: flowStep });
    }
  }, [onboardingData, flowStep, saveDraft]);

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

    // Clear draft on successful save
    clearDraft();
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
      <>
        <DraftRestoredToast 
          wasRestored={wasRestored} 
          onDismiss={dismissRestoreNotice} 
          entityName="dados do cadastro" 
        />
        <OnboardingWizard
          onComplete={handleWizardComplete}
          onSkip={handleWizardSkip}
          initialData={onboardingData || restoredDraft?.data || undefined}
        />
      </>
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
