/**
 * Budget Templates Configuration
 * Intelligent budget allocation by income band and prefix
 * 
 * Based on OIK FDC-Realizado cost center prefixes
 * Does NOT create or modify categories - only uses existing ones
 */

// ========== INCOME BANDS ==========

export interface IncomeBand {
  id: string;
  label: string;
  min: number;
  max: number;
  subBands: SubBand[];
}

export interface SubBand {
  id: string;
  label: string;
  min: number;
  max: number;
  midpoint: number;
  position: 'low' | 'mid' | 'high';
}

export const INCOME_BANDS: IncomeBand[] = [
  {
    id: 'band_0_5k',
    label: 'Até R$ 5.000',
    min: 0,
    max: 5000,
    subBands: [
      { id: 'band_0_5k_low', label: 'Até R$ 2.000', min: 0, max: 2000, midpoint: 1000, position: 'low' },
      { id: 'band_0_5k_mid', label: 'R$ 2.001 – R$ 3.500', min: 2001, max: 3500, midpoint: 2750, position: 'mid' },
      { id: 'band_0_5k_high', label: 'R$ 3.501 – R$ 5.000', min: 3501, max: 5000, midpoint: 4250, position: 'high' },
    ],
  },
  {
    id: 'band_5k_8k',
    label: 'R$ 5.001 – R$ 8.000',
    min: 5001,
    max: 8000,
    subBands: [
      { id: 'band_5k_8k_low', label: 'R$ 5.001 – R$ 6.000', min: 5001, max: 6000, midpoint: 5500, position: 'low' },
      { id: 'band_5k_8k_mid', label: 'R$ 6.001 – R$ 7.000', min: 6001, max: 7000, midpoint: 6500, position: 'mid' },
      { id: 'band_5k_8k_high', label: 'R$ 7.001 – R$ 8.000', min: 7001, max: 8000, midpoint: 7500, position: 'high' },
    ],
  },
  {
    id: 'band_8k_15k',
    label: 'R$ 8.001 – R$ 15.000',
    min: 8001,
    max: 15000,
    subBands: [
      { id: 'band_8k_15k_low', label: 'R$ 8.001 – R$ 10.000', min: 8001, max: 10000, midpoint: 9000, position: 'low' },
      { id: 'band_8k_15k_mid', label: 'R$ 10.001 – R$ 12.500', min: 10001, max: 12500, midpoint: 11250, position: 'mid' },
      { id: 'band_8k_15k_high', label: 'R$ 12.501 – R$ 15.000', min: 12501, max: 15000, midpoint: 13750, position: 'high' },
    ],
  },
  {
    id: 'band_15k_30k',
    label: 'R$ 15.001 – R$ 30.000',
    min: 15001,
    max: 30000,
    subBands: [
      { id: 'band_15k_30k_low', label: 'R$ 15.001 – R$ 20.000', min: 15001, max: 20000, midpoint: 17500, position: 'low' },
      { id: 'band_15k_30k_mid', label: 'R$ 20.001 – R$ 25.000', min: 20001, max: 25000, midpoint: 22500, position: 'mid' },
      { id: 'band_15k_30k_high', label: 'R$ 25.001 – R$ 30.000', min: 25001, max: 30000, midpoint: 27500, position: 'high' },
    ],
  },
  {
    id: 'band_30k_50k',
    label: 'R$ 30.001 – R$ 50.000',
    min: 30001,
    max: 50000,
    subBands: [
      { id: 'band_30k_50k_low', label: 'R$ 30.001 – R$ 36.000', min: 30001, max: 36000, midpoint: 33000, position: 'low' },
      { id: 'band_30k_50k_mid', label: 'R$ 36.001 – R$ 43.000', min: 36001, max: 43000, midpoint: 39500, position: 'mid' },
      { id: 'band_30k_50k_high', label: 'R$ 43.001 – R$ 50.000', min: 43001, max: 50000, midpoint: 46500, position: 'high' },
    ],
  },
  {
    id: 'band_50k_80k',
    label: 'R$ 50.001 – R$ 80.000',
    min: 50001,
    max: 80000,
    subBands: [
      { id: 'band_50k_80k_low', label: 'R$ 50.001 – R$ 60.000', min: 50001, max: 60000, midpoint: 55000, position: 'low' },
      { id: 'band_50k_80k_mid', label: 'R$ 60.001 – R$ 70.000', min: 60001, max: 70000, midpoint: 65000, position: 'mid' },
      { id: 'band_50k_80k_high', label: 'R$ 70.001 – R$ 80.000', min: 70001, max: 80000, midpoint: 75000, position: 'high' },
    ],
  },
  {
    id: 'band_80k_120k',
    label: 'R$ 80.001 – R$ 120.000',
    min: 80001,
    max: 120000,
    subBands: [
      { id: 'band_80k_120k_low', label: 'R$ 80.001 – R$ 93.000', min: 80001, max: 93000, midpoint: 86500, position: 'low' },
      { id: 'band_80k_120k_mid', label: 'R$ 93.001 – R$ 106.000', min: 93001, max: 106000, midpoint: 99500, position: 'mid' },
      { id: 'band_80k_120k_high', label: 'R$ 106.001 – R$ 120.000', min: 106001, max: 120000, midpoint: 113000, position: 'high' },
    ],
  },
  {
    id: 'band_120k_plus',
    label: 'Acima de R$ 120.000',
    min: 120001,
    max: 300000,
    subBands: [
      { id: 'band_120k_plus_low', label: 'R$ 120.001 – R$ 160.000', min: 120001, max: 160000, midpoint: 140000, position: 'low' },
      { id: 'band_120k_plus_mid', label: 'R$ 160.001 – R$ 220.000', min: 160001, max: 220000, midpoint: 190000, position: 'mid' },
      { id: 'band_120k_plus_high', label: 'Acima de R$ 220.000', min: 220001, max: 300000, midpoint: 260000, position: 'high' },
    ],
  },
];

// ========== PREFIX MAPPING TO CATEGORIES ==========

export interface PrefixConfig {
  code: string;
  name: string;
  categoryId: string;
  isBudgetable: boolean;
  conditionalOn?: 'has_pets' | 'has_dependents';
  defaultSubcategoryWeights?: Record<string, number>; // subcategory_id -> weight
}

// Maps prefixes to category IDs (uses existing categories only)
export const PREFIX_CONFIG: PrefixConfig[] = [
  { 
    code: 'C', 
    name: 'Casa/Moradia', 
    categoryId: 'casa', 
    isBudgetable: true,
    defaultSubcategoryWeights: {
      'casa-agua': 3,
      'casa-condominio': 15,
      'casa-energia-eletrica': 8,
      'casa-internet-tv-streamings': 5,
      'casa-iptu': 10,
      'casa-diarista': 10,
      'casa-telefone-celular': 5,
      'casa-manutencao-estrutura': 20,
      'casa-manutencao-eletronicos': 10,
      'casa-utensilios-para-casa': 10,
      'casa-seguro-da-casa': 4,
    },
  },
  { 
    code: 'A', 
    name: 'Alimentação', 
    categoryId: 'alimentacao', 
    isBudgetable: true,
    defaultSubcategoryWeights: {
      'alimentacao-supermercado': 50,
      'alimentacao-almoco': 15,
      'alimentacao-delivery': 10,
      'alimentacao-padaria': 8,
      'alimentacao-feira': 7,
      'alimentacao-acougue': 5,
      'alimentacao-peixaria': 3,
      'alimentacao-produtos-naturais': 2,
    },
  },
  { 
    code: 'T', 
    name: 'Transporte', 
    categoryId: 'transporte', 
    isBudgetable: true,
    defaultSubcategoryWeights: {
      'transporte-combustivel': 40,
      'transporte-manutencao': 20,
      'transporte-seguro-do-carro': 15,
      'transporte-ipva': 10,
      'transporte-taxi-uber': 8,
      'transporte-estacionamento': 5,
      'transporte-lavacao': 2,
    },
  },
  { 
    code: 'V & S', 
    name: 'Vida & Saúde', 
    categoryId: 'vida-saude', 
    isBudgetable: true,
    defaultSubcategoryWeights: {
      'vida-saude-plano-de-saude': 40,
      'vida-saude-seguro-plano-de-saude': 15,
      'vida-saude-academia': 10,
      'vida-saude-medicamentos': 10,
      'vida-saude-medico': 10,
      'vida-saude-dentista': 8,
      'vida-saude-exames': 5,
      'vida-saude-personal': 2,
    },
  },
  { 
    code: 'E & F', 
    name: 'Educação & Formação', 
    categoryId: 'educacao', 
    isBudgetable: true,
    defaultSubcategoryWeights: {
      'educacao-cursos-online': 30,
      'educacao-cursos-presenciais': 25,
      'educacao-ingles': 20,
      'educacao-livros': 10,
      'educacao-mba': 10,
      'educacao-certificacoes': 5,
    },
  },
  { 
    code: 'L', 
    name: 'Lazer', 
    categoryId: 'lazer', 
    isBudgetable: true,
    defaultSubcategoryWeights: {
      'lazer-restaurantes': 40,
      'lazer-pequenas-viagens': 20,
      'lazer-cinema-teatro': 15,
      'lazer-shows': 10,
      'lazer-baladas': 8,
      'lazer-eventos-em-casa': 5,
      'lazer-viagem-nacional': 2,
    },
  },
  { 
    code: 'R & E', 
    name: 'Roupas & Estética', 
    categoryId: 'roupa-estetica', 
    isBudgetable: true,
    defaultSubcategoryWeights: {
      'roupa-estetica-roupas': 35,
      'roupa-estetica-calcados': 20,
      'roupa-estetica-cabeleireiro': 20,
      'roupa-estetica-acessorios': 10,
      'roupa-estetica-manicure': 10,
      'roupa-estetica-perfume': 5,
    },
  },
  { 
    code: 'F', 
    name: 'Filhos', 
    categoryId: 'filhos', 
    isBudgetable: true,
    conditionalOn: 'has_dependents',
    defaultSubcategoryWeights: {
      'filhos-escola': 40,
      'filhos-plano-de-saude': 15,
      'filhos-atividades-extras': 10,
      'filhos-alimentacao': 10,
      'filhos-roupas-e-acessorios': 8,
      'filhos-medicamentos-e-vacinas': 5,
      'filhos-brinquedos': 5,
      'filhos-passeios': 5,
      'filhos-material-escolar': 2,
    },
  },
  { 
    code: 'PET', 
    name: 'Pets', 
    categoryId: 'pet', 
    isBudgetable: true,
    conditionalOn: 'has_pets',
    defaultSubcategoryWeights: {
      'pet-alimentacao': 40,
      'pet-medico-veterinario': 20,
      'pet-banho-e-tosa': 15,
      'pet-medicamentos-e-vacinas': 10,
      'pet-plano-de-saude': 8,
      'pet-brinquedos': 5,
      'pet-hotel': 2,
    },
  },
  { 
    code: 'DF', 
    name: 'Despesas Financeiras', 
    categoryId: 'despesas-financeiras', 
    isBudgetable: true,
    defaultSubcategoryWeights: {
      'despesas-financeiras-juros': 30,
      'despesas-financeiras-emprestimos-diversos': 25,
      'despesas-financeiras-anuidade-cartao': 15,
      'despesas-financeiras-parcelamento-do-cartao': 15,
      'despesas-financeiras-iof': 5,
      'despesas-financeiras-manutencao-de-conta': 5,
      'despesas-financeiras-ted': 3,
      'despesas-financeiras-outras': 2,
    },
  },
  { 
    code: 'DIV', 
    name: 'Diversos', 
    categoryId: 'diversos', 
    isBudgetable: true,
    defaultSubcategoryWeights: {
      'diversos-equipamentos-eletronicos': 30,
      'diversos-presentes-para-familia': 25,
      'diversos-presentes-para-festas-casamentos-15-anos': 15,
      'diversos-doacoes': 10,
      'diversos-despesas-profissionais': 10,
      'diversos-consultoria-pontual': 5,
      'diversos-renovacao-de-documentos': 5,
    },
  },
  { 
    code: 'E', 
    name: 'Despesas Eventuais', 
    categoryId: 'despesas-eventuais', 
    isBudgetable: true,
    defaultSubcategoryWeights: {
      'despesas-eventuais-grandes-viagens-ferias': 25,
      'despesas-eventuais-reformas': 25,
      'despesas-eventuais-festas-aniversario-bodas-15-anos': 15,
      'despesas-eventuais-grandes-presentes-doacoes': 10,
      'despesas-eventuais-joias-bolsas-relogios': 10,
      'despesas-eventuais-compra-troca-de-veiculos': 8,
      'despesas-eventuais-compra-troca-de-imoveis': 5,
      'despesas-eventuais-consultorias-eventuais': 2,
    },
  },
  { 
    code: 'IF', 
    name: 'Reserva / Investimentos', 
    categoryId: 'investimentos', 
    isBudgetable: true,
    defaultSubcategoryWeights: {
      'investimentos-reserva-emergencia': 40,
      'investimentos-previdencia': 25,
      'investimentos-renda-fixa': 20,
      'investimentos-renda-variavel': 15,
    },
  },
  // Non-budgetable prefixes (excluded from budget generation)
  { code: 'R', name: 'Receitas', categoryId: 'rendas', isBudgetable: false },
  { code: 'DESC', name: 'Desconhecidas', categoryId: 'desconhecidas', isBudgetable: false },
  { code: 'PGTO', name: 'Pagamento Cartão', categoryId: '', isBudgetable: false },
  { code: 'CA', name: 'Caixa Auxiliar', categoryId: '', isBudgetable: false },
  { code: 'OBJ', name: 'Objetivos', categoryId: 'objetivos', isBudgetable: false },
];

// ========== BASE PERCENTAGES BY INCOME BAND ==========

export interface BandPercentages {
  [prefixCode: string]: number; // percentage as decimal (e.g., 0.25 for 25%)
}

// Percentages by income band (should sum to 1.0 or 100%)
// Based on OIK official table - operates by prefix only
export const BASE_PERCENTAGES: Record<string, BandPercentages> = {
  // Até R$ 5.000 - Perfil: organização básica / contenção
  band_0_5k: {
    'C': 0.30,      // Casa/Moradia
    'A': 0.20,      // Alimentação
    'T': 0.12,      // Transporte
    'V & S': 0.06,  // Vida & Saúde
    'E & F': 0.03,  // Educação & Formação
    'L': 0.04,      // Lazer
    'R & E': 0.03,  // Roupas & Estética
    'F': 0.05,      // Filhos (conditional)
    'PET': 0.02,    // Pets (conditional)
    'DF': 0.05,     // Despesas Financeiras
    'DIV': 0.04,    // Diversos
    'E': 0.04,      // Eventuais / Provisões
    'IF': 0.02,     // Reserva / Investimentos
  },
  // R$ 5.001 – R$ 8.000 - Perfil: estabilização
  band_5k_8k: {
    'C': 0.28,
    'A': 0.18,
    'T': 0.12,
    'V & S': 0.06,
    'E & F': 0.04,
    'L': 0.05,
    'R & E': 0.04,
    'F': 0.05,
    'PET': 0.02,
    'DF': 0.05,
    'DIV': 0.04,
    'E': 0.04,
    'IF': 0.03,
  },
  // R$ 8.001 – R$ 15.000 - Perfil: estabilidade confortável
  band_8k_15k: {
    'C': 0.25,
    'A': 0.16,
    'T': 0.11,
    'V & S': 0.07,
    'E & F': 0.06,
    'L': 0.06,
    'R & E': 0.04,
    'F': 0.05,
    'PET': 0.02,
    'DF': 0.04,
    'DIV': 0.04,
    'E': 0.04,
    'IF': 0.06,
  },
  // R$ 15.001 – R$ 30.000 - Perfil: conforto + planejamento
  band_15k_30k: {
    'C': 0.23,
    'A': 0.14,
    'T': 0.10,
    'V & S': 0.07,
    'E & F': 0.08,
    'L': 0.07,
    'R & E': 0.05,
    'F': 0.06,
    'PET': 0.02,
    'DF': 0.04,
    'DIV': 0.04,
    'E': 0.04,
    'IF': 0.06,
  },
  // R$ 30.001 – R$ 50.000 - Perfil: alto padrão
  band_30k_50k: {
    'C': 0.20,
    'A': 0.13,
    'T': 0.09,
    'V & S': 0.08,
    'E & F': 0.09,
    'L': 0.08,
    'R & E': 0.06,
    'F': 0.06,
    'PET': 0.02,
    'DF': 0.03,
    'DIV': 0.04,
    'E': 0.04,
    'IF': 0.08,
  },
  // R$ 50.001 – R$ 80.000 - Perfil: patrimônio em formação
  band_50k_80k: {
    'C': 0.18,
    'A': 0.12,
    'T': 0.08,
    'V & S': 0.08,
    'E & F': 0.10,
    'L': 0.09,
    'R & E': 0.06,
    'F': 0.06,
    'PET': 0.02,
    'DF': 0.03,
    'DIV': 0.04,
    'E': 0.04,
    'IF': 0.10,
  },
  // R$ 80.001 – R$ 120.000 - Perfil: estratégia patrimonial
  band_80k_120k: {
    'C': 0.16,
    'A': 0.11,
    'T': 0.07,
    'V & S': 0.08,
    'E & F': 0.10,
    'L': 0.10,
    'R & E': 0.07,
    'F': 0.06,
    'PET': 0.02,
    'DF': 0.02,
    'DIV': 0.04,
    'E': 0.04,
    'IF': 0.13,
  },
  // Acima de R$ 120.000 - Perfil: preservação e crescimento
  band_120k_plus: {
    'C': 0.14,
    'A': 0.10,
    'T': 0.06,
    'V & S': 0.08,
    'E & F': 0.10,
    'L': 0.12,
    'R & E': 0.08,
    'F': 0.06,
    'PET': 0.02,
    'DF': 0.02,
    'DIV': 0.04,
    'E': 0.04,
    'IF': 0.14,
  },
};

// ========== SUBBAND ADJUSTMENTS ==========

export interface SubBandAdjustment {
  [prefixCode: string]: number; // percentage point adjustment (e.g., +0.02 for +2%)
}

export const SUBBAND_ADJUSTMENTS: Record<'low' | 'mid' | 'high', SubBandAdjustment> = {
  low: {
    'C': +0.02,       // +2pp for housing (lower income needs more for housing)
    'DF': +0.01,      // +1pp for financial expenses (debts more common)
    'L': -0.01,       // -1pp for leisure
    'E': -0.01,       // -1pp for eventual expenses
    'DIV': -0.01,     // -1pp for miscellaneous
  },
  mid: {
    // No adjustments for middle sub-band
  },
  high: {
    'C': -0.02,       // -2pp for housing (can afford efficiency)
    'L': +0.01,       // +1pp for leisure
    'E': +0.01,       // +1pp for provisions
    'DIV': +0.01,     // +1pp for miscellaneous
    'DF': -0.01,      // -1pp for financial expenses
  },
};

// ========== HELPER FUNCTIONS ==========

export function getBandById(bandId: string): IncomeBand | undefined {
  return INCOME_BANDS.find(b => b.id === bandId);
}

export function getSubBandById(bandId: string, subBandId: string): SubBand | undefined {
  const band = getBandById(bandId);
  return band?.subBands.find(sb => sb.id === subBandId);
}

export function getPrefixConfig(prefixCode: string): PrefixConfig | undefined {
  return PREFIX_CONFIG.find(p => p.code === prefixCode);
}

export function getBudgetablePrefixes(hasPets: boolean, hasDependents: boolean): PrefixConfig[] {
  return PREFIX_CONFIG.filter(p => {
    if (!p.isBudgetable) return false;
    if (p.conditionalOn === 'has_pets' && !hasPets) return false;
    if (p.conditionalOn === 'has_dependents' && !hasDependents) return false;
    return true;
  });
}

export function calculateAdjustedPercentages(
  bandId: string,
  subBandPosition: 'low' | 'mid' | 'high',
  hasPets: boolean,
  hasDependents: boolean
): Record<string, number> {
  const basePercents = BASE_PERCENTAGES[bandId] || BASE_PERCENTAGES['band_8k_15k'];
  const adjustments = SUBBAND_ADJUSTMENTS[subBandPosition];
  
  const result: Record<string, number> = {};
  
  // Start with base percentages
  Object.entries(basePercents).forEach(([prefix, percent]) => {
    result[prefix] = percent;
  });
  
  // Apply sub-band adjustments
  Object.entries(adjustments).forEach(([prefix, adjustment]) => {
    if (result[prefix] !== undefined) {
      result[prefix] = Math.max(0, result[prefix] + adjustment);
    }
  });
  
  // Remove conditional prefixes if not applicable
  if (!hasPets) {
    delete result['PET'];
  }
  if (!hasDependents) {
    delete result['F'];
  }
  
  // Normalize to ensure sum = 1.0
  const total = Object.values(result).reduce((sum, val) => sum + val, 0);
  if (total !== 1) {
    const factor = 1 / total;
    Object.keys(result).forEach(key => {
      result[key] = result[key] * factor;
    });
  }
  
  return result;
}

export function calculateBudgetAmounts(
  estimatedIncome: number,
  percentages: Record<string, number>
): Record<string, number> {
  const result: Record<string, number> = {};
  
  Object.entries(percentages).forEach(([prefix, percent]) => {
    result[prefix] = Math.round(estimatedIncome * percent);
  });
  
  return result;
}

// Get category ID from prefix code
export function getCategoryIdFromPrefix(prefixCode: string): string | null {
  const config = getPrefixConfig(prefixCode);
  return config?.categoryId || null;
}

// Get default subcategory distribution for a prefix
export function getSubcategoryDistribution(
  prefixCode: string,
  totalAmount: number
): Record<string, number> {
  const config = getPrefixConfig(prefixCode);
  if (!config?.defaultSubcategoryWeights) {
    return {};
  }
  
  const totalWeight = Object.values(config.defaultSubcategoryWeights).reduce((a, b) => a + b, 0);
  const result: Record<string, number> = {};
  
  Object.entries(config.defaultSubcategoryWeights).forEach(([subId, weight]) => {
    result[subId] = Math.round((weight / totalWeight) * totalAmount);
  });
  
  return result;
}

// Format currency for display
export function formatBandLabel(band: IncomeBand | SubBand): string {
  return band.label;
}
