import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { 
  resolveMerchant, 
  recordMerchantCorrection,
  batchResolveMerchants,
  type MerchantResolution,
} from "@/lib/merchantEnrichment";
import { toast } from "sonner";

interface UseMerchantEnrichmentResult {
  // Single resolution
  resolve: (descriptor: string) => Promise<MerchantResolution>;
  
  // Batch resolution
  resolveBatch: (descriptors: string[]) => Promise<Map<string, MerchantResolution>>;
  
  // Record user correction (learning)
  recordCorrection: (
    rawDescriptor: string,
    merchantName: string | null,
    categoryId: string,
    subcategoryId: string | null
  ) => Promise<boolean>;
  
  // Cache of resolutions
  resolutions: Map<string, MerchantResolution>;
  
  // Loading state
  isResolving: boolean;
}

/**
 * Hook for using merchant enrichment in import flows
 */
export function useMerchantEnrichment(): UseMerchantEnrichmentResult {
  const { family } = useAuth();
  const [resolutions, setResolutions] = useState<Map<string, MerchantResolution>>(new Map());
  const [isResolving, setIsResolving] = useState(false);
  
  const resolve = useCallback(async (descriptor: string): Promise<MerchantResolution> => {
    // Check cache first
    if (resolutions.has(descriptor)) {
      return resolutions.get(descriptor)!;
    }
    
    setIsResolving(true);
    try {
      const result = await resolveMerchant(descriptor, family?.id);
      
      // Update cache
      setResolutions(prev => {
        const next = new Map(prev);
        next.set(descriptor, result);
        return next;
      });
      
      return result;
    } finally {
      setIsResolving(false);
    }
  }, [family?.id, resolutions]);
  
  const resolveBatch = useCallback(async (descriptors: string[]): Promise<Map<string, MerchantResolution>> => {
    // Filter out already cached
    const uncached = descriptors.filter(d => !resolutions.has(d));
    
    if (uncached.length === 0) {
      // All cached, return from cache
      const result = new Map<string, MerchantResolution>();
      descriptors.forEach(d => {
        result.set(d, resolutions.get(d)!);
      });
      return result;
    }
    
    setIsResolving(true);
    try {
      const newResolutions = await batchResolveMerchants(uncached, family?.id);
      
      // Merge with cache
      setResolutions(prev => {
        const next = new Map(prev);
        newResolutions.forEach((v, k) => next.set(k, v));
        return next;
      });
      
      // Return complete result
      const result = new Map<string, MerchantResolution>();
      descriptors.forEach(d => {
        result.set(d, newResolutions.get(d) || resolutions.get(d)!);
      });
      return result;
    } finally {
      setIsResolving(false);
    }
  }, [family?.id, resolutions]);
  
  const recordCorrection = useCallback(async (
    rawDescriptor: string,
    merchantName: string | null,
    categoryId: string,
    subcategoryId: string | null
  ): Promise<boolean> => {
    if (!family?.id) {
      toast.error("Família não encontrada");
      return false;
    }
    
    try {
      const success = await recordMerchantCorrection(
        family.id,
        rawDescriptor,
        merchantName,
        categoryId,
        subcategoryId
      );
      
      if (success) {
        toast.success("Aprendido!", {
          description: "Próximas transações semelhantes serão sugeridas automaticamente.",
        });
        
        // Update cache with high confidence
        setResolutions(prev => {
          const next = new Map(prev);
          const existing = next.get(rawDescriptor);
          if (existing) {
            next.set(rawDescriptor, {
              ...existing,
              suggestedCategoryId: categoryId,
              suggestedSubcategoryId: subcategoryId,
              confidence: 0.95,
              source: 'CACHE',
            });
          }
          return next;
        });
      }
      
      return success;
    } catch (error) {
      console.error('[MerchantEnrichment] Failed to record correction:', error);
      return false;
    }
  }, [family?.id]);
  
  return {
    resolve,
    resolveBatch,
    recordCorrection,
    resolutions,
    isResolving,
  };
}
