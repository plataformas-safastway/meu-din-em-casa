// Expense nature classification types
export type ExpenseNature = 'FIXED' | 'VARIABLE' | 'EVENTUAL' | 'UNKNOWN';
export type ExpenseNatureSource = 'USER' | 'SYSTEM_RULE' | 'AI_INFERENCE';

export interface ExpenseNatureResult {
  nature: ExpenseNature;
  source: ExpenseNatureSource;
  confidence: number;
  reason?: string;
}

export interface CategoryNatureMapping {
  categoryId: string;
  subcategoryIds?: string[];
  nature: ExpenseNature;
}

export interface MonthlyFixedCost {
  id: string;
  familyId: string;
  monthRef: string;
  totalFixedAmount: number;
  categoryBreakdown: CategoryFixedBreakdown[];
  calculatedAt: string;
}

export interface CategoryFixedBreakdown {
  categoryId: string;
  categoryName: string;
  amount: number;
  subcategories?: SubcategoryFixedBreakdown[];
}

export interface SubcategoryFixedBreakdown {
  subcategoryId: string;
  subcategoryName: string;
  amount: number;
}

export interface FixedCostChange {
  previousMonth: string;
  currentMonth: string;
  previousAmount: number;
  currentAmount: number;
  difference: number;
  percentageChange: number;
  direction: 'increase' | 'decrease' | 'stable';
  topChanges: CategoryChange[];
}

export interface CategoryChange {
  categoryId: string;
  categoryName: string;
  previousAmount: number;
  currentAmount: number;
  difference: number;
}

export interface ExpenseNatureOverride {
  id: string;
  familyId: string;
  categoryId?: string;
  subcategoryId?: string;
  merchantKey?: string;
  expenseNature: ExpenseNature;
  createdBy?: string;
  createdAt: string;
}
