import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";
import { BudgetProposalScreen, type BudgetItem } from "@/components/onboarding/BudgetProposalScreen";
import { BudgetMetaAcceptanceScreen } from "@/components/budget/BudgetMetaAcceptanceScreen";
import { useOnboardingWizard } from "@/hooks/useOnboardingWizard";
import { type OnboardingData, getBudgetModeById } from "@/data/budgetModes";
import { 
  getBandById, 
  BASE_PERCENTAGES,
  PREFIX_CONFIG,
  calculateFixedFinancialExpenses,
} from "@/data/budgetTemplates";
import { 
  applyModeAdjustments,
  redistributeInactivePercentages,
  NON_MONTHLY_PLANNING_LEVELS,
} from "@/data/budgetModes";
import { useDraftPersistence } from "@/hooks/useDraftPersistence";
import { DraftRestoredToast } from "@/components/ui/draft-restored-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import type { BudgetCategoryItem } from "@/components/budget/BudgetMetaAdjustment";

type FlowStep = 'wizard' | 'budget-acceptance' | 'budget-adjustment' | 'budget-proposal';

export function OnboardingFlowPage() {
  const navigate = useNavigate();
  const { family, loading: authLoading } = useAuth();
  const [flowStep, setFlowStep] = useState<FlowStep>('wizard');
  const [onboardingData, setOnboardingData] = useState<OnboardingData | null>(null);
  const { saveOnboarding, generateAISuggestions, isLoading } = useOnboardingWizard();

  // CRITICAL: Redirect to family selection if no active family
  // Onboarding REQUIRES an existing family context
  useEffect(() => {
    if (!authLoading && !family) {
      console.log("[OnboardingFlowPage] No active family - redirecting to select-family");
      navigate("/select-family", { replace: true });
    }
  }, [family, authLoading, navigate]);
  
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

  // Generate budget items from onboarding data
  const generatedBudgetItems = useMemo((): BudgetCategoryItem[] => {
    if (!onboardingData) return [];
    
    const band = getBandById(onboardingData.incomeBandId);
    if (!band) return [];

    // Get base percentages for this income band
    const basePercents = BASE_PERCENTAGES[onboardingData.incomeBandId] 
      ? { ...BASE_PERCENTAGES[onboardingData.incomeBandId] }
      : { ...BASE_PERCENTAGES['band_8k_15k'] };

    // Apply budget mode adjustments
    let adjustedPercents = applyModeAdjustments(basePercents, onboardingData.budgetMode);

    // Track inactive categories
    const inactiveCategories: string[] = [];
    if (!onboardingData.hasPets) inactiveCategories.push('PET');
    if (!onboardingData.hasDependents) inactiveCategories.push('F');

    // Redistribute inactive percentages
    if (inactiveCategories.length > 0) {
      adjustedPercents = redistributeInactivePercentages(
        adjustedPercents, 
        inactiveCategories, 
        onboardingData.budgetMode
      );
    }

    // Apply non-monthly planning adjustment
    const planningLevel = NON_MONTHLY_PLANNING_LEVELS.find(l => l.id === onboardingData.nonMonthlyPlanningLevel);
    if (planningLevel && planningLevel.adjustE > 0) {
      const eAdjust = planningLevel.adjustE;
      adjustedPercents['E'] = (adjustedPercents['E'] || 0) + eAdjust;
      adjustedPercents['IF'] = Math.max(0.01, (adjustedPercents['IF'] || 0) - eAdjust);
      
      const total = Object.values(adjustedPercents).reduce((a, b) => a + b, 0);
      Object.keys(adjustedPercents).forEach(k => {
        adjustedPercents[k] = adjustedPercents[k] / total;
      });
    }

    // Get budgetable prefixes
    const budgetablePrefixes = PREFIX_CONFIG.filter(p => {
      if (!p.isBudgetable) return false;
      if (p.conditionalOn === 'has_pets' && !onboardingData.hasPets) return false;
      if (p.conditionalOn === 'has_dependents' && !onboardingData.hasDependents) return false;
      return true;
    });

    // Fixed financial expenses logic
    const fixedDFAmount = calculateFixedFinancialExpenses(onboardingData.incomeBandId);
    const fixedDFPercentage = (fixedDFAmount / onboardingData.incomeAnchorValue) * 100;
    const originalDFPercentage = (adjustedPercents['DF'] || 0) * 100;
    const dfPercentageDifference = originalDFPercentage - fixedDFPercentage;
    
    if (dfPercentageDifference > 0) {
      adjustedPercents['DF'] = fixedDFPercentage / 100;
      adjustedPercents['IF'] = (adjustedPercents['IF'] || 0) + (dfPercentageDifference / 100);
    } else {
      adjustedPercents['DF'] = fixedDFPercentage / 100;
    }

    // Normalize
    const totalAfterDF = Object.values(adjustedPercents).reduce((a, b) => a + b, 0);
    if (Math.abs(totalAfterDF - 1) > 0.001) {
      Object.keys(adjustedPercents).forEach(k => {
        adjustedPercents[k] = adjustedPercents[k] / totalAfterDF;
      });
    }

    // Create budget items
    return budgetablePrefixes
      .filter(p => adjustedPercents[p.code] !== undefined && adjustedPercents[p.code] > 0)
      .map(prefix => ({
        prefixCode: prefix.code,
        prefixName: prefix.name,
        categoryId: prefix.categoryId,
        percentage: adjustedPercents[prefix.code] * 100,
        amount: Math.round(onboardingData.incomeAnchorValue * adjustedPercents[prefix.code]),
        isEdited: false,
      }));
  }, [onboardingData]);

  // Handle wizard completion
  const handleWizardComplete = (data: OnboardingData) => {
    setOnboardingData(data);
    setFlowStep('budget-acceptance'); // Go to acceptance screen first
  };

  // Handle wizard skip
  const handleWizardSkip = () => {
    navigate("/app");
  };

  // Handle accept budget as-is
  // CRITICAL: Await mutation and cache invalidation before navigating
  const handleAcceptBudget = async () => {
    if (!onboardingData) return;

    const budgets: BudgetItem[] = generatedBudgetItems.map(item => ({
      prefixCode: item.prefixCode,
      prefixName: item.prefixName,
      categoryId: item.categoryId,
      percentage: item.percentage,
      amount: item.amount,
      isEdited: false,
    }));

    try {
      // Wait for the mutation to complete (includes cache invalidation)
      await saveOnboarding.mutateAsync({
        data: onboardingData,
        budgets,
      });

      // Clear draft only after successful save
      clearDraft();
      
      // Navigate only after everything is persisted and cache is refreshed
      console.log('[OnboardingFlowPage] Onboarding completed, navigating to /app');
      navigate("/app");
    } catch (error) {
      // Error is already handled by the mutation's onError
      // Do NOT navigate on error
      console.error('[OnboardingFlowPage] Failed to complete onboarding:', error);
    }
  };

  // Handle choose to adjust
  const handleChooseAdjust = () => {
    setFlowStep('budget-proposal');
  };

  // Handle budget confirmation (after adjustments)
  // CRITICAL: Await mutation and cache invalidation before navigating
  const handleBudgetConfirm = async (budgets: BudgetItem[]) => {
    if (!onboardingData) return;

    try {
      // Wait for the mutation to complete (includes cache invalidation)
      await saveOnboarding.mutateAsync({
        data: onboardingData,
        budgets,
      });

      // Clear draft only after successful save
      clearDraft();
      
      // Navigate only after everything is persisted and cache is refreshed
      console.log('[OnboardingFlowPage] Onboarding completed (adjusted), navigating to /app');
      navigate("/app");
    } catch (error) {
      // Error is already handled by the mutation's onError
      // Do NOT navigate on error
      console.error('[OnboardingFlowPage] Failed to complete onboarding:', error);
    }
  };

  // Handle back from budget screens
  const handleBudgetBack = () => {
    if (flowStep === 'budget-proposal') {
      setFlowStep('budget-acceptance');
    } else {
      setFlowStep('wizard');
    }
  };

  // Handle AI generation
  const handleGenerateAI = async () => {
    generateAISuggestions.mutate([]);
  };

  // Get budget mode name for display
  const budgetModeName = onboardingData 
    ? getBudgetModeById(onboardingData.budgetMode)?.label || 'Personalizado'
    : 'Personalizado';

  // Show loading while checking for family
  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // If no family, the useEffect will redirect - show loading in the meantime
  if (!family) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

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

  if (flowStep === 'budget-acceptance' && onboardingData) {
    return (
      <BudgetMetaAcceptanceScreen
        items={generatedBudgetItems}
        monthlyIncome={onboardingData.incomeAnchorValue}
        budgetModeName={budgetModeName}
        onAccept={handleAcceptBudget}
        onAdjust={handleChooseAdjust}
        isLoading={saveOnboarding.isPending}
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
