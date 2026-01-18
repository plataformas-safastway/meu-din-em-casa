import { useState } from "react";
import { Header } from "@/components/Header";
import { BalanceCard } from "@/components/BalanceCard";
import { QuickActions } from "@/components/QuickActions";
import { InsightList } from "@/components/InsightCard";
import { CategoryChart } from "@/components/CategoryChart";
import { GoalsWidget } from "@/components/goals/GoalsWidget";
import { TransactionList } from "@/components/TransactionList";
import { MonthlyChart } from "@/components/MonthlyChart";
import { AddTransactionSheet } from "@/components/AddTransactionSheet";
import { FabButton } from "@/components/QuickActions";
import { useAuth } from "@/contexts/AuthContext";
import { useTransactions, useFinanceSummary, useCreateTransaction } from "@/hooks/useTransactions";
import { useInsights } from "@/hooks/useInsights";
import { getCategoryById } from "@/data/categories";
import { TransactionType } from "@/types/finance";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface DashboardProps {
  onSettingsClick?: () => void;
  onGoalsClick?: () => void;
}

export function Dashboard({ onSettingsClick, onGoalsClick }: DashboardProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [defaultTransactionType, setDefaultTransactionType] = useState<TransactionType>("expense");

  const { family } = useAuth();
  const { data: transactions = [], isLoading: loadingTransactions } = useTransactions();
  const { data: summary, isLoading: loadingSummary } = useFinanceSummary();
  const { insights } = useInsights();
  const createTransaction = useCreateTransaction();

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
      await createTransaction.mutateAsync({
        type: transaction.type,
        amount: transaction.amount,
        category_id: transaction.category,
        subcategory_id: transaction.subcategory,
        description: transaction.description,
        date: transaction.date,
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
  const categoryExpenses = summary?.expensesByCategory
    ? Object.entries(summary.expensesByCategory).map(([categoryId, amount]) => {
        const category = getCategoryById(categoryId);
        return {
          category: category?.name || categoryId,
          amount: amount as number,
          color: category?.color || "hsl(var(--muted))",
        };
      })
    : [];

  // Mock monthly data (will be implemented with historical query later)
  const monthlyData = [
    { month: "Jan", income: 0, expenses: 0 },
    { month: "Fev", income: 0, expenses: 0 },
    { month: "Mar", income: 0, expenses: 0 },
    { month: "Abr", income: 0, expenses: 0 },
    { month: "Mai", income: 0, expenses: 0 },
    { month: "Jun", income: summary?.income || 0, expenses: summary?.expenses || 0 },
  ];

  const isLoading = loadingTransactions || loadingSummary;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header familyName={family?.name || "Família"} onSettingsClick={onSettingsClick} />

      <main className="container px-4 space-y-6 py-4">
        {/* Balance Card */}
        <BalanceCard
          balance={summary?.balance || 0}
          income={summary?.income || 0}
          expenses={summary?.expenses || 0}
          savingsRate={summary?.savingsRate || 0}
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

        {/* Goals Widget - Always visible */}
        <GoalsWidget onViewAll={onGoalsClick} />

        {/* Charts Grid */}
        {categoryExpenses.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            <CategoryChart categories={categoryExpenses} />
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
