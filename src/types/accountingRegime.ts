/**
 * Accounting Regime Types (Regime Contábil)
 * 
 * O OIK suporta dois regimes de registro financeiro:
 * 
 * 1. CASH_BASIS (Fluxo de Caixa) - PADRÃO RECOMENDADO
 *    - Considera receitas/despesas quando o dinheiro efetivamente entra/sai
 *    - Cartão de crédito entra no realizado no pagamento da fatura
 *    - Mais simples e visual para planejamento familiar
 * 
 * 2. ACCRUAL_BASIS (Competência) - OPCIONAL
 *    - Considera receitas/despesas no período em que acontecem
 *    - Independe da data de pagamento ou recebimento
 *    - Mais analítico, usado para acompanhamento por competência
 */

export type AccountingRegime = 'cash_basis' | 'accrual_basis';

export const ACCOUNTING_REGIME_LABELS: Record<AccountingRegime, string> = {
  cash_basis: 'Fluxo de Caixa',
  accrual_basis: 'Competência',
};

export const ACCOUNTING_REGIME_DESCRIPTIONS: Record<AccountingRegime, {
  title: string;
  description: string;
  examples: string[];
  note: string;
}> = {
  cash_basis: {
    title: 'Regime de Fluxo de Caixa',
    description: 'O aplicativo considera as receitas e despesas no momento em que o dinheiro realmente entra ou sai da sua conta. É o modelo mais simples, visual e indicado para o planejamento financeiro familiar, pois reflete exatamente o impacto no seu saldo.',
    examples: [
      'Salário recebido dia 05 → entra em janeiro',
      'Cartão de crédito pago em fevereiro → entra em fevereiro',
      'Conta agendada, mas ainda não paga → não entra no realizado',
    ],
    note: 'Este é o modelo padrão e recomendado pelo OIK.',
  },
  accrual_basis: {
    title: 'Regime de Competência',
    description: 'As receitas e despesas são registradas no período em que elas acontecem, independentemente da data de pagamento ou recebimento. Esse modelo é mais analítico e costuma ser usado por quem prefere acompanhar compromissos financeiros por competência mensal.',
    examples: [
      'Aluguel de janeiro → entra em janeiro, mesmo pago em fevereiro',
      'Compra parcelada → cada parcela entra no mês correspondente',
      'Serviço prestado em março → entra em março, mesmo recebido depois',
    ],
    note: 'Ao escolher este regime, a forma como o realizado é calculado será diferente do padrão.',
  },
};

/**
 * Default accounting regime for new families
 */
export const DEFAULT_ACCOUNTING_REGIME: AccountingRegime = 'cash_basis';

/**
 * Check if the regime is cash basis
 */
export function isCashBasis(regime: AccountingRegime): boolean {
  return regime === 'cash_basis';
}

/**
 * Check if the regime is accrual basis
 */
export function isAccrualBasis(regime: AccountingRegime): boolean {
  return regime === 'accrual_basis';
}

/**
 * Get the date field to use for budget calculations based on regime
 * - cash_basis: uses cash_date (when money moved)
 * - accrual_basis: uses event_date (when event occurred)
 */
export function getBudgetDateField(regime: AccountingRegime): 'cash_date' | 'event_date' {
  return regime === 'cash_basis' ? 'cash_date' : 'event_date';
}
