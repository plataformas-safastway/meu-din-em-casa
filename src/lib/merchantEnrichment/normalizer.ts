/**
 * Merchant Descriptor Normalizer
 * Cleans and normalizes transaction descriptors for matching
 */

// Noise tokens to remove (common in bank statements)
const NOISE_TOKENS = new Set([
  // Payment-related
  'PGTO', 'PAGTO', 'PAG', 'COMPRA', 'DEBITO', 'DEB', 'CREDITO', 'CRED',
  'PARCELADO', 'PARC', 'PARCELA', 'AVISTA', 'A VISTA',
  // Technical
  'POS', 'CARD', 'CARTAO', 'CC', 'CD', 'TERMINAL', 'TID', 'NSU',
  'DOC', 'TED', 'PIX', 'BOLETO', 'TRANSF', 'TRANSFERENCIA',
  // Location
  'BR', 'BRA', 'BRASIL', 'SP', 'RJ', 'MG', 'RS', 'PR', 'SC', 'BA', 'PE',
  'DF', 'GO', 'CE', 'PA', 'MA', 'PB', 'RN', 'PI', 'SE', 'AL', 'AM', 'MT',
  'MS', 'ES', 'RO', 'AC', 'AP', 'RR', 'TO',
  // Generic
  'LTDA', 'ME', 'EIRELI', 'EPP', 'SA', 'SS', 'CIA', 'COMERCIO', 'COM',
  'SERVICOS', 'SERV', 'LOJA', 'FILIAL', 'MATRIZ',
  // Date-like
  'JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ',
  // Numbers that are often codes
  'FATURA', 'FAT', 'REF', 'REFERENTE', 'NF', 'NFE', 'NOTA',
]);

// Known platform patterns (for detection)
export const KNOWN_PLATFORMS: Record<string, { pattern: RegExp; platform: string; isIntermediary: boolean; categoryHint?: string; subcategoryHint?: string }> = {
  // ============ PAYMENT GATEWAYS (intermediaries - low confidence) ============
  MERCADOPAGO: { pattern: /MERCADO\s*PAGO|MERCADOPAGO|MP\s*\*/i, platform: 'MERCADOPAGO', isIntermediary: true },
  MERCADOLIVRE: { pattern: /MERCADO\s*LIVRE|MERCADOLIVRE|ML\s*\*/i, platform: 'MERCADOLIVRE', isIntermediary: true },
  PAGSEGURO: { pattern: /PAGSEGURO|PAG\s*SEGURO|UOLPAG/i, platform: 'PAGSEGURO', isIntermediary: true },
  PAYPAL: { pattern: /PAYPAL/i, platform: 'PAYPAL', isIntermediary: true },
  PICPAY: { pattern: /PICPAY/i, platform: 'PICPAY', isIntermediary: true },
  STONE: { pattern: /\bSTONE\b/i, platform: 'STONE', isIntermediary: true },
  CIELO: { pattern: /\bCIELO\b/i, platform: 'CIELO', isIntermediary: true },
  GETNET: { pattern: /\bGETNET\b/i, platform: 'GETNET', isIntermediary: true },
  REDE: { pattern: /\bREDE\b(?!\s*CELULAR)/i, platform: 'REDE', isIntermediary: true },
  
  // ============ INFOPRODUCTS / COURSES (intermediaries) ============
  HOTMART: { pattern: /HOTMART/i, platform: 'HOTMART', isIntermediary: true, categoryHint: 'educacao', subcategoryHint: 'educacao-cursos-online' },
  EDUZZ: { pattern: /EDUZZ/i, platform: 'EDUZZ', isIntermediary: true, categoryHint: 'educacao', subcategoryHint: 'educacao-cursos-online' },
  MONETIZZE: { pattern: /MONETIZZE/i, platform: 'MONETIZZE', isIntermediary: true, categoryHint: 'educacao', subcategoryHint: 'educacao-cursos-online' },
  KIWIFY: { pattern: /KIWIFY/i, platform: 'KIWIFY', isIntermediary: true, categoryHint: 'educacao', subcategoryHint: 'educacao-cursos-online' },
  BRAIP: { pattern: /BRAIP/i, platform: 'BRAIP', isIntermediary: true, categoryHint: 'educacao', subcategoryHint: 'educacao-cursos-online' },
  TICTO: { pattern: /TICTO/i, platform: 'TICTO', isIntermediary: true, categoryHint: 'educacao', subcategoryHint: 'educacao-cursos-online' },
  PERFECTPAY: { pattern: /PERFECTPAY|PERFECT\s*PAY/i, platform: 'PERFECTPAY', isIntermediary: true, categoryHint: 'educacao', subcategoryHint: 'educacao-cursos-online' },
  
  // ============ TRANSPORT (not intermediaries) ============
  UBER: { pattern: /\bUBER\b(?!\s*EATS)/i, platform: 'UBER', isIntermediary: false, categoryHint: 'transporte', subcategoryHint: 'transporte-taxi-uber' },
  UBER_EATS: { pattern: /UBER\s*EATS/i, platform: 'UBER_EATS', isIntermediary: false, categoryHint: 'alimentacao', subcategoryHint: 'alimentacao-delivery' },
  NINETYNINE: { pattern: /\b99\b|99\s*APP|99\s*POP|99\s*TAXI/i, platform: '99', isIntermediary: false, categoryHint: 'transporte', subcategoryHint: 'transporte-taxi-uber' },
  CABIFY: { pattern: /CABIFY/i, platform: 'CABIFY', isIntermediary: false, categoryHint: 'transporte', subcategoryHint: 'transporte-taxi-uber' },
  
  // ============ FOOD DELIVERY ============
  IFOOD: { pattern: /IFOOD|I\s*FOOD/i, platform: 'IFOOD', isIntermediary: true, categoryHint: 'alimentacao', subcategoryHint: 'alimentacao-delivery' },
  RAPPI: { pattern: /RAPPI/i, platform: 'RAPPI', isIntermediary: true, categoryHint: 'alimentacao', subcategoryHint: 'alimentacao-delivery' },
  ZEDELIVERY: { pattern: /ZE\s*DELIVERY|ZDELIVERY/i, platform: 'ZEDELIVERY', isIntermediary: false, categoryHint: 'alimentacao', subcategoryHint: 'alimentacao-delivery' },
  
  // ============ STREAMING ============
  NETFLIX: { pattern: /NETFLIX/i, platform: 'NETFLIX', isIntermediary: false, categoryHint: 'casa', subcategoryHint: 'casa-internet---tv---streamings' },
  SPOTIFY: { pattern: /SPOTIFY/i, platform: 'SPOTIFY', isIntermediary: false, categoryHint: 'casa', subcategoryHint: 'casa-internet---tv---streamings' },
  AMAZON_PRIME: { pattern: /AMAZON\s*PRIME|PRIME\s*VIDEO|PRIMEVIDEO/i, platform: 'AMAZON_PRIME', isIntermediary: false, categoryHint: 'casa', subcategoryHint: 'casa-internet---tv---streamings' },
  DISNEY: { pattern: /DISNEY\s*\+|DISNEY\s*PLUS|DISNEYPLUS/i, platform: 'DISNEY', isIntermediary: false, categoryHint: 'casa', subcategoryHint: 'casa-internet---tv---streamings' },
  HBO: { pattern: /HBO\s*MAX|HBOMAX|\bHBO\b/i, platform: 'HBO', isIntermediary: false, categoryHint: 'casa', subcategoryHint: 'casa-internet---tv---streamings' },
  GLOBOPLAY: { pattern: /GLOBOPLAY|GLOBO\s*PLAY/i, platform: 'GLOBOPLAY', isIntermediary: false, categoryHint: 'casa', subcategoryHint: 'casa-internet---tv---streamings' },
  DEEZER: { pattern: /DEEZER/i, platform: 'DEEZER', isIntermediary: false, categoryHint: 'casa', subcategoryHint: 'casa-internet---tv---streamings' },
  YOUTUBE: { pattern: /YOUTUBE|YOU\s*TUBE/i, platform: 'YOUTUBE', isIntermediary: false, categoryHint: 'casa', subcategoryHint: 'casa-internet---tv---streamings' },
  
  // ============ APPLE/GOOGLE SUBSCRIPTIONS ============
  APPLE: { pattern: /APPLE\.COM\/BILL|APPLE\s*STORE|ITUNES/i, platform: 'APPLE', isIntermediary: true, categoryHint: 'casa', subcategoryHint: 'casa-internet---tv---streamings' },
  GOOGLE_PLAY: { pattern: /GOOGLE\s*\*|GOOGLE\s*PLAY|GOOGLE\s*SERVICOS/i, platform: 'GOOGLE', isIntermediary: true, categoryHint: 'casa', subcategoryHint: 'casa-internet---tv---streamings' },
  
  // ============ E-COMMERCE (marketplaces - intermediaries) ============
  AMAZON: { pattern: /\bAMAZON\b(?!\s*PRIME)/i, platform: 'AMAZON', isIntermediary: true },
  SHOPEE: { pattern: /SHOPEE/i, platform: 'SHOPEE', isIntermediary: true },
  ALIEXPRESS: { pattern: /ALIEXPRESS|ALI\s*EXPRESS/i, platform: 'ALIEXPRESS', isIntermediary: true },
  MAGALU: { pattern: /MAGALU|MAGAZINE\s*LUIZA/i, platform: 'MAGALU', isIntermediary: true },
  AMERICANAS: { pattern: /AMERICANAS/i, platform: 'AMERICANAS', isIntermediary: true },
  SHEIN: { pattern: /\bSHEIN\b/i, platform: 'SHEIN', isIntermediary: false, categoryHint: 'roupa-estetica', subcategoryHint: 'roupa-estetica-roupas' },
  
  // ============ UTILITIES - ELECTRICITY ============
  ENEL: { pattern: /ENEL/i, platform: 'ENEL', isIntermediary: false, categoryHint: 'casa', subcategoryHint: 'casa-energia-eletrica' },
  CPFL: { pattern: /CPFL/i, platform: 'CPFL', isIntermediary: false, categoryHint: 'casa', subcategoryHint: 'casa-energia-eletrica' },
  CEMIG: { pattern: /CEMIG/i, platform: 'CEMIG', isIntermediary: false, categoryHint: 'casa', subcategoryHint: 'casa-energia-eletrica' },
  LIGHT: { pattern: /\bLIGHT\b/i, platform: 'LIGHT', isIntermediary: false, categoryHint: 'casa', subcategoryHint: 'casa-energia-eletrica' },
  EQUATORIAL: { pattern: /EQUATORIAL/i, platform: 'EQUATORIAL', isIntermediary: false, categoryHint: 'casa', subcategoryHint: 'casa-energia-eletrica' },
  COELBA: { pattern: /COELBA/i, platform: 'COELBA', isIntermediary: false, categoryHint: 'casa', subcategoryHint: 'casa-energia-eletrica' },
  COPEL: { pattern: /COPEL/i, platform: 'COPEL', isIntermediary: false, categoryHint: 'casa', subcategoryHint: 'casa-energia-eletrica' },
  CELESC: { pattern: /CELESC/i, platform: 'CELESC', isIntermediary: false, categoryHint: 'casa', subcategoryHint: 'casa-energia-eletrica' },
  
  // ============ UTILITIES - WATER ============
  SABESP: { pattern: /SABESP/i, platform: 'SABESP', isIntermediary: false, categoryHint: 'casa', subcategoryHint: 'casa-agua' },
  COPASA: { pattern: /COPASA/i, platform: 'COPASA', isIntermediary: false, categoryHint: 'casa', subcategoryHint: 'casa-agua' },
  SANEPAR: { pattern: /SANEPAR/i, platform: 'SANEPAR', isIntermediary: false, categoryHint: 'casa', subcategoryHint: 'casa-agua' },
  CEDAE: { pattern: /CEDAE/i, platform: 'CEDAE', isIntermediary: false, categoryHint: 'casa', subcategoryHint: 'casa-agua' },
  AGUAS: { pattern: /AGUAS\s*DE|AGUAS\s*E/i, platform: 'AGUAS', isIntermediary: false, categoryHint: 'casa', subcategoryHint: 'casa-agua' },
  EMBASA: { pattern: /EMBASA/i, platform: 'EMBASA', isIntermediary: false, categoryHint: 'casa', subcategoryHint: 'casa-agua' },
  
  // ============ TELECOM ============
  VIVO: { pattern: /\bVIVO\b/i, platform: 'VIVO', isIntermediary: false, categoryHint: 'casa', subcategoryHint: 'casa-telefone-celular' },
  CLARO: { pattern: /\bCLARO\b/i, platform: 'CLARO', isIntermediary: false, categoryHint: 'casa', subcategoryHint: 'casa-telefone-celular' },
  TIM: { pattern: /\bTIM\b/i, platform: 'TIM', isIntermediary: false, categoryHint: 'casa', subcategoryHint: 'casa-telefone-celular' },
  OI: { pattern: /\bOI\b(?!\s*FIXO)/i, platform: 'OI', isIntermediary: false, categoryHint: 'casa', subcategoryHint: 'casa-telefone-celular' },
  
  // ============ TOLL/PARKING TAGS ============
  SEMPARAR: { pattern: /SEM\s*PARAR|SEMPARAR/i, platform: 'SEMPARAR', isIntermediary: false, categoryHint: 'transporte', subcategoryHint: 'transporte-estacionamento' },
  CONECTCAR: { pattern: /CONECTCAR|CONECT\s*CAR/i, platform: 'CONECTCAR', isIntermediary: false, categoryHint: 'transporte', subcategoryHint: 'transporte-estacionamento' },
  VELOE: { pattern: /VELOE/i, platform: 'VELOE', isIntermediary: false, categoryHint: 'transporte', subcategoryHint: 'transporte-estacionamento' },
  
  // ============ GAS STATIONS ============
  SHELL: { pattern: /\bSHELL\b/i, platform: 'SHELL', isIntermediary: false, categoryHint: 'transporte', subcategoryHint: 'transporte-combustivel' },
  IPIRANGA: { pattern: /IPIRANGA/i, platform: 'IPIRANGA', isIntermediary: false, categoryHint: 'transporte', subcategoryHint: 'transporte-combustivel' },
  PETROBRAS: { pattern: /PETROBRAS|BR\s*DISTRIBUIDORA/i, platform: 'PETROBRAS', isIntermediary: false, categoryHint: 'transporte', subcategoryHint: 'transporte-combustivel' },
  
  // ============ PHARMACIES ============
  DROGASIL: { pattern: /DROGASIL/i, platform: 'DROGASIL', isIntermediary: false, categoryHint: 'vida-saude', subcategoryHint: 'vida-saude-medicamentos' },
  DROGARAIA: { pattern: /DROGA\s*RAIA|DROGARAIA/i, platform: 'DROGARAIA', isIntermediary: false, categoryHint: 'vida-saude', subcategoryHint: 'vida-saude-medicamentos' },
  PANVEL: { pattern: /PANVEL/i, platform: 'PANVEL', isIntermediary: false, categoryHint: 'vida-saude', subcategoryHint: 'vida-saude-medicamentos' },
  PACHECO: { pattern: /PACHECO/i, platform: 'PACHECO', isIntermediary: false, categoryHint: 'vida-saude', subcategoryHint: 'vida-saude-medicamentos' },
  
  // ============ SUPERMARKETS ============
  CARREFOUR: { pattern: /CARREFOUR/i, platform: 'CARREFOUR', isIntermediary: false, categoryHint: 'alimentacao', subcategoryHint: 'alimentacao-supermercado' },
  PAODEACUCAR: { pattern: /PAO\s*DE\s*ACUCAR|P[ÃA]O\s*DE\s*A[CÇ]UCAR/i, platform: 'PAODEACUCAR', isIntermediary: false, categoryHint: 'alimentacao', subcategoryHint: 'alimentacao-supermercado' },
  ASSAI: { pattern: /ASSAI|ASSA[IÍ]/i, platform: 'ASSAI', isIntermediary: false, categoryHint: 'alimentacao', subcategoryHint: 'alimentacao-supermercado' },
  ATACADAO: { pattern: /ATACADAO|ATACAD[ÃA]O/i, platform: 'ATACADAO', isIntermediary: false, categoryHint: 'alimentacao', subcategoryHint: 'alimentacao-supermercado' },
  EXTRA: { pattern: /\bEXTRA\b/i, platform: 'EXTRA', isIntermediary: false, categoryHint: 'alimentacao', subcategoryHint: 'alimentacao-supermercado' },
  
  // ============ ADS / PROFESSIONAL EXPENSES ============
  META_ADS: { pattern: /META\s*\*|FACEBOOK\s*\*|FB\s*\*/i, platform: 'META', isIntermediary: false, categoryHint: 'diversos', subcategoryHint: 'diversos-despesas-profissionais' },
  INSTAGRAM_ADS: { pattern: /INSTAGRAM\s*\*/i, platform: 'INSTAGRAM', isIntermediary: false, categoryHint: 'diversos', subcategoryHint: 'diversos-despesas-profissionais' },
  GOOGLE_ADS: { pattern: /GOOGLE\s*ADS|ADWORDS/i, platform: 'GOOGLE_ADS', isIntermediary: false, categoryHint: 'diversos', subcategoryHint: 'diversos-despesas-profissionais' },
};

// CNPJ regex pattern
const CNPJ_PATTERN = /\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/;

// CPF regex pattern
const CPF_PATTERN = /\d{3}\.?\d{3}\.?\d{3}-?\d{2}/;

// Email pattern
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

// Domain pattern (without full URL)
const DOMAIN_PATTERN = /(?:www\.)?([a-zA-Z0-9-]+(?:\.[a-zA-Z]{2,})+)/;

// PIX key patterns
const PIX_KEY_PATTERNS = {
  phone: /^\+?55?\d{10,11}$/,
  email: EMAIL_PATTERN,
  cpf: CPF_PATTERN,
  cnpj: CNPJ_PATTERN,
  random: /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i,
};

export interface DetectedEntities {
  cnpj?: string;
  cpf?: string;
  email?: string;
  domain?: string;
  pixKey?: string;
  platform?: string;
  isIntermediary?: boolean;
  mcc?: string;
}

export interface NormalizedDescriptor {
  original: string;
  normalized: string;
  normalizedKey: string; // For database matching
  tokens: string[];
  entities: DetectedEntities;
}

/**
 * Normalize a descriptor for matching purposes
 */
export function normalizeDescriptor(rawDescriptor: string): NormalizedDescriptor {
  const original = rawDescriptor;
  
  // Step 1: Uppercase and basic cleanup
  let text = rawDescriptor.toUpperCase().trim();
  
  // Step 2: Extract entities before cleaning
  const entities: DetectedEntities = {};
  
  // Extract CNPJ
  const cnpjMatch = text.match(CNPJ_PATTERN);
  if (cnpjMatch) {
    entities.cnpj = cnpjMatch[0].replace(/[^\d]/g, '');
  }
  
  // Extract CPF (only if no CNPJ)
  if (!entities.cnpj) {
    const cpfMatch = text.match(CPF_PATTERN);
    if (cpfMatch) {
      entities.cpf = cpfMatch[0].replace(/[^\d]/g, '');
    }
  }
  
  // Extract email
  const emailMatch = text.match(EMAIL_PATTERN);
  if (emailMatch) {
    entities.email = emailMatch[0].toLowerCase();
  }
  
  // Extract domain
  const domainMatch = text.match(DOMAIN_PATTERN);
  if (domainMatch) {
    entities.domain = domainMatch[1].toLowerCase();
  }
  
  // Detect known platforms
  for (const [key, config] of Object.entries(KNOWN_PLATFORMS)) {
    if (config.pattern.test(text)) {
      entities.platform = config.platform;
      entities.isIntermediary = config.isIntermediary;
      break;
    }
  }
  
  // Step 3: Remove dates (DD/MM/YYYY, DD-MM-YYYY, etc.)
  text = text.replace(/\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/g, ' ');
  
  // Remove time patterns (HH:MM, HH:MM:SS)
  text = text.replace(/\d{1,2}:\d{2}(:\d{2})?/g, ' ');
  
  // Remove long number sequences (NSU, terminal IDs, etc.) - keep only if 5+ digits
  text = text.replace(/\b\d{5,}\b/g, ' ');
  
  // Step 4: Remove special characters but keep spaces
  text = text.replace(/[*_\-=+|\\\/\[\]{}()<>!@#$%^&~`'\".,;:]/g, ' ');
  
  // Step 5: Normalize multiple spaces
  text = text.replace(/\s+/g, ' ').trim();
  
  // Step 6: Tokenize and filter noise
  const allTokens = text.split(' ').filter(t => t.length > 0);
  const cleanTokens = allTokens.filter(token => {
    // Remove noise tokens
    if (NOISE_TOKENS.has(token)) return false;
    // Remove very short tokens (1-2 chars) unless they're meaningful
    if (token.length <= 2 && !/^\d+$/.test(token)) return false;
    // Remove pure numbers
    if (/^\d+$/.test(token)) return false;
    return true;
  });
  
  // Step 7: Create normalized string and key
  const normalized = cleanTokens.join(' ');
  
  // Normalized key: lowercase, only alphanumeric, no spaces
  const normalizedKey = cleanTokens
    .map(t => t.toLowerCase())
    .join('')
    .replace(/[^a-z0-9]/g, '');
  
  return {
    original,
    normalized,
    normalizedKey,
    tokens: cleanTokens,
    entities,
  };
}

/**
 * Generate matching keys for fuzzy matching
 * Returns multiple keys to check against merchant_directory
 */
export function generateMatchingKeys(normalized: NormalizedDescriptor): string[] {
  const keys: string[] = [];
  
  // Primary key
  if (normalized.normalizedKey) {
    keys.push(normalized.normalizedKey);
  }
  
  // Platform key (if detected)
  if (normalized.entities.platform) {
    keys.push(normalized.entities.platform.toLowerCase());
  }
  
  // First token (often the merchant name)
  if (normalized.tokens.length > 0) {
    keys.push(normalized.tokens[0].toLowerCase());
  }
  
  // First two tokens combined
  if (normalized.tokens.length >= 2) {
    keys.push((normalized.tokens[0] + normalized.tokens[1]).toLowerCase());
  }
  
  return [...new Set(keys)]; // Remove duplicates
}

/**
 * Check if descriptor looks like a bank fee/charge
 */
export function isBankFeePattern(normalized: NormalizedDescriptor): boolean {
  const feePatterns = [
    /TARIFA/i, /IOF/i, /ANUIDADE/i, /JUROS/i, /MULTA/i,
    /TED/i, /DOC/i, /MANUTENCAO/i, /TAXA/i, /COBRANCA/i,
  ];
  
  return feePatterns.some(p => p.test(normalized.normalized));
}

/**
 * Detect if the descriptor might be a PIX transaction
 */
export function detectPixInfo(descriptor: string): { isPix: boolean; pixKey?: string } {
  const upper = descriptor.toUpperCase();
  const isPix = /PIX|CHAVE\s*PIX/.test(upper);
  
  if (!isPix) return { isPix: false };
  
  // Try to extract PIX key
  for (const [keyType, pattern] of Object.entries(PIX_KEY_PATTERNS)) {
    const match = descriptor.match(pattern);
    if (match) {
      return { isPix: true, pixKey: match[0] };
    }
  }
  
  return { isPix: true };
}
