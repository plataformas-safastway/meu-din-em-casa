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
// Subcategory weights based on OIK official distribution (used when no history available)
export const PREFIX_CONFIG: PrefixConfig[] = [
  { 
    code: 'C', 
    name: 'Casa/Moradia', 
    categoryId: 'casa', 
    isBudgetable: true,
    defaultSubcategoryWeights: {
      'C - Condomínio': 20,
      'C - Empregada Doméstica': 15,
      'C - Energia Elétrica': 8,
      'C - Internet + TV + Streamings': 8,
      'C - IPTU': 8,
      'C - Manutenção Estrutura': 8,
      'C - Diarista': 6,
      'C - Telefone Celular': 5,
      'C - Seguro da casa': 5,
      'C - INSS Empregada': 5,
      'C - Água': 4,
      'C - Utensílios para casa': 3,
      'C - Manutenção Eletrônicos': 3,
      'C - Locação área lazer': 2,
    },
  },
  { 
    code: 'A', 
    name: 'Alimentação', 
    categoryId: 'alimentacao', 
    isBudgetable: true,
    defaultSubcategoryWeights: {
      'A - Supermercado': 40,
      'A - Almoço': 15,
      'A - Delivery': 15,
      'A - Feira': 10,
      'A - Açougue': 7,
      'A - Padaria': 5,
      'A - Peixaria': 4,
      'A - Produtos Naturais': 4,
    },
  },
  { 
    code: 'T', 
    name: 'Transporte', 
    categoryId: 'transporte', 
    isBudgetable: true,
    defaultSubcategoryWeights: {
      'T - Combustível': 35,
      'T - Taxi/Uber': 15,
      'T - Manutenção': 12,
      'T - Seguro do carro': 10,
      'T - IPVA': 8,
      'T - Estacionamento': 8,
      'T - Ônibus': 5,
      'T - Lavação': 4,
      'T - Multa': 3,
    },
  },
  { 
    code: 'V & S', 
    name: 'Vida & Saúde', 
    categoryId: 'vida-saude', 
    isBudgetable: true,
    defaultSubcategoryWeights: {
      'V & S - Plano de saúde': 30,
      'V & S - Seguro/Plano de saúde': 10,
      'V & S - Médico': 10,
      'V & S - Exames': 8,
      'V & S - Medicamentos': 8,
      'V & S - Academia': 10,
      'V & S - Dentista': 6,
      'V & S - Personal': 6,
      'V & S - Seguro de vida': 6,
      'V & S - Tratamentos Específicos': 6,
    },
  },
  { 
    code: 'E & F', 
    name: 'Educação & Formação', 
    categoryId: 'educacao', 
    isBudgetable: true,
    defaultSubcategoryWeights: {
      'E & F - Inglês': 20,
      'E & F - Cursos presenciais': 20,
      'E & F - MBA': 20,
      'E & F - Cursos online': 15,
      'E & F - Livros': 15,
      'E & F - Certificações': 10,
    },
  },
  { 
    code: 'L', 
    name: 'Lazer', 
    categoryId: 'lazer', 
    isBudgetable: true,
    defaultSubcategoryWeights: {
      'L - Restaurantes': 25,
      'L - Viagem Nacional': 20,
      'L - Pequenas Viagens': 15,
      'L - Shows': 10,
      'L - Cinema/teatro': 10,
      'L - Baladas': 10,
      'L - Eventos em casa': 10,
    },
  },
  { 
    code: 'R & E', 
    name: 'Roupas & Estética', 
    categoryId: 'roupa-estetica', 
    isBudgetable: true,
    defaultSubcategoryWeights: {
      'R & E - Roupas': 35,
      'R & E - Calçados': 20,
      'R & E - Cabeleireiro': 15,
      'R & E - Manicure': 10,
      'R & E - Perfume': 10,
      'R & E - Acessórios': 10,
    },
  },
  { 
    code: 'F', 
    name: 'Filhos', 
    categoryId: 'filhos', 
    isBudgetable: true,
    conditionalOn: 'has_dependents',
    defaultSubcategoryWeights: {
      'F - Escola': 20,
      'F - Alimentação': 16,
      'F - Atividades Extras': 10,
      'F - Plano de Saúde': 9,
      'F - Medicamentos e Vacinas': 6,
      'F - Material Escolar': 5,
      'F - Médico': 5,
      'F - Passeios': 5,
      'F - Roupas e Acessórios': 7,
      'F - Brinquedos': 4,
      'F - Dentista': 3,
      'F - Calçados': 3,
      'F - Cabeleleiro': 2,
      'F - Festas': 2,
      'F - Presentes para Amigos': 3,
    },
  },
  { 
    code: 'PET', 
    name: 'Pets', 
    categoryId: 'pet', 
    isBudgetable: true,
    conditionalOn: 'has_pets',
    defaultSubcategoryWeights: {
      'PET - Alimentação': 35,
      'PET - Médico Veterinário': 15,
      'PET - Plano de Saúde': 10,
      'PET - Medicamentos e Vacinas': 10,
      'PET - Banho e Tosa': 10,
      'PET - Hotel': 8,
      'PET - Brinquedos': 5,
      'PET - Roupas e Acessórios': 4,
      'PET - Dentista': 3,
    },
  },
  { 
    code: 'DF', 
    name: 'Despesas Financeiras', 
    categoryId: 'despesas-financeiras', 
    isBudgetable: true,
    defaultSubcategoryWeights: {
      'DF - Juros': 25,
      'DF - Parcelamento do cartão': 20,
      'DF - Empréstimos diversos ': 15,
      'DF - Anuidade Cartão': 10,
      'DF - Outras': 12,
      'DF - Manutenção de Conta': 8,
      'DF - IOF': 5,
      'DF - TED': 5,
    },
  },
  { 
    code: 'DIV', 
    name: 'Diversos', 
    categoryId: 'diversos', 
    isBudgetable: true,
    defaultSubcategoryWeights: {
      'DIV - Despesas Profissionais': 25,
      'DIV - Consultoria Pontual ': 15,
      'DIV - Equipamentos Eletrônicos': 15,
      'DIV - Presentes para família': 15,
      'DIV - Presentes para festas (casamentos, 15 anos)': 10,
      'DIV - Doações': 10,
      'DIV - Renovação de Documentos': 10,
    },
  },
  { 
    code: 'E', 
    name: 'Despesas Eventuais', 
    categoryId: 'despesas-eventuais', 
    isBudgetable: true,
    defaultSubcategoryWeights: {
      'E - Grandes viagens (férias)': 24,
      'E - Reformas': 18,
      'E - Compra/troca de veículos': 15,
      'E - Compra/troca de Imóveis ': 15,
      'E - Festas (aniversário, bodas, 15 anos,...)': 10,
      'E - Joias, bolsas, relógios': 9,
      'E - Consultorias eventuais': 5,
      'E - Grandes presentes / doações': 4,
    },
  },
  { 
    code: 'IF', 
    name: 'Reserva / Investimentos', 
    categoryId: 'investimentos', 
    isBudgetable: true,
    defaultSubcategoryWeights: {
      '(+/-) IF - CDB': 30,
      '(+/-) IF - Tesouro Direto': 25,
      '(+/-) IF - Fundos de Investimento': 20,
      '(+/-) IF - Ações': 15,
      '(+/-) IF - Poupança': 10,
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
