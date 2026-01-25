export type TransactionType = 'income' | 'expense';

// Classification for better accounting control (Sprint 2)
export type TransactionClassification = 
  | 'income'        // Receita - entrada real de dinheiro
  | 'expense'       // Despesa - saída real de dinheiro
  | 'transfer'      // Transferência - movimentação entre contas (não entra no orçamento)
  | 'reimbursement' // Reembolso - redução de despesa em categoria
  | 'adjustment';   // Ajuste - correção contábil

export type ExpenseType = 'fixed' | 'variable';

export type PaymentMethod = 'debit' | 'credit' | 'pix' | 'cash' | 'transfer' | 'cheque' | 'boleto' | 'other';

// Payment method display info
export const paymentMethodLabels: Record<PaymentMethod, { label: string; icon: string }> = {
  pix: { label: 'PIX', icon: '⚡' },
  boleto: { label: 'Boleto', icon: '📄' },
  debit: { label: 'Débito', icon: '💳' },
  credit: { label: 'Cartão', icon: '💳' },
  cheque: { label: 'Cheque', icon: '📝' },
  cash: { label: 'Dinheiro', icon: '💵' },
  transfer: { label: 'Transferência', icon: '🔄' },
  other: { label: 'Outro', icon: '📦' },
};

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
  classification?: TransactionClassification;
  expenseType?: ExpenseType;
  amount: number;
  category: string;
  subcategory?: string;
  date: string;
  paymentMethod: PaymentMethod;
  description?: string;
  isRecurring?: boolean;
  createdAt: string;
  checkNumber?: string;
  goalId?: string;
  goalTitle?: string;
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

// Classification labels for UI
export const classificationLabels: Record<TransactionClassification, { label: string; icon: string; description: string }> = {
  income: {
    label: 'Receita',
    icon: '💰',
    description: 'Entrada real de dinheiro',
  },
  expense: {
    label: 'Despesa',
    icon: '💸',
    description: 'Saída real de dinheiro',
  },
  transfer: {
    label: 'Transferência',
    icon: '🔄',
    description: 'Movimentação entre contas (não afeta orçamento)',
  },
  reimbursement: {
    label: 'Reembolso',
    icon: '↩️',
    description: 'Redução de despesa em categoria',
  },
  adjustment: {
    label: 'Ajuste',
    icon: '⚙️',
    description: 'Correção contábil',
  },
};