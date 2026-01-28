/**
 * Merchant Enrichment Module
 * 
 * This module provides merchant identification and category suggestion
 * for transaction descriptors from bank statements and invoices.
 */

export { 
  normalizeDescriptor,
  generateMatchingKeys,
  isBankFeePattern,
  detectPixInfo,
  KNOWN_PLATFORMS,
  type NormalizedDescriptor,
  type DetectedEntities,
} from './normalizer';

export {
  resolveMerchant,
  recordMerchantCorrection,
  batchResolveMerchants,
  type MerchantResolution,
  type EvidenceItem,
} from './resolver';
