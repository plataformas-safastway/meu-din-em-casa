import { useMemo } from "react";
import { useFinanceSummary } from "./useTransactions";
import { useActiveGoals } from "./useGoals";
import { getCategoryById } from "@/data/categories";
import { Insight } from "@/types/finance";

export function useInsights() {
  const { data: summary } = useFinanceSummary();
  const { data: goals } = useActiveGoals();

  const insights = useMemo(() => {
    const result: Insight[] = [];

    if (!summary) return result;

    const { income, expenses, balance, savingsRate, expensesByCategory } = summary;

    // Check if month is negative
    if (balance < 0) {
      result.push({
        id: "negative-month",
        type: "warning",
        title: "Mês no vermelho",
        message: `As despesas superaram as receitas em ${Math.abs(balance).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}. Revejam os gastos para retomar o equilíbrio.`,
        priority: 1,
      });
    }

    // Check if savings rate is good
    if (savingsRate >= 20) {
      result.push({
        id: "good-savings",
        type: "success",
        title: "Ótima economia!",
        message: `A família está guardando ${savingsRate.toFixed(0)}% da renda este mês. Continuem assim!`,
        priority: 3,
      });
    } else if (savingsRate > 0 && savingsRate < 10) {
      result.push({
        id: "low-savings",
        type: "tip",
        title: "Margem apertada",
        message: "A família está economizando menos de 10% da renda. Pequenos ajustes podem fazer diferença.",
        priority: 2,
      });
    }

    // Check fixed expenses ratio (if categories exist)
    const totalExpenses = expenses;
    if (totalExpenses > 0) {
      // Find top spending categories
      const sortedCategories = Object.entries(expensesByCategory)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3);

      if (sortedCategories.length > 0) {
        const [topCategoryId, topAmount] = sortedCategories[0];
        const topCategory = getCategoryById(topCategoryId);
        const percentage = (topAmount / totalExpenses) * 100;

        if (percentage > 40 && topCategory) {
          result.push({
            id: "high-category",
            type: "info",
            title: `${topCategory.name} em destaque`,
            message: `Esta categoria representa ${percentage.toFixed(0)}% dos gastos do mês. Vale acompanhar se está dentro do esperado.`,
            priority: 2,
          });
        }
      }

      // Check for unknown expenses
      const unknownExpenses = expensesByCategory["desc"] || 0;
      if (unknownExpenses > 0) {
        const unknownPercentage = (unknownExpenses / totalExpenses) * 100;
        if (unknownPercentage > 5) {
          result.push({
            id: "unknown-expenses",
            type: "warning",
            title: "Gastos não identificados",
            message: "Despesas não identificadas costumam gerar perda de controle financeiro. Categorizem para mais clareza.",
            priority: 1,
          });
        }
      }
    }

    // Check goals progress
    if (goals && goals.length > 0) {
      const completedGoals = goals.filter(g => g.status === "COMPLETED").length;
      const activeGoals = goals.filter(g => g.status === "ACTIVE");
      
      // Check for goals with high progress
      for (const goal of activeGoals) {
        if (goal.target_amount && goal.current_amount) {
          const progress = (Number(goal.current_amount) / Number(goal.target_amount)) * 100;
          if (progress >= 80 && progress < 100) {
            result.push({
              id: `goal-almost-${goal.id}`,
              type: "success",
              title: `"${goal.title}" quase lá!`,
              message: `Vocês já completaram ${progress.toFixed(0)}% deste objetivo. Falta pouco!`,
              priority: 3,
            });
            break; // Only show one goal insight
          }
        }
      }
      
      if (completedGoals > 0) {
        result.push({
          id: "goals-completed",
          type: "success",
          title: "Objetivos alcançados! 🎉",
          message: `A família já completou ${completedGoals} objetivo${completedGoals > 1 ? 's' : ''}. Parabéns!`,
          priority: 4,
        });
      }
    } else if (goals && goals.length === 0) {
      result.push({
        id: "no-goals",
        type: "tip",
        title: "Definam objetivos",
        message: "Criar objetivos ajuda a família a se manter focada e motivada. Que tal definir o primeiro?",
        priority: 3,
      });
    }

    // Welcome message if no transactions
    if (summary.transactionCount === 0) {
      result.push({
        id: "welcome",
        type: "info",
        title: "Bem-vindos! 👋",
        message: "Registrem o primeiro lançamento para começar a visualizar as finanças da família.",
        priority: 1,
      });
    }

    // Sort by priority
    return result.sort((a, b) => a.priority - b.priority);
  }, [summary, goals]);

  return { insights, isLoading: !summary };
}
