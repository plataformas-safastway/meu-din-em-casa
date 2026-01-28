/**
 * Learned Categorization Hook
 * 
 * Provides access to the category learning system that improves
 * suggestions based on user corrections.
 * 
 * Priority order:
 * 1. Learned rules (user → family → global)
 * 2. Regex patterns (bank descriptors)
 * 3. Heuristics
 * 4. Fallback
 */

import { useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { generateFingerprints, MerchantFingerprints } from '@/lib/merchantFingerprint';
import { getSuggestionFromDescriptor } from '@/data/bankDescriptors';
import type { TransactionClassification } from '@/types/finance';

export type LearningScope = 'user' | 'family' | 'global';
export type PredictionSource = 'learned' | 'regex' | 'heuristic' | 'fallback';

export interface LearnedRule {
  id: string;
  scope_type: LearningScope;
  fingerprint_type: 'strong' | 'weak';
  fingerprint: string;
  category_id: string;
  subcategory_id: string | null;
  merchant_canon: string | null;
  confidence_base: number;
  examples_count: number;
  conflict_count: number;
  is_archived: boolean;
  last_used_at: string;
  created_at: string;
}

export interface CategorizationSuggestion {
  categoryId: string;
  subcategoryId?: string;
  classification?: TransactionClassification;
  confidence: number;
  source: PredictionSource;
  matchCount?: number;
  fingerprintType?: 'strong' | 'weak';
  scope?: LearningScope;
  hasConflict?: boolean;
}

export interface RecordFeedbackParams {
  transactionId?: string;
  rawDescriptor: string;
  predictedCategoryId?: string;
  predictedSubcategoryId?: string;
  predictedSource?: PredictionSource;
  predictedConfidence?: number;
  userCategoryId: string;
  userSubcategoryId?: string;
  applyScope: LearningScope;
  applyToFuture: boolean;
}

export interface FeedbackResult {
  success: boolean;
  learned: boolean;
  action?: 'created' | 'reinforced';
  conflict?: boolean;
  existingCategoryId?: string;
  message?: string;
}

/**
 * Hook to fetch learned rules for the current user/family
 */
export function useLearnedRules() {
  const { user, family } = useAuth();
  
  return useQuery({
    queryKey: ['learned-rules', user?.id, family?.id],
    queryFn: async (): Promise<LearnedRule[]> => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('learned_merchant_rules')
        .select('*')
        .eq('is_archived', false)
        .order('last_used_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching learned rules:', error);
        return [];
      }
      
      return data as LearnedRule[];
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled: !!user?.id,
  });
}

/**
 * Main hook for learned categorization engine
 */
export function useLearnedCategorization() {
  const { user, family } = useAuth();
  const queryClient = useQueryClient();
  
  /**
   * Get categorization suggestion for a descriptor
   */
  const getSuggestion = useCallback(async (
    rawDescriptor: string
  ): Promise<CategorizationSuggestion> => {
    if (!rawDescriptor || rawDescriptor.trim().length < 3 || !user?.id) {
      return { categoryId: '', confidence: 0, source: 'fallback' };
    }
    
    const fingerprints = generateFingerprints(rawDescriptor);
    
    // Rule 1: Check learned rules via database function
    if (family?.id) {
      try {
        const { data, error } = await supabase.rpc('get_learned_categorization', {
          p_user_id: user.id,
          p_family_id: family.id,
          p_fingerprint_strong: fingerprints.strong || '',
          p_fingerprint_weak: fingerprints.weak || '',
        });
        
        if (!error && data && data.length > 0) {
          const match = data[0] as {
            category_id: string;
            subcategory_id: string | null;
            confidence: number;
            examples_count: number;
            fingerprint_matched: 'strong' | 'weak';
            source_scope: LearningScope;
          };
          return {
            categoryId: match.category_id,
            subcategoryId: match.subcategory_id || undefined,
            confidence: Number(match.confidence) || 0.85,
            source: 'learned',
            matchCount: match.examples_count,
            fingerprintType: match.fingerprint_matched,
            scope: match.source_scope,
          };
        }
      } catch (err) {
        console.error('Error querying learned rules:', err);
      }
    }
    
    // Rule 2: Check bank descriptor patterns (regex)
    const descriptorMatch = getSuggestionFromDescriptor(rawDescriptor);
    if (descriptorMatch && descriptorMatch.categoryId) {
      return {
        ...descriptorMatch,
        source: 'regex',
      };
    }
    
    // Rule 3: Heuristics could be added here
    // For now, skip to fallback
    
    // Rule 4: Fallback
    return { categoryId: '', confidence: 0, source: 'fallback' };
  }, [user?.id, family?.id]);
  
  /**
   * Record feedback when user corrects a categorization
   */
  const recordFeedbackMutation = useMutation({
    mutationFn: async (params: RecordFeedbackParams): Promise<FeedbackResult> => {
      if (!user?.id || !family?.id) {
        throw new Error('User not authenticated');
      }
      
      const fingerprints = generateFingerprints(params.rawDescriptor);
      
      const { data, error } = await supabase.rpc('record_categorization_feedback', {
        p_transaction_id: params.transactionId || null,
        p_user_id: user.id,
        p_family_id: family.id,
        p_raw_descriptor: params.rawDescriptor,
        p_normalized_descriptor: fingerprints.normalizedDescriptor,
        p_fingerprint_strong: fingerprints.strong || '',
        p_fingerprint_weak: fingerprints.weak || '',
        p_predicted_category_id: params.predictedCategoryId || null,
        p_predicted_subcategory_id: params.predictedSubcategoryId || null,
        p_predicted_source: params.predictedSource || null,
        p_predicted_confidence: params.predictedConfidence || null,
        p_user_category_id: params.userCategoryId,
        p_user_subcategory_id: params.userSubcategoryId || null,
        p_apply_scope: params.applyScope,
        p_apply_to_future: params.applyToFuture,
      });
      
      if (error) {
        console.error('Error recording feedback:', error);
        throw error;
      }
      
      // Parse the JSON result from the RPC
      const result = typeof data === 'object' && data !== null ? data as unknown as FeedbackResult : { success: true, learned: false };
      return result;
    },
    onSuccess: () => {
      // Invalidate learned rules cache
      queryClient.invalidateQueries({ queryKey: ['learned-rules'] });
      queryClient.invalidateQueries({ queryKey: ['category-history'] });
    },
  });
  
  return {
    getSuggestion,
    recordFeedback: recordFeedbackMutation.mutateAsync,
    isRecordingFeedback: recordFeedbackMutation.isPending,
    generateFingerprints,
  };
}

/**
 * Hook to manage learned rules (view, edit, delete)
 */
export function useManageLearnedRules() {
  const queryClient = useQueryClient();
  const { user, family } = useAuth();
  
  const deleteRuleMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      const { error } = await supabase
        .from('learned_merchant_rules')
        .delete()
        .eq('id', ruleId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learned-rules'] });
    },
  });
  
  const archiveRuleMutation = useMutation({
    mutationFn: async (ruleId: string) => {
      const { error } = await supabase
        .from('learned_merchant_rules')
        .update({ is_archived: true })
        .eq('id', ruleId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learned-rules'] });
    },
  });
  
  const updateRuleMutation = useMutation({
    mutationFn: async (params: {
      ruleId: string;
      categoryId: string;
      subcategoryId?: string | null;
    }) => {
      const { error } = await supabase
        .from('learned_merchant_rules')
        .update({
          category_id: params.categoryId,
          subcategory_id: params.subcategoryId || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', params.ruleId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learned-rules'] });
    },
  });
  
  return {
    deleteRule: deleteRuleMutation.mutateAsync,
    archiveRule: archiveRuleMutation.mutateAsync,
    updateRule: updateRuleMutation.mutateAsync,
    isDeleting: deleteRuleMutation.isPending,
    isArchiving: archiveRuleMutation.isPending,
    isUpdating: updateRuleMutation.isPending,
  };
}
