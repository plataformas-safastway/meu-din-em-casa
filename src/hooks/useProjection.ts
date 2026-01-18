import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ProjectionDriver {
  type: "INSTALLMENT" | "RECURRING" | "AVERAGE";
  label: string;
  amount: number;
  category?: string;
}

export interface MonthProjection {
  month: string;
  monthLabel: string;
  incomeProjected: number;
  expenseProjected: number;
  creditCardInstallments: number;
  recurringIncome: number;
  recurringExpense: number;
  balanceProjected: number;
  drivers: ProjectionDriver[];
}

export interface AITips {
  tips: string[];
  alert: string | null;
  recommendation: string;
}

export interface ProjectionData {
  projections: MonthProjection[];
  aiTips: AITips | null;
  metadata: {
    generatedAt: string;
    monthsProjected: number;
    historicalMonths: number;
  };
}

export function useProjection(months: number = 6, includeAiTips: boolean = true) {
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
