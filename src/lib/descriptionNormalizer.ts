/**
 * Description Normalizer for Category Suggestion Engine
 * 
 * Generates a stable `description_key` from transaction descriptions
 * to enable pattern matching and learning from user behavior.
 * 
 * LGPD: Only the normalized key is stored, not the full description.
 */

// Common prefixes to standardize
const PREFIX_MAP: Record<string, string> = {
  'rem:': 'REM',
  'rem ': 'REM',
  'remessa': 'REM',
  'des:': 'DES',
  'des ': 'DES',
  'pix ': 'PIX',
  'pix-': 'PIX',
  'pix:': 'PIX',
  'ted ': 'TED',
  'ted-': 'TED',
  'ted:': 'TED',
  'doc ': 'DOC',
  'doc-': 'DOC',
  'doc:': 'DOC',
  'boleto ': 'BOLETO',
  'boleto:': 'BOLETO',
  'tit ': 'BOLETO',
  'titulo ': 'BOLETO',
  'pag ': 'PAG',
  'pag:': 'PAG',
  'pgto ': 'PAG',
  'pgto:': 'PAG',
  'pagto ': 'PAG',
  'pagamento ': 'PAG',
  'rec ': 'REC',
  'rec:': 'REC',
  'receb ': 'REC',
  'recebido ': 'REC',
  'cred ': 'CRED',
  'cred:': 'CRED',
  'credito ': 'CRED',
  'deb ': 'DEB',
  'deb:': 'DEB',
  'debito ': 'DEB',
  'debito automatico': 'DEBAUTO',
  'deb auto': 'DEBAUTO',
  'saque ': 'SAQUE',
  'saq ': 'SAQUE',
  'deposito ': 'DEP',
  'dep ': 'DEP',
  'dep:': 'DEP',
  'transf ': 'TRANSF',
  'transferencia ': 'TRANSF',
  'resg ': 'RESGATE',
  'resgate ': 'RESGATE',
  'aplic ': 'APLIC',
  'aplicacao ': 'APLIC',
  'tbi ': 'TBI',
  'tbi:': 'TBI',
  'tar ': 'TARIFA',
  'tarifa ': 'TARIFA',
  'tarifas ': 'TARIFA',
  'taxa ': 'TARIFA',
  'rend ': 'REND',
  'rend:': 'REND',
  'rendimento ': 'REND',
  'juros ': 'JUROS',
  'jur ': 'JUROS',
  'jur:': 'JUROS',
  'iof ': 'IOF',
  'iof:': 'IOF',
  'encargo ': 'ENCARGO',
  'encargos ': 'ENCARGO',
  'enc ': 'ENCARGO',
};

// Patterns to remove (dates, codes, numbers)
const NOISE_PATTERNS = [
  // Dates in various formats
  /\d{2}\/\d{2}\/\d{2,4}/g,
  /\d{2}-\d{2}-\d{2,4}/g,
  /\d{2}\.\d{2}\.\d{2,4}/g,
  // Long number sequences (NSU, authorization codes, IDs)
  /\b\d{6,}\b/g,
  // Time patterns
  /\d{2}:\d{2}(:\d{2})?/g,
  // Common noise identifiers
  /nsu[\s:]*\d+/gi,
  /aut[\s:]*\d+/gi,
  /cod[\s:]*\d+/gi,
  /id[\s:]*\d+/gi,
  /ref[\s:]*\d+/gi,
  /nr[\s:]*\d+/gi,
  /num[\s:]*\d+/gi,
  /numero[\s:]*\d+/gi,
  /agencia[\s:]*\d+/gi,
  /ag[\s:]*\d+/gi,
  /conta[\s:]*\d+/gi,
  /cc[\s:]*\d+/gi,
  /cpf[\s:]*[\d\.\-]+/gi,
  /cnpj[\s:]*[\d\.\-\/]+/gi,
  // Terminal identifiers
  /terminal[\s:]*\w+/gi,
  /term[\s:]*\w+/gi,
  // Asterisks and partial card numbers
  /\*{2,}/g,
  /\d{4}\*+\d{4}/g,
  // Sequential numbers with separators
  /[\d\s\-\.]{10,}/g,
];

// Words to completely remove (common noise)
const STOPWORDS = new Set([
  'de', 'da', 'do', 'das', 'dos', 'em', 'no', 'na', 'nos', 'nas',
  'para', 'por', 'com', 'sem', 'a', 'o', 'as', 'os', 'e', 'ou',
  'um', 'uma', 'uns', 'umas', 'que', 'se', 'ao', 'aos',
  'ltda', 'eireli', 'me', 'epp', 'sa', 's/a', 'ss', 'cia',
  'brasil', 'br', 'pag', 'pagamento', 'parcela', 'parc',
]);

/**
 * Removes accents from a string
 */
function removeAccents(str: string): string {
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

/**
 * Standardizes known prefixes
 */
function standardizePrefixes(str: string): string {
  let result = str.toLowerCase();
  
  for (const [pattern, replacement] of Object.entries(PREFIX_MAP)) {
    if (result.startsWith(pattern)) {
      result = replacement + ' ' + result.slice(pattern.length);
      break;
    }
  }
  
  return result;
}

/**
 * Removes noise patterns from description
 */
function removeNoise(str: string): string {
  let result = str;
  
  for (const pattern of NOISE_PATTERNS) {
    result = result.replace(pattern, ' ');
  }
  
  return result;
}

/**
 * Extracts meaningful tokens from description
 */
function extractTokens(str: string): string[] {
  return str
    .split(/[\s\-_.\/\,;:]+/)
    .filter(token => {
      // Keep only tokens with at least 2 chars
      if (token.length < 2) return false;
      // Remove stopwords
      if (STOPWORDS.has(token)) return false;
      // Remove pure numbers
      if (/^\d+$/.test(token)) return false;
      return true;
    })
    // Limit to first 5 meaningful tokens
    .slice(0, 5);
}

/**
 * Generates a stable description key for matching
 * 
 * @param description - The transaction description
 * @returns A normalized key suitable for matching similar transactions
 */
export function generateDescriptionKey(description: string): string {
  if (!description || typeof description !== 'string') {
    return '';
  }
  
  let normalized = description.trim();
  
  // Step 1: Standardize prefixes
  normalized = standardizePrefixes(normalized);
  
  // Step 2: Convert to uppercase and remove accents
  normalized = removeAccents(normalized.toUpperCase());
  
  // Step 3: Remove noise (dates, codes, numbers)
  normalized = removeNoise(normalized);
  
  // Step 4: Extract meaningful tokens
  const tokens = extractTokens(normalized.toLowerCase());
  
  // Step 5: Generate key from sorted tokens (for consistency)
  // Keep first 3 tokens in order, then add sorted remaining
  const orderedTokens = tokens.slice(0, 3);
  const remainingTokens = tokens.slice(3).sort();
  
  const key = [...orderedTokens, ...remainingTokens].join('_');
  
  // Step 6: Limit key length
  return key.slice(0, 100);
}

/**
 * Checks if two descriptions are similar based on their keys
 */
export function areDescriptionsSimilar(desc1: string, desc2: string): boolean {
  const key1 = generateDescriptionKey(desc1);
  const key2 = generateDescriptionKey(desc2);
  
  if (!key1 || !key2) return false;
  
  // Exact match
  if (key1 === key2) return true;
  
  // Check if one contains the other (for partial matches)
  const tokens1 = key1.split('_');
  const tokens2 = key2.split('_');
  
  // At least 2 tokens must match
  const matches = tokens1.filter(t => tokens2.includes(t)).length;
  return matches >= 2 || (matches >= 1 && Math.min(tokens1.length, tokens2.length) === 1);
}

/**
 * Extracts the primary merchant/entity name from a description
 * Used for display purposes
 */
export function extractMerchantName(description: string): string {
  if (!description) return '';
  
  let name = description.trim();
  
  // Remove common prefixes
  for (const prefix of Object.keys(PREFIX_MAP)) {
    const upper = name.toUpperCase();
    if (upper.startsWith(prefix.toUpperCase())) {
      name = name.slice(prefix.length).trim();
      break;
    }
  }
  
  // Remove noise
  name = removeNoise(name);
  
  // Get first 3-4 meaningful words
  const words = name
    .split(/[\s\-_.\/\,;:]+/)
    .filter(w => w.length >= 2 && !STOPWORDS.has(w.toLowerCase()) && !/^\d+$/.test(w))
    .slice(0, 4);
  
  return words.join(' ').trim() || description.slice(0, 30);
}
