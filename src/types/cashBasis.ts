/**
 * Cash-Basis Accounting Types (Regime de Caixa)
 * 
 * The OIK budget system operates on a cash-basis:
 * - event_date: When the transaction occurred (e.g., purchase date)
 * - cash_date: When money actually left/entered the account
 * - budget_month: YYYY-MM derived from cash_date for budget allocation
 * 
 * Payment Method Rules:
 * - PIX/Debit/Cash/Transfer: cash_date = event_date (immediate)
 * - Credit Card Purchase: cash_date = NULL (pending invoice payment)
 * - Credit Card Invoice Payment: cash_date = payment date
 * - Cheque: cash_date = NULL until compensation date is set
 */

export interface CashBasisTransaction {
  id: string;
  event_date: string;      // When the event occurred
  cash_date: string | null; // When money moved (null = pending)
  budget_month: string | null; // YYYY-MM for budget (null = not in budget yet)
  payment_method: CashBasisPaymentMethod;
}

export type CashBasisPaymentMethod = 
  | 'pix'      // Immediate: cash_date = event_date
  | 'debit'    // Immediate: cash_date = event_date
  | 'cash'     // Immediate: cash_date = event_date
  | 'transfer' // Immediate: cash_date = event_date
  | 'credit'   // Deferred: cash_date = invoice payment date
  | 'cheque';  // Deferred: cash_date = compensation date

export const IMMEDIATE_PAYMENT_METHODS: CashBasisPaymentMethod[] = [
  'pix', 'debit', 'cash', 'transfer'
];

export const DEFERRED_PAYMENT_METHODS: CashBasisPaymentMethod[] = [
  'credit', 'cheque'
];

/**
 * Check if a payment method results in immediate cash movement
 */
export function isImmediateCashPayment(method: CashBasisPaymentMethod): boolean {
  return IMMEDIATE_PAYMENT_METHODS.includes(method);
}

/**
 * Check if a transaction is pending (no cash_date yet)
 */
export function isPendingCashTransaction(cashDate: string | null): boolean {
  return cashDate === null;
}

/**
 * Format budget_month for display
 */
export function formatBudgetMonth(budgetMonth: string | null): string {
  if (!budgetMonth) return 'Pendente';
  
  const [year, month] = budgetMonth.split('-');
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  
  return `${monthNames[parseInt(month) - 1]} ${year}`;
}
