/**
 * Category Suggestion Engine Hook
 * 
 * Provides automatic category/subcategory suggestions for transactions
 * based on user history (Rule 1) and bank descriptor patterns (Rule 2).
 * 
 * Priority:
 * 1. User's previous categorizations (last 180 days)
 * 2. Bank descriptor dictionary patterns
 */

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { generateDescriptionKey } from "@/lib/descriptionNormalizer";
import { getSuggestionFromDescriptor } from "@/data/bankDescriptors";
import { TransactionClassification } from "@/types/finance";

export interface CategorySuggestion {
  categoryId: string;
  subcategoryId?: string;
  classification?: TransactionClassification;
  confidence: number;
  source: 'history' | 'descriptor' | 'none';
  matchCount?: number; // How many times this category was used for similar transactions
}

interface TransactionHistoryItem {
  description_key: string;
  category_id: string;
  subcategory_id: string | null;
  classification: string | null;
  count: number;
  last_used: string;
}

/**
 * Fetches category history for the family (cached)
 */
function useCategoryHistory() {
  const { family } = useAuth();
  
  return useQuery({
    queryKey: ['category-history', family?.id],
    queryFn: async (): Promise<Map<string, {
      categoryId: string;
      subcategoryId: string | null;
      classification: string | null;
      count: number;
      lastUsed: Date;
    }>> => {
      if (!family?.id) return new Map();
      
      // Get transactions from last 180 days grouped by description_key
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 180);
      
      const { data, error } = await supabase
        .from('transactions')
        .select('description, category_id, subcategory_id, classification, created_at')
        .eq('family_id', family.id)
        .gte('created_at', sixMonthsAgo.toISOString())
        .not('description', 'is', null)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Error fetching category history:', error);
        return new Map();
      }
      
      // Build a map of description_key -> category usage
      const historyMap = new Map<string, {
        categoryId: string;
        subcategoryId: string | null;
        classification: string | null;
        count: number;
        lastUsed: Date;
      }>();
      
      for (const tx of data || []) {
        if (!tx.description) continue;
        
        const key = generateDescriptionKey(tx.description);
        if (!key) continue;
        
        const existing = historyMap.get(key);
        const txDate = new Date(tx.created_at);
        
        if (!existing) {
          historyMap.set(key, {
            categoryId: tx.category_id,
            subcategoryId: tx.subcategory_id,
            classification: tx.classification,
            count: 1,
            lastUsed: txDate,
          });
        } else {
          // Increment count
          existing.count++;
          // Keep most recent categorization if same count
          if (txDate > existing.lastUsed) {
            existing.categoryId = tx.category_id;
            existing.subcategoryId = tx.subcategory_id;
            existing.classification = tx.classification;
            existing.lastUsed = txDate;
          }
        }
      }
      
      return historyMap;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    gcTime: 30 * 60 * 1000, // 30 minutes before garbage collection
    enabled: !!family?.id,
  });
}

/**
 * Main hook for category suggestions
 */
export function useCategorySuggestion() {
  const { data: historyMap, isLoading: isLoadingHistory } = useCategoryHistory();
  const queryClient = useQueryClient();
  const { family } = useAuth();
  
  /**
   * Get suggestion for a description
   */
  const getSuggestion = useCallback((description: string): CategorySuggestion => {
    if (!description || description.trim().length < 3) {
      return { categoryId: '', confidence: 0, source: 'none' };
    }
    
    const descKey = generateDescriptionKey(description);
    
    // Rule 1: Check user history first
    if (historyMap && descKey) {
      const historyMatch = historyMap.get(descKey);
      
      if (historyMatch) {
        // Calculate confidence based on count and recency
        const baseConfidence = Math.min(0.95, 0.7 + (historyMatch.count * 0.05));
        const daysSinceUse = Math.floor(
          (Date.now() - historyMatch.lastUsed.getTime()) / (1000 * 60 * 60 * 24)
        );
        // Reduce confidence if old
        const recencyFactor = Math.max(0.8, 1 - (daysSinceUse / 180) * 0.2);
        
        return {
          categoryId: historyMatch.categoryId,
          subcategoryId: historyMatch.subcategoryId || undefined,
          classification: historyMatch.classification as TransactionClassification | undefined,
          confidence: baseConfidence * recencyFactor,
          source: 'history',
          matchCount: historyMatch.count,
        };
      }
    }
    
    // Rule 2: Check bank descriptor patterns
    const descriptorMatch = getSuggestionFromDescriptor(description);
    if (descriptorMatch) {
      return {
        ...descriptorMatch,
        source: 'descriptor',
      };
    }
    
    return { categoryId: '', confidence: 0, source: 'none' };
  }, [historyMap]);
  
  /**
   * Record user feedback when they change a suggestion
   * This helps the system learn for future suggestions
   */
  const recordFeedback = useCallback(async (
    description: string,
    chosenCategoryId: string,
    chosenSubcategoryId?: string,
    wasAccepted?: boolean
  ) => {
    if (!family?.id || !description) return;
    
    // Invalidate the history cache so next time we get fresh data
    queryClient.invalidateQueries({ queryKey: ['category-history', family.id] });
    
    // The actual feedback is implicit in the transaction creation
    // The next time this description appears, we'll find it in history
  }, [family?.id, queryClient]);
  
  return {
    getSuggestion,
    recordFeedback,
    isLoading: isLoadingHistory,
  };
}

/**
 * Hook for debounced suggestion as user types
 */
export function useDebouncedSuggestion(debounceMs = 300) {
  const { getSuggestion, isLoading } = useCategorySuggestion();
  const [suggestion, setSuggestion] = useState<CategorySuggestion | null>(null);
  const [description, setDescription] = useState('');
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  const updateDescription = useCallback((newDescription: string) => {
    setDescription(newDescription);
    
    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Debounce the suggestion lookup
    timeoutRef.current = setTimeout(() => {
      if (newDescription.trim().length >= 3) {
        const newSuggestion = getSuggestion(newDescription);
        setSuggestion(newSuggestion.confidence > 0 ? newSuggestion : null);
      } else {
        setSuggestion(null);
      }
    }, debounceMs);
  }, [getSuggestion, debounceMs]);
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  const clearSuggestion = useCallback(() => {
    setSuggestion(null);
  }, []);
  
  return {
    suggestion,
    updateDescription,
    clearSuggestion,
    isLoading,
  };
}

/**
 * Get most used categories for quick access
 */
export function useRecentCategories(limit = 6) {
  const { family } = useAuth();
  
  return useQuery({
    queryKey: ['recent-categories', family?.id],
    queryFn: async () => {
      if (!family?.id) return [];
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data, error } = await supabase
        .from('transactions')
        .select('category_id')
        .eq('family_id', family.id)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .not('category_id', 'is', null);
      
      if (error) {
        console.error('Error fetching recent categories:', error);
        return [];
      }
      
      // Count category usage
      const categoryCount = new Map<string, number>();
      for (const tx of data || []) {
        const count = categoryCount.get(tx.category_id) || 0;
        categoryCount.set(tx.category_id, count + 1);
      }
      
      // Sort by count and return top N
      return Array.from(categoryCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([categoryId]) => categoryId);
    },
    staleTime: 10 * 60 * 1000, // 10 minutes
    enabled: !!family?.id,
  });
}
