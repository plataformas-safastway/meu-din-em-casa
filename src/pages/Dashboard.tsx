import { useState, useMemo } from "react";
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
import { FabButton } from "@/components/QuickActions";
import { BudgetAlertsWidget } from "@/components/budget/BudgetAlertsWidget";
import { SkeletonHome } from "@/components/ui/money-loader";
import { useAuth } from "@/contexts/AuthContext";
import { useTransactions, useFinanceSummary, useCreateTransaction } from "@/hooks/useTransactions";
import { useInsights } from "@/hooks/useInsights";
import { useHomeSummary } from "@/hooks/useHomeSummary";
import { useDebouncedLoading } from "@/hooks/useLoading";
import { getCategoryById } from "@/data/categories";
import { TransactionType } from "@/types/finance";
import { toast } from "sonner";
import { format } from "date-fns";

interface DashboardProps {
  onSettingsClick?: () => void;
  onGoalsClick?: () => void;
  onBudgetsClick?: () => void;
  onLearnMore?: (tab?: "accounts" | "cards") => void;
  onBanksClick?: () => void;
  onCategoriesClick?: () => void;
}

export function Dashboard({ 
  onSettingsClick, 
  onGoalsClick, 
  onBudgetsClick,
  onLearnMore,
  onBanksClick,
  onCategoriesClick,
}: DashboardProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [defaultTransactionType, setDefaultTransactionType] = useState<TransactionType>("expense");
  const [selectedDate, setSelectedDate] = useState(new Date());

  const selectedMonth = selectedDate.getMonth();
  const selectedYear = selectedDate.getFullYear();

  const { family, user } = useAuth();
  const { data: transactions = [], isLoading: loadingTransactions } = useTransactions(selectedMonth, selectedYear);
  const { data: summary, isLoading: loadingSummary } = useFinanceSummary(selectedMonth, selectedYear);
  const { data: homeSummary, isLoading: loadingHomeSummary } = useHomeSummary(selectedMonth, selectedYear);
  const { insights } = useInsights();
  const createTransaction = useCreateTransaction();

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
  }, [homeSummary, user, family]);

  const handleAddIncome = () => {
    setDefaultTransactionType("income");
    setIsSheetOpen(true);
  };

  const handleAddExpense = () => {
    setDefaultTransactionType("expense");
    setIsSheetOpen(true);
  };

  const handleAddGoal = () => {
    onGoalsClick?.();
  };

  const handleViewReceipts = () => {
    toast.info("Em breve! Vocês poderão anexar recibos aos lançamentos.");
  };

  const handleSubmitTransaction = async (transaction: any) => {
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
  };

  // Transform transactions for display
  const displayTransactions = transactions.map((t) => ({
    id: t.id,
    type: t.type as TransactionType,
    amount: Number(t.amount),
    category: t.category_id,
    subcategory: t.subcategory_id || undefined,
    date: t.date,
    paymentMethod: t.payment_method as any,
    description: t.description || undefined,
    createdAt: t.created_at,
  }));

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
  }, [summary]);

  // Monthly data placeholder
  const monthlyData = [
    { month: "Jan", income: 0, expenses: 0 },
    { month: "Fev", income: 0, expenses: 0 },
    { month: "Mar", income: 0, expenses: 0 },
    { month: "Abr", income: 0, expenses: 0 },
    { month: "Mai", income: 0, expenses: 0 },
    { month: "Jun", income: summary?.income || 0, expenses: summary?.expenses || 0 },
  ];

  const isLoading = loadingTransactions || loadingSummary || loadingHomeSummary;
  const showLoading = useDebouncedLoading(isLoading, { delay: 300, minDuration: 500 });

  if (showLoading && transactions.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header userName="..." onSettingsClick={onSettingsClick} />
        <SkeletonHome />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header userName={userName} onSettingsClick={onSettingsClick} />

      <main className="container px-4 space-y-4 py-4">
        {/* Month Selector */}
        <MonthSelector selectedDate={selectedDate} onMonthChange={setSelectedDate} />

        {/* Global Balance Card with Accounts Preview */}
        <GlobalBalanceCard
          balance={homeSummary?.balanceGlobal ?? summary?.balance ?? 0}
          income={homeSummary?.income ?? summary?.income ?? 0}
          expenses={homeSummary?.expenses ?? summary?.expenses ?? 0}
          savingsRate={homeSummary?.savingsRate ?? summary?.savingsRate ?? 0}
          accounts={homeSummary?.accountsPreview ?? []}
          hasMoreAccounts={homeSummary?.hasMoreAccounts ?? false}
          totalAccounts={homeSummary?.totalAccounts ?? 0}
          onLearnMore={() => onLearnMore?.("accounts")}
        />

        {/* Credit Cards Preview Card */}
        <CreditCardsPreviewCard
          cards={homeSummary?.creditCardsPreview ?? []}
          hasMoreCards={homeSummary?.hasMoreCreditCards ?? false}
          totalCards={homeSummary?.totalCreditCards ?? 0}
          totalBill={homeSummary?.totalCreditCardBill ?? 0}
          bestCardSuggestion={homeSummary?.bestCardSuggestion ?? null}
          onLearnMore={() => onLearnMore?.("cards")}
          onAddCard={onBanksClick}
        />

        {/* Quick Actions */}
        <QuickActions
          onAddIncome={handleAddIncome}
          onAddExpense={handleAddExpense}
          onAddGoal={handleAddGoal}
          onViewReceipts={handleViewReceipts}
        />

        {/* Insights */}
        {insights.length > 0 && <InsightList insights={insights} />}

        {/* Budget Alerts Widget */}
        <BudgetAlertsWidget 
          month={selectedMonth} 
          year={selectedYear} 
          onViewAll={onBudgetsClick}
        />

        {/* Goals Widget */}
        <GoalsWidget onViewAll={onGoalsClick} />

        {/* Charts Grid */}
        {categoryExpenses.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            <CategoryChart categories={categoryExpenses} onViewAll={onCategoriesClick} />
            <MonthlyChart data={monthlyData} />
          </div>
        )}

        {/* Recent Transactions */}
        <TransactionList transactions={displayTransactions} limit={5} />
      </main>

      {/* Floating Action Button */}
      <FabButton onClick={() => setIsSheetOpen(true)} />

      {/* Add Transaction Sheet */}
      <AddTransactionSheet
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        onSubmit={handleSubmitTransaction}
        defaultType={defaultTransactionType}
      />
    </div>
  );
}
