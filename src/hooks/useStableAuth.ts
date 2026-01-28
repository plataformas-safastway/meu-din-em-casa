import { useEffect, useRef, useSyncExternalStore } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { addBreadcrumb } from '@/lib/observability';

// =====================================================
// Global state to track tab visibility transitions
// This avoids hook ordering issues
// =====================================================

let globalIsInTransition = false;
let globalTransitionTimeout: ReturnType<typeof setTimeout> | null = null;
let lastVisibleTimestamp = Date.now();
let hadSessionBeforeHidden = false;
const transitionListeners = new Set<() => void>();

// Increased transition window to handle slow token refreshes
const TRANSITION_WINDOW_MS = 5000;

function getSnapshot(): boolean {
  return globalIsInTransition;
}

function subscribe(callback: () => void): () => void {
  transitionListeners.add(callback);
  return () => {
    transitionListeners.delete(callback);
  };
}

function notifyListeners() {
  transitionListeners.forEach(listener => listener());
}

/**
 * Mark that we had a valid session before hiding
 * Called from AuthContext when session exists and tab becomes hidden
 */
export function markSessionBeforeHide(hasSession: boolean): void {
  hadSessionBeforeHidden = hasSession;
  if (hasSession) {
    addBreadcrumb('auth', 'session_marked_before_hide');
  }
}

/**
 * Check if we recently had a valid session before tab was hidden
 */
export function hadRecentValidSession(): boolean {
  return hadSessionBeforeHidden;
}

/**
 * Get time since last visible
 */
export function getTimeSinceLastVisible(): number {
  return Date.now() - lastVisibleTimestamp;
}

// Initialize visibility listener once - SYNCHRONOUSLY set transition BEFORE any React render
if (typeof document !== 'undefined') {
  let lastVisibility = document.visibilityState;
  
  // Track visibility changes with extended protection
  document.addEventListener('visibilitychange', () => {
    const isVisible = document.visibilityState === 'visible';
    const wasHidden = lastVisibility === 'hidden';
    lastVisibility = document.visibilityState;
    
    if (!isVisible) {
      // Tab becoming hidden - mark timestamp
      lastVisibleTimestamp = Date.now();
      addBreadcrumb('auth', 'tab_hidden');
    }
    
    if (isVisible && wasHidden) {
      const hiddenDuration = Date.now() - lastVisibleTimestamp;
      console.log('[StableAuth] Tab became visible after', hiddenDuration, 'ms hidden');
      addBreadcrumb('auth', 'tab_visible', { hiddenDuration, hadSession: hadSessionBeforeHidden });
      
      globalIsInTransition = true;
      // Notify synchronously to ensure React sees the new state
      notifyListeners();
      
      if (globalTransitionTimeout) {
        clearTimeout(globalTransitionTimeout);
      }
      
      // Extended window for slow networks/token refresh
      globalTransitionTimeout = setTimeout(() => {
        globalIsInTransition = false;
        console.log('[StableAuth] Transition period ended');
        addBreadcrumb('auth', 'transition_ended');
        notifyListeners();
      }, TRANSITION_WINDOW_MS);
    }
  }, true); // Use capture phase
  
  // Also track focus for additional safety
  window.addEventListener('focus', () => {
    // If we're not already in transition but coming back from blur, start one
    if (!globalIsInTransition && document.visibilityState === 'visible') {
      globalIsInTransition = true;
      notifyListeners();
      
      if (globalTransitionTimeout) {
        clearTimeout(globalTransitionTimeout);
      }
      
      globalTransitionTimeout = setTimeout(() => {
        globalIsInTransition = false;
        notifyListeners();
      }, TRANSITION_WINDOW_MS);
    }
  });
}

/**
 * Hook that provides stable authentication state
 * Prevents flash redirects during token refresh or tab focus
 * 
 * Uses useSyncExternalStore for synchronous updates from visibility changes
 */
export function useStableAuth() {
  const auth = useAuth();
  
  // Use useSyncExternalStore for synchronous subscription to global state
  const isAuthTransition = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  
  const lastValidSessionRef = useRef<boolean>(!!auth.session);
  
  // Track last valid session and update global state
  useEffect(() => {
    if (auth.session) {
      lastValidSessionRef.current = true;
      // Mark for visibility change detection
      markSessionBeforeHide(true);
    } else if (auth.bootstrapStatus === 'ready' && !isAuthTransition) {
      // Only clear if truly logged out (not during transition)
      lastValidSessionRef.current = false;
      markSessionBeforeHide(false);
    }
  }, [auth.session, auth.bootstrapStatus, isAuthTransition]);

  // Computed stable values
  const isLoading = auth.bootstrapStatus === 'initializing' || 
                    auth.profileStatus === 'loading' || 
                    isAuthTransition;

  // CRITICAL: Consider session valid if:
  // 1. We have a session now, OR
  // 2. We're in transition AND we had a session before hiding
  const hasValidSession = auth.session !== null || 
                          (isAuthTransition && lastValidSessionRef.current);

  // Log when shouldRedirectToLogin would be true
  const shouldRedirectToLogin = !isLoading && !hasValidSession && auth.bootstrapStatus === 'ready';
  
  if (shouldRedirectToLogin) {
    console.warn('[StableAuth] shouldRedirectToLogin=true', {
      isLoading,
      hasValidSession,
      bootstrapStatus: auth.bootstrapStatus,
      isAuthTransition,
      hasSession: !!auth.session,
      lastValidSession: lastValidSessionRef.current,
      hadSessionBeforeHidden,
    });
  }

  return {
    ...auth,
    isLoading,
    hasValidSession,
    isAuthTransition,
    shouldRedirectToLogin,
  };
}

/**
 * Simple function to check if we're in a focus transition
 * Non-hook version for use in callbacks
 */
export function isInFocusTransition(): boolean {
  return globalIsInTransition;
}
