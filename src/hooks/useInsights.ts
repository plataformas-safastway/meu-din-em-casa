import { useMemo } from "react";
import { useFinanceSummary, useEmergencyFund } from "./useTransactions";
import { getCategoryById } from "@/data/categories";
import { Insight } from "@/types/finance";

export function useInsights() {
  const { data: summary } = useFinanceSummary();
  const { data: emergencyFund } = useEmergencyFund();

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

    // Check emergency fund progress
    if (emergencyFund) {
      const fundProgress = emergencyFund.target_amount > 0 
        ? (Number(emergencyFund.current_amount) / Number(emergencyFund.target_amount)) * 100 
        : 0;

      if (fundProgress >= 100) {
        result.push({
          id: "fund-complete",
          type: "success",
          title: "Meta da reserva atingida! 🎉",
          message: "Parabéns! A família atingiu a meta da reserva de emergência. Isso traz muita tranquilidade.",
          priority: 3,
        });
      } else if (fundProgress >= 50) {
        result.push({
          id: "fund-progress",
          type: "success",
          title: "Reserva crescendo",
          message: `Vocês já completaram ${fundProgress.toFixed(0)}% da reserva de emergência. Continuem!`,
          priority: 4,
        });
      } else if (emergencyFund.target_amount > 0 && Number(emergencyFund.current_amount) === 0) {
        result.push({
          id: "fund-empty",
          type: "tip",
          title: "Reserva zerada",
          message: "Começar uma reserva de emergência, mesmo com pouco, já traz mais segurança para a família.",
          priority: 2,
        });
      }
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
  }, [summary, emergencyFund]);

  return { insights, isLoading: !summary };
}
