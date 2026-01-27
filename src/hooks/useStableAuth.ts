import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useAuth } from '@/contexts/AuthContext';

// Global state to track tab visibility transitions
// This avoids hook ordering issues
let globalIsInTransition = false;
let globalTransitionTimeout: ReturnType<typeof setTimeout> | null = null;
const transitionListeners = new Set<() => void>();

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

// Initialize visibility listener once - SYNCHRONOUSLY set transition BEFORE any React render
if (typeof document !== 'undefined') {
  let lastVisibility = document.visibilityState;
  
  // Use capture phase to run BEFORE any other handlers
  document.addEventListener('visibilitychange', () => {
    const isVisible = document.visibilityState === 'visible';
    const wasHidden = lastVisibility === 'hidden';
    lastVisibility = document.visibilityState;
    
    if (isVisible && wasHidden) {
      console.log('[StableAuth] Tab became visible, IMMEDIATELY marking transition');
      globalIsInTransition = true;
      // Notify synchronously to ensure React sees the new state
      notifyListeners();
      
      if (globalTransitionTimeout) {
        clearTimeout(globalTransitionTimeout);
      }
      
      globalTransitionTimeout = setTimeout(() => {
        globalIsInTransition = false;
        console.log('[StableAuth] Transition period ended');
        notifyListeners();
      }, 2000);
    }
  }, true); // Use capture phase
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
  
  // Track last valid session
  useEffect(() => {
    if (auth.session) {
      lastValidSessionRef.current = true;
    } else if (auth.bootstrapStatus === 'ready' && !isAuthTransition) {
      lastValidSessionRef.current = false;
    }
  }, [auth.session, auth.bootstrapStatus, isAuthTransition]);

  // Computed stable values
  const isLoading = auth.bootstrapStatus === 'initializing' || 
                    auth.profileStatus === 'loading' || 
                    isAuthTransition;

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
