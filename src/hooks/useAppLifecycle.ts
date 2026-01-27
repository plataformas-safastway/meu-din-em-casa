import { useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_INVALIDATION_GROUPS } from '@/lib/queryConfig';

/**
 * Hook to handle app lifecycle events for cache revalidation
 * 
 * CRITICAL: This hook is carefully tuned to:
 * - NEVER cause page reloads on tab switch
 * - NEVER cause UI flicker on visibility change
 * - Only do background data invalidation (mark stale, don't refetch immediately)
 * 
 * NO RELOAD TRIGGERS HERE - just cache management
 */
export function useAppLifecycle() {
  const queryClient = useQueryClient();
  const lastRefreshRef = useRef<number>(Date.now());
  const visibilityTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Minimum 60s between auto-refreshes
  const MIN_REFRESH_INTERVAL = 60 * 1000;
  
  // Delay before refreshing after visibility change (prevents flash)
  const VISIBILITY_DEBOUNCE = 3000;

  const refreshCriticalData = useCallback(() => {
    const now = Date.now();
    if (now - lastRefreshRef.current < MIN_REFRESH_INTERVAL) {
      console.log('[Lifecycle] Skipping refresh - too soon since last refresh');
      return;
    }
    
    lastRefreshRef.current = now;
    
    console.log('[Lifecycle] Marking data as stale (background, no refetch)');
    
    // CRITICAL: Only INVALIDATE, never refetch immediately
    // This marks data as stale so it's refreshed on next access
    // NO PAGE RELOAD, NO HARD NAVIGATION
    QUERY_INVALIDATION_GROUPS.appResume.forEach((key) => {
      queryClient.invalidateQueries({ 
        queryKey: [key],
        refetchType: 'none', // Mark as stale but DON'T refetch
      });
    });
  }, [queryClient]);

  useEffect(() => {
    // Handle visibility change (tab focus/blur)
    // CRITICAL: This ONLY invalidates cache, it NEVER reloads the page
    const handleVisibilityChange = () => {
      // Clear any pending refresh
      if (visibilityTimeoutRef.current) {
        clearTimeout(visibilityTimeoutRef.current);
        visibilityTimeoutRef.current = null;
      }
      
      if (document.visibilityState === 'visible') {
        console.log('[Lifecycle] Tab became visible - scheduling cache invalidation (no reload)');
        
        // Wait before invalidating to let auth stabilize
        visibilityTimeoutRef.current = setTimeout(() => {
          // Double-check we're still visible
          if (document.visibilityState === 'visible') {
            refreshCriticalData();
          }
        }, VISIBILITY_DEBOUNCE);
      }
    };

    // Handle online/offline - but with debounce
    // CRITICAL: This ONLY invalidates cache, it NEVER reloads the page
    const handleOnline = () => {
      console.log('[Lifecycle] Network reconnected - invalidating cache (no reload)');
      // Wait a moment for auth to stabilize
      setTimeout(() => {
        // Only invalidate, don't force refetch
        queryClient.invalidateQueries({ refetchType: 'none' });
      }, 2000);
    };

    // Handle page show (back/forward cache)
    // CRITICAL: This ONLY invalidates cache, it NEVER reloads the page
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        console.log('[Lifecycle] Page restored from bfcache - invalidating cache (no reload)');
        // Page was restored from bfcache - give time for auth
        setTimeout(() => {
          refreshCriticalData();
        }, VISIBILITY_DEBOUNCE);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('pageshow', handlePageShow);
      
      if (visibilityTimeoutRef.current) {
        clearTimeout(visibilityTimeoutRef.current);
      }
    };
  }, [queryClient, refreshCriticalData]);

  return { refreshCriticalData };
}

/**
 * Hook to clear all user-specific cache on logout
 */
export function useClearCacheOnLogout() {
  const queryClient = useQueryClient();

  const clearUserCache = useCallback(() => {
    // Clear all queries except system ones
    queryClient.clear();
    
    // Also clear any localStorage cache if needed
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('rq-') || key.startsWith('finance-'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (e) {
      // Ignore localStorage errors
    }
  }, [queryClient]);

  return { clearUserCache };
}

/**
 * Hook for pull-to-refresh functionality
 */
export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const queryClient = useQueryClient();
  const isRefreshingRef = useRef(false);

  const handleRefresh = useCallback(async () => {
    if (isRefreshingRef.current) return;
    
    isRefreshingRef.current = true;
    try {
      await onRefresh();
      // Invalidate all active queries
      await queryClient.invalidateQueries({ refetchType: 'active' });
    } finally {
      isRefreshingRef.current = false;
    }
  }, [queryClient, onRefresh]);

  return { handleRefresh, isRefreshing: isRefreshingRef.current };
}
