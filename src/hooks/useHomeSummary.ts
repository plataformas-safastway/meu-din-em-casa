import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AccountPreview {
  id: string;
  label: string;
  balance: number;
  bankName: string;
  type: string;
}

export interface CardPreview {
  id: string;
  label: string;
  projectedBill: number;
  dueDate: string;
  closingDay: number;
  dueDay: number;
  limit: number | null;
  usedPercent: number;
}

export interface BestCardSuggestion {
  cardId: string;
  title: string;
  recommendation: string;
  reason: string;
  daysUntilDue: number;
}

export interface HomeSummaryData {
  greeting: {
    firstName: string;
    photoUrl: string | null;
  };
  balanceGlobal: number;
  income: number;
  expenses: number;
  savingsRate: number;
  accountsPreview: AccountPreview[];
  hasMoreAccounts: boolean;
  totalAccounts: number;
  creditCardsPreview: CardPreview[];
  hasMoreCreditCards: boolean;
  totalCreditCards: number;
  totalCreditCardBill: number;
  bestCardSuggestion: BestCardSuggestion | null;
}

export function useHomeSummary(month: number, year: number) {
  const { user } = useAuth();
  // month is 0-indexed (0 = January), so add 1 for the API
  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;

  return useQuery({
    queryKey: ["home-summary", monthStr],
    queryFn: async (): Promise<HomeSummaryData> => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/home-summary?month=${monthStr}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch home summary");
      }

      return response.json();
    },
    enabled: !!user,
    staleTime: 60000,
  });
}

export interface AccountWithInsight {
  id: string;
  type: string;
  nickname: string;
  bankName: string;
  balance: number;
  incomeTotal: number;
  expenseTotal: number;
  transactionCount: number;
  insight: string;
}

export interface CardWithInsight {
  id: string;
  name: string;
  brand: string;
  closingDay: number;
  dueDay: number;
  limit: number | null;
  totalSpent3Months: number;
  avgMonthlySpend: number;
  usagePercent: number | null;
  insight: string;
  bestUse: string;
}

export interface AccountsCardsInsights {
  accounts: AccountWithInsight[];
  cards: CardWithInsight[];
  generalTip: string;
}

export function useAccountsCardsInsights() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["accounts-cards-insights"],
    queryFn: async (): Promise<AccountsCardsInsights> => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/accounts-cards-insights`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch insights");
      }

      return response.json();
    },
    enabled: !!user,
    staleTime: 300000, // 5 minutes
  });
}
