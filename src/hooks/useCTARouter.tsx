/**
 * CTA Router Hook
 * Centralized navigation handler for all Home CTAs
 */

import { useCallback, useState, createContext, useContext, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  CTANavigationRequest,
  CTADefaultMode,
  CTASourceContext,
  CTAPayload,
  CTATargetScreen,
  CTASlot,
  CTAEntityType,
  CTAState,
  CTATrackingEvent,
  toMonthRef,
  createCTARef,
  isValidSourceContext,
} from '@/types/navigation';
import { format } from 'date-fns';

// ============================================
// CTA CONTEXT
// ============================================
interface CTARouterContextValue {
  /** Current CTA state */
  ctaState: CTAState;
  
  /** Main handler for CTA navigation */
  handleHomeCTA: (request: CTANavigationRequest, navigate: (tab: string) => void) => void;
  
  /** Builder for creating CTA requests */
  buildCTARequest: (params: BuildCTAParams) => CTANavigationRequest;
  
  /** Get current CTA state and clear it */
  consumeCTAState: () => CTANavigationRequest | null;
  
  /** Clear CTA state without consuming */
  clearCTAState: () => void;
  
  /** Check if there's an active CTA */
  hasActiveCTA: boolean;
}

interface BuildCTAParams {
  targetScreen: CTATargetScreen;
  defaultMode: CTADefaultMode;
  slot: CTASlot;
  entityType: CTAEntityType;
  entityId?: string | null;
  monthRef?: string;
  payload?: CTAPayload;
  actionName?: string;
}

const CTARouterContext = createContext<CTARouterContextValue | null>(null);

// ============================================
// CTA ROUTER PROVIDER
// ============================================
interface CTARouterProviderProps {
  children: ReactNode;
}

export function CTARouterProvider({ children }: CTARouterProviderProps) {
  const { family, user } = useAuth();
  const [ctaState, setCTAState] = useState<CTAState>({
    active: null,
    triggeredAt: null,
  });

  /**
   * Build a CTA navigation request with proper defaults
   */
  const buildCTARequest = useCallback((params: BuildCTAParams): CTANavigationRequest => {
    const {
      targetScreen,
      defaultMode,
      slot,
      entityType,
      entityId = null,
      monthRef = toMonthRef(new Date()),
      payload,
      actionName,
    } = params;

    const sourceContext: CTASourceContext = {
      source: 'home',
      slot,
      entityType,
      entityId,
      monthRef,
      familyId: family?.id || '',
      ref: createCTARef('home', slot, actionName || defaultMode),
    };

    return {
      targetScreen,
      defaultMode,
      sourceContext,
      payload,
    };
  }, [family?.id]);

  /**
   * Track CTA click event (audit + analytics)
   * Does not include sensitive data
   */
  const trackCTAClick = useCallback(async (request: CTANavigationRequest) => {
    try {
      const trackingEvent: CTATrackingEvent = {
        event: 'CTA_CLICKED',
        defaultMode: request.defaultMode,
        sourceContext: {
          source: request.sourceContext.source,
          slot: request.sourceContext.slot,
          entityType: request.sourceContext.entityType,
          entityId: request.sourceContext.entityId,
          monthRef: request.sourceContext.monthRef,
          familyRef: request.sourceContext.familyId ? 
            request.sourceContext.familyId.substring(0, 8) : 'unknown', // Pseudonymized
          ref: request.sourceContext.ref,
        },
        targetScreen: request.targetScreen,
        timestamp: new Date().toISOString(),
        hasEntityId: !!request.sourceContext.entityId,
      };

      // Log to audit (if user is authenticated)
      if (user?.id && family?.id) {
        await supabase.from('audit_logs').insert({
          user_id: user.id,
          family_id: family.id,
          action: 'CTA_CLICKED',
          entity_type: 'navigation',
          entity_id: request.sourceContext.ref,
          module: 'home',
          severity: 'info',
          metadata: {
            defaultMode: request.defaultMode,
            slot: request.sourceContext.slot,
            entityType: request.sourceContext.entityType,
            targetScreen: request.targetScreen,
            hasEntityId: !!request.sourceContext.entityId,
          },
        });
      }

      // Console log for development
      if (import.meta.env.DEV) {
        console.log('[CTA Router] Tracked:', trackingEvent);
      }
    } catch (error) {
      // Silent fail - don't block navigation for tracking errors
      console.warn('[CTA Router] Tracking failed:', error);
    }
  }, [user?.id, family?.id]);

  /**
   * Validate CTA request
   */
  const validateRequest = useCallback((request: CTANavigationRequest): boolean => {
    // Validate sourceContext
    if (!isValidSourceContext(request.sourceContext)) {
      console.error('[CTA Router] Invalid sourceContext:', request.sourceContext);
      return false;
    }

    // Validate defaultMode
    if (!Object.values(CTADefaultMode).includes(request.defaultMode)) {
      console.error('[CTA Router] Invalid defaultMode:', request.defaultMode);
      return false;
    }

    return true;
  }, []);

  /**
   * Main CTA handler - validates, tracks, stores state, and navigates
   */
  const handleHomeCTA = useCallback((
    request: CTANavigationRequest,
    navigate: (tab: string) => void
  ) => {
    // Validate request
    if (!validateRequest(request)) {
      console.error('[CTA Router] Request validation failed, aborting navigation');
      return;
    }

    // Store CTA state for destination screen
    setCTAState({
      active: request,
      triggeredAt: Date.now(),
    });

    // Track the click (async, non-blocking)
    trackCTAClick(request);

    // Navigate to target screen
    navigate(request.targetScreen);

    if (import.meta.env.DEV) {
      console.log('[CTA Router] Navigating:', {
        target: request.targetScreen,
        mode: request.defaultMode,
        slot: request.sourceContext.slot,
      });
    }
  }, [validateRequest, trackCTAClick]);

  /**
   * Consume CTA state (get and clear)
   */
  const consumeCTAState = useCallback((): CTANavigationRequest | null => {
    const current = ctaState.active;
    
    // Clear state after consuming
    setCTAState({
      active: null,
      triggeredAt: null,
    });

    return current;
  }, [ctaState.active]);

  /**
   * Clear CTA state without returning it
   */
  const clearCTAState = useCallback(() => {
    setCTAState({
      active: null,
      triggeredAt: null,
    });
  }, []);

  const value: CTARouterContextValue = {
    ctaState,
    handleHomeCTA,
    buildCTARequest,
    consumeCTAState,
    clearCTAState,
    hasActiveCTA: !!ctaState.active,
  };

  return (
    <CTARouterContext.Provider value={value}>
      {children}
    </CTARouterContext.Provider>
  );
}

// ============================================
// HOOK
// ============================================
export function useCTARouter(): CTARouterContextValue {
  const context = useContext(CTARouterContext);
  
  if (!context) {
    // Return a stub implementation if outside provider
    // This allows components to work without the provider during testing
    return {
      ctaState: { active: null, triggeredAt: null },
      handleHomeCTA: () => {},
      buildCTARequest: (params) => ({
        targetScreen: params.targetScreen,
        defaultMode: params.defaultMode,
        sourceContext: {
          source: 'home',
          slot: params.slot,
          entityType: params.entityType,
          entityId: params.entityId || null,
          monthRef: params.monthRef || toMonthRef(new Date()),
          familyId: '',
          ref: createCTARef('home', params.slot, params.actionName || params.defaultMode),
        },
        payload: params.payload,
      }),
      consumeCTAState: () => null,
      clearCTAState: () => {},
      hasActiveCTA: false,
    };
  }
  
  return context;
}

// ============================================
// CONVENIENCE HOOKS FOR SPECIFIC USE CASES
// ============================================

/**
 * Hook for consuming CTA state in destination screens
 */
export function useCTADestination() {
  const { consumeCTAState, ctaState, clearCTAState } = useCTARouter();
  
  return {
    /** Get and clear the active CTA request */
    consumeCTA: consumeCTAState,
    
    /** Check the current CTA without consuming */
    peekCTA: () => ctaState.active,
    
    /** Clear CTA state (e.g., on unmount or after timeout) */
    clearCTA: clearCTAState,
    
    /** Check if there's a pending CTA */
    hasPendingCTA: !!ctaState.active,
    
    /** Get default mode if CTA exists */
    defaultMode: ctaState.active?.defaultMode || null,
    
    /** Get payload if CTA exists */
    payload: ctaState.active?.payload || null,
    
    /** Get month reference from CTA */
    monthRef: ctaState.active?.sourceContext.monthRef || null,
  };
}
