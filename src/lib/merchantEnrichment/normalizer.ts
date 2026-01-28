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
export const KNOWN_PLATFORMS: Record<string, { pattern: RegExp; platform: string; isIntermediary: boolean }> = {
  // Payment gateways (intermediaries)
  MERCADOPAGO: { pattern: /MERCADO\s*PAGO|MERCADOPAGO|MP\s*\*/i, platform: 'MERCADOPAGO', isIntermediary: true },
  MERCADOLIVRE: { pattern: /MERCADO\s*LIVRE|MERCADOLIVRE|ML\s*\*/i, platform: 'MERCADOLIVRE', isIntermediary: true },
  PAGSEGURO: { pattern: /PAGSEGURO|PAG\s*SEGURO|UOLPAG/i, platform: 'PAGSEGURO', isIntermediary: true },
  PAYPAL: { pattern: /PAYPAL/i, platform: 'PAYPAL', isIntermediary: true },
  PICPAY: { pattern: /PICPAY/i, platform: 'PICPAY', isIntermediary: true },
  STONE: { pattern: /\bSTONE\b/i, platform: 'STONE', isIntermediary: true },
  CIELO: { pattern: /\bCIELO\b/i, platform: 'CIELO', isIntermediary: true },
  GETNET: { pattern: /\bGETNET\b/i, platform: 'GETNET', isIntermediary: true },
  REDE: { pattern: /\bREDE\b(?!\s*CELULAR)/i, platform: 'REDE', isIntermediary: true },
  
  // Digital courses (intermediaries)
  HOTMART: { pattern: /HOTMART/i, platform: 'HOTMART', isIntermediary: true },
  EDUZZ: { pattern: /EDUZZ/i, platform: 'EDUZZ', isIntermediary: true },
  MONETIZZE: { pattern: /MONETIZZE/i, platform: 'MONETIZZE', isIntermediary: true },
  KIWIFY: { pattern: /KIWIFY/i, platform: 'KIWIFY', isIntermediary: true },
  
  // Transport (not intermediaries)
  UBER: { pattern: /\bUBER\b/i, platform: 'UBER', isIntermediary: false },
  UBER_EATS: { pattern: /UBER\s*EATS/i, platform: 'UBER_EATS', isIntermediary: false },
  NINETYNINE: { pattern: /\b99\b|99\s*APP|99\s*POP|99\s*TAXI/i, platform: '99', isIntermediary: false },
  CABIFY: { pattern: /CABIFY/i, platform: 'CABIFY', isIntermediary: false },
  
  // Food delivery
  IFOOD: { pattern: /IFOOD|I\s*FOOD/i, platform: 'IFOOD', isIntermediary: true },
  RAPPI: { pattern: /RAPPI/i, platform: 'RAPPI', isIntermediary: true },
  ZEDELIVERY: { pattern: /ZE\s*DELIVERY|ZDELIVERY/i, platform: 'ZEDELIVERY', isIntermediary: false },
  
  // Streaming
  NETFLIX: { pattern: /NETFLIX/i, platform: 'NETFLIX', isIntermediary: false },
  SPOTIFY: { pattern: /SPOTIFY/i, platform: 'SPOTIFY', isIntermediary: false },
  AMAZON_PRIME: { pattern: /AMAZON\s*PRIME|PRIME\s*VIDEO|PRIMEVIDEO/i, platform: 'AMAZON_PRIME', isIntermediary: false },
  DISNEY: { pattern: /DISNEY\s*+|DISNEY\s*PLUS|DISNEYPLUS/i, platform: 'DISNEY', isIntermediary: false },
  HBO: { pattern: /HBO\s*MAX|HBOMAX|\bMAX\b/i, platform: 'HBO', isIntermediary: false },
  GLOBOPLAY: { pattern: /GLOBOPLAY|GLOBO\s*PLAY/i, platform: 'GLOBOPLAY', isIntermediary: false },
  DEEZER: { pattern: /DEEZER/i, platform: 'DEEZER', isIntermediary: false },
  YOUTUBE: { pattern: /YOUTUBE|YOU\s*TUBE/i, platform: 'YOUTUBE', isIntermediary: false },
  
  // E-commerce
  AMAZON: { pattern: /\bAMAZON\b(?!\s*PRIME)/i, platform: 'AMAZON', isIntermediary: true },
  SHOPEE: { pattern: /SHOPEE/i, platform: 'SHOPEE', isIntermediary: true },
  ALIEXPRESS: { pattern: /ALIEXPRESS|ALI\s*EXPRESS/i, platform: 'ALIEXPRESS', isIntermediary: true },
  MAGALU: { pattern: /MAGALU|MAGAZINE\s*LUIZA/i, platform: 'MAGALU', isIntermediary: true },
  AMERICANAS: { pattern: /AMERICANAS/i, platform: 'AMERICANAS', isIntermediary: true },
  SHEIN: { pattern: /\bSHEIN\b/i, platform: 'SHEIN', isIntermediary: false },
  
  // Gas stations
  SHELL: { pattern: /\bSHELL\b/i, platform: 'SHELL', isIntermediary: false },
  IPIRANGA: { pattern: /IPIRANGA/i, platform: 'IPIRANGA', isIntermediary: false },
  PETROBRAS: { pattern: /PETROBRAS|BR\s*DISTRIBUIDORA/i, platform: 'PETROBRAS', isIntermediary: false },
  
  // Pharmacies
  DROGASIL: { pattern: /DROGASIL/i, platform: 'DROGASIL', isIntermediary: false },
  DROGARAIA: { pattern: /DROGA\s*RAIA|DROGARAIA/i, platform: 'DROGARAIA', isIntermediary: false },
  PANVEL: { pattern: /PANVEL/i, platform: 'PANVEL', isIntermediary: false },
  
  // Supermarkets
  CARREFOUR: { pattern: /CARREFOUR/i, platform: 'CARREFOUR', isIntermediary: false },
  PAODEACUCAR: { pattern: /PAO\s*DE\s*ACUCAR|P[ÃA]O\s*DE\s*A[CÇ]UCAR/i, platform: 'PAODEACUCAR', isIntermediary: false },
  ASSAI: { pattern: /ASSAI|ASSA[IÍ]/i, platform: 'ASSAI', isIntermediary: false },
  ATACADAO: { pattern: /ATACADAO|ATACAD[ÃA]O/i, platform: 'ATACADAO', isIntermediary: false },
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
