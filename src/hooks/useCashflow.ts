import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface CashflowDay {
  date: string;
  projectedIncome: number;
  projectedExpenses: number;
  projectedInstallments: number;
  projectedBalance: number;
  cumulativeBalance: number;
  alertLevel: "ok" | "warning" | "danger";
  events: Array<{
    type: "income" | "expense" | "installment";
    description: string;
    amount: number;
    category?: string;
  }>;
}

export function useCashflowForecast(days: number = 90) {
  const { family } = useAuth();

  return useQuery({
    queryKey: ["cashflow-forecast", family?.id, days],
    queryFn: async () => {
      if (!family) return [];

      const today = new Date();
      const startBalance = 0; // Could be enhanced to use actual bank balances

      // Get recurring transactions
      const { data: recurrings, error: recError } = await supabase
        .from("recurring_transactions")
        .select("*")
        .eq("family_id", family.id)
        .eq("is_active", true);

      if (recError) throw recError;

      // Get active installments
      const { data: installments, error: instError } = await supabase
        .from("installments")
        .select("*")
        .eq("family_id", family.id)
        .eq("is_active", true);

      if (instError) throw instError;

      // Generate daily projections
      const forecast: CashflowDay[] = [];
      let cumulativeBalance = startBalance;

      for (let i = 0; i < days; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        const dateStr = date.toISOString().split("T")[0];
        const dayOfMonth = date.getDate();
        const month = date.getMonth();
        const year = date.getFullYear();

        let projectedIncome = 0;
        let projectedExpenses = 0;
        let projectedInstallments = 0;
        const events: CashflowDay["events"] = [];

        // Check recurring transactions for this day
        recurrings?.forEach((rec: any) => {
          if (rec.frequency === "monthly" && rec.day_of_month === dayOfMonth) {
            // Check if start_date has passed and end_date hasn't been reached
            const startDate = new Date(rec.start_date);
            const endDate = rec.end_date ? new Date(rec.end_date) : null;

            if (date >= startDate && (!endDate || date <= endDate)) {
              if (rec.type === "income") {
                projectedIncome += Number(rec.amount);
                events.push({
                  type: "income",
                  description: rec.description,
                  amount: Number(rec.amount),
                  category: rec.category_id,
                });
              } else {
                projectedExpenses += Number(rec.amount);
                events.push({
                  type: "expense",
                  description: rec.description,
                  amount: Number(rec.amount),
                  category: rec.category_id,
                });
              }
            }
          }
        });

        // Check installments for this day (assuming they're due on day 10 for credit cards)
        installments?.forEach((inst: any) => {
          const startDate = new Date(inst.start_date);
          const startMonth = startDate.getMonth();
          const startYear = startDate.getFullYear();
          
          // Calculate which installment number this month would be
          const monthsDiff = (year - startYear) * 12 + (month - startMonth);
          const installmentNumber = monthsDiff + 1;

          // If this is within the installment range and it's the payment day
          if (
            installmentNumber >= inst.current_installment &&
            installmentNumber <= inst.total_installments &&
            dayOfMonth === 10 // Typical credit card due date
          ) {
            projectedInstallments += Number(inst.installment_amount);
            events.push({
              type: "installment",
              description: `${inst.description} (${installmentNumber}/${inst.total_installments})`,
              amount: Number(inst.installment_amount),
              category: inst.category_id,
            });
          }
        });

        const dailyBalance = projectedIncome - projectedExpenses - projectedInstallments;
        cumulativeBalance += dailyBalance;

        // Determine alert level
        let alertLevel: "ok" | "warning" | "danger" = "ok";
        if (cumulativeBalance < 0) {
          alertLevel = "danger";
        } else if (cumulativeBalance < 500) {
          alertLevel = "warning";
        }

        forecast.push({
          date: dateStr,
          projectedIncome,
          projectedExpenses,
          projectedInstallments,
          projectedBalance: dailyBalance,
          cumulativeBalance,
          alertLevel,
          events,
        });
      }

      return forecast;
    },
    enabled: !!family,
  });
}

// Aggregated monthly view
export function useMonthlyCashflow(months: number = 3) {
  const { data: dailyForecast } = useCashflowForecast(months * 31);

  if (!dailyForecast) return { data: undefined, isLoading: true };

  // Aggregate by month
  const monthlyData: Record<string, {
    month: string;
    income: number;
    expenses: number;
    installments: number;
    balance: number;
    alertLevel: "ok" | "warning" | "danger";
  }> = {};

  dailyForecast.forEach((day) => {
    const monthKey = day.date.slice(0, 7); // YYYY-MM
    
    if (!monthlyData[monthKey]) {
      const date = new Date(day.date);
      const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
      monthlyData[monthKey] = {
        month: `${monthNames[date.getMonth()]}/${date.getFullYear()}`,
        income: 0,
        expenses: 0,
        installments: 0,
        balance: 0,
        alertLevel: "ok",
      };
    }

    monthlyData[monthKey].income += day.projectedIncome;
    monthlyData[monthKey].expenses += day.projectedExpenses;
    monthlyData[monthKey].installments += day.projectedInstallments;
    
    // Use the worst alert level of the month
    if (day.alertLevel === "danger") {
      monthlyData[monthKey].alertLevel = "danger";
    } else if (day.alertLevel === "warning" && monthlyData[monthKey].alertLevel !== "danger") {
      monthlyData[monthKey].alertLevel = "warning";
    }
  });

  // Calculate final balance for each month
  Object.values(monthlyData).forEach((m) => {
    m.balance = m.income - m.expenses - m.installments;
  });

  return { 
    data: Object.values(monthlyData),
    isLoading: false,
  };
}
