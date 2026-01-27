import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook that provides stable authentication state
 * Prevents flash redirects during token refresh or tab focus
 * 
 * Key features:
 * - Debounces auth state changes to prevent flicker
 * - Tracks if we're in a "transition" period (tab switch, token refresh)
 * - Never reports "no session" during temporary states
 */
export function useStableAuth() {
  const auth = useAuth();
  const [isAuthTransition, setIsAuthTransition] = useState(false);
  const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastValidSessionRef = useRef<boolean>(!!auth.session);
  const visibilityRef = useRef<boolean>(document.visibilityState === 'visible');

  // Track visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = document.visibilityState === 'visible';
      const wasHidden = !visibilityRef.current;
      visibilityRef.current = isVisible;

      // If returning to visible after being hidden
      if (isVisible && wasHidden && lastValidSessionRef.current) {
        console.log('[StableAuth] Tab became visible, marking transition period');
        setIsAuthTransition(true);

        // Give time for session refresh
        if (transitionTimeoutRef.current) {
          clearTimeout(transitionTimeoutRef.current);
        }
        transitionTimeoutRef.current = setTimeout(() => {
          setIsAuthTransition(false);
          console.log('[StableAuth] Transition period ended');
        }, 2000); // 2 second grace period
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }
    };
  }, []);

  // Track last valid session
  useEffect(() => {
    if (auth.session) {
      lastValidSessionRef.current = true;
    } else if (auth.bootstrapStatus === 'ready' && !isAuthTransition) {
      // Only clear if we're fully ready AND not in transition
      lastValidSessionRef.current = false;
    }
  }, [auth.session, auth.bootstrapStatus, isAuthTransition]);

  // Computed stable values
  const isLoading = auth.bootstrapStatus === 'initializing' || 
                    auth.profileStatus === 'loading' || 
                    isAuthTransition;

  const hasValidSession = auth.session !== null || 
                          (isAuthTransition && lastValidSessionRef.current);

  return {
    ...auth,
    isLoading,
    hasValidSession,
    isAuthTransition,
    // Safe check: only returns false when we're CERTAIN there's no session
    shouldRedirectToLogin: !isLoading && !hasValidSession && auth.bootstrapStatus === 'ready',
  };
}

/**
 * Hook to track if we're in a focus transition
 * Used to prevent data resets during tab switches
 */
export function useFocusTransition() {
  const [isInTransition, setIsInTransition] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleFocus = () => {
      console.log('[FocusTransition] Window focused, starting transition');
      setIsInTransition(true);
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        setIsInTransition(false);
        console.log('[FocusTransition] Transition ended');
      }, 1500);
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        handleFocus();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return isInTransition;
}
