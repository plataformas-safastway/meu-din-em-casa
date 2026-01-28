import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format, subMonths } from "date-fns";
import { formatCurrency } from "@/lib/formatters";
import { getCategoryById } from "@/data/categories";

export interface MonthlyReportSummary {
  income: number;
  expenses: number;
  balance: number;
  topCategories: { categoryId: string; name: string; amount: number; percentage: number }[];
}

export interface MonthlyReportIssue {
  id: string;
  type: 'uncategorized' | 'duplicate' | 'unpaid_invoice' | 'no_goal_contribution' | 'budget_exceeded';
  title: string;
  description: string;
  count?: number;
  severity: 'low' | 'medium' | 'high';
  actionUrl?: string;
}

export interface MonthlyReport {
  id: string;
  family_id: string;
  month_ref: string;
  status: 'open' | 'closed';
  closed_at: string | null;
  closed_by: string | null;
  summary: MonthlyReportSummary;
  issues: MonthlyReportIssue[];
  created_at: string;
  updated_at: string;
}

export interface ContextualInsight {
  id: string;
  type: 'warning' | 'success' | 'tip' | 'info';
  title: string;
  description: string;
  reason: string;
  priority: number;
  actionLabel?: string;
  actionUrl?: string;
  category?: string;
  amount?: number;
  percentage?: number;
}

// Hook for fetching or generating monthly reports
export function useMonthlyReportsList() {
  const { family } = useAuth();

  return useQuery({
    queryKey: ["monthly-reports-list", family?.id],
    queryFn: async () => {
      if (!family) return [];

      // Get last 12 months
      const months: string[] = [];
      for (let i = 0; i < 12; i++) {
        const date = subMonths(new Date(), i);
        months.push(format(date, "yyyy-MM"));
      }

      // Fetch existing reports
      const { data: existingReports, error } = await supabase
        .from("monthly_reports")
        .select("*")
        .eq("family_id", family.id)
        .in("month_ref", months)
        .order("month_ref", { ascending: false });

      if (error) throw error;

      // Create a map for quick lookup
      const reportsMap = new Map<string, MonthlyReport>();
      (existingReports || []).forEach((r: any) => {
        reportsMap.set(r.month_ref, {
          ...r,
          summary: r.summary || { income: 0, expenses: 0, balance: 0, topCategories: [] },
          issues: r.issues || [],
        });
      });

      // Return all months with reports (existing or placeholder)
      return months.map((monthRef) => {
        if (reportsMap.has(monthRef)) {
          return reportsMap.get(monthRef)!;
        }
        return {
          id: "",
          family_id: family.id,
          month_ref: monthRef,
          status: "open" as const,
          closed_at: null,
          closed_by: null,
          summary: { income: 0, expenses: 0, balance: 0, topCategories: [] },
          issues: [],
          created_at: "",
          updated_at: "",
        };
      });
    },
    enabled: !!family,
  });
}

// Hook for a specific month's report with calculated data
export function useMonthlyReportDetail(monthRef: string) {
  const { family } = useAuth();

  return useQuery({
    queryKey: ["monthly-report-detail", family?.id, monthRef],
    queryFn: async () => {
      if (!family || !monthRef) return null;

      const [year, month] = monthRef.split("-").map(Number);
      const startDate = `${monthRef}-01`;
      const endDate = format(new Date(year, month, 0), "yyyy-MM-dd");

      // Fetch transactions for this month
      const { data: transactions, error: txError } = await supabase
        .from("transactions")
        .select("*")
        .eq("family_id", family.id)
        .gte("date", startDate)
        .lte("date", endDate);

      if (txError) throw txError;

      // Calculate summary
      const income = (transactions || [])
        .filter((t: any) => t.type === "income")
        .reduce((sum: number, t: any) => sum + Number(t.amount), 0);
      
      const expenses = (transactions || [])
        .filter((t: any) => t.type === "expense")
        .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

      // Calculate top categories
      const categoryTotals: Record<string, number> = {};
      (transactions || [])
        .filter((t: any) => t.type === "expense")
        .forEach((t: any) => {
          const catId = t.category_id || "uncategorized";
          categoryTotals[catId] = (categoryTotals[catId] || 0) + Number(t.amount);
        });

      const topCategories = Object.entries(categoryTotals)
        .map(([categoryId, amount]) => ({
          categoryId,
          name: categoryId,
          amount,
          percentage: expenses > 0 ? (amount / expenses) * 100 : 0,
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5);

      // Calculate issues
      const issues: MonthlyReportIssue[] = [];

      // Check for uncategorized transactions
      const uncategorized = (transactions || []).filter(
        (t: any) => !t.category_id || t.category_id === "desc"
      );
      if (uncategorized.length > 0) {
        issues.push({
          id: "uncategorized",
          type: "uncategorized",
          title: "Transações sem categoria",
          description: `${uncategorized.length} transações precisam ser categorizadas`,
          count: uncategorized.length,
          severity: uncategorized.length > 5 ? "high" : "medium",
          actionUrl: "/extrato?filter=uncategorized",
        });
      }

      // Check for budget exceeded
      const { data: budgets } = await supabase
        .from("budgets")
        .select("*")
        .eq("family_id", family.id)
        .eq("is_active", true);

      if (budgets && budgets.length > 0) {
        for (const budget of budgets) {
          const spent = categoryTotals[budget.category_id] || 0;
          if (spent > budget.monthly_limit) {
            issues.push({
              id: `budget-${budget.id}`,
              type: "budget_exceeded",
              title: "Orçamento excedido",
              description: `Categoria ultrapassou o limite em ${((spent / budget.monthly_limit - 1) * 100).toFixed(0)}%`,
              severity: "high",
              actionUrl: "/orcamentos",
            });
          }
        }
      }

      // Fetch existing report record
      const { data: existingReport } = await supabase
        .from("monthly_reports")
        .select("*")
        .eq("family_id", family.id)
        .eq("month_ref", monthRef)
        .maybeSingle();

      const summary: MonthlyReportSummary = {
        income,
        expenses,
        balance: income - expenses,
        topCategories,
      };

      return {
        id: existingReport?.id || "",
        family_id: family.id,
        month_ref: monthRef,
        status: (existingReport?.status || "open") as "open" | "closed",
        closed_at: existingReport?.closed_at || null,
        closed_by: existingReport?.closed_by || null,
        summary,
        issues,
        created_at: existingReport?.created_at || "",
        updated_at: existingReport?.updated_at || "",
        transactionCount: transactions?.length || 0,
      };
    },
    enabled: !!family && !!monthRef,
  });
}

// Hook to close a month
export function useCloseMonth() {
  const queryClient = useQueryClient();
  const { family, user } = useAuth();

  return useMutation({
    mutationFn: async ({ monthRef, summary, issues }: { 
      monthRef: string; 
      summary: MonthlyReportSummary;
      issues: MonthlyReportIssue[];
    }) => {
      if (!family || !user) throw new Error("Not authenticated");

      // Upsert the monthly report with closed status
      const { data, error } = await supabase
        .from("monthly_reports")
        .upsert({
          family_id: family.id,
          month_ref: monthRef,
          status: "closed",
          closed_at: new Date().toISOString(),
          closed_by: user.id,
          summary: summary as any,
          issues: issues as any,
        }, {
          onConflict: "family_id,month_ref",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["monthly-reports-list"] });
      queryClient.invalidateQueries({ queryKey: ["monthly-report-detail", family?.id, variables.monthRef] });
      toast.success("Mês fechado com sucesso!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao fechar o mês", { description: error.message });
    },
  });
}

// Hook to reopen a month
export function useReopenMonth() {
  const queryClient = useQueryClient();
  const { family } = useAuth();

  return useMutation({
    mutationFn: async (monthRef: string) => {
      if (!family) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("monthly_reports")
        .update({
          status: "open",
          closed_at: null,
          closed_by: null,
        })
        .eq("family_id", family.id)
        .eq("month_ref", monthRef);

      if (error) throw error;
    },
    onSuccess: (_, monthRef) => {
      queryClient.invalidateQueries({ queryKey: ["monthly-reports-list"] });
      queryClient.invalidateQueries({ queryKey: ["monthly-report-detail", family?.id, monthRef] });
      toast.success("Mês reaberto!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao reabrir o mês", { description: error.message });
    },
  });
}

// Hook to generate contextual insights for a month
export function useContextualInsights(month: number, year: number) {
  const { family } = useAuth();

  return useQuery({
    queryKey: ["contextual-insights", family?.id, month, year],
    queryFn: async () => {
      if (!family) return [];

      const monthRef = `${year}-${String(month + 1).padStart(2, "0")}`;
      const prevMonthRef = month === 0 
        ? `${year - 1}-12`
        : `${year}-${String(month).padStart(2, "0")}`;
      
      const startDate = `${monthRef}-01`;
      const endDate = format(new Date(year, month + 1, 0), "yyyy-MM-dd");
      const prevStartDate = `${prevMonthRef}-01`;
      const prevEndDate = month === 0
        ? `${year - 1}-12-31`
        : format(new Date(year, month, 0), "yyyy-MM-dd");

      // Fetch current month transactions
      const { data: currentTx } = await supabase
        .from("transactions")
        .select("*")
        .eq("family_id", family.id)
        .gte("date", startDate)
        .lte("date", endDate);

      // Fetch previous month transactions
      const { data: prevTx } = await supabase
        .from("transactions")
        .select("*")
        .eq("family_id", family.id)
        .gte("date", prevStartDate)
        .lte("date", prevEndDate);

      // Fetch budgets
      const { data: budgets } = await supabase
        .from("budgets")
        .select("*")
        .eq("family_id", family.id)
        .eq("is_active", true);

      // Fetch goals
      const { data: goals } = await supabase
        .from("goals")
        .select("*")
        .eq("family_id", family.id)
        .eq("status", "ACTIVE");

      const insights: ContextualInsight[] = [];

      // Calculate totals
      const currentExpenses = (currentTx || [])
        .filter((t: any) => t.type === "expense")
        .reduce((sum: number, t: any) => sum + Number(t.amount), 0);
      
      const prevExpenses = (prevTx || [])
        .filter((t: any) => t.type === "expense")
        .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

      const currentIncome = (currentTx || [])
        .filter((t: any) => t.type === "income")
        .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

      // 1. Spending increase vs previous month
      if (prevExpenses > 0 && currentExpenses > prevExpenses) {
        const increase = ((currentExpenses - prevExpenses) / prevExpenses) * 100;
        if (increase > 10) {
          insights.push({
            id: "spending-increase",
            type: "warning",
            title: "Gastos em alta",
            description: `Os gastos deste mês são ${increase.toFixed(0)}% maiores que o mês anterior.`,
            reason: "Acompanhar variações ajuda a manter o controle financeiro.",
            priority: 2,
            amount: currentExpenses - prevExpenses,
            percentage: increase,
            actionLabel: "Ver extrato",
            actionUrl: "/extrato",
          });
        }
      }

      // 2. Budget exceeded
      if (budgets && budgets.length > 0) {
        const categoryTotals: Record<string, number> = {};
        (currentTx || [])
          .filter((t: any) => t.type === "expense")
          .forEach((t: any) => {
            categoryTotals[t.category_id] = (categoryTotals[t.category_id] || 0) + Number(t.amount);
          });

        for (const budget of budgets) {
          const spent = categoryTotals[budget.category_id] || 0;
          const percentage = (spent / budget.monthly_limit) * 100;
          
          if (percentage > 100) {
            insights.push({
              id: `budget-exceeded-${budget.id}`,
              type: "warning",
              title: "Orçamento excedido",
              description: `Você ultrapassou o limite em ${(percentage - 100).toFixed(0)}%.`,
              reason: "Ajuste os gastos ou revise o orçamento para o próximo mês.",
              priority: 1,
              category: budget.category_id,
              amount: spent - budget.monthly_limit,
              percentage: percentage - 100,
              actionLabel: "Ajustar orçamento",
              actionUrl: "/orcamentos",
            });
          } else if (percentage > 80) {
            insights.push({
              id: `budget-warning-${budget.id}`,
              type: "tip",
              title: "Orçamento chegando ao limite",
              description: `Você já utilizou ${percentage.toFixed(0)}% do orçamento.`,
              reason: "Atenção para não ultrapassar o limite até o fim do mês.",
              priority: 3,
              category: budget.category_id,
              percentage,
            });
          }
        }
      }

      // 3. Goals without contribution
      if (goals && goals.length > 0) {
        const goalContributions = (currentTx || []).filter(
          (t: any) => t.goal_id && t.type === "expense"
        );
        
        const goalsWithoutContribution = goals.filter(
          (g: any) => !goalContributions.some((t: any) => t.goal_id === g.id)
        );

        if (goalsWithoutContribution.length > 0) {
          insights.push({
            id: "goals-no-contribution",
            type: "tip",
            title: "Metas sem aporte",
            description: `${goalsWithoutContribution.length} meta(s) não receberam aportes este mês.`,
            reason: "Pequenos aportes regulares fazem grande diferença a longo prazo.",
            priority: 4,
            actionLabel: "Ver metas",
            actionUrl: "/metas",
          });
        }
      }

      // 4. Uncategorized transactions
      const uncategorized = (currentTx || []).filter(
        (t: any) => !t.category_id || t.category_id === "desc"
      );
      if (uncategorized.length > 3) {
        insights.push({
          id: "uncategorized",
          type: "info",
          title: "Categorize suas transações",
          description: `${uncategorized.length} transações aguardam categorização.`,
          reason: "Categorizar ajuda a entender para onde vai seu dinheiro.",
          priority: 5,
          actionLabel: "Categorizar pendências",
          actionUrl: "/extrato?filter=uncategorized",
        });
      }

      // 5. Good savings rate
      if (currentIncome > 0) {
        const savingsRate = ((currentIncome - currentExpenses) / currentIncome) * 100;
        if (savingsRate >= 20) {
          insights.push({
            id: "good-savings",
            type: "success",
            title: "Ótima economia!",
            description: `Você está guardando ${savingsRate.toFixed(0)}% da renda este mês.`,
            reason: "Continue assim para alcançar seus objetivos mais rápido.",
            priority: 6,
            percentage: savingsRate,
          });
        }
      }

      // 6. Category concentration
      const categoryTotals: Record<string, number> = {};
      (currentTx || [])
        .filter((t: any) => t.type === "expense")
        .forEach((t: any) => {
          if (t.category_id && t.category_id !== "desc") {
            categoryTotals[t.category_id] = (categoryTotals[t.category_id] || 0) + Number(t.amount);
          }
        });

      const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
      if (sortedCategories.length > 0 && currentExpenses > 0) {
        const topCategoryPct = (sortedCategories[0][1] / currentExpenses) * 100;
        if (topCategoryPct > 50) {
          insights.push({
            id: "category-concentration",
            type: "info",
            title: "Concentração de gastos",
            description: `${topCategoryPct.toFixed(0)}% dos gastos estão em uma única categoria.`,
            reason: "Diversificar pode ajudar a identificar oportunidades de economia.",
            priority: 7,
            category: sortedCategories[0][0],
            percentage: topCategoryPct,
            actionLabel: "Ver categorias",
            actionUrl: "/categorias",
          });
        }
      }

      // 7. Fixed cost insights - fetch fixed expenses and calculate ratio
      const fixedExpenses = (currentTx || []).filter(
        (t: any) => t.type === 'expense' && t.expense_nature === 'FIXED'
      );
      const totalFixedCost = fixedExpenses.reduce((sum: number, t: any) => sum + Number(t.amount), 0);
      
      if (currentIncome > 0 && totalFixedCost > 0) {
        const fixedRatio = (totalFixedCost / currentIncome) * 100;
        
        if (fixedRatio > 70) {
          insights.push({
            id: "fixed-cost-ratio-high",
            type: "warning",
            title: "Comprometimento alto",
            description: `${fixedRatio.toFixed(0)}% da sua renda está comprometida com custos fixos estruturais.`,
            reason: "Isso reduz muito sua flexibilidade financeira e capacidade de investir.",
            priority: 1,
            percentage: fixedRatio,
            amount: totalFixedCost,
            actionLabel: "Ver custos fixos",
            actionUrl: "/projecao",
          });
        } else if (fixedRatio > 50) {
          insights.push({
            id: "fixed-cost-ratio-medium",
            type: "tip",
            title: "Atenção ao custo fixo",
            description: `${fixedRatio.toFixed(0)}% da sua renda está em custos fixos estruturais.`,
            reason: "Idealmente, mantenha abaixo de 50% para ter mais margem de manobra.",
            priority: 3,
            percentage: fixedRatio,
            amount: totalFixedCost,
          });
        } else if (fixedRatio <= 40) {
          insights.push({
            id: "fixed-cost-ratio-good",
            type: "success",
            title: "Boa estrutura de custos",
            description: `Apenas ${fixedRatio.toFixed(0)}% da renda está comprometida com custos fixos.`,
            reason: "Isso dá mais flexibilidade para investir e realizar objetivos.",
            priority: 8,
            percentage: fixedRatio,
            amount: totalFixedCost,
          });
        }
      }

      // 8. Fixed cost change vs previous month
      const prevFixedExpenses = (prevTx || []).filter(
        (t: any) => t.type === 'expense' && t.expense_nature === 'FIXED'
      );
      const totalPrevFixed = prevFixedExpenses.reduce((sum: number, t: any) => sum + Number(t.amount), 0);
      
      if (totalPrevFixed > 0 && totalFixedCost > 0) {
        const fixedChange = totalFixedCost - totalPrevFixed;
        const fixedChangePct = (fixedChange / totalPrevFixed) * 100;
        
        if (fixedChangePct > 5) {
          // Calculate top changes by category
          const currentByCat: Record<string, number> = {};
          const prevByCat: Record<string, number> = {};
          
          fixedExpenses.forEach((t: any) => {
            currentByCat[t.category_id] = (currentByCat[t.category_id] || 0) + Number(t.amount);
          });
          prevFixedExpenses.forEach((t: any) => {
            prevByCat[t.category_id] = (prevByCat[t.category_id] || 0) + Number(t.amount);
          });
          
          const changes = Object.keys({ ...currentByCat, ...prevByCat }).map(catId => ({
            categoryId: catId,
            diff: (currentByCat[catId] || 0) - (prevByCat[catId] || 0),
          })).filter(c => c.diff > 0).sort((a, b) => b.diff - a.diff).slice(0, 3);
          
          const topChangesText = changes.map(c => {
            const cat = getCategoryById(c.categoryId);
            return `• ${cat?.name || c.categoryId} (+${formatCurrency(c.diff)})`;
          }).join('\n');
          
          insights.push({
            id: "fixed-cost-increase",
            type: "warning",
            title: "Custo fixo aumentou",
            description: `Seu custo fixo estrutural aumentou ${formatCurrency(fixedChange)} (${fixedChangePct.toFixed(0)}%) este mês.${topChangesText ? '\n\nPrincipais aumentos:\n' + topChangesText : ''}`,
            reason: "Mudanças no custo fixo afetam seu padrão de vida estrutural.",
            priority: 2,
            amount: fixedChange,
            percentage: fixedChangePct,
          });
        } else if (fixedChangePct < -5) {
          insights.push({
            id: "fixed-cost-decrease",
            type: "success",
            title: "Custo fixo reduziu! 🎉",
            description: `Seu custo fixo estrutural diminuiu ${formatCurrency(Math.abs(fixedChange))} (${Math.abs(fixedChangePct).toFixed(0)}%) este mês.`,
            reason: "Parabéns! Isso aumenta sua flexibilidade financeira.",
            priority: 6,
            amount: Math.abs(fixedChange),
            percentage: Math.abs(fixedChangePct),
          });
        }
      }

      // Sort by priority
      return insights.sort((a, b) => a.priority - b.priority);
    },
    enabled: !!family,
    staleTime: 5 * 60 * 1000,
  });
}

// Hook to request PDF export
export function useRequestPdfExport() {
  const { family, user } = useAuth();

  return useMutation({
    mutationFn: async (monthRef: string) => {
      if (!family || !user) throw new Error("Not authenticated");

      const { data: session } = await supabase.auth.getSession();
      const token = session?.session?.access_token;

      if (!token) throw new Error("No session");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-report-pdf`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            familyId: family.id,
            monthRef,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to generate PDF");
      }

      return response.json();
    },
    onSuccess: (data) => {
      if (data.signedUrl) {
        window.open(data.signedUrl, "_blank");
        toast.success("PDF gerado com sucesso!");
      }
    },
    onError: (error: Error) => {
      toast.error("Erro ao gerar PDF", { description: error.message });
    },
  });
}
