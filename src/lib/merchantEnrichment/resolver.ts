/**
 * Merchant Resolver
 * Multi-tier resolution pipeline to identify merchants and suggest categories
 */

import { supabase } from "@/integrations/supabase/client";
import { 
  normalizeDescriptor, 
  generateMatchingKeys, 
  isBankFeePattern,
  NormalizedDescriptor,
  DetectedEntities,
  KNOWN_PLATFORMS,
} from "./normalizer";

export interface EvidenceItem {
  type: 'CACHE_MATCH' | 'PLATFORM_DETECTED' | 'HEURISTIC' | 'USER_CONFIRMED' | 'FAMILY_HISTORY' | 'BANK_FEE' | 'INTERMEDIARY_WARNING';
  detail: string;
  confidence?: number;
}

export interface MerchantResolution {
  // Merchant info
  merchantLabel: string | null;
  legalName?: string | null;
  cnpj?: string | null;
  
  // Category suggestion
  suggestedCategoryId: string | null;
  suggestedSubcategoryId: string | null;
  
  // Confidence and evidence
  confidence: number;
  evidence: EvidenceItem[];
  
  // Metadata
  isIntermediary: boolean;
  detectedPlatform?: string;
  normalizedKey: string;
  
  // Source tracking
  source: 'CACHE' | 'PLATFORM' | 'HEURISTIC' | 'UNKNOWN';
  
  // Flag for requiring user confirmation
  requiresConfirmation?: boolean;
}

interface MerchantDirectoryEntry {
  id: string;
  scope: string;
  family_id: string | null;
  normalized_key: string;
  merchant_name_display: string | null;
  legal_name: string | null;
  cnpj: string | null;
  category_id_suggested: string | null;
  subcategory_id_suggested: string | null;
  confidence_default: number;
  evidence_summary: string | null;
  source: string;
  detected_platform: string | null;
  is_intermediary: boolean;
}

// Context patterns for category refinement
const CONTEXT_PATTERNS = {
  // Education context patterns
  CERTIFICATION: /MBA|CERT|CERTIF|EXAME|PROVA|CERTIFICACAO/i,
  
  // Clothing/Fashion context
  CLOTHING: /ROUPA|ROPA|SHOES|MODA|VESTUARIO|CALCA|CAMISA|VESTIDO|TENIS|SAPATO/i,
  
  // Electronics context
  ELECTRONICS: /ELETR|INFO|NOTE|NOTEBOOK|IPHONE|TV|TABLET|CELULAR|SMARTPHONE|COMPUTER|PC/i,
  
  // Fee/Tax context (for gateway transactions)
  FEE_CONTEXT: /TARIFA|TAXA|FEE|COMISSAO|MDR/i,
  
  // Internet/Fiber context (for telecom)
  INTERNET_CONTEXT: /INTERNET|FIBRA|BANDA\s*LARGA|WIFI|WI-FI/i,
};

/**
 * Main resolver function - attempts to identify a merchant from a descriptor
 */
export async function resolveMerchant(
  rawDescriptor: string,
  familyId?: string
): Promise<MerchantResolution> {
  // Step 1: Normalize the descriptor
  const normalized = normalizeDescriptor(rawDescriptor);
  const matchingKeys = generateMatchingKeys(normalized);
  
  // Step 2: Try local cache (merchant_directory)
  const cacheResult = await tryMerchantCache(matchingKeys, familyId);
  if (cacheResult && cacheResult.confidence >= 0.5) {
    return cacheResult;
  }
  
  // Step 3: Check for bank fees (heuristic)
  if (isBankFeePattern(normalized)) {
    return createBankFeeResolution(normalized);
  }
  
  // Step 4: Platform detection with context-aware category mapping
  if (normalized.entities.platform) {
    return createPlatformResolution(normalized, rawDescriptor);
  }
  
  // Step 5: If we have a low-confidence cache result, return it
  if (cacheResult) {
    return cacheResult;
  }
  
  // Step 6: Unknown - return minimal info with confirmation flag
  return {
    merchantLabel: null,
    suggestedCategoryId: 'desconhecidas',
    suggestedSubcategoryId: 'desconhecidas-outros',
    confidence: 0,
    evidence: [],
    isIntermediary: false,
    normalizedKey: normalized.normalizedKey,
    source: 'UNKNOWN',
    requiresConfirmation: true,
  };
}

/**
 * Try to find a match in the merchant_directory cache
 */
async function tryMerchantCache(
  matchingKeys: string[],
  familyId?: string
): Promise<MerchantResolution | null> {
  if (matchingKeys.length === 0) return null;
  
  try {
    // Query merchant_directory for any matching key
    // Priority: family-scoped > global
    const { data: entries, error } = await supabase
      .from('merchant_directory')
      .select('*')
      .in('normalized_key', matchingKeys)
      .order('scope', { ascending: true }) // 'family' comes before 'global'
      .order('confidence_default', { ascending: false });
    
    if (error || !entries || entries.length === 0) {
      return null;
    }
    
    // Find best match (prefer family-scoped, then highest confidence)
    let bestMatch: MerchantDirectoryEntry | null = null;
    
    for (const entry of entries as MerchantDirectoryEntry[]) {
      // If family-scoped, must match family
      if (entry.scope === 'family' && entry.family_id !== familyId) {
        continue;
      }
      
      if (!bestMatch || entry.confidence_default > bestMatch.confidence_default) {
        bestMatch = entry;
      }
    }
    
    if (!bestMatch) return null;
    
    // Build evidence based on source
    const evidence: EvidenceItem[] = [];
    
    if (bestMatch.source === 'USER_CONFIRMED') {
      evidence.push({
        type: 'USER_CONFIRMED',
        detail: 'Você já categorizou esta transação anteriormente',
        confidence: bestMatch.confidence_default,
      });
    } else if (bestMatch.source === 'PLATFORM_DETECTED') {
      evidence.push({
        type: 'PLATFORM_DETECTED',
        detail: bestMatch.detected_platform 
          ? `Plataforma identificada: ${bestMatch.detected_platform}`
          : 'Plataforma conhecida',
        confidence: bestMatch.confidence_default,
      });
    } else if (bestMatch.source === 'HEURISTIC') {
      evidence.push({
        type: 'HEURISTIC',
        detail: bestMatch.evidence_summary || 'Padrão conhecido',
        confidence: bestMatch.confidence_default,
      });
    } else {
      evidence.push({
        type: 'CACHE_MATCH',
        detail: bestMatch.evidence_summary || 'Encontrado no histórico',
        confidence: bestMatch.confidence_default,
      });
    }
    
    // Add intermediary warning
    if (bestMatch.is_intermediary) {
      evidence.push({
        type: 'PLATFORM_DETECTED',
        detail: 'Intermediador de pagamentos - pode esconder o lojista real',
      });
    }
    
    return {
      merchantLabel: bestMatch.merchant_name_display,
      legalName: bestMatch.legal_name,
      cnpj: bestMatch.cnpj,
      suggestedCategoryId: bestMatch.category_id_suggested,
      suggestedSubcategoryId: bestMatch.subcategory_id_suggested,
      confidence: bestMatch.confidence_default,
      evidence,
      isIntermediary: bestMatch.is_intermediary,
      detectedPlatform: bestMatch.detected_platform || undefined,
      normalizedKey: bestMatch.normalized_key,
      source: 'CACHE',
    };
  } catch (error) {
    console.error('[MerchantResolver] Cache lookup failed:', error);
    return null;
  }
}

/**
 * Create resolution for detected platform with context-aware category mapping
 */
function createPlatformResolution(normalized: NormalizedDescriptor, rawDescriptor: string): MerchantResolution {
  const platform = normalized.entities.platform!;
  const isIntermediary = normalized.entities.isIntermediary ?? false;
  
  // Get platform config for category hints
  const platformConfig = Object.values(KNOWN_PLATFORMS).find(p => p.platform === platform);
  
  let suggestedCategoryId: string | null = platformConfig?.categoryHint || null;
  let suggestedSubcategoryId: string | null = platformConfig?.subcategoryHint || null;
  let confidence = isIntermediary ? 0.50 : 0.85;
  
  // Context-aware refinements
  const upperDescriptor = rawDescriptor.toUpperCase();
  
  // For infoproduct platforms, check for certification context
  if (['HOTMART', 'EDUZZ', 'MONETIZZE', 'KIWIFY', 'BRAIP', 'TICTO', 'PERFECTPAY'].includes(platform)) {
    if (CONTEXT_PATTERNS.CERTIFICATION.test(upperDescriptor)) {
      suggestedSubcategoryId = 'educacao-certificacoes';
      confidence = 0.75;
    }
  }
  
  // For marketplaces, try to detect product type
  if (['AMAZON', 'MERCADOLIVRE', 'SHOPEE', 'ALIEXPRESS', 'MAGALU', 'AMERICANAS'].includes(platform)) {
    if (CONTEXT_PATTERNS.CLOTHING.test(upperDescriptor)) {
      suggestedCategoryId = 'roupa-estetica';
      suggestedSubcategoryId = 'roupa-estetica-roupas';
      confidence = 0.70;
    } else if (CONTEXT_PATTERNS.ELECTRONICS.test(upperDescriptor)) {
      suggestedCategoryId = 'diversos';
      suggestedSubcategoryId = 'diversos-equipamentos-eletronicos';
      confidence = 0.75;
    } else {
      // Generic marketplace purchase - low confidence, needs confirmation
      suggestedCategoryId = 'desconhecidas';
      suggestedSubcategoryId = 'desconhecidas-outros';
      confidence = 0.45;
    }
  }
  
  // For payment gateways, check if it's a fee
  if (['MERCADOPAGO', 'PAGSEGURO', 'STONE', 'CIELO', 'GETNET', 'REDE', 'PAYPAL', 'PICPAY'].includes(platform)) {
    if (CONTEXT_PATTERNS.FEE_CONTEXT.test(upperDescriptor)) {
      suggestedCategoryId = 'despesas-financeiras';
      suggestedSubcategoryId = 'despesas-financeiras-outras';
      confidence = 0.75;
    } else {
      // Gateway without lojista info - needs confirmation
      suggestedCategoryId = 'desconhecidas';
      suggestedSubcategoryId = 'desconhecidas-outros';
      confidence = 0.40;
    }
  }
  
  // For telecom, check if it's internet or mobile
  if (['VIVO', 'CLARO', 'TIM', 'OI'].includes(platform)) {
    if (CONTEXT_PATTERNS.INTERNET_CONTEXT.test(upperDescriptor)) {
      suggestedSubcategoryId = 'casa-internet---tv---streamings';
      confidence = 0.85;
    } else {
      // Default to mobile
      suggestedSubcategoryId = 'casa-telefone-celular';
      confidence = 0.80;
    }
  }
  
  const evidence: EvidenceItem[] = [{
    type: 'PLATFORM_DETECTED',
    detail: `Plataforma identificada: ${platform}`,
    confidence,
  }];
  
  if (isIntermediary) {
    evidence.push({
      type: 'INTERMEDIARY_WARNING',
      detail: 'Este é um intermediador - o lojista real pode ser diferente',
    });
  }
  
  // Flag for requiring confirmation on low confidence
  const requiresConfirmation = confidence < 0.55 || (isIntermediary && !CONTEXT_PATTERNS.FEE_CONTEXT.test(upperDescriptor));
  
  return {
    merchantLabel: platform,
    suggestedCategoryId,
    suggestedSubcategoryId,
    confidence,
    evidence,
    isIntermediary,
    detectedPlatform: platform,
    normalizedKey: normalized.normalizedKey,
    source: 'PLATFORM',
    requiresConfirmation,
  };
}

/**
 * Create resolution for bank fees
 */
function createBankFeeResolution(normalized: NormalizedDescriptor): MerchantResolution {
  // Try to determine specific fee type
  let suggestedSubcategoryId: string | null = null;
  let feeType = 'Tarifa bancária';
  
  if (/IOF/i.test(normalized.normalized)) {
    suggestedSubcategoryId = 'despesas-financeiras-iof';
    feeType = 'IOF';
  } else if (/ANUIDADE/i.test(normalized.normalized)) {
    suggestedSubcategoryId = 'despesas-financeiras-anuidade-cartao';
    feeType = 'Anuidade de cartão';
  } else if (/JUROS/i.test(normalized.normalized)) {
    suggestedSubcategoryId = 'despesas-financeiras-juros';
    feeType = 'Cobrança de juros';
  } else if (/TED|DOC/i.test(normalized.normalized)) {
    suggestedSubcategoryId = 'despesas-financeiras-ted';
    feeType = 'Tarifa de transferência';
  } else if (/TARIFA|MANUTENCAO/i.test(normalized.normalized)) {
    suggestedSubcategoryId = 'despesas-financeiras-manutencao-de-conta';
    feeType = 'Tarifa de manutenção';
  }
  
  return {
    merchantLabel: feeType,
    suggestedCategoryId: 'despesas-financeiras',
    suggestedSubcategoryId,
    confidence: 0.9,
    evidence: [{
      type: 'BANK_FEE',
      detail: `Padrão de cobrança bancária: ${feeType}`,
      confidence: 0.9,
    }],
    isIntermediary: false,
    normalizedKey: normalized.normalizedKey,
    source: 'HEURISTIC',
  };
}

/**
 * Record a user correction to learn from
 */
export async function recordMerchantCorrection(
  familyId: string,
  rawDescriptor: string,
  merchantNameDisplay: string | null,
  categoryId: string,
  subcategoryId: string | null
): Promise<boolean> {
  try {
    const normalized = normalizeDescriptor(rawDescriptor);
    
    // Upsert into merchant_directory as USER_CONFIRMED
    const { error } = await supabase
      .from('merchant_directory')
      .upsert({
        scope: 'family',
        family_id: familyId,
        normalized_key: normalized.normalizedKey,
        merchant_name_display: merchantNameDisplay,
        category_id_suggested: categoryId,
        subcategory_id_suggested: subcategoryId,
        confidence_default: 0.95, // High confidence for user-confirmed
        evidence_summary: 'Confirmado pelo usuário',
        source: 'USER_CONFIRMED',
        sample_descriptors: [rawDescriptor],
        match_count: 1,
        last_matched_at: new Date().toISOString(),
      }, {
        onConflict: 'scope,family_id,normalized_key',
      });
    
    if (error) {
      console.error('[MerchantResolver] Failed to record correction:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('[MerchantResolver] Error recording correction:', error);
    return false;
  }
}

/**
 * Batch resolve multiple descriptors (for import flows)
 */
export async function batchResolveMerchants(
  descriptors: string[],
  familyId?: string
): Promise<Map<string, MerchantResolution>> {
  const results = new Map<string, MerchantResolution>();
  
  // Resolve in parallel with concurrency limit
  const BATCH_SIZE = 10;
  for (let i = 0; i < descriptors.length; i += BATCH_SIZE) {
    const batch = descriptors.slice(i, i + BATCH_SIZE);
    const promises = batch.map(d => resolveMerchant(d, familyId));
    const resolved = await Promise.all(promises);
    
    batch.forEach((d, idx) => {
      results.set(d, resolved[idx]);
    });
  }
  
  return results;
}
