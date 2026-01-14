import { useState, useCallback } from 'react';
import { Transaction, EmergencyFund } from '@/types/finance';
import { mockTransactions, mockFinanceSummary } from '@/data/mockData';

export function useFinanceStore() {
  const [transactions, setTransactions] = useState<Transaction[]>(mockTransactions);
  const [emergencyFund, setEmergencyFund] = useState<EmergencyFund>(mockFinanceSummary.emergencyFund);

  const addTransaction = useCallback((transaction: Omit<Transaction, 'id' | 'createdAt'>) => {
    const newTransaction: Transaction = {
      ...transaction,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    setTransactions(prev => [newTransaction, ...prev]);
    return newTransaction;
  }, []);

  const deleteTransaction = useCallback((id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id));
  }, []);

  const updateEmergencyFund = useCallback((amount: number) => {
    setEmergencyFund(prev => ({
      ...prev,
      currentAmount: amount,
    }));
  }, []);

  const getMonthlyIncome = useCallback(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    return transactions
      .filter(t => {
        const date = new Date(t.date);
        return t.type === 'income' && date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      })
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const getMonthlyExpenses = useCallback(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    return transactions
      .filter(t => {
        const date = new Date(t.date);
        return t.type === 'expense' && date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      })
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions]);

  const getExpensesByCategory = useCallback(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const expenses = transactions.filter(t => {
      const date = new Date(t.date);
      return t.type === 'expense' && date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    const byCategory: Record<string, number> = {};
    expenses.forEach(t => {
      byCategory[t.category] = (byCategory[t.category] || 0) + t.amount;
    });

    return byCategory;
  }, [transactions]);

  return {
    transactions,
    emergencyFund,
    addTransaction,
    deleteTransaction,
    updateEmergencyFund,
    getMonthlyIncome,
    getMonthlyExpenses,
    getExpensesByCategory,
  };
}
