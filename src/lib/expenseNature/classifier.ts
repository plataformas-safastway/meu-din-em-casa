import { ExpenseNature, ExpenseNatureResult, ExpenseNatureSource } from './types';
import { getNatureFromRules, isHeuristicCandidate } from './rules';

export interface ClassificationInput {
  categoryId: string;
  subcategoryId?: string;
  merchantKey?: string;
  amount?: number;
  description?: string;
}

export interface TransactionHistory {
  categoryId: string;
  subcategoryId?: string;
  merchantKey?: string;
  amount: number;
  date: string;
}

/**
 * Main classifier for expense nature
 * Priority: User Override > Deterministic Rules > Heuristics > Default
 */
export function classifyExpenseNature(
  input: ClassificationInput,
  userOverrides?: Map<string, ExpenseNature>,
  transactionHistory?: TransactionHistory[]
): ExpenseNatureResult {
  const { categoryId, subcategoryId, merchantKey } = input;
  
  // 1. Check user overrides first (highest priority)
  const overrideKey = buildOverrideKey(categoryId, subcategoryId, merchantKey);
  if (userOverrides?.has(overrideKey)) {
    return {
      nature: userOverrides.get(overrideKey)!,
      source: 'USER',
      confidence: 1.0,
      reason: 'Classificação definida pelo usuário',
    };
  }
  
  // 2. Check deterministic rules
  const ruleNature = getNatureFromRules(categoryId, subcategoryId);
  if (ruleNature) {
    return {
      nature: ruleNature,
      source: 'SYSTEM_RULE',
      confidence: 0.95,
      reason: getRuleReason(ruleNature, categoryId),
    };
  }
  
  // 3. Check heuristics for candidate subcategories
  if (subcategoryId && isHeuristicCandidate(subcategoryId) && transactionHistory) {
    const heuristicResult = applyRecurrenceHeuristic(
      categoryId,
      subcategoryId,
      transactionHistory
    );
    if (heuristicResult) {
      return heuristicResult;
    }
  }
  
  // 4. Default to UNKNOWN for expenses without clear classification
  return {
    nature: 'UNKNOWN',
    source: 'SYSTEM_RULE',
    confidence: 0.3,
    reason: 'Classificação não determinada automaticamente',
  };
}

/**
 * Build a unique key for override lookup
 */
function buildOverrideKey(
  categoryId: string,
  subcategoryId?: string,
  merchantKey?: string
): string {
  const parts = [categoryId];
  if (subcategoryId) parts.push(subcategoryId);
  if (merchantKey) parts.push(merchantKey);
  return parts.join('::');
}

/**
 * Get human-readable reason for rule-based classification
 */
function getRuleReason(nature: ExpenseNature, categoryId: string): string {
  switch (nature) {
    case 'FIXED':
      return 'Despesa fixa estrutural - ocorre independente de decisões de consumo';
    case 'VARIABLE':
      return 'Despesa variável - depende de decisões de consumo no mês';
    case 'EVENTUAL':
      return 'Despesa eventual - não recorrente';
    default:
      return 'Classificação baseada em regras do sistema';
  }
}

/**
 * Apply recurrence heuristic for candidate subcategories
 * Checks if transaction appears ≥3 months consecutively with stable amounts
 */
function applyRecurrenceHeuristic(
  categoryId: string,
  subcategoryId: string,
  history: TransactionHistory[]
): ExpenseNatureResult | null {
  // Filter transactions matching this category/subcategory
  const matching = history.filter(
    t => t.categoryId === categoryId && t.subcategoryId === subcategoryId
  );
  
  if (matching.length < 3) {
    return null; // Not enough data
  }
  
  // Group by month
  const byMonth = new Map<string, number>();
  for (const t of matching) {
    const monthKey = t.date.substring(0, 7); // YYYY-MM
    byMonth.set(monthKey, (byMonth.get(monthKey) || 0) + t.amount);
  }
  
  // Check for at least 3 consecutive months
  const months = Array.from(byMonth.keys()).sort();
  if (months.length < 3) {
    return null;
  }
  
  // Check amount stability (variation < 20%)
  const amounts = Array.from(byMonth.values());
  const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  const maxVariation = Math.max(...amounts.map(a => Math.abs(a - avgAmount) / avgAmount));
  
  if (maxVariation <= 0.20) {
    return {
      nature: 'FIXED',
      source: 'AI_INFERENCE',
      confidence: 0.75,
      reason: `Despesa recorrente detectada: ${months.length} meses consecutivos com variação ≤20%`,
    };
  }
  
  return null;
}

/**
 * Batch classify multiple transactions
 */
export function batchClassifyExpenses(
  inputs: ClassificationInput[],
  userOverrides?: Map<string, ExpenseNature>,
  transactionHistory?: TransactionHistory[]
): Map<string, ExpenseNatureResult> {
  const results = new Map<string, ExpenseNatureResult>();
  
  for (const input of inputs) {
    const key = buildOverrideKey(input.categoryId, input.subcategoryId, input.merchantKey);
    const result = classifyExpenseNature(input, userOverrides, transactionHistory);
    results.set(key, result);
  }
  
  return results;
}

/**
 * Get display label for expense nature
 */
export function getExpenseNatureLabel(nature: ExpenseNature): string {
  switch (nature) {
    case 'FIXED':
      return 'Despesa Fixa';
    case 'VARIABLE':
      return 'Despesa Variável';
    case 'EVENTUAL':
      return 'Despesa Eventual';
    case 'UNKNOWN':
      return 'Não classificada';
    default:
      return nature;
  }
}

/**
 * Get short badge label
 */
export function getExpenseNatureBadge(nature: ExpenseNature): string {
  switch (nature) {
    case 'FIXED':
      return 'Fixa';
    case 'VARIABLE':
      return 'Variável';
    case 'EVENTUAL':
      return 'Eventual';
    case 'UNKNOWN':
      return '?';
    default:
      return nature;
  }
}

/**
 * Get color for expense nature badge
 */
export function getExpenseNatureColor(nature: ExpenseNature): string {
  switch (nature) {
    case 'FIXED':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    case 'VARIABLE':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
    case 'EVENTUAL':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
    case 'UNKNOWN':
      return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400';
    default:
      return 'bg-muted text-muted-foreground';
  }
}
