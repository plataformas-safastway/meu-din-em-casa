import { useEffect, useRef, useSyncExternalStore, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { addBreadcrumb } from '@/lib/observability';
import { logLifecycle, isLifecycleDebugEnabled, logTabEvent } from '@/lib/lifecycleTracer';

// =====================================================
// Global state to track tab visibility transitions
// This avoids hook ordering issues
// =====================================================

let globalIsInTransition = false;
let globalTransitionTimeout: ReturnType<typeof setTimeout> | null = null;
let lastVisibleTimestamp = Date.now();
let lastHiddenTimestamp = 0;
let hadSessionBeforeHidden = false;
const transitionListeners = new Set<() => void>();

// Extended transition window for slow token refreshes (15 seconds)
const TRANSITION_WINDOW_MS = 15000;

// Minimum hidden time to trigger protection (500ms - covers quick tab switches)
const MIN_HIDDEN_FOR_PROTECTION = 500;

// NEW: Minimum hidden time to trigger hard check (3 seconds)
const MIN_HIDDEN_FOR_HARD_CHECK = 3000;

// NEW: Threshold before showing overlay (600ms)
const OVERLAY_DELAY_MS = 600;

// NEW: Maximum transition duration before auto-clear (prevents stuck state)
const MAX_TRANSITION_DURATION_MS = 20000;

// NEW: Track if we're in a "soft" resume (no overlay needed)
let globalIsSoftResume = false;
let globalResumeStartTime = 0;
let globalTokenRefreshInProgress = false;
let globalHardCheckInProgress = false;
let globalTransitionStartTime = 0;

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
 * Uses time-based check to avoid stale state issues
 */
export function hadRecentValidSession(): boolean {
  // If we had a session when hidden AND it was within the protection window
  const timeSinceHidden = lastHiddenTimestamp > 0 ? Date.now() - lastHiddenTimestamp : Infinity;
  const isRecent = timeSinceHidden < TRANSITION_WINDOW_MS;
  
  if (isLifecycleDebugEnabled()) {
    console.log('[StableAuth] hadRecentValidSession check:', {
      hadSessionBeforeHidden,
      timeSinceHidden,
      isRecent,
      TRANSITION_WINDOW_MS,
    });
  }
  
  return hadSessionBeforeHidden && isRecent;
}

/**
 * Get time since last visible
 */
export function getTimeSinceLastVisible(): number {
  return Date.now() - lastVisibleTimestamp;
}

/**
 * Get duration since resume started (for overlay delay logic)
 */
export function getResumeDuration(): number {
  return globalResumeStartTime > 0 ? Date.now() - globalResumeStartTime : 0;
}

/**
 * Check if we're in a soft resume (no overlay needed yet)
 */
export function isSoftResume(): boolean {
  return globalIsSoftResume;
}

/**
 * Check if token refresh is in progress
 */
export function isTokenRefreshInProgress(): boolean {
  return globalTokenRefreshInProgress;
}

/**
 * Mark token refresh status
 */
export function setTokenRefreshInProgress(inProgress: boolean): void {
  globalTokenRefreshInProgress = inProgress;
  if (isLifecycleDebugEnabled()) {
    console.log('[StableAuth] Token refresh:', inProgress);
  }
  notifyListeners();
}

/**
 * Check if hard auth check is in progress
 */
export function isHardCheckInProgress(): boolean {
  return globalHardCheckInProgress;
}

/**
 * Mark hard check status (used during boot or forced re-auth)
 */
export function setHardCheckInProgress(inProgress: boolean): void {
  globalHardCheckInProgress = inProgress;
  if (isLifecycleDebugEnabled()) {
    console.log('[StableAuth] Hard check:', inProgress);
  }
  notifyListeners();
}

// Initialize visibility listener once - SYNCHRONOUSLY set transition BEFORE any React render
if (typeof document !== 'undefined') {
  let lastVisibility = document.visibilityState;
  
  // Track visibility changes with extended protection
  document.addEventListener('visibilitychange', () => {
    const isVisible = document.visibilityState === 'visible';
    const wasHidden = lastVisibility === 'hidden';
    lastVisibility = document.visibilityState;
    
    // Log for lifecycle debugging
    logTabEvent('visibilitychange', { visibilityState: document.visibilityState });
    
    if (!isVisible) {
      // Tab becoming hidden - mark timestamps
      lastHiddenTimestamp = Date.now();
      lastVisibleTimestamp = Date.now();
      addBreadcrumb('auth', 'tab_hidden');
      
      if (isLifecycleDebugEnabled()) {
        console.log('[StableAuth] Tab hidden at:', lastHiddenTimestamp);
      }
    }
    
    if (isVisible && wasHidden) {
      const hiddenDuration = Date.now() - lastHiddenTimestamp;
      console.log('[StableAuth] Tab became visible after', hiddenDuration, 'ms hidden');
      addBreadcrumb('auth', 'tab_visible', { hiddenDuration, hadSession: hadSessionBeforeHidden });
      
      // NEW: Determine if this is a soft resume (short hide, no overlay needed)
      if (hiddenDuration < MIN_HIDDEN_FOR_HARD_CHECK) {
        // Short hide - soft resume, no overlay
        globalIsSoftResume = true;
        console.log('[StableAuth] Soft resume - hidden only', hiddenDuration, 'ms, no overlay needed');
        
        // Don't trigger full transition for short hides
        if (hiddenDuration < MIN_HIDDEN_FOR_PROTECTION) {
          return;
        }
      } else {
        // Longer hide - may need overlay if verification takes time
        globalIsSoftResume = false;
        globalResumeStartTime = Date.now();
      }
      
      // Only enable protection if hidden for meaningful time
      if (hiddenDuration >= MIN_HIDDEN_FOR_PROTECTION) {
        globalIsInTransition = true;
        globalTransitionStartTime = Date.now(); // Track start time
        // Notify synchronously to ensure React sees the new state
        notifyListeners();
        
        if (globalTransitionTimeout) {
          clearTimeout(globalTransitionTimeout);
        }
        
        // Extended window for slow networks/token refresh
        globalTransitionTimeout = setTimeout(() => {
          globalIsInTransition = false;
          globalIsSoftResume = false;
          globalResumeStartTime = 0;
          globalTransitionStartTime = 0;
          console.log('[StableAuth] Transition period ended after', TRANSITION_WINDOW_MS, 'ms');
          addBreadcrumb('auth', 'transition_ended');
          notifyListeners();
        }, TRANSITION_WINDOW_MS);
        
        if (isLifecycleDebugEnabled()) {
          console.log('[StableAuth] Protection enabled for', TRANSITION_WINDOW_MS, 'ms');
        }
      } else {
        console.log('[StableAuth] Skipping protection - hidden too briefly:', hiddenDuration, 'ms');
      }
    }
  }, true); // Use capture phase
  
  // Also track focus for additional safety
  window.addEventListener('focus', () => {
    logTabEvent('focus');
    
    // If we're not already in transition but coming back from blur, start one
    if (!globalIsInTransition && document.visibilityState === 'visible') {
      const hiddenDuration = Date.now() - lastHiddenTimestamp;
      
      // Only trigger for longer hides
      if (hiddenDuration >= MIN_HIDDEN_FOR_HARD_CHECK) {
        globalIsInTransition = true;
        globalIsSoftResume = false;
        globalResumeStartTime = Date.now();
        notifyListeners();
        
        if (globalTransitionTimeout) {
          clearTimeout(globalTransitionTimeout);
        }
        
        globalTransitionTimeout = setTimeout(() => {
          globalIsInTransition = false;
          globalIsSoftResume = false;
          globalResumeStartTime = 0;
          notifyListeners();
        }, TRANSITION_WINDOW_MS);
      } else if (hiddenDuration >= MIN_HIDDEN_FOR_PROTECTION) {
        // Medium hide - soft resume
        globalIsSoftResume = true;
        globalIsInTransition = true;
        notifyListeners();
        
        if (globalTransitionTimeout) {
          clearTimeout(globalTransitionTimeout);
        }
        
        globalTransitionTimeout = setTimeout(() => {
          globalIsInTransition = false;
          globalIsSoftResume = false;
          notifyListeners();
        }, TRANSITION_WINDOW_MS);
      }
    }
  });
  
  window.addEventListener('blur', () => {
    logTabEvent('blur');
  });
}

/**
 * Check if transition is stuck (exceeded max duration)
 */
export function isTransitionStuck(): boolean {
  if (!globalIsInTransition || globalTransitionStartTime === 0) {
    return false;
  }
  return (Date.now() - globalTransitionStartTime) > MAX_TRANSITION_DURATION_MS;
}

/**
 * Get transition duration in milliseconds
 */
export function getTransitionDuration(): number {
  if (!globalIsInTransition || globalTransitionStartTime === 0) {
    return 0;
  }
  return Date.now() - globalTransitionStartTime;
}

/**
 * Clear transition state (called when auth is verified)
 */
export function clearTransition(): void {
  if (globalTransitionTimeout) {
    clearTimeout(globalTransitionTimeout);
    globalTransitionTimeout = null;
  }
  globalIsInTransition = false;
  globalIsSoftResume = false;
  globalResumeStartTime = 0;
  globalTransitionStartTime = 0;
  globalTokenRefreshInProgress = false;
  globalHardCheckInProgress = false;
  notifyListeners();
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
  
  // NEW: Track if overlay should be shown based on timing
  const [shouldShowOverlay, setShouldShowOverlay] = useState(false);
  const overlayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Track last valid session and update global state
  useEffect(() => {
    if (auth.session) {
      lastValidSessionRef.current = true;
      // Mark for visibility change detection
      markSessionBeforeHide(true);
      
      // Session confirmed - clear transition if we were in one
      if (isAuthTransition && !globalTokenRefreshInProgress) {
        console.log('[StableAuth] Session confirmed, clearing transition');
        clearTransition();
      }
    } else if (auth.bootstrapStatus === 'ready' && !isAuthTransition) {
      // Only clear if truly logged out (not during transition)
      lastValidSessionRef.current = false;
      markSessionBeforeHide(false);
    }
  }, [auth.session, auth.bootstrapStatus, isAuthTransition]);
  
  // NEW: Delayed overlay logic - only show after OVERLAY_DELAY_MS
  useEffect(() => {
    if (overlayTimerRef.current) {
      clearTimeout(overlayTimerRef.current);
      overlayTimerRef.current = null;
    }
    
    const hasSession = auth.session !== null || lastValidSessionRef.current;
    
    // Immediate overlay for token refresh or hard check
    if (hasSession && (globalTokenRefreshInProgress || globalHardCheckInProgress)) {
      setShouldShowOverlay(true);
      return;
    }
    
    // Soft resume or no transition - no overlay
    if (!isAuthTransition || globalIsSoftResume) {
      setShouldShowOverlay(false);
      return;
    }
    
    // In transition with session - delay overlay
    if (hasSession && isAuthTransition) {
      overlayTimerRef.current = setTimeout(() => {
        // Only show if still in transition after delay
        if (globalIsInTransition && !globalIsSoftResume) {
          console.log('[StableAuth] Showing overlay after', OVERLAY_DELAY_MS, 'ms delay');
          setShouldShowOverlay(true);
        }
      }, OVERLAY_DELAY_MS);
    } else {
      setShouldShowOverlay(false);
    }
    
    return () => {
      if (overlayTimerRef.current) {
        clearTimeout(overlayTimerRef.current);
      }
    };
  }, [isAuthTransition, auth.session]);

  // NEW: Safety mechanism to auto-clear stuck transitions
  useEffect(() => {
    if (!isAuthTransition) return;
    
    // Check periodically if transition is stuck
    const checkStuckInterval = setInterval(() => {
      if (isTransitionStuck()) {
        console.warn('[StableAuth] Transition stuck for >', MAX_TRANSITION_DURATION_MS, 'ms - auto-clearing');
        addBreadcrumb('auth', 'transition_stuck_auto_clear', { 
          duration: getTransitionDuration(),
          hasSession: !!auth.session,
        });
        clearTransition();
      }
    }, 5000); // Check every 5 seconds
    
    return () => clearInterval(checkStuckInterval);
  }, [isAuthTransition, auth.session]);

  // Computed stable values
  const isLoading = auth.bootstrapStatus === 'initializing' || 
                    auth.profileStatus === 'loading';
  
  // NEW: Separate loading from overlay decision
  const isVerifying = isAuthTransition && !globalIsSoftResume;

  // ============================================================
  // HARD LOGOUT CHECK - BLOCKS ALL AUTO-LOGIN
  // ============================================================
  // If user explicitly logged out, treat as if no session exists
  // This forces manual re-authentication even if Supabase has a valid token
  let logoutRequired = false;
  try {
    logoutRequired = localStorage.getItem('oik:logout_required') === 'true';
  } catch {
    // localStorage may not be available
  }
  // ============================================================

  // CRITICAL: Consider session valid if:
  // 1. We have a session now, OR
  // 2. We're in transition AND we had a session before hiding
  // BUT: If logout_required is true, session is NEVER valid
  const hasValidSession = !logoutRequired && (
    auth.session !== null || 
    (isAuthTransition && lastValidSessionRef.current)
  );

  // Log when shouldRedirectToLogin would be true
  const shouldRedirectToLogin = !isLoading && !hasValidSession && auth.bootstrapStatus === 'ready' && !isAuthTransition;
  
  if (shouldRedirectToLogin) {
    console.warn('[StableAuth] shouldRedirectToLogin=true', {
      isLoading,
      hasValidSession,
      logoutRequired,
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
    isVerifying,
    hasValidSession,
    isAuthTransition,
    shouldRedirectToLogin,
    // HARD LOGOUT: Exposed for components that need to check
    logoutRequired,
    // NEW: Fine-grained overlay control
    shouldShowSessionOverlay: shouldShowOverlay,
    isSoftResume: globalIsSoftResume,
  };
}

/**
 * Simple function to check if we're in a focus transition
 * Non-hook version for use in callbacks
 */
export function isInFocusTransition(): boolean {
  return globalIsInTransition;
}
