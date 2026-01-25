import { useState, useMemo, useEffect, memo, useCallback } from "react";
import { Header } from "@/components/Header";
import { MonthSelector } from "@/components/MonthSelector";
import { FamilyStatusCard, DailyFocusCard, CollapsibleSection, CreditCardsPreviewCard } from "@/components/home";
import { QuickActions } from "@/components/QuickActions";
import { CategoryChart } from "@/components/CategoryChart";
import { GoalsWidget } from "@/components/goals/GoalsWidget";
import { TransactionList } from "@/components/TransactionList";
import { MonthlyChart } from "@/components/MonthlyChart";
import { AddTransactionSheet } from "@/components/AddTransactionSheet";
import { EditTransactionSheet } from "@/components/EditTransactionSheet";
import { FabButton } from "@/components/QuickActions";
import { SkeletonHome } from "@/components/ui/money-loader";
import { WelcomeModal, OnboardingChecklist } from "@/components/onboarding";
import { BudgetAlertsWidget } from "@/components/budget";
import { useAuth } from "@/contexts/AuthContext";
import { useTransactions, useFinanceSummary, useCreateTransaction, useTransactionsLast6Months } from "@/hooks/useTransactions";
import { useInsights } from "@/hooks/useInsights";
import { useHomeSummary } from "@/hooks/useHomeSummary";
import { useBudgetAlerts } from "@/hooks/useBudgets";
import { useDebouncedLoading } from "@/hooks/useLoading";
import { useOnboarding } from "@/hooks/useOnboarding";
import { getCategoryById } from "@/data/categories";
import { Transaction, TransactionType } from "@/types/finance";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { markHomeRender } from "@/lib/performance";
import { motion } from "framer-motion";

interface DashboardProps {
  onSettingsClick?: () => void;
  onGoalsClick?: () => void;
  onLearnMore?: (tab?: "accounts" | "cards") => void;
  onBanksClick?: () => void;
  onCategoriesClick?: () => void;
  onTransactionsClick?: () => void;
  onBudgetsClick?: () => void;
  onProjectionClick?: () => void;
}

// Memoized sub-components to prevent re-renders
const MemoizedQuickActions = memo(QuickActions);
const MemoizedGoalsWidget = memo(GoalsWidget);
const MemoizedBudgetAlertsWidget = memo(BudgetAlertsWidget);
const MemoizedMonthlyChart = memo(MonthlyChart);
const MemoizedCategoryChart = memo(CategoryChart);

export const Dashboard = memo(function Dashboard({ 
  onSettingsClick, 
  onGoalsClick,
  onLearnMore,
  onBanksClick,
  onCategoriesClick,
  onTransactionsClick,
  onBudgetsClick,
  onProjectionClick,
}: DashboardProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [defaultTransactionType, setDefaultTransactionType] = useState<TransactionType>("expense");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
  const [hasMarkedRender, setHasMarkedRender] = useState(false);

  const selectedMonth = selectedDate.getMonth();
  const selectedYear = selectedDate.getFullYear();

  const { family, user } = useAuth();
  
  // PRIMARY: Home summary is the main data source for first load
  const { data: homeSummary, isLoading: loadingHomeSummary, isFetched: homeSummaryFetched } = useHomeSummary(selectedMonth, selectedYear);
  
  // SECONDARY: These load after home summary, only for detailed views
  const { data: transactions = [], isLoading: loadingTransactions } = useTransactions(
    selectedMonth, 
    selectedYear,
    { enabled: homeSummaryFetched }
  );
  const { data: summary, isLoading: loadingSummary } = useFinanceSummary(
    selectedMonth, 
    selectedYear,
    { enabled: homeSummaryFetched }
  );
  
  // Budget alerts for focus card
  const { data: budgetAlertsData = [] } = useBudgetAlerts(selectedMonth, selectedYear);
  
  // DEFERRED: These load lazily for charts (not critical for first paint)
  const { data: last6MonthsTransactions = [] } = useTransactionsLast6Months(
    { enabled: homeSummaryFetched && !loadingHomeSummary }
  );
  
  // Insights are not critical for first load
  const { insights } = useInsights();
  
  const createTransaction = useCreateTransaction();
  const { state: onboardingState } = useOnboarding();

  // Mark home render once we've mounted
  useEffect(() => {
    if (!hasMarkedRender) {
      markHomeRender();
      setHasMarkedRender(true);
    }
  }, [hasMarkedRender]);

  // Get user's first name for greeting
  const userName = useMemo(() => {
    if (homeSummary?.greeting?.firstName) {
      return homeSummary.greeting.firstName;
    }
    if (user?.user_metadata?.display_name) {
      return user.user_metadata.display_name.split(" ")[0];
    }
    if (family?.name) {
      return family.name;
    }
    return "Usuário";
  }, [homeSummary?.greeting?.firstName, user?.user_metadata?.display_name, family?.name]);

  // Budget alerts for focus card
  const budgetAlerts = useMemo(() => {
    return budgetAlertsData
      .filter((b) => b.percentage >= 80)
      .map((b) => ({
        category: getCategoryById(b.budget.category_id)?.name || "Categoria",
        usedPercent: b.percentage,
      }))
      .slice(0, 3);
  }, [budgetAlertsData]);

  // Memoized callbacks
  const handleAddIncome = useCallback(() => {
    setDefaultTransactionType("income");
    setIsSheetOpen(true);
  }, []);

  const handleAddExpense = useCallback(() => {
    setDefaultTransactionType("expense");
    setIsSheetOpen(true);
  }, []);

  const handleAddGoal = useCallback(() => {
    onGoalsClick?.();
  }, [onGoalsClick]);

  const handleTransactionClick = useCallback((transaction: Transaction) => {
    setTransactionToEdit(transaction);
    setEditSheetOpen(true);
  }, []);

  const handleSubmitTransaction = useCallback(async (transaction: any) => {
    try {
      let transactionDate = transaction.date;
      const transactionMonth = new Date(transactionDate).getMonth() + 1;
      const transactionYear = new Date(transactionDate).getFullYear();

      if (transactionMonth !== selectedMonth || transactionYear !== selectedYear) {
        transactionDate = format(selectedDate, "yyyy-MM-01");
      }

      await createTransaction.mutateAsync({
        type: transaction.type,
        amount: transaction.amount,
        category_id: transaction.category,
        subcategory_id: transaction.subcategory,
        description: transaction.description,
        date: transactionDate,
        payment_method: transaction.paymentMethod,
        bank_account_id: transaction.bankAccountId,
        credit_card_id: transaction.creditCardId,
      });

      const isIncome = transaction.type === "income";
      toast.success(isIncome ? "Receita registrada! 💰" : "Despesa registrada com sucesso.", {
        description: isIncome
          ? "Ótimo! Cada entrada fortalece o orçamento da família."
          : "Registrar é o primeiro passo para o controle financeiro.",
      });
    } catch (error) {
      toast.error("Erro ao salvar lançamento");
    }
  }, [selectedMonth, selectedYear, selectedDate, createTransaction]);

  // Transform transactions for display
  const displayTransactions = useMemo(() => 
    transactions.map((t: any) => ({
      id: t.id,
      type: t.type as TransactionType,
      amount: Number(t.amount),
      category: t.category_id,
      subcategory: t.subcategory_id || undefined,
      date: t.date,
      paymentMethod: t.payment_method as any,
      description: t.description || undefined,
      createdAt: t.created_at,
      goalTitle: t.goals?.title || undefined,
    })),
  [transactions]);

  // Transform expenses by category for chart
  const categoryExpenses = useMemo(() => {
    if (!summary?.expensesByCategory) return [];
    
    const totalExpenses = summary.expenses || 0;
    
    return Object.entries(summary.expensesByCategory).map(([categoryId, amount]) => {
      const category = getCategoryById(categoryId);
      const percentage = totalExpenses > 0 ? ((amount as number) / totalExpenses) * 100 : 0;
      
      return {
        category: categoryId,
        amount: amount as number,
        color: category?.color || "hsl(var(--muted))",
        percentage,
      };
    }).sort((a, b) => b.amount - a.amount);
  }, [summary?.expensesByCategory, summary?.expenses]);

  // Monthly data from real transactions
  const monthlyData = useMemo(() => {
    if (last6MonthsTransactions.length === 0) return [];
    
    const transactionDates = last6MonthsTransactions.map((t: any) => new Date(t.date));
    const minDate = new Date(Math.min(...transactionDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...transactionDates.map(d => d.getTime())));
    
    const months: { month: string; income: number; expenses: number }[] = [];
    
    let currentDate = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    const endDate = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
    
    while (currentDate <= endDate) {
      const monthNum = currentDate.getMonth();
      const yearNum = currentDate.getFullYear();
      const monthLabel = format(currentDate, "MMM", { locale: ptBR });
      
      const monthTransactions = last6MonthsTransactions.filter((t: any) => {
        const tDate = new Date(t.date);
        return tDate.getMonth() === monthNum && tDate.getFullYear() === yearNum;
      });
      
      const income = monthTransactions
        .filter((t: any) => t.type === "income")
        .reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);
        
      const expenses = monthTransactions
        .filter((t: any) => t.type === "expense")
        .reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);
      
      months.push({
        month: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
        income,
        expenses
      });
      
      currentDate = new Date(yearNum, monthNum + 1, 1);
    }
    
    return months;
  }, [last6MonthsTransactions]);

  // Loading state
  const isLoading = loadingHomeSummary;
  const showLoading = useDebouncedLoading(isLoading, { delay: 300, minDuration: 500 });

  // Navigation callbacks
  const handleLearnMoreCards = useCallback(() => onLearnMore?.("cards"), [onLearnMore]);
  const handleOpenSheet = useCallback(() => setIsSheetOpen(true), []);
  const handleCloseSheet = useCallback((open: boolean) => setIsSheetOpen(open), []);
  const handleCloseEditSheet = useCallback((open: boolean) => setEditSheetOpen(open), []);

  if (showLoading && !homeSummary) {
    return (
      <div className="min-h-screen bg-background">
        <Header userName="..." onSettingsClick={onSettingsClick} />
        <SkeletonHome />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Welcome Modal for new users */}
      <WelcomeModal />

      <Header userName={userName} onSettingsClick={onSettingsClick} />

      <main className="container px-4 space-y-4 py-4">
        {/* Month Selector */}
        <MonthSelector selectedDate={selectedDate} onMonthChange={setSelectedDate} />

        {/* Onboarding Checklist - show if not complete */}
        {onboardingState.progressPercent < 100 && (
          <OnboardingChecklist />
        )}

        {/* ═══════════════════════════════════════════════════════════════
            BLOCO 1 — ESTADO FINANCEIRO DA FAMÍLIA (PRIMEIRA DOBRA)
            Card de leitura única: status emocional + saldo/receita/despesa
        ═══════════════════════════════════════════════════════════════ */}
        <FamilyStatusCard
          balance={homeSummary?.balanceGlobal ?? summary?.balance ?? 0}
          income={homeSummary?.income ?? summary?.income ?? 0}
          expenses={homeSummary?.expenses ?? summary?.expenses ?? 0}
          savingsRate={homeSummary?.savingsRate ?? summary?.savingsRate ?? 0}
        />

        {/* ═══════════════════════════════════════════════════════════════
            BLOCO 2 — FOCO DO DIA (INSIGHT ÚNICO)
            1 insight prioritário, nunca lista
        ═══════════════════════════════════════════════════════════════ */}
        <DailyFocusCard
          insights={insights}
          bestCardSuggestion={homeSummary?.bestCardSuggestion ?? null}
          budgetAlerts={budgetAlerts}
        />

        {/* ═══════════════════════════════════════════════════════════════
            BLOCO 3 — AÇÕES RÁPIDAS (1 CLIQUE)
            Receita, Despesa, Objetivo, Importar
        ═══════════════════════════════════════════════════════════════ */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <MemoizedQuickActions
            onAddIncome={handleAddIncome}
            onAddExpense={handleAddExpense}
            onAddGoal={handleAddGoal}
          />
          <p className="text-xs text-muted-foreground text-center mt-2 opacity-70">
            Registrar agora evita ruído depois.
          </p>
        </motion.div>

        {/* ═══════════════════════════════════════════════════════════════
            BLOCO 4 — CONTEXTO (COLAPSÁVEL)
            Dados tradicionais: cartões, metas, orçamento, gráficos, extrato
        ═══════════════════════════════════════════════════════════════ */}

        {/* Credit Cards Preview - collapsible */}
        {(homeSummary?.creditCardsPreview?.length ?? 0) > 0 && (
          <CollapsibleSection
            title="Cartões de Crédito"
            defaultOpen={false}
            onViewAll={handleLearnMoreCards}
            viewAllLabel="Gerenciar"
          >
            <CreditCardsPreviewCard
              cards={homeSummary?.creditCardsPreview ?? []}
              hasMoreCards={homeSummary?.hasMoreCreditCards ?? false}
              totalCards={homeSummary?.totalCreditCards ?? 0}
              totalBill={homeSummary?.totalCreditCardBill ?? 0}
              bestCardSuggestion={null}
              onLearnMore={handleLearnMoreCards}
              onAddCard={onBanksClick}
            />
          </CollapsibleSection>
        )}

        {/* Goals Widget - collapsible */}
        <CollapsibleSection
          title="Objetivos"
          defaultOpen={false}
          onViewAll={onGoalsClick}
          viewAllLabel="Ver todos"
        >
          <MemoizedGoalsWidget onViewAll={onGoalsClick} />
        </CollapsibleSection>

        {/* Budget Alerts - collapsible */}
        <CollapsibleSection
          title="Orçamento"
          defaultOpen={false}
          onViewAll={onBudgetsClick}
          viewAllLabel="Gerenciar"
        >
          <MemoizedBudgetAlertsWidget 
            month={selectedMonth} 
            year={selectedYear} 
            onViewAll={onBudgetsClick}
            limit={3}
          />
        </CollapsibleSection>

        {/* Monthly Evolution Chart - collapsible */}
        {monthlyData.length > 0 && (
          <CollapsibleSection
            title="Evolução Mensal"
            defaultOpen={false}
          >
            <MemoizedMonthlyChart data={monthlyData} />
          </CollapsibleSection>
        )}

        {/* Category Chart - collapsible */}
        {categoryExpenses.length > 0 && (
          <CollapsibleSection
            title="Despesas por Categoria"
            defaultOpen={false}
            onViewAll={onCategoriesClick}
            viewAllLabel="Ver detalhes"
          >
            <MemoizedCategoryChart categories={categoryExpenses} onViewAll={onCategoriesClick} />
          </CollapsibleSection>
        )}

        {/* Recent Transactions - collapsible */}
        <CollapsibleSection
          title="Últimos Lançamentos"
          defaultOpen={false}
          onViewAll={onTransactionsClick}
          viewAllLabel="Ver extrato"
        >
          <TransactionList 
            transactions={displayTransactions} 
            limit={5} 
            onTransactionClick={handleTransactionClick}
            onViewAll={onTransactionsClick}
          />
        </CollapsibleSection>
      </main>

      {/* Floating Action Button */}
      <FabButton onClick={handleOpenSheet} />

      {/* Add Transaction Sheet */}
      <AddTransactionSheet
        open={isSheetOpen}
        onOpenChange={handleCloseSheet}
        onSubmit={handleSubmitTransaction}
        defaultType={defaultTransactionType}
      />

      {/* Edit Transaction Sheet */}
      <EditTransactionSheet
        open={editSheetOpen}
        onOpenChange={handleCloseEditSheet}
        transaction={transactionToEdit}
      />
    </div>
  );
});
