import { useState, useEffect, useRef } from "react";

interface UseDebouncedLoadingOptions {
  /** Minimum time to show loading (avoids "flash") */
  minDuration?: number;
  /** Delay before showing loading (avoids flash for fast operations) */
  delay?: number;
}

/**
 * Hook that debounces loading state to avoid "flashing" for fast operations.
 * - Shows loading only after `delay` ms (default: 300ms)
 * - Once shown, keeps loading visible for at least `minDuration` ms (default: 500ms)
 * 
 * @param isLoading - The actual loading state
 * @param options - Configuration options
 * @returns Debounced loading state
 */
export function useDebouncedLoading(
  isLoading: boolean,
  options: UseDebouncedLoadingOptions = {}
): boolean {
  const { delay = 300, minDuration = 500 } = options;
  
  const [showLoading, setShowLoading] = useState(false);
  const loadingStartRef = useRef<number | null>(null);
  const delayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const minDurationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (isLoading) {
      // Start delay timer
      delayTimeoutRef.current = setTimeout(() => {
        setShowLoading(true);
        loadingStartRef.current = Date.now();
      }, delay);
    } else {
      // Clear delay timer if loading finished before delay
      if (delayTimeoutRef.current) {
        clearTimeout(delayTimeoutRef.current);
        delayTimeoutRef.current = null;
      }

      // If loading was shown, ensure minimum duration
      if (loadingStartRef.current !== null) {
        const elapsed = Date.now() - loadingStartRef.current;
        const remaining = minDuration - elapsed;

        if (remaining > 0) {
          minDurationTimeoutRef.current = setTimeout(() => {
            setShowLoading(false);
            loadingStartRef.current = null;
          }, remaining);
        } else {
          setShowLoading(false);
          loadingStartRef.current = null;
        }
      }
    }

    return () => {
      if (delayTimeoutRef.current) {
        clearTimeout(delayTimeoutRef.current);
      }
      if (minDurationTimeoutRef.current) {
        clearTimeout(minDurationTimeoutRef.current);
      }
    };
  }, [isLoading, delay, minDuration]);

  return showLoading;
}

/**
 * Checks if user prefers reduced motion.
 */
export function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    
    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return prefersReducedMotion;
}