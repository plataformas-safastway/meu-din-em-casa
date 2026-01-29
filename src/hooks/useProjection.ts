import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ProjectionDriver {
  type: "INSTALLMENT" | "RECURRING" | "AVERAGE";
  label: string;
  amount: number;
  category?: string;
  subcategory?: string;
}

export interface MonthProjection {
  month: string;
  monthLabel: string;
  // Income
  incomeProjected: number;
  recurringIncome: number;
  // Expenses total
  expenseProjected: number;
  recurringExpense: number;
  // Fixed Commitment breakdown (core feature)
  fixedRecurringTotal: number;
  creditCardInstallments: number;
  fixedCommitmentTotal: number;
  fixedCommitmentPercentage: number;
  // Projected surplus
  projectedSurplus: number;
  variableExpenseEstimate: number;
  // Balance
  balanceProjected: number;
  // Drivers/details
  drivers: ProjectionDriver[];
  fixedExpenses: ProjectionDriver[];
  installmentDetails: ProjectionDriver[];
}

export interface CurrentMonthSummary {
  month: string;
  fixedCommitmentTotal: number;
  fixedCommitmentPercentage: number;
  projectedSurplus: number;
  incomeProjected: number;
  fixedRecurringTotal: number;
  creditCardInstallments: number;
  alertLevel: 'healthy' | 'warning' | 'critical';
}

export interface AITips {
  tips: string[];
  alert: string | null;
  recommendation: string;
}

export interface ProjectionData {
  projections: MonthProjection[];
  currentMonthSummary: CurrentMonthSummary | null;
  aiTips: AITips | null;
  metadata: {
    generatedAt: string;
    monthsProjected: number;
    historicalMonths: number;
    accountingRegime: string;
  };
}

export function useProjection(months: number = 12, includeAiTips: boolean = true) {
  const { family } = useAuth();

  return useQuery({
    queryKey: ["projection", family?.id, months, includeAiTips],
    queryFn: async (): Promise<ProjectionData> => {
      if (!family) throw new Error("No family");

      const { data, error } = await supabase.functions.invoke("generate-projection", {
        body: { months, includeAiTips },
      });

      if (error) throw error;
      return data as ProjectionData;
    },
    enabled: !!family,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: false,
  });
}

// Get projection summary for a specific month
export function useMonthProjectionSummary(monthIndex: number = 0) {
  const { data, isLoading, error } = useProjection(6, false);

  const monthData = data?.projections[monthIndex] || null;

  return {
    data: monthData,
    isLoading,
    error,
  };
}

// Get current month's fixed commitment summary (for Home widget)
export function useCurrentMonthCommitment() {
  const { data, isLoading, error } = useProjection(1, false);

  return {
    data: data?.currentMonthSummary || null,
    projection: data?.projections[0] || null,
    isLoading,
    error,
  };
}

// Helper to get alert level color
export function getAlertLevelColor(level: CurrentMonthSummary['alertLevel']) {
  switch (level) {
    case 'critical':
      return 'destructive';
    case 'warning':
      return 'warning';
    case 'healthy':
    default:
      return 'success';
  }
}

// Helper to get alert level text
export function getAlertLevelText(level: CurrentMonthSummary['alertLevel']) {
  switch (level) {
    case 'critical':
      return 'Comprometimento alto';
    case 'warning':
      return 'Atenção ao limite';
    case 'healthy':
    default:
      return 'Saudável';
  }
}
