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
} from "./normalizer";

export interface EvidenceItem {
  type: 'CACHE_MATCH' | 'PLATFORM_DETECTED' | 'HEURISTIC' | 'USER_CONFIRMED' | 'FAMILY_HISTORY' | 'BANK_FEE';
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
  
  // Step 4: Platform detection (if not already resolved by cache)
  if (normalized.entities.platform) {
    return createPlatformResolution(normalized);
  }
  
  // Step 5: If we have a low-confidence cache result, return it
  if (cacheResult) {
    return cacheResult;
  }
  
  // Step 6: Unknown - return minimal info
  return {
    merchantLabel: null,
    suggestedCategoryId: null,
    suggestedSubcategoryId: null,
    confidence: 0,
    evidence: [],
    isIntermediary: false,
    normalizedKey: normalized.normalizedKey,
    source: 'UNKNOWN',
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
 * Create resolution for detected platform
 */
function createPlatformResolution(normalized: NormalizedDescriptor): MerchantResolution {
  const platform = normalized.entities.platform!;
  const isIntermediary = normalized.entities.isIntermediary ?? false;
  
  const evidence: EvidenceItem[] = [{
    type: 'PLATFORM_DETECTED',
    detail: `Plataforma identificada: ${platform}`,
    confidence: isIntermediary ? 0.6 : 0.9,
  }];
  
  if (isIntermediary) {
    evidence.push({
      type: 'PLATFORM_DETECTED',
      detail: 'Este é um intermediador - o lojista real pode ser diferente',
    });
  }
  
  return {
    merchantLabel: platform,
    suggestedCategoryId: null, // Will be resolved from cache or left for user
    suggestedSubcategoryId: null,
    confidence: isIntermediary ? 0.5 : 0.8,
    evidence,
    isIntermediary,
    detectedPlatform: platform,
    normalizedKey: normalized.normalizedKey,
    source: 'PLATFORM',
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
