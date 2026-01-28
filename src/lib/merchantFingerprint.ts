/**
 * Merchant Fingerprint Generator
 * 
 * Generates stable fingerprints for transaction matching based on
 * normalized descriptors. Used by the category learning system.
 * 
 * Two types of fingerprints:
 * - Strong (F:): High precision, based on known merchant tokens
 * - Weak (W:): Higher coverage, hash of top tokens after cleaning
 */

import { generateDescriptionKey } from './descriptionNormalizer';

// Known strong merchants - high confidence identifiers
const STRONG_MERCHANTS = new Set([
  // Streaming & Entertainment
  'NETFLIX', 'SPOTIFY', 'AMAZON', 'PRIME', 'DISNEY', 'HBO', 'MAX',
  'YOUTUBE', 'APPLE', 'GOOGLE', 'DEEZER', 'GLOBOPLAY', 'PARAMOUNT',
  'CRUNCHYROLL', 'TWITCH', 'STEAM', 'PLAYSTATION', 'XBOX', 'NINTENDO',
  
  // Delivery & Food
  'IFOOD', 'RAPPI', 'UBER', 'UBEREATS', '99', 'ZDELIVERY',
  'MCDONALDS', 'BURGUER', 'BURGER', 'STARBUCKS', 'SUBWAY', 'KFC',
  'PIZZAHUT', 'DOMINOS', 'HABIB', 'OUTBACK', 'MADERO',
  
  // Telecom
  'VIVO', 'TIM', 'CLARO', 'OI', 'NET', 'ALGAR', 'NEXTEL',
  
  // Utilities
  'COPEL', 'CEMIG', 'CPFL', 'ENEL', 'CELESC', 'LIGHT', 'AMPLA',
  'SABESP', 'COPASA', 'SANEPAR', 'COMGAS', 'NATURGY',
  
  // Finance & Insurance
  'NUBANK', 'INTER', 'C6BANK', 'ITAU', 'BRADESCO', 'SANTANDER', 'BB',
  'CAIXA', 'PICPAY', 'MERCADOPAGO', 'PAGSEGURO', 'STONE', 'CIELO',
  'SULAMERICA', 'BRADESCOSEGUROS', 'PORTOSEGURO', 'ALLIANZ', 'AZUL',
  
  // Retail
  'MAGAZINELUIZA', 'MAGALU', 'AMERICANAS', 'CASASBAHIA', 'PONTOFRIO',
  'CARREFOUR', 'EXTRA', 'PAO', 'PAOACUCAR', 'ATACADAO', 'ASSAI', 'BIG',
  'RENNER', 'RIACHUELO', 'CENTAURO', 'NETSHOES', 'DAFITI', 'SHEIN',
  'ALIEXPRESS', 'SHOPEE', 'MERCADOLIVRE', 'AMAZON',
  
  // Gas Stations
  'SHELL', 'IPIRANGA', 'BR', 'PETROBRAS', 'ALE', 'ALESAT',
  
  // Health
  'DROGASIL', 'DROGARIA', 'RAIA', 'PANVEL', 'PACHECO', 'ARAÚJO',
  'UNIMED', 'AMIL', 'HAPVIDA', 'NOTREDAME',
  
  // Education
  'UDEMY', 'COURSERA', 'HOTMART', 'EDUZZ', 'ALURA', 'DESCOMPLICA',
  
  // Gym & Fitness
  'SMARTFIT', 'BLUEFIT', 'BODYTECH', 'SELFIT',
  
  // Travel
  'LATAM', 'GOL', 'AZUL', 'BOOKING', 'AIRBNB', 'DECOLAR', 'HURB',
  '123MILHAS', 'SMILES', 'LIVELO',
]);

// Gateway prefixes to remove for better matching
const GATEWAY_PREFIXES = [
  'PAG*', 'MP*', 'MERCPAGO*', 'PAGSEGURO*', 'STONE*', 'CIELO*',
  'GETNET*', 'REDE*', 'SAFRA*', 'BIN*', 'VERO*', 'SUMUP*',
  'PICPAY*', 'PAGBANK*', 'EBANX*', 'WIRECARD*', 'ADYEN*',
  'STRIPE*', 'PAYPAL*',
];

// Location patterns to remove
const LOCATION_PATTERNS = [
  /\b(SAO|SP|RJ|MG|BA|PR|RS|SC|GO|PE|CE|PA|MA|PI|RN|PB|SE|AL|MT|MS|DF|TO|RO|AC|AP|RR|AM|ES)\b/gi,
  /\bBRASIL\b/gi,
  /\bBR\b/gi,
  /\d{5}[-]?\d{3}/g, // CEP
];

/**
 * Remove gateway prefixes from descriptor
 */
function removeGatewayPrefix(descriptor: string): string {
  let result = descriptor.toUpperCase();
  
  for (const prefix of GATEWAY_PREFIXES) {
    const pattern = prefix.replace('*', '\\*?');
    const regex = new RegExp(`^${pattern}\\s*`, 'i');
    result = result.replace(regex, '');
  }
  
  return result.trim();
}

/**
 * Remove location information from descriptor
 */
function removeLocation(descriptor: string): string {
  let result = descriptor;
  
  for (const pattern of LOCATION_PATTERNS) {
    result = result.replace(pattern, ' ');
  }
  
  return result.replace(/\s+/g, ' ').trim();
}

/**
 * Extract strong merchant identifier if present
 */
function extractStrongMerchant(tokens: string[]): string | null {
  for (const token of tokens) {
    const upperToken = token.toUpperCase();
    if (STRONG_MERCHANTS.has(upperToken)) {
      return upperToken;
    }
    
    // Check partial matches for compound names
    for (const merchant of STRONG_MERCHANTS) {
      if (upperToken.includes(merchant) || merchant.includes(upperToken)) {
        if (upperToken.length >= 4 || merchant.length <= 5) {
          return merchant;
        }
      }
    }
  }
  
  return null;
}

/**
 * Generate a weak fingerprint from tokens
 */
function generateWeakFingerprint(tokens: string[]): string {
  // Take first 3 meaningful tokens, sorted for consistency
  const meaningfulTokens = tokens
    .filter(t => t.length >= 3 && !/^\d+$/.test(t))
    .slice(0, 3)
    .sort();
  
  if (meaningfulTokens.length === 0) {
    return '';
  }
  
  return `W:${meaningfulTokens.join('_').toUpperCase()}`;
}

export interface MerchantFingerprints {
  strong: string | null;
  weak: string | null;
  normalizedDescriptor: string;
  merchantCanon: string | null;
}

/**
 * Generate fingerprints for a transaction descriptor
 * 
 * @param rawDescriptor - The original transaction description
 * @returns Object with strong and weak fingerprints
 */
export function generateFingerprints(rawDescriptor: string): MerchantFingerprints {
  if (!rawDescriptor || typeof rawDescriptor !== 'string') {
    return { strong: null, weak: null, normalizedDescriptor: '', merchantCanon: null };
  }
  
  // Step 1: Basic normalization
  let normalized = rawDescriptor.trim().toUpperCase();
  
  // Step 2: Remove gateway prefix
  normalized = removeGatewayPrefix(normalized);
  
  // Step 3: Remove location
  normalized = removeLocation(normalized);
  
  // Step 4: Get the description key (uses existing normalizer)
  const descKey = generateDescriptionKey(normalized);
  
  // Step 5: Tokenize
  const tokens = normalized
    .split(/[\s\-_.\/\,;:*]+/)
    .filter(t => t.length >= 2 && !/^\d+$/.test(t));
  
  // Step 6: Try to find strong merchant
  const strongMerchant = extractStrongMerchant(tokens);
  
  // Step 7: Generate fingerprints
  const strong = strongMerchant ? `F:${strongMerchant}` : null;
  const weak = descKey ? `W:${descKey}` : generateWeakFingerprint(tokens);
  
  return {
    strong,
    weak: weak || null,
    normalizedDescriptor: descKey || normalized,
    merchantCanon: strongMerchant,
  };
}

/**
 * Check if a descriptor has a strong fingerprint match
 */
export function hasStrongFingerprint(rawDescriptor: string): boolean {
  const { strong } = generateFingerprints(rawDescriptor);
  return strong !== null;
}

/**
 * Get the canonical merchant name from a descriptor
 */
export function extractMerchantCanon(rawDescriptor: string): string | null {
  const { merchantCanon } = generateFingerprints(rawDescriptor);
  return merchantCanon;
}
