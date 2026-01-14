export type TransactionType = 'income' | 'expense';

export type ExpenseType = 'fixed' | 'variable';

export type PaymentMethod = 'debit' | 'credit' | 'pix' | 'cash' | 'transfer';

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
  type: TransactionType;
  isDefault?: boolean;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  expenseType?: ExpenseType;
  amount: number;
  category: string;
  subcategory?: string;
  date: string;
  paymentMethod: PaymentMethod;
  description?: string;
  isRecurring?: boolean;
  createdAt: string;
}

export interface EmergencyFund {
  targetAmount: number;
  currentAmount: number;
  targetDate?: string;
}

export interface MonthlyBalance {
  month: string;
  income: number;
  expenses: number;
  balance: number;
}

export interface CategoryExpense {
  category: string;
  amount: number;
  percentage: number;
  color: string;
  previousAmount?: number;
  change?: number;
}

export interface Insight {
  id: string;
  type: 'warning' | 'tip' | 'success' | 'info';
  title: string;
  message: string;
  category?: string;
  priority: number;
  createdAt: string;
}

export interface FamilyFinanceSummary {
  currentBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  savingsRate: number;
  emergencyFund: EmergencyFund;
  topCategories: CategoryExpense[];
  insights: Insight[];
}
