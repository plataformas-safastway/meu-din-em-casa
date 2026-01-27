import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

// Global state to track tab visibility transitions
// This avoids hook ordering issues
let globalIsInTransition = false;
let globalTransitionTimeout: ReturnType<typeof setTimeout> | null = null;
const transitionListeners = new Set<() => void>();

function notifyListeners() {
  transitionListeners.forEach(listener => listener());
}

// Initialize visibility listener once
if (typeof document !== 'undefined') {
  let lastVisibility = document.visibilityState;
  
  document.addEventListener('visibilitychange', () => {
    const isVisible = document.visibilityState === 'visible';
    const wasHidden = lastVisibility === 'hidden';
    lastVisibility = document.visibilityState;
    
    if (isVisible && wasHidden) {
      console.log('[StableAuth] Tab became visible, starting transition');
      globalIsInTransition = true;
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
  });
}

/**
 * Hook that provides stable authentication state
 * Prevents flash redirects during token refresh or tab focus
 */
export function useStableAuth() {
  const auth = useAuth();
  const [, forceUpdate] = useState(0);
  const lastValidSessionRef = useRef<boolean>(!!auth.session);
  
  // Subscribe to global transition state changes
  useEffect(() => {
    const listener = () => forceUpdate(n => n + 1);
    transitionListeners.add(listener);
    return () => {
      transitionListeners.delete(listener);
    };
  }, []);
  
  // Track last valid session
  useEffect(() => {
    if (auth.session) {
      lastValidSessionRef.current = true;
    } else if (auth.bootstrapStatus === 'ready' && !globalIsInTransition) {
      lastValidSessionRef.current = false;
    }
  }, [auth.session, auth.bootstrapStatus]);

  // Computed stable values
  const isLoading = auth.bootstrapStatus === 'initializing' || 
                    auth.profileStatus === 'loading' || 
                    globalIsInTransition;

  const hasValidSession = auth.session !== null || 
                          (globalIsInTransition && lastValidSessionRef.current);

  return {
    ...auth,
    isLoading,
    hasValidSession,
    isAuthTransition: globalIsInTransition,
    shouldRedirectToLogin: !isLoading && !hasValidSession && auth.bootstrapStatus === 'ready',
  };
}

/**
 * Simple function to check if we're in a focus transition
 * Non-hook version for use in callbacks
 */
export function isInFocusTransition(): boolean {
  return globalIsInTransition;
}
