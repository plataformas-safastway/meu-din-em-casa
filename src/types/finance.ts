export type TransactionType = 'income' | 'expense';

export type ExpenseType = 'fixed' | 'variable';

export type PaymentMethod = 'debit' | 'credit' | 'pix' | 'cash' | 'transfer';

export interface Subcategory {
  id: string;
  name: string;
  categoryId: string;
}

export interface Category {
  id: string;
  name: string;
  code: string; // e.g., "R", "C", "A", etc.
  icon: string;
  color: string;
  type: TransactionType;
  isDefault?: boolean;
  subcategories: Subcategory[];
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

export interface MonthlyBalance {
  month: string;
  income: number;
  expenses: number;
  balance?: number;
}

export interface CategoryExpense {
  category: string;
  amount: number;
  percentage?: number;
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
  createdAt?: string;
}

export interface FamilyFinanceSummary {
  currentBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  savingsRate: number;
  topCategories: CategoryExpense[];
  insights: Insight[];
}
