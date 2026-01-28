import { useState, useEffect, useCallback, useRef } from 'react';
import { logAuthStage } from '@/lib/authDebug';
import { recordAuthStage } from '@/lib/authInstrumentation';
import { captureEvent, addBreadcrumb } from '@/lib/observability';

interface UseAuthTimeoutOptions {
  /** Timeout in milliseconds before showing "taking longer" message (default: 10000 = 10s) */
  timeoutMs?: number;
  /** Whether auth is currently loading */
  isLoading: boolean;
  /** Callback when timeout is triggered (optional - for analytics/logging) */
  onTimeout?: () => void;
  /** If true, the timeout is "soft" and doesn't block (default: true) */
  softMode?: boolean;
}

interface UseAuthTimeoutReturn {
  /** Whether the auth has exceeded the timeout threshold */
  hasTimedOut: boolean;
  /** Reset the timeout (call when retrying) */
  resetTimeout: () => void;
  /** Time remaining in seconds before timeout triggers */
  remainingSeconds: number;
  /** Whether we're in "slow loading" state (past warning threshold but before full timeout) */
  isSlowLoading: boolean;
  /** Time elapsed since loading started (in seconds) */
  elapsedSeconds: number;
}

// Warning threshold: Show "taking longer" message at 5 seconds
const WARNING_THRESHOLD_MS = 5000;

/**
 * Hook to detect and handle auth loading timeouts
 * 
 * BEHAVIOR (v2 - non-blocking):
 * - Tracks loading duration without blocking UI
 * - Provides progressive state: normal -> slow -> timeout
 * - NEVER triggers automatic redirects
 * - Only provides state for UI to show recovery options
 * - Timeout does NOT alter authorization state
 */
export function useAuthTimeout({
  timeoutMs = 10000,
  isLoading,
  onTimeout,
  softMode = true,
}: UseAuthTimeoutOptions): UseAuthTimeoutReturn {
  const [hasTimedOut, setHasTimedOut] = useState(false);
  const [isSlowLoading, setIsSlowLoading] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState(Math.ceil(timeoutMs / 1000));
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  
  const startTimeRef = useRef<number | null>(null);
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalIdRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = useCallback(() => {
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
    if (warningIdRef.current) {
      clearTimeout(warningIdRef.current);
      warningIdRef.current = null;
    }
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
  }, []);

  const resetTimeout = useCallback(() => {
    addBreadcrumb('auth', 'timeout_reset');
    setHasTimedOut(false);
    setIsSlowLoading(false);
    setRemainingSeconds(Math.ceil(timeoutMs / 1000));
    setElapsedSeconds(0);
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
        setIsSlowLoading(false);
        setElapsedSeconds(0);
        startTimeRef.current = null;
      }
      return;
    }

    // Already timed out, don't restart timers
    if (hasTimedOut) {
      return;
    }

    // Start timing
    if (startTimeRef.current === null) {
      startTimeRef.current = Date.now();
      setRemainingSeconds(Math.ceil(timeoutMs / 1000));
      setElapsedSeconds(0);
      addBreadcrumb('auth', 'timeout_started', { timeoutMs, softMode });
    }

    // Set up countdown interval (updates every second)
    intervalIdRef.current = setInterval(() => {
      if (startTimeRef.current === null) return;
      
      const elapsed = Date.now() - startTimeRef.current;
      const remaining = Math.max(0, Math.ceil((timeoutMs - elapsed) / 1000));
      setRemainingSeconds(remaining);
      setElapsedSeconds(Math.floor(elapsed / 1000));
    }, 1000);

    // Set up warning threshold (5 seconds)
    warningIdRef.current = setTimeout(() => {
      console.log('[AuthTimeout] Entering slow loading state');
      addBreadcrumb('auth', 'slow_loading');
      setIsSlowLoading(true);
    }, WARNING_THRESHOLD_MS);

    // Set up timeout
    timeoutIdRef.current = setTimeout(() => {
      const context = {
        timeoutMs,
        startTime: startTimeRef.current,
        path: window.location.pathname,
        search: window.location.search,
        softMode,
      };
      
      // Log to legacy debug system
      logAuthStage('AUTH_TIMEOUT', context);
      
      // Log to production observability
      recordAuthStage('timeout');
      
      // Capture as warning (not fatal in soft mode)
      captureEvent({
        category: 'auth',
        name: 'timeout_threshold_reached',
        severity: softMode ? 'warning' : 'fatal',
        message: `Auth loading exceeded ${timeoutMs}ms threshold`,
        data: context,
      });
      
      console.log('[AuthTimeout] Timeout threshold reached - showing recovery options');
      setHasTimedOut(true);
      
      // Call optional callback for analytics
      onTimeout?.();
      
      // Clear interval but keep tracking (user might retry)
      if (intervalIdRef.current) {
        clearInterval(intervalIdRef.current);
        intervalIdRef.current = null;
      }
    }, timeoutMs);

    return () => {
      clearTimers();
    };
  }, [isLoading, hasTimedOut, timeoutMs, onTimeout, softMode, clearTimers]);

  return {
    hasTimedOut,
    resetTimeout,
    remainingSeconds,
    isSlowLoading,
    elapsedSeconds,
  };
}
