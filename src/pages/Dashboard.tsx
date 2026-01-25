import { useState, useMemo, useEffect, memo, useCallback } from "react";
import { Header } from "@/components/Header";
import { MonthSelector } from "@/components/MonthSelector";
import { GlobalBalanceCard } from "@/components/home/GlobalBalanceCard";
import { CreditCardsPreviewCard } from "@/components/home/CreditCardsPreviewCard";
import { QuickActions } from "@/components/QuickActions";
import { InsightList } from "@/components/InsightCard";
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
import { ProjectionPreviewWidget } from "@/components/projection";
import { UpcomingDuesCard } from "@/components/alerts";
import { ReceiptCaptureSheet, ReceiptReviewSheet } from "@/components/receipt";
import { useAuth } from "@/contexts/AuthContext";
import { useTransactions, useFinanceSummary, useCreateTransaction, useTransactionsLast6Months } from "@/hooks/useTransactions";
import { useInsights } from "@/hooks/useInsights";
import { useHomeSummary } from "@/hooks/useHomeSummary";
import { useDebouncedLoading } from "@/hooks/useLoading";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useSyncGoalFromTransaction } from "@/hooks/useGoalContributions";
import { getCategoryById, GOALS_CATEGORY_ID } from "@/data/categories";
import { Transaction, TransactionType } from "@/types/finance";
import { OcrExtractedData } from "@/hooks/useReceiptCapture";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { markHomeRender } from "@/lib/performance";

interface DashboardProps {
  onSettingsClick?: () => void;
  onGoalsClick?: () => void;
  onLearnMore?: (tab?: "accounts" | "cards") => void;
  onBanksClick?: () => void;
  onCategoriesClick?: () => void;
  onTransactionsClick?: () => void;
  onBudgetsClick?: () => void;
  onProjectionClick?: () => void;
  onNavigate?: (tab: string) => void;
}

// Memoized sub-components to prevent re-renders
const MemoizedQuickActions = memo(QuickActions);
const MemoizedGoalsWidget = memo(GoalsWidget);
const MemoizedBudgetAlertsWidget = memo(BudgetAlertsWidget);
const MemoizedProjectionPreviewWidget = memo(ProjectionPreviewWidget);
const MemoizedMonthlyChart = memo(MonthlyChart);
const MemoizedCategoryChart = memo(CategoryChart);
const MemoizedUpcomingDuesCard = memo(UpcomingDuesCard);

export const Dashboard = memo(function Dashboard({ 
  onSettingsClick, 
  onGoalsClick,
  onLearnMore,
  onBanksClick,
  onCategoriesClick,
  onTransactionsClick,
  onBudgetsClick,
  onProjectionClick,
  onNavigate,
}: DashboardProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [defaultTransactionType, setDefaultTransactionType] = useState<TransactionType>("expense");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<Transaction | null>(null);
  const [hasMarkedRender, setHasMarkedRender] = useState(false);
  
  // Receipt capture state
  const [receiptCaptureOpen, setReceiptCaptureOpen] = useState(false);
  const [receiptReviewOpen, setReceiptReviewOpen] = useState(false);
  const [extractedReceiptData, setExtractedReceiptData] = useState<OcrExtractedData | null>(null);
  const [receiptImageFile, setReceiptImageFile] = useState<File | Blob | null>(null);
  const [receiptImagePreview, setReceiptImagePreview] = useState<string | null>(null);

  const selectedMonth = selectedDate.getMonth();
  const selectedYear = selectedDate.getFullYear();

  const { family, user } = useAuth();
  
  // PRIMARY: Home summary is the main data source for first load
  const { data: homeSummary, isLoading: loadingHomeSummary, isFetched: homeSummaryFetched } = useHomeSummary(selectedMonth, selectedYear);
  
  // SECONDARY: These load after home summary, only for detailed views
  // Defer loading transactions until home summary is ready
  const { data: transactions = [], isLoading: loadingTransactions } = useTransactions(
    selectedMonth, 
    selectedYear,
    { enabled: homeSummaryFetched } // Only fetch after home summary
  );
  const { data: summary, isLoading: loadingSummary } = useFinanceSummary(
    selectedMonth, 
    selectedYear,
    { enabled: homeSummaryFetched }
  );
  
  // DEFERRED: These load lazily for charts (not critical for first paint)
  const { data: last6MonthsTransactions = [] } = useTransactionsLast6Months(
    { enabled: homeSummaryFetched && !loadingHomeSummary }
  );
  
  // Insights are not critical for first load
  const { insights } = useInsights();
  
  const createTransaction = useCreateTransaction();
  const syncGoalFromTransaction = useSyncGoalFromTransaction();
  const { state: onboardingState } = useOnboarding();

  // Mark home render once we've mounted
  useEffect(() => {
    if (!hasMarkedRender) {
      markHomeRender();
      setHasMarkedRender(true);
    }
  }, [hasMarkedRender]);

  // Get user's first name for greeting - memoized
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

  // Memoized callbacks to prevent child re-renders
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

  const handlePhotoCapture = useCallback(() => {
    setReceiptCaptureOpen(true);
  }, []);

  const handleReceiptDataExtracted = useCallback((
    data: OcrExtractedData, 
    imageFile: File | Blob, 
    imagePreview: string
  ) => {
    setExtractedReceiptData(data);
    setReceiptImageFile(imageFile);
    setReceiptImagePreview(imagePreview);
    setReceiptReviewOpen(true);
  }, []);

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
        // Goal linking - store goal_id directly on transaction
        goal_id: transaction.goalId,
      });

      // If this transaction is linked to a goal, sync the goal's current_amount
      if (transaction.goalId && transaction.category === GOALS_CATEGORY_ID && transaction.subcategory) {
        await syncGoalFromTransaction.mutateAsync({ subcategoryId: transaction.subcategory });
      }

      const isIncome = transaction.type === "income";
      const isGoalContribution = transaction.goalId;
      
      if (isGoalContribution) {
        toast.success("Aporte registrado! 🎯", {
          description: "O valor foi adicionado ao seu objetivo.",
        });
      } else {
        toast.success(isIncome ? "Receita registrada! 💰" : "Despesa registrada com sucesso.", {
          description: isIncome
            ? "Ótimo! Cada entrada fortalece o orçamento da família."
            : "Registrar é o primeiro passo para o controle financeiro.",
        });
      }
    } catch (error) {
      toast.error("Erro ao salvar lançamento");
    }
  }, [selectedMonth, selectedYear, selectedDate, createTransaction, syncGoalFromTransaction]);

  // Transform transactions for display - memoized
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

  // Transform expenses by category for chart - memoized
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

  // Monthly data from real transactions - memoized
  const monthlyData = useMemo(() => {
    if (last6MonthsTransactions.length === 0) return [];
    
    // Find the range of months with transactions
    const transactionDates = last6MonthsTransactions.map((t: any) => new Date(t.date));
    const minDate = new Date(Math.min(...transactionDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...transactionDates.map(d => d.getTime())));
    
    const months: { month: string; income: number; expenses: number }[] = [];
    
    // Start from the first month with data
    let currentDate = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    const endDate = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
    
    while (currentDate <= endDate) {
      const monthNum = currentDate.getMonth();
      const yearNum = currentDate.getFullYear();
      const monthLabel = format(currentDate, "MMM", { locale: ptBR });
      
      // Filter transactions for this month
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
      
      // Move to next month
      currentDate = new Date(yearNum, monthNum + 1, 1);
    }
    
    return months;
  }, [last6MonthsTransactions]);

  // Only wait for home summary for first render (skeleton state)
  const isLoading = loadingHomeSummary;
  const showLoading = useDebouncedLoading(isLoading, { delay: 300, minDuration: 500 });

  // Memoized callbacks for navigation
  const handleLearnMoreAccounts = useCallback(() => onLearnMore?.("accounts"), [onLearnMore]);
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
          <OnboardingChecklist onNavigate={onNavigate} />
        )}

        {/* Global Balance Card with Accounts Preview */}
        <GlobalBalanceCard
          balance={homeSummary?.balanceGlobal ?? summary?.balance ?? 0}
          income={homeSummary?.income ?? summary?.income ?? 0}
          expenses={homeSummary?.expenses ?? summary?.expenses ?? 0}
          savingsRate={homeSummary?.savingsRate ?? summary?.savingsRate ?? 0}
          accounts={homeSummary?.accountsPreview ?? []}
          hasMoreAccounts={homeSummary?.hasMoreAccounts ?? false}
          totalAccounts={homeSummary?.totalAccounts ?? 0}
          onLearnMore={handleLearnMoreAccounts}
        />

        {/* Credit Cards Preview Card */}
        <CreditCardsPreviewCard
          cards={homeSummary?.creditCardsPreview ?? []}
          hasMoreCards={homeSummary?.hasMoreCreditCards ?? false}
          totalCards={homeSummary?.totalCreditCards ?? 0}
          totalBill={homeSummary?.totalCreditCardBill ?? 0}
          bestCardSuggestion={homeSummary?.bestCardSuggestion ?? null}
          onLearnMore={handleLearnMoreCards}
          onAddCard={onBanksClick}
        />

        {/* Quick Actions */}
        <MemoizedQuickActions
          onAddIncome={handleAddIncome}
          onAddExpense={handleAddExpense}
          onAddGoal={handleAddGoal}
          onPhotoCapture={handlePhotoCapture}
        />

        {/* Insights */}
        {insights.length > 0 && <InsightList insights={insights} />}

        {/* Goals Widget */}
        <MemoizedGoalsWidget onViewAll={onGoalsClick} />

        {/* Upcoming Dues Card */}
        <MemoizedUpcomingDuesCard maxItems={3} />

        {/* Budget & Projection Widgets */}
        <div className="grid gap-4 md:grid-cols-2">
          <MemoizedBudgetAlertsWidget 
            month={selectedMonth} 
            year={selectedYear} 
            onViewAll={onBudgetsClick}
            limit={3}
          />
          <MemoizedProjectionPreviewWidget onViewAll={onProjectionClick} />
        </div>

        {/* Charts Grid - only render when we have data */}
        {categoryExpenses.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            <MemoizedCategoryChart categories={categoryExpenses} onViewAll={onCategoriesClick} />
            <MemoizedMonthlyChart data={monthlyData} />
          </div>
        )}

        {/* Recent Transactions */}
        <TransactionList 
          transactions={displayTransactions} 
          limit={5} 
          onTransactionClick={handleTransactionClick}
          onViewAll={onTransactionsClick}
        />
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

      {/* Receipt Capture Sheet */}
      <ReceiptCaptureSheet
        open={receiptCaptureOpen}
        onOpenChange={setReceiptCaptureOpen}
        onDataExtracted={handleReceiptDataExtracted}
      />

      {/* Receipt Review Sheet */}
      <ReceiptReviewSheet
        open={receiptReviewOpen}
        onOpenChange={setReceiptReviewOpen}
        extractedData={extractedReceiptData}
        imageFile={receiptImageFile}
        imagePreview={receiptImagePreview}
      />
    </div>
  );
});
