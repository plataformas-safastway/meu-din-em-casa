/**
 * Budget Modes Configuration
 * Defines different budget allocation strategies based on user objectives
 * 
 * Each mode adjusts the base income-band percentages to prioritize different areas
 */

export interface BudgetMode {
  id: string;
  label: string;
  description: string;
  icon: string;
  // Adjustment multipliers for each prefix (1.0 = no change, >1 = increase, <1 = decrease)
  adjustments: Record<string, number>;
  // Priority prefixes for redistribution when categories are inactive
  redistributionPriority: string[];
}

// The 6 budget modes based on user objectives
export const BUDGET_MODES: BudgetMode[] = [
  {
    id: 'comfort',
    label: 'Conforto',
    description: 'Prioriza qualidade de vida no dia a dia',
    icon: '🏠',
    adjustments: {
      'C': 1.05,      // +5% housing
      'A': 1.05,      // +5% food
      'L': 1.10,      // +10% leisure
      'R & E': 1.05,  // +5% clothing/aesthetics
      'DIV': 1.05,    // +5% misc
      'IF': 0.80,     // -20% investments (comfort trades future for present)
      'E': 0.90,      // -10% provisions
    },
    redistributionPriority: ['C', 'L', 'DIV', 'A'],
  },
  {
    id: 'tranquility',
    label: 'Tranquilidade',
    description: 'Foco em segurança e prevenção',
    icon: '😌',
    adjustments: {
      'V & S': 1.15,  // +15% health
      'E': 1.20,      // +20% provisions
      'IF': 1.15,     // +15% investments
      'L': 0.85,      // -15% leisure
      'R & E': 0.85,  // -15% clothing
      'DIV': 0.90,    // -10% misc
    },
    redistributionPriority: ['E', 'IF', 'V & S'],
  },
  {
    id: 'security',
    label: 'Segurança',
    description: 'Máxima proteção e reservas',
    icon: '🛡️',
    adjustments: {
      'V & S': 1.20,  // +20% health
      'E': 1.25,      // +25% provisions
      'IF': 1.25,     // +25% investments
      'L': 0.70,      // -30% leisure
      'R & E': 0.75,  // -25% clothing
      'DIV': 0.80,    // -20% misc
      'C': 0.95,      // -5% housing (find efficiency)
    },
    redistributionPriority: ['IF', 'E', 'V & S'],
  },
  {
    id: 'optimization',
    label: 'Otimização / Crescimento',
    description: 'Maximizar patrimônio e investimentos',
    icon: '📈',
    adjustments: {
      'IF': 1.40,     // +40% investments
      'E': 1.15,      // +15% provisions
      'E & F': 1.10,  // +10% education
      'L': 0.70,      // -30% leisure
      'R & E': 0.70,  // -30% clothing
      'DIV': 0.75,    // -25% misc
      'C': 0.90,      // -10% housing
      'A': 0.90,      // -10% food
    },
    redistributionPriority: ['IF', 'E'],
  },
  {
    id: 'quality',
    label: 'Qualidade de Vida',
    description: 'Equilíbrio entre presente e futuro',
    icon: '⚖️',
    adjustments: {
      'L': 1.10,      // +10% leisure
      'E': 1.10,      // +10% provisions
      'IF': 1.05,     // +5% investments
      'V & S': 1.05,  // +5% health
      'DF': 0.85,     // -15% financial expenses
      'DIV': 0.90,    // -10% misc
    },
    redistributionPriority: ['E', 'IF', 'L'],
  },
  {
    id: 'preservation',
    label: 'Preservação Patrimonial',
    description: 'Proteger e manter o que já foi conquistado',
    icon: '🏦',
    adjustments: {
      'IF': 1.35,     // +35% investments
      'V & S': 1.15,  // +15% health
      'E': 1.20,      // +20% provisions
      'L': 0.80,      // -20% leisure
      'R & E': 0.80,  // -20% clothing
      'DIV': 0.80,    // -20% misc
      'A': 0.95,      // -5% food
    },
    redistributionPriority: ['IF', 'E', 'V & S'],
  },
];

// Get mode by ID
export function getBudgetModeById(modeId: string): BudgetMode | undefined {
  return BUDGET_MODES.find(m => m.id === modeId);
}

// Apply mode adjustments to base percentages
export function applyModeAdjustments(
  basePercentages: Record<string, number>,
  modeId: string
): Record<string, number> {
  const mode = getBudgetModeById(modeId);
  if (!mode) return { ...basePercentages };

  const adjusted: Record<string, number> = {};
  
  // Apply multipliers
  Object.entries(basePercentages).forEach(([prefix, value]) => {
    const multiplier = mode.adjustments[prefix] ?? 1.0;
    adjusted[prefix] = value * multiplier;
  });

  // Normalize to ensure sum = 1.0
  const total = Object.values(adjusted).reduce((sum, val) => sum + val, 0);
  if (total > 0 && total !== 1) {
    const factor = 1 / total;
    Object.keys(adjusted).forEach(key => {
      adjusted[key] = adjusted[key] * factor;
    });
  }

  return adjusted;
}

// Redistribute inactive category percentages according to mode priority
export function redistributeInactivePercentages(
  percentages: Record<string, number>,
  inactiveCategories: string[],
  modeId: string
): Record<string, number> {
  const mode = getBudgetModeById(modeId);
  const result = { ...percentages };
  
  // Calculate total to redistribute
  let toRedistribute = 0;
  inactiveCategories.forEach(prefix => {
    toRedistribute += result[prefix] || 0;
    delete result[prefix];
  });

  if (toRedistribute <= 0) return result;

  // Get priority categories that are still active
  const priorityCategories = (mode?.redistributionPriority || ['IF', 'E', 'V & S'])
    .filter(p => result[p] !== undefined);

  if (priorityCategories.length === 0) {
    // Fallback: distribute proportionally across all remaining
    const activeTotal = Object.values(result).reduce((a, b) => a + b, 0);
    Object.keys(result).forEach(key => {
      result[key] += (result[key] / activeTotal) * toRedistribute;
    });
  } else {
    // Distribute among priority categories proportionally
    const priorityTotal = priorityCategories.reduce((sum, p) => sum + (result[p] || 0), 0);
    priorityCategories.forEach(p => {
      const share = (result[p] / priorityTotal) * toRedistribute;
      result[p] += share;
    });
  }

  // Final normalization to ensure sum = 1.0
  const total = Object.values(result).reduce((sum, val) => sum + val, 0);
  if (total > 0 && Math.abs(total - 1) > 0.001) {
    const factor = 1 / total;
    Object.keys(result).forEach(key => {
      result[key] = result[key] * factor;
    });
  }

  return result;
}

// Onboarding data types
export interface OnboardingData {
  incomeBandId: string;
  incomeAnchorValue: number;
  incomeType: string;
  financialStage: string;
  budgetMode: string;
  householdStructure: string;
  hasPets: boolean;
  hasDependents: boolean;
  nonMonthlyPlanningLevel: string;
}

// Income type options
export const INCOME_TYPES = [
  { id: 'fixed', label: 'Totalmente fixa (salário)', description: 'Renda previsível todo mês' },
  { id: 'mostly_fixed', label: 'Maior parte fixa, com parte variável', description: 'Salário + comissões/bônus' },
  { id: 'mostly_variable', label: 'Maior parte variável', description: 'Comissões ou vendas' },
  { id: 'fully_variable', label: 'Totalmente variável', description: 'Autônomo ou freelancer' },
  { id: 'patrimonial', label: 'Patrimonial', description: 'Aluguéis, dividendos, juros' },
  { id: 'irregular', label: 'Irregular', description: 'Muda bastante mês a mês' },
];

// Financial stage options
export const FINANCIAL_STAGES = [
  { id: 'limit', label: 'Vivo no limite, sempre preocupado', description: 'Às vezes no negativo', severity: 'critical' },
  { id: 'no_surplus', label: 'Pago tudo, mas não sobra', description: 'Zero a zero todo mês', severity: 'warning' },
  { id: 'some_surplus', label: 'Sobra um pouco, mas sem organização', description: 'Não sabe para onde vai', severity: 'info' },
  { id: 'organized', label: 'Tenho organização e já consigo planejar', description: 'Controle básico', severity: 'success' },
  { id: 'patrimony', label: 'Já penso mais em patrimônio e futuro', description: 'Foco em crescer', severity: 'success' },
];

// Household structure options
export const HOUSEHOLD_STRUCTURES = [
  { id: 'alone', label: 'Moro sozinho(a)', hasDependents: false },
  { id: 'couple_no_kids', label: 'Casal sem filhos', hasDependents: false },
  { id: 'couple_with_kids', label: 'Casal com filhos', hasDependents: true },
  { id: 'single_parent', label: 'Família monoparental', hasDependents: true },
  { id: 'other_dependents', label: 'Outros dependentes (pais/parentes)', hasDependents: true },
];

// Non-monthly planning level options
export const NON_MONTHLY_PLANNING_LEVELS = [
  { id: 'most', label: 'Sim, considero a maioria', adjustE: 0 },
  { id: 'some', label: 'Considero algumas', adjustE: 0.02 },
  { id: 'almost_never', label: 'Quase nunca considero', adjustE: 0.04 },
  { id: 'never', label: 'Nunca considerei', adjustE: 0.06 },
];

// Micro-tips for each onboarding step
export const ONBOARDING_TIPS: Record<string, { tip: string; emoji: string }> = {
  income_band: {
    tip: 'Você não precisa de exatidão neste momento. O orçamento começa com clareza, não com perfeição.',
    emoji: '💡',
  },
  income_anchor: {
    tip: 'Pessoas com a mesma renda podem ter orçamentos bem diferentes. O que muda é o objetivo e o momento de vida. Não se compare com ninguém.',
    emoji: '🎯',
  },
  income_type: {
    tip: 'Renda variável costuma pedir mais proteção: reservas maiores e compromissos fixos mais leves.',
    emoji: '⚡',
  },
  financial_stage: {
    tip: 'Isso muda ao longo da vida. O OIK vai ajustar junto com você, sem julgamento.',
    emoji: '📊',
  },
  budget_mode: {
    tip: 'Não existe objetivo certo. O melhor orçamento é o que respeita seu momento.',
    emoji: '✨',
  },
  household_structure: {
    tip: 'Responsabilidades mudam o orçamento, e está tudo bem ajustar ao longo do tempo.',
    emoji: '👨‍👩‍👧',
  },
  pets: {
    tip: 'Um orçamento bom não tem "tudo". Ele tem o que faz sentido para a sua vida.',
    emoji: '🐕',
  },
  non_monthly_planning: {
    tip: 'O dinheiro costuma "sumir" nas despesas grandes e espaçadas, não é no cafezinho do dia a dia.',
    emoji: '📆',
  },
};
