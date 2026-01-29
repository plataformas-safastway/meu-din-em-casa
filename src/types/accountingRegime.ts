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
 *    - Cartão de crédito entra no realizado no mês da compra
 *    - Mais analítico, usado para acompanhamento por competência
 * 
 * ============================================================
 * REGRAS DE CARTÃO DE CRÉDITO POR REGIME (INVIOLÁVEIS)
 * ============================================================
 * 
 * CASH_BASIS (Fluxo de Caixa):
 * - Compra no cartão → NÃO entra no realizado
 * - Pagamento da fatura → ENTRA no realizado (mês do pagamento)
 * - Parcelamentos → Impactam quando cada fatura é paga
 * - Cartão = meio de pagamento, não despesa imediata
 * 
 * ACCRUAL_BASIS (Competência):
 * - Compra no cartão → ENTRA no realizado (mês da compra)
 * - Pagamento da fatura → NÃO entra no realizado (evita dupla contagem)
 * - Parcelamentos → Cada parcela entra no mês correspondente
 * - Cartão = irrelevante para orçamento, o que vale é a despesa
 * 
 * REGRA DE OURO: Nunca contar compra + fatura no mesmo regime!
 * ============================================================
 */

export type AccountingRegime = 'cash_basis' | 'accrual_basis';

export const ACCOUNTING_REGIME_LABELS: Record<AccountingRegime, string> = {
  cash_basis: 'Fluxo de Caixa',
  accrual_basis: 'Competência',
};

export const ACCOUNTING_REGIME_DESCRIPTIONS: Record<AccountingRegime, {
  title: string;
  shortTitle: string;
  description: string;
  examples: string[];
  note: string;
  creditCardBehavior: string;
  recommendation: string;
}> = {
  cash_basis: {
    title: 'Fluxo de Caixa',
    shortTitle: 'Fluxo de Caixa',
    description: 'O aplicativo considera as receitas e despesas no momento em que o dinheiro realmente entra ou sai da sua conta. É a forma mais simples e visual de acompanhar sua vida financeira, pois reflete exatamente o impacto no seu saldo.',
    examples: [
      'Salário recebido → conta no mês em que caiu na conta',
      'Fatura do cartão paga → conta no mês do pagamento',
      'Conta agendada, mas não paga → ainda não entra no realizado',
    ],
    note: 'Padrão do OIK',
    creditCardBehavior: 'Compras no cartão entram no orçamento quando a fatura é paga.',
    recommendation: 'Recomendado para organização financeira familiar e controle do dia a dia.',
  },
  accrual_basis: {
    title: 'Regime de Competência',
    shortTitle: 'Competência',
    description: 'O aplicativo considera as receitas e despesas no mês em que elas acontecem, independentemente da data de pagamento ou recebimento. Esse modelo é indicado para quem prefere acompanhar compromissos financeiros por mês, mesmo que o dinheiro ainda não tenha sido movimentado.',
    examples: [
      'Aluguel de janeiro → conta em janeiro, mesmo pago em fevereiro',
      'Compra parcelada → cada parcela conta no mês correspondente',
      'Serviço prestado → conta no mês da realização',
    ],
    note: 'Visão analítica',
    creditCardBehavior: 'Compras no cartão entram no orçamento no mês da compra, independentemente do pagamento da fatura.',
    recommendation: 'Indicado para quem prefere uma visão mais analítica por período.',
  },
};

/**
 * Important notes about regime change
 */
export const ACCOUNTING_REGIME_CHANGE_NOTES = [
  'O OIK usa Fluxo de Caixa como padrão',
  'A troca de regime não apaga seus lançamentos',
  'Apenas a forma de cálculo do realizado será alterada',
  'O orçamento planejado permanece o mesmo',
  'Ao mudar o regime, os valores do realizado e os comparativos podem mudar',
];

/**
 * Warning message for regime change
 */
export const ACCOUNTING_REGIME_CHANGE_WARNING = {
  title: 'Atenção ao alterar',
  message: 'Ao trocar o regime de registro financeiro, a forma como o realizado é calculado será modificada. Essa mudança afeta apenas a leitura dos dados, não os lançamentos já feitos.',
};

/**
 * Credit card behavior rules per regime
 */
export const CREDIT_CARD_REGIME_RULES: Record<AccountingRegime, {
  purchaseIncluded: boolean;
  invoicePaymentIncluded: boolean;
  installmentsBehavior: string;
  summary: string;
}> = {
  cash_basis: {
    purchaseIncluded: false,
    invoicePaymentIncluded: true,
    installmentsBehavior: 'Impactam o realizado quando cada fatura mensal é paga',
    summary: 'Cartão = meio de pagamento. Despesa entra no pagamento da fatura.',
  },
  accrual_basis: {
    purchaseIncluded: true,
    invoicePaymentIncluded: false,
    installmentsBehavior: 'Cada parcela entra no realizado no mês correspondente',
    summary: 'Cartão = irrelevante. Despesa entra no mês da compra.',
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

/**
 * Check if a credit card purchase should be included in budget actuals
 */
export function shouldIncludeCreditCardPurchase(regime: AccountingRegime): boolean {
  return CREDIT_CARD_REGIME_RULES[regime].purchaseIncluded;
}

/**
 * Check if a credit card invoice payment should be included in budget actuals
 */
export function shouldIncludeInvoicePayment(regime: AccountingRegime): boolean {
  return CREDIT_CARD_REGIME_RULES[regime].invoicePaymentIncluded;
}
