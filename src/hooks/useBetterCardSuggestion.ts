import { useMemo, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

interface CreditCard {
  id: string;
  card_name: string;
  brand?: string;
  closing_day: number | null;
  due_day: number | null;
  credit_limit: number | null;
  is_active: boolean;
}

interface BetterCardSuggestion {
  usedCard: CreditCard;
  betterCard: CreditCard;
  extraDaysClosing: number;
  extraDaysDue: number;
}

const MIN_DAYS_DIFFERENCE = 7; // Minimum difference to show suggestion
const RATE_LIMIT_KEY = "better_card_suggestion_last_shown";

/**
 * Calculate days until the next occurrence of a specific day of month
 */
function daysUntilDayOfMonth(targetDay: number, fromDate: Date = new Date()): number {
  const currentDay = fromDate.getDate();
  const currentMonth = fromDate.getMonth();
  const currentYear = fromDate.getFullYear();
  
  // Get last day of current month
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const effectiveTargetDay = Math.min(targetDay, lastDayOfMonth);
  
  if (currentDay <= effectiveTargetDay) {
    // Target is still in this month
    return effectiveTargetDay - currentDay;
  } else {
    // Target is next month
    const lastDayOfNextMonth = new Date(currentYear, currentMonth + 2, 0).getDate();
    const nextEffectiveTargetDay = Math.min(targetDay, lastDayOfNextMonth);
    const daysLeftThisMonth = lastDayOfMonth - currentDay;
    return daysLeftThisMonth + nextEffectiveTargetDay;
  }
}

/**
 * Calculate card metrics for comparison
 */
function getCardMetrics(card: CreditCard, transactionDate: Date = new Date()) {
  const closingDay = card.closing_day;
  const dueDay = card.due_day;
  
  if (!closingDay || !dueDay) {
    return null;
  }
  
  const daysToClosing = daysUntilDayOfMonth(closingDay, transactionDate);
  const daysToDue = daysUntilDayOfMonth(dueDay, transactionDate);
  
  return {
    daysToClosing,
    daysToDue,
    closingDay,
    dueDay,
  };
}

/**
 * Check if we've shown a suggestion recently (rate limiting)
 */
function canShowSuggestion(): boolean {
  try {
    const lastShown = localStorage.getItem(RATE_LIMIT_KEY);
    if (!lastShown) return true;
    
    const lastShownDate = new Date(lastShown);
    const now = new Date();
    
    // Only show once per day
    const isSameDay = 
      lastShownDate.getFullYear() === now.getFullYear() &&
      lastShownDate.getMonth() === now.getMonth() &&
      lastShownDate.getDate() === now.getDate();
    
    return !isSameDay;
  } catch {
    return true;
  }
}

/**
 * Mark that we've shown a suggestion
 */
function markSuggestionShown() {
  try {
    localStorage.setItem(RATE_LIMIT_KEY, new Date().toISOString());
  } catch {
    // Ignore storage errors
  }
}

/**
 * Check if user has disabled smart tips
 */
function hasDisabledSmartTips(): boolean {
  try {
    return localStorage.getItem("better_card_tips_disabled") === "true";
  } catch {
    return false;
  }
}

/**
 * Disable smart tips permanently
 */
function disableSmartTips() {
  try {
    localStorage.setItem("better_card_tips_disabled", "true");
  } catch {
    // Ignore storage errors
  }
}

export function useBetterCardSuggestion() {
  const { family, familyMember } = useAuth();
  const queryClient = useQueryClient();
  const [suggestion, setSuggestion] = useState<BetterCardSuggestion | null>(null);
  const [transactionIdToUpdate, setTransactionIdToUpdate] = useState<string | null>(null);

  /**
   * Find if there's a better card for the given transaction
   */
  const findBetterCard = useCallback((
    usedCardId: string,
    allCards: CreditCard[],
    transactionAmount: number,
    transactionDate: Date = new Date()
  ): BetterCardSuggestion | null => {
    // Don't show if disabled
    if (hasDisabledSmartTips()) return null;
    
    // Need at least 2 active cards with dates configured
    const validCards = allCards.filter(c => 
      c.is_active && 
      c.closing_day !== null && 
      c.due_day !== null
    );
    
    if (validCards.length < 2) return null;
    
    const usedCard = validCards.find(c => c.id === usedCardId);
    if (!usedCard) return null;
    
    const usedMetrics = getCardMetrics(usedCard, transactionDate);
    if (!usedMetrics) return null;
    
    // Find the best alternative
    let bestAlternative: CreditCard | null = null;
    let bestExtraDaysClosing = 0;
    let bestExtraDaysDue = 0;
    
    for (const card of validCards) {
      if (card.id === usedCardId) continue;
      
      // Check if card has enough limit (if limit is set and we know the amount)
      if (card.credit_limit !== null && transactionAmount > 0) {
        if (transactionAmount > card.credit_limit) {
          continue; // Card doesn't have enough limit
        }
      }
      
      const cardMetrics = getCardMetrics(card, transactionDate);
      if (!cardMetrics) continue;
      
      // Primary: more days to closing = better (more time for purchase to enter next bill)
      const extraDaysClosing = cardMetrics.daysToClosing - usedMetrics.daysToClosing;
      // Secondary: more days to due = better (more time to pay)
      const extraDaysDue = cardMetrics.daysToDue - usedMetrics.daysToDue;
      
      // Prioritize closing difference, then due difference
      if (extraDaysClosing > bestExtraDaysClosing || 
          (extraDaysClosing === bestExtraDaysClosing && extraDaysDue > bestExtraDaysDue)) {
        bestAlternative = card;
        bestExtraDaysClosing = extraDaysClosing;
        bestExtraDaysDue = extraDaysDue;
      }
    }
    
    // Only suggest if difference is significant
    if (!bestAlternative) return null;
    if (bestExtraDaysClosing < MIN_DAYS_DIFFERENCE && bestExtraDaysDue < MIN_DAYS_DIFFERENCE) {
      return null;
    }
    
    // Check rate limit
    if (!canShowSuggestion()) return null;
    
    return {
      usedCard,
      betterCard: bestAlternative,
      extraDaysClosing: bestExtraDaysClosing,
      extraDaysDue: bestExtraDaysDue,
    };
  }, []);

  /**
   * Check and show suggestion after transaction is created
   */
  const checkAndShowSuggestion = useCallback((
    transactionId: string,
    usedCardId: string,
    allCards: CreditCard[],
    transactionAmount: number,
    transactionDate?: Date
  ) => {
    const result = findBetterCard(usedCardId, allCards, transactionAmount, transactionDate);
    
    if (result) {
      setSuggestion(result);
      setTransactionIdToUpdate(transactionId);
      markSuggestionShown();
    }
  }, [findBetterCard]);

  /**
   * Switch the transaction to use the better card
   */
  const switchCard = useCallback(async () => {
    if (!transactionIdToUpdate || !suggestion || !family) return false;
    
    try {
      const { error } = await supabase
        .from("transactions")
        .update({ 
          credit_card_id: suggestion.betterCard.id,
        })
        .eq("id", transactionIdToUpdate);
      
      if (error) throw error;
      
      // Log the change for audit
      await supabase.from("audit_logs").insert({
        user_id: familyMember?.user_id || "",
        family_id: family.id,
        action: "transaction_card_switched",
        entity_type: "transaction",
        entity_id: transactionIdToUpdate,
        module: "smart_tips",
        metadata: {
          from_card_id: suggestion.usedCard.id,
          from_card_name: suggestion.usedCard.card_name,
          to_card_id: suggestion.betterCard.id,
          to_card_name: suggestion.betterCard.card_name,
          reason: "better_card_suggestion",
          extra_days: suggestion.extraDaysClosing || suggestion.extraDaysDue,
        },
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      
      setSuggestion(null);
      setTransactionIdToUpdate(null);
      
      return true;
    } catch (error) {
      console.error("Error switching card:", error);
      return false;
    }
  }, [transactionIdToUpdate, suggestion, family, familyMember, queryClient]);

  /**
   * Dismiss the suggestion (keep current card)
   */
  const dismiss = useCallback(() => {
    setSuggestion(null);
    setTransactionIdToUpdate(null);
  }, []);

  /**
   * Disable suggestions permanently
   */
  const disablePermanently = useCallback(async () => {
    disableSmartTips();
    
    // Log the preference change
    if (family && familyMember) {
      await supabase.from("audit_logs").insert({
        user_id: familyMember.user_id,
        family_id: family.id,
        action: "smart_tips_disabled",
        entity_type: "user_preference",
        module: "smart_tips",
        metadata: {
          tip_type: "better_card_suggestion",
        },
      });
    }
    
    setSuggestion(null);
    setTransactionIdToUpdate(null);
  }, [family, familyMember]);

  return {
    suggestion,
    checkAndShowSuggestion,
    switchCard,
    dismiss,
    disablePermanently,
  };
}

// Re-export utility functions for testing
export { daysUntilDayOfMonth, getCardMetrics };
