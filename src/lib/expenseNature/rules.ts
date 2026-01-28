import { CategoryNatureMapping, ExpenseNature } from './types';

/**
 * Deterministic rules for expense nature classification
 * Based on the OIK category structure - these are ALWAYS fixed by definition
 */
export const FIXED_SUBCATEGORIES: CategoryNatureMapping[] = [
  // CASA - Fixed utilities and essential costs
  {
    categoryId: 'casa',
    subcategoryIds: [
      'casa-agua',
      'casa-condominio',
      'casa-diarista',
      'casa-empregada-domestica',
      'casa-inss-empregada',
      'casa-energia-eletrica',
      'casa-internet---tv---streamings',
      'casa-iptu',
      'casa-seguro-da-casa',
      'casa-telefone-celular',
    ],
    nature: 'FIXED',
  },
  // FILHOS - School and health plans are fixed
  {
    categoryId: 'filhos',
    subcategoryIds: [
      'filhos-escola',
      'filhos-plano-de-saude',
    ],
    nature: 'FIXED',
  },
  // VIDA & SAÚDE - Health and life insurance are fixed
  {
    categoryId: 'vida-saude',
    subcategoryIds: [
      'vida-saude-plano-de-saude',
      'vida-saude-seguro-de-vida',
      'vida-saude-seguro-plano-de-saude',
    ],
    nature: 'FIXED',
  },
  // TRANSPORTE - Insurance and financing are fixed
  {
    categoryId: 'transporte',
    subcategoryIds: [
      'transporte-seguro-do-carro',
      'transporte-ipva',
    ],
    nature: 'FIXED',
  },
  // EDUCAÇÃO - Regular courses and language learning
  {
    categoryId: 'educacao',
    subcategoryIds: [
      'educacao-ingles',
    ],
    nature: 'FIXED',
  },
  // DESPESAS FINANCEIRAS - Banking fees are fixed
  {
    categoryId: 'despesas-financeiras',
    subcategoryIds: [
      'despesas-financeiras-anuidade-cartao',
      'despesas-financeiras-manutencao-de-conta',
      'despesas-financeiras-emprestimos-diversos',
      'despesas-financeiras-parcelamento-do-cartao',
    ],
    nature: 'FIXED',
  },
  // PET - Health plan
  {
    categoryId: 'pet',
    subcategoryIds: [
      'pet-plano-de-saude',
    ],
    nature: 'FIXED',
  },
];

/**
 * Categories/subcategories that are ALWAYS variable
 */
export const VARIABLE_SUBCATEGORIES: CategoryNatureMapping[] = [
  // ALIMENTAÇÃO - All food is variable
  {
    categoryId: 'alimentacao',
    nature: 'VARIABLE',
  },
  // LAZER - All leisure is variable
  {
    categoryId: 'lazer',
    nature: 'VARIABLE',
  },
  // ROUPA & ESTÉTICA - All personal care is variable
  {
    categoryId: 'roupa-estetica',
    nature: 'VARIABLE',
  },
];

/**
 * Categories that are ALWAYS eventual
 */
export const EVENTUAL_CATEGORIES: string[] = [
  'despesas-eventuais',
];

/**
 * Check if a category/subcategory is deterministically FIXED
 */
export function isFixedByRule(categoryId: string, subcategoryId?: string): boolean {
  for (const mapping of FIXED_SUBCATEGORIES) {
    if (mapping.categoryId === categoryId) {
      // If no specific subcategories defined, entire category is fixed
      if (!mapping.subcategoryIds) return true;
      // If subcategory matches the fixed list
      if (subcategoryId && mapping.subcategoryIds.includes(subcategoryId)) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Check if a category/subcategory is deterministically VARIABLE
 */
export function isVariableByRule(categoryId: string): boolean {
  return VARIABLE_SUBCATEGORIES.some(mapping => mapping.categoryId === categoryId);
}

/**
 * Check if a category is EVENTUAL
 */
export function isEventualByRule(categoryId: string): boolean {
  return EVENTUAL_CATEGORIES.includes(categoryId);
}

/**
 * Get nature from deterministic rules
 */
export function getNatureFromRules(
  categoryId: string,
  subcategoryId?: string
): ExpenseNature | null {
  // Check eventual first (entire category)
  if (isEventualByRule(categoryId)) {
    return 'EVENTUAL';
  }
  
  // Check fixed rules (category + subcategory specific)
  if (isFixedByRule(categoryId, subcategoryId)) {
    return 'FIXED';
  }
  
  // Check variable rules (entire category)
  if (isVariableByRule(categoryId)) {
    return 'VARIABLE';
  }
  
  return null; // No deterministic rule found
}

/**
 * Subcategories that might become FIXED through heuristics
 * (if they appear consistently with stable amounts)
 */
export const HEURISTIC_CANDIDATES: string[] = [
  // Academia - if recurring and stable
  'vida-saude-academia',
  'vida-saude-personal',
  // Filhos extras that might be recurring
  'filhos-atividades-extras',
  'filhos-ingles',
  // Casa maintenance if contracted
  'casa-manutenção-estrutura',
  // Transporte recurring
  'transporte-estacionamento', // Monthly parking
];

export function isHeuristicCandidate(subcategoryId: string): boolean {
  return HEURISTIC_CANDIDATES.includes(subcategoryId);
}
