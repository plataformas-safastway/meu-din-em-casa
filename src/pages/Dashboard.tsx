import { useState } from "react";
import { Header } from "@/components/Header";
import { BalanceCard } from "@/components/BalanceCard";
import { QuickActions } from "@/components/QuickActions";
import { InsightList } from "@/components/InsightCard";
import { CategoryChart } from "@/components/CategoryChart";
import { EmergencyFundProgress } from "@/components/EmergencyFundProgress";
import { TransactionList } from "@/components/TransactionList";
import { MonthlyChart } from "@/components/MonthlyChart";
import { AddTransactionSheet } from "@/components/AddTransactionSheet";
import { FabButton } from "@/components/QuickActions";
import { useFinanceStore } from "@/hooks/useFinanceStore";
import { mockFinanceSummary, mockMonthlyBalance, mockInsights, mockCategoryExpenses } from "@/data/mockData";
import { TransactionType } from "@/types/finance";
import { toast } from "sonner";

export function Dashboard() {
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [defaultTransactionType, setDefaultTransactionType] = useState<TransactionType>('expense');
  
  const { 
    transactions, 
    emergencyFund, 
    addTransaction 
  } = useFinanceStore();

  const handleAddIncome = () => {
    setDefaultTransactionType('income');
    setIsSheetOpen(true);
  };

  const handleAddExpense = () => {
    setDefaultTransactionType('expense');
    setIsSheetOpen(true);
  };

  const handleAddGoal = () => {
    toast.info("Em breve! Vamos implementar metas personalizadas para a família.");
  };

  const handleViewReceipts = () => {
    toast.info("Em breve! Vocês poderão anexar recibos aos lançamentos.");
  };

  const handleSubmitTransaction = (transaction: any) => {
    addTransaction(transaction);
    
    const isIncome = transaction.type === 'income';
    toast.success(
      isIncome 
        ? "Receita registrada! 💰" 
        : "Despesa registrada com sucesso.",
      {
        description: isIncome 
          ? "Ótimo! Cada entrada fortalece o orçamento da família."
          : "Registrar é o primeiro passo para o controle financeiro."
      }
    );
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <Header familyName="Silva" />
      
      <main className="container px-4 space-y-6 py-4">
        {/* Balance Card */}
        <BalanceCard 
          balance={mockFinanceSummary.currentBalance}
          income={mockFinanceSummary.monthlyIncome}
          expenses={mockFinanceSummary.monthlyExpenses}
          savingsRate={mockFinanceSummary.savingsRate}
        />

        {/* Quick Actions */}
        <QuickActions 
          onAddIncome={handleAddIncome}
          onAddExpense={handleAddExpense}
          onAddGoal={handleAddGoal}
          onViewReceipts={handleViewReceipts}
        />

        {/* Insights */}
        <InsightList insights={mockInsights} />

        {/* Charts Grid */}
        <div className="grid gap-4 md:grid-cols-2">
          <CategoryChart categories={mockCategoryExpenses} />
          <MonthlyChart data={mockMonthlyBalance} />
        </div>

        {/* Emergency Fund */}
        <EmergencyFundProgress 
          fund={emergencyFund}
          onAddFund={() => toast.info("Em breve! Adicione valores à sua reserva.")}
        />

        {/* Recent Transactions */}
        <TransactionList 
          transactions={transactions}
          limit={5}
        />
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
