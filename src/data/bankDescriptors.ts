/**
 * Bank Descriptor Dictionary for Category Suggestion
 * 
 * Maps common bank transaction patterns to default categories.
 * Used as Rule 2 (fallback) when no user history match is found.
 */

import { TransactionClassification } from "@/types/finance";

export interface DescriptorRule {
  // Pattern to match (case-insensitive)
  patterns: (string | RegExp)[];
  // Suggested category
  categoryId: string;
  // Suggested subcategory (optional)
  subcategoryId?: string;
  // Classification hint
  classification: TransactionClassification;
  // Confidence score (0-1) - lower for generic patterns
  confidence: number;
  // Description for debugging
  description: string;
}

export const bankDescriptorRules: DescriptorRule[] = [
  // ============ FINANCIAL FEES & CHARGES ============
  {
    patterns: ['IOF', /\bIOF\b/],
    categoryId: 'despesas-financeiras',
    subcategoryId: 'despesas-financeiras-iof',
    classification: 'expense',
    confidence: 0.95,
    description: 'IOF - Imposto sobre Operações Financeiras',
  },
  {
    patterns: ['TARIFA', 'TAR ', 'TAXA', 'MANUTENCAO CONTA', 'MANUT CONTA', 'PACOTE SERVICOS'],
    categoryId: 'despesas-financeiras',
    subcategoryId: 'despesas-financeiras-manutencao-de-conta',
    classification: 'expense',
    confidence: 0.9,
    description: 'Tarifas bancárias',
  },
  {
    patterns: ['JUROS', 'JUR ', 'ENCARGO', 'ENC ', 'MORA', 'MULTA ATRASO'],
    categoryId: 'despesas-financeiras',
    subcategoryId: 'despesas-financeiras-juros',
    classification: 'expense',
    confidence: 0.9,
    description: 'Juros e encargos',
  },
  {
    patterns: ['ANUIDADE', 'ANUIDADE CARTAO', 'MENSALIDADE CARTAO'],
    categoryId: 'despesas-financeiras',
    subcategoryId: 'despesas-financeiras-anuidade-cartao',
    classification: 'expense',
    confidence: 0.95,
    description: 'Anuidade de cartão',
  },
  {
    patterns: ['TED', 'DOC'],
    categoryId: 'despesas-financeiras',
    subcategoryId: 'despesas-financeiras-ted',
    classification: 'transfer',
    confidence: 0.5, // Low confidence - could be many things
    description: 'Transferências TED/DOC',
  },

  // ============ CREDIT CARD DESCRIPTORS ============
  {
    patterns: ['GASTO C CRED', 'COMPRA CREDITO', 'PAGAMENTO FATURA', 'PAG FATURA', 'FATURA CARTAO'],
    categoryId: 'despesas-financeiras',
    subcategoryId: 'despesas-financeiras-parcelamento-do-cartao',
    classification: 'expense',
    confidence: 0.7,
    description: 'Pagamento de fatura de cartão',
  },

  // ============ INVESTMENTS ============
  {
    patterns: ['RESGATE', 'RESG ', 'RESGATE CDB', 'RESGATE POUP', 'RESGATE FUNDO', 'RESGATE LCI', 'RESGATE LCA'],
    categoryId: 'rendas',
    subcategoryId: 'rendas-investimentos',
    classification: 'income',
    confidence: 0.8,
    description: 'Resgate de investimento',
  },
  {
    patterns: ['APLICACAO', 'APLIC ', 'APLIC CDB', 'APLIC POUP', 'APLIC FUNDO', 'APLIC LCI', 'APLIC LCA', 'INVESTIMENTO'],
    categoryId: 'objetivos',
    classification: 'transfer', // Moving money to investment
    confidence: 0.75,
    description: 'Aplicação em investimento',
  },
  {
    patterns: ['RENDIMENTO', 'REND ', 'REND POUP', 'REND CDB', 'REND FUNDO', 'DIVIDENDO', 'JCP', 'JSCP', 'PROVENTOS'],
    categoryId: 'rendas',
    subcategoryId: 'rendas-investimentos',
    classification: 'income',
    confidence: 0.9,
    description: 'Rendimentos de investimento',
  },

  // ============ PIX PATTERNS ============
  {
    patterns: ['PIX RECEBIDO', 'PIX REC', 'RECEBIDO PIX'],
    categoryId: 'rendas',
    classification: 'income',
    confidence: 0.4, // Very low - needs context
    description: 'PIX recebido',
  },
  {
    patterns: ['PIX ENVIADO', 'PIX ENV', 'ENVIADO PIX', 'PIX TRANSF'],
    categoryId: 'diversos',
    classification: 'expense',
    confidence: 0.3, // Very low - needs context
    description: 'PIX enviado',
  },

  // ============ SALARY & INCOME ============
  {
    patterns: ['SALARIO', 'SAL ', 'FOLHA', 'PRO LABORE', 'PROLABORE', 'REMUNERACAO'],
    categoryId: 'rendas',
    subcategoryId: 'rendas-remuneracao-pro-labore',
    classification: 'income',
    confidence: 0.95,
    description: 'Salário/Remuneração',
  },
  {
    patterns: ['13 SALARIO', 'DECIMO TERCEIRO', '13O SALARIO'],
    categoryId: 'rendas',
    subcategoryId: 'rendas-remuneracao-pro-labore',
    classification: 'income',
    confidence: 0.95,
    description: '13º salário',
  },
  {
    patterns: ['FERIAS', 'ADIANTAMENTO FERIAS'],
    categoryId: 'rendas',
    subcategoryId: 'rendas-remuneracao-pro-labore',
    classification: 'income',
    confidence: 0.9,
    description: 'Férias',
  },
  {
    patterns: ['VALE ALIM', 'VA ', 'VR ', 'VALE REFEICAO', 'VALE TRANSP', 'VT '],
    categoryId: 'rendas',
    subcategoryId: 'rendas-vale-alimentacao',
    classification: 'income',
    confidence: 0.85,
    description: 'Vale alimentação/transporte',
  },
  {
    patterns: ['INSS', 'FGTS'],
    categoryId: 'vida-saude',
    subcategoryId: 'vida-saude-plano-de-saude',
    classification: 'expense',
    confidence: 0.7,
    description: 'INSS/FGTS',
  },
  {
    patterns: ['IRRF', 'IR RETIDO', 'IMPOSTO RENDA'],
    categoryId: 'despesas-financeiras',
    subcategoryId: 'despesas-financeiras-outras',
    classification: 'expense',
    confidence: 0.85,
    description: 'Imposto de renda',
  },

  // ============ UTILITIES ============
  {
    patterns: ['ENERGIA', 'ELETRIC', 'CEMIG', 'ENEL', 'CPFL', 'LIGHT', 'COELBA', 'COPEL', 'CELESC'],
    categoryId: 'casa',
    subcategoryId: 'casa-energia-eletrica',
    classification: 'expense',
    confidence: 0.95,
    description: 'Energia elétrica',
  },
  {
    patterns: ['AGUA', 'SANEPAR', 'SABESP', 'COPASA', 'CEDAE', 'EMBASA', 'CAGECE', 'COMPESA'],
    categoryId: 'casa',
    subcategoryId: 'casa-agua',
    classification: 'expense',
    confidence: 0.95,
    description: 'Água e saneamento',
  },
  {
    patterns: ['GAS ', 'COMGAS', 'ULTRAGAZ', 'SUPERGASBRAS', 'NACIONAL GAS', 'LIQUIGAS'],
    categoryId: 'casa',
    classification: 'expense',
    confidence: 0.85,
    description: 'Gás',
  },
  {
    patterns: ['INTERNET', 'NET ', 'VIVO FIXO', 'CLARO TV', 'OI FIXO', 'TIM FIXO', 'SKY', 'NETFLIX', 'SPOTIFY', 'DISNEY', 'HBO', 'AMAZON PRIME', 'GLOBOPLAY', 'DEEZER', 'YOUTUBE PREMIUM'],
    categoryId: 'casa',
    subcategoryId: 'casa-internet---tv---streamings',
    classification: 'expense',
    confidence: 0.9,
    description: 'Internet, TV e streaming',
  },
  {
    patterns: ['CELULAR', 'VIVO', 'CLARO', 'TIM', 'OI MOVEL'],
    categoryId: 'casa',
    subcategoryId: 'casa-telefone-celular',
    classification: 'expense',
    confidence: 0.85,
    description: 'Telefone celular',
  },
  {
    patterns: ['CONDOMINIO', 'COND '],
    categoryId: 'casa',
    subcategoryId: 'casa-condominio',
    classification: 'expense',
    confidence: 0.95,
    description: 'Condomínio',
  },
  {
    patterns: ['IPTU'],
    categoryId: 'casa',
    subcategoryId: 'casa-iptu',
    classification: 'expense',
    confidence: 0.95,
    description: 'IPTU',
  },
  {
    patterns: ['ALUGUEL', 'LOCACAO'],
    categoryId: 'casa',
    classification: 'expense',
    confidence: 0.8,
    description: 'Aluguel',
  },

  // ============ TRANSPORT ============
  {
    patterns: ['COMBUSTIVEL', 'SHELL', 'IPIRANGA', 'PETROB', 'BR DISTRIBUIDORA', 'POSTO', 'GASOLINA', 'ETANOL', 'DIESEL', 'GNV'],
    categoryId: 'transporte',
    subcategoryId: 'transporte-combustivel',
    classification: 'expense',
    confidence: 0.9,
    description: 'Combustível',
  },
  {
    patterns: ['UBER', '99 ', '99POP', 'CABIFY', 'TAXI', 'MODAL'],
    categoryId: 'transporte',
    subcategoryId: 'transporte-taxi-uber',
    classification: 'expense',
    confidence: 0.95,
    description: 'Taxi/App de transporte',
  },
  {
    patterns: ['ESTACIONAMENTO', 'ESTAPAR', 'PARKING', 'PARK '],
    categoryId: 'transporte',
    subcategoryId: 'transporte-estacionamento',
    classification: 'expense',
    confidence: 0.9,
    description: 'Estacionamento',
  },
  {
    patterns: ['PEDAGIO', 'VELOE', 'AUTOEXPRESSO', 'CONECTCAR', 'SEMPARAR', 'MOVE MAIS', 'TAGGY'],
    categoryId: 'transporte',
    classification: 'expense',
    confidence: 0.9,
    description: 'Pedágio',
  },
  {
    patterns: ['IPVA'],
    categoryId: 'transporte',
    subcategoryId: 'transporte-ipva',
    classification: 'expense',
    confidence: 0.95,
    description: 'IPVA',
  },
  {
    patterns: ['SEGURO VEIC', 'SEGURO AUTO', 'SEGURO CARRO'],
    categoryId: 'transporte',
    subcategoryId: 'transporte-seguro-do-carro',
    classification: 'expense',
    confidence: 0.9,
    description: 'Seguro veicular',
  },

  // ============ FOOD & RESTAURANTS ============
  {
    patterns: ['SUPERMERCADO', 'MERCADO', 'PAO DE ACUCAR', 'CARREFOUR', 'EXTRA', 'ATACADAO', 'ASSAI', 'BIG', 'WALMART', 'SAMS CLUB', 'MAKRO'],
    categoryId: 'alimentacao',
    subcategoryId: 'alimentacao-supermercado',
    classification: 'expense',
    confidence: 0.9,
    description: 'Supermercado',
  },
  {
    patterns: ['IFOOD', 'RAPPI', 'UBER EATS', 'AIQFOME', '99 FOOD', 'DELIVERY'],
    categoryId: 'alimentacao',
    subcategoryId: 'alimentacao-delivery',
    classification: 'expense',
    confidence: 0.95,
    description: 'Delivery de comida',
  },
  {
    patterns: ['RESTAURANTE', 'REST ', 'LANCHONETE', 'HAMBURGUERIA', 'PIZZARIA', 'CHURRASCARIA', 'SUSHI', 'PADARIA', 'CONFEITARIA', 'CAFE ', 'CAFETERIA', 'STARBUCKS', 'OUTBACK', 'MCDONALDS', 'BURGER KING', 'KFC', 'SUBWAY', 'HABIBS', 'BOBS', 'GIRAFFAS'],
    categoryId: 'alimentacao',
    subcategoryId: 'alimentacao-almoco',
    classification: 'expense',
    confidence: 0.85,
    description: 'Restaurantes e lanchonetes',
  },

  // ============ HEALTH ============
  {
    patterns: ['FARMACIA', 'DROGARIA', 'DROGASIL', 'DROGA RAIA', 'PACHECO', 'PANVEL', 'DROGAL', 'PAGUE MENOS', 'ARAUJO', 'DROGAS'],
    categoryId: 'vida-saude',
    subcategoryId: 'vida-saude-medicamentos',
    classification: 'expense',
    confidence: 0.9,
    description: 'Farmácia',
  },
  {
    patterns: ['PLANO SAUDE', 'UNIMED', 'AMIL', 'BRADESCO SAUDE', 'SULAMERICA', 'HAPVIDA', 'NOTRE DAME', 'PREVENT SENIOR', 'CARE PLUS'],
    categoryId: 'vida-saude',
    subcategoryId: 'vida-saude-plano-de-saude',
    classification: 'expense',
    confidence: 0.95,
    description: 'Plano de saúde',
  },
  {
    patterns: ['ACADEMIA', 'SMARTFIT', 'BODYTECH', 'COMPANHIA ATHLETICA', 'BIO RITMO', 'CROSSFIT', 'BLUEFIT'],
    categoryId: 'vida-saude',
    subcategoryId: 'vida-saude-academia',
    classification: 'expense',
    confidence: 0.95,
    description: 'Academia',
  },
  {
    patterns: ['DENTISTA', 'ODONTO', 'SORRIDENTS', 'ODONTOCOMPANY'],
    categoryId: 'vida-saude',
    subcategoryId: 'vida-saude-dentista',
    classification: 'expense',
    confidence: 0.9,
    description: 'Dentista',
  },

  // ============ EDUCATION ============
  {
    patterns: ['ESCOLA', 'COLEGIO', 'FACULDADE', 'UNIVERSIDADE', 'UNIP', 'UNICID', 'ANHANGUERA', 'ESTACIO', 'UNINOVE', 'MACKENZIE', 'PUC', 'FGV', 'INSPER'],
    categoryId: 'educacao',
    subcategoryId: 'educacao-cursos-presenciais',
    classification: 'expense',
    confidence: 0.9,
    description: 'Educação',
  },
  {
    patterns: ['CURSO ONLINE', 'UDEMY', 'COURSERA', 'ALURA', 'ROCKETSEAT', 'HOTMART', 'DOMESTIKA', 'LINKEDIN LEARNING', 'PLURALSIGHT'],
    categoryId: 'educacao',
    subcategoryId: 'educacao-cursos-online',
    classification: 'expense',
    confidence: 0.9,
    description: 'Cursos online',
  },
  {
    patterns: ['LIVRARIA', 'SARAIVA', 'CULTURA', 'AMAZON LIVRO', 'KINDLE'],
    categoryId: 'educacao',
    subcategoryId: 'educacao-livros',
    classification: 'expense',
    confidence: 0.85,
    description: 'Livros',
  },

  // ============ ENTERTAINMENT ============
  {
    patterns: ['CINEMA', 'CINEMARK', 'KINOPLEX', 'UCI', 'CINEPOLIS', 'CINESYSTEM'],
    categoryId: 'lazer',
    subcategoryId: 'lazer-cinema-teatro',
    classification: 'expense',
    confidence: 0.95,
    description: 'Cinema',
  },
  {
    patterns: ['TEATRO', 'SHOW', 'INGRESSO', 'SYMPLA', 'EVENTIM', 'TICKET ', 'TICKETMASTER'],
    categoryId: 'lazer',
    subcategoryId: 'lazer-shows',
    classification: 'expense',
    confidence: 0.85,
    description: 'Shows e eventos',
  },

  // ============ SHOPPING ============
  {
    patterns: ['MAGAZINE LUIZA', 'MAGALU', 'AMERICANAS', 'SUBMARINO', 'AMAZON', 'MERCADO LIVRE', 'SHOPEE', 'ALIEXPRESS', 'SHEIN', 'RENNER', 'C&A', 'RIACHUELO', 'ZARA', 'HERING', 'MARISA'],
    categoryId: 'roupa-estetica',
    subcategoryId: 'roupa-estetica-roupas',
    classification: 'expense',
    confidence: 0.7, // Medium - could be many things
    description: 'Lojas e e-commerce',
  },

  // ============ TRANSFERS (usually neutral) ============
  {
    patterns: ['TRANSFERENCIA', 'TRANSF MESMA TITULARIDADE', 'TRANSF CONTA', 'MOVIMENTACAO INTERNA'],
    categoryId: 'desconhecidas',
    subcategoryId: 'desconhecidas-transferencia-entre-c.c.s-proprias',
    classification: 'transfer',
    confidence: 0.6,
    description: 'Transferências entre contas',
  },

  // ============ CASH OPERATIONS ============
  {
    patterns: ['SAQUE', 'SAQUE ATM', 'SAQUE ELETRONICO', 'SAQUE 24H'],
    categoryId: 'desconhecidas',
    classification: 'transfer',
    confidence: 0.5,
    description: 'Saque em dinheiro',
  },
  {
    patterns: ['DEPOSITO', 'DEP DINHEIRO', 'DEP CHEQUE'],
    categoryId: 'desconhecidas',
    classification: 'transfer',
    confidence: 0.5,
    description: 'Depósito',
  },

  // ============ INSURANCE ============
  {
    patterns: ['SEGURO VIDA', 'SEG VIDA', 'SEGURO RESIDENCIAL', 'SEGURO CASA', 'PORTO SEGURO', 'BRADESCO SEG', 'ITAU SEG', 'SULAMERICA SEG', 'LIBERTY', 'ALLIANZ', 'MAPFRE', 'HDI'],
    categoryId: 'vida-saude',
    subcategoryId: 'vida-saude-seguro-de-vida',
    classification: 'expense',
    confidence: 0.85,
    description: 'Seguros',
  },
];

/**
 * Finds matching descriptor rule for a description
 * Returns null if no confident match found
 */
export function matchBankDescriptor(description: string): DescriptorRule | null {
  if (!description) return null;
  
  const upperDesc = description.toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  
  let bestMatch: DescriptorRule | null = null;
  let bestConfidence = 0;
  
  for (const rule of bankDescriptorRules) {
    for (const pattern of rule.patterns) {
      let matches = false;
      
      if (typeof pattern === 'string') {
        // String pattern - check if description contains it
        const normalizedPattern = pattern.toUpperCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');
        matches = upperDesc.includes(normalizedPattern);
      } else {
        // Regex pattern
        matches = pattern.test(upperDesc);
      }
      
      if (matches && rule.confidence > bestConfidence) {
        bestMatch = rule;
        bestConfidence = rule.confidence;
      }
    }
  }
  
  return bestMatch;
}

/**
 * Gets category suggestion from bank descriptors
 */
export function getSuggestionFromDescriptor(description: string): {
  categoryId: string;
  subcategoryId?: string;
  classification: TransactionClassification;
  confidence: number;
  source: 'descriptor';
} | null {
  const match = matchBankDescriptor(description);
  
  if (!match) return null;
  
  return {
    categoryId: match.categoryId,
    subcategoryId: match.subcategoryId,
    classification: match.classification,
    confidence: match.confidence,
    source: 'descriptor',
  };
}
