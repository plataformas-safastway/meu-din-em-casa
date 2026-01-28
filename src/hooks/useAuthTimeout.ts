import { useState, useEffect, useCallback, useRef } from 'react';
import { logAuthStage } from '@/lib/authDebug';
import { recordAuthStage } from '@/lib/authInstrumentation';
import { captureEvent, addBreadcrumb } from '@/lib/observability';

interface UseAuthTimeoutOptions {
  /** Timeout in milliseconds (default: 10000 = 10s) */
  timeoutMs?: number;
  /** Whether auth is currently loading */
  isLoading: boolean;
  /** Callback when timeout is triggered */
  onTimeout?: () => void;
}

interface UseAuthTimeoutReturn {
  /** Whether the auth has timed out */
  hasTimedOut: boolean;
  /** Reset the timeout (call when retrying) */
  resetTimeout: () => void;
  /** Time remaining in seconds */
  remainingSeconds: number;
}

/**
 * Hook to detect and handle auth loading timeouts
 * 
 * Prevents infinite loading states by triggering a timeout fallback
 * after a configurable duration.
 */
export function useAuthTimeout({
  timeoutMs = 10000,
  isLoading,
  onTimeout,
}: UseAuthTimeoutOptions): UseAuthTimeoutReturn {
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(Math.ceil(timeoutMs / 1000));
  const startTimeRef = useRef<number | null>(null);
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalIdRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = useCallback(() => {
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
  }, []);

  const resetTimeout = useCallback(() => {
    addBreadcrumb('auth', 'timeout_reset');
    setHasTimedOut(false);
    setRemainingSeconds(Math.ceil(timeoutMs / 1000));
    startTimeRef.current = null;
    clearTimers();
  }, [timeoutMs, clearTimers]);

  useEffect(() => {
    // If not loading, clear timers and reset
    if (!isLoading) {
      clearTimers();
      if (startTimeRef.current !== null) {
        // Auth completed successfully
        const elapsed = Date.now() - startTimeRef.current;
        addBreadcrumb('auth', 'loading_complete', { elapsed });
        setHasTimedOut(false);
        startTimeRef.current = null;
      }
      return;
    }

    // Already timed out, don't restart
    if (hasTimedOut) {
      return;
    }

    // Start timing
    if (startTimeRef.current === null) {
      startTimeRef.current = Date.now();
      setRemainingSeconds(Math.ceil(timeoutMs / 1000));
      addBreadcrumb('auth', 'timeout_started', { timeoutMs });
    }

    // Set up countdown interval
    intervalIdRef.current = setInterval(() => {
      if (startTimeRef.current === null) return;
      
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, Math.ceil((timeoutMs - elapsed) / 1000));
      setRemainingSeconds(remaining);
    }, 1000);

    // Set up timeout
    timeoutIdRef.current = setTimeout(() => {
      const context = {
        timeoutMs,
        startTime: startTimeRef.current,
        path: window.location.pathname,
        search: window.location.search,
      };
      
      // Log to legacy debug system
      logAuthStage('AUTH_TIMEOUT', context);
      
      // Log to production observability
      recordAuthStage('timeout');
      
      // Capture as fatal event
      captureEvent({
        category: 'auth',
        name: 'timeout_triggered',
        severity: 'fatal',
        message: `Auth loading timed out after ${timeoutMs}ms`,
        data: context,
      });
      
      setHasTimedOut(true);
      clearTimers();
      onTimeout?.();
    }, timeoutMs);

    return () => {
      clearTimers();
    };
  }, [isLoading, hasTimedOut, timeoutMs, onTimeout, clearTimers]);

  return {
    hasTimedOut,
    resetTimeout,
    remainingSeconds,
  };
}
