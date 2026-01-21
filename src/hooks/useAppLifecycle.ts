import { useEffect, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { QUERY_INVALIDATION_GROUPS } from '@/lib/queryConfig';

/**
 * Hook to handle app lifecycle events for cache revalidation
 * Triggers refresh when:
 * - App gains focus (tab becomes visible)
 * - App returns from background
 * - Network reconnects
 */
export function useAppLifecycle() {
  const queryClient = useQueryClient();
  const lastRefreshRef = useRef<number>(Date.now());
  const MIN_REFRESH_INTERVAL = 30 * 1000; // Minimum 30s between auto-refreshes

  const refreshCriticalData = useCallback(() => {
    const now = Date.now();
    if (now - lastRefreshRef.current < MIN_REFRESH_INTERVAL) {
      return; // Too soon since last refresh
    }
    
    lastRefreshRef.current = now;
    
    // Invalidate critical queries on app resume
    QUERY_INVALIDATION_GROUPS.appResume.forEach((key) => {
      queryClient.invalidateQueries({ 
        queryKey: [key],
        refetchType: 'active',
      });
    });
  }, [queryClient]);

  useEffect(() => {
    // Handle visibility change (tab focus/blur)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshCriticalData();
      }
    };

    // Handle online/offline
    const handleOnline = () => {
      // When back online, refresh all active queries
      queryClient.invalidateQueries({ refetchType: 'active' });
    };

    // Handle page show (back/forward cache)
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        // Page was restored from bfcache
        refreshCriticalData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('online', handleOnline);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('pageshow', handlePageShow);
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
