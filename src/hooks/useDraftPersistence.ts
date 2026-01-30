import { useEffect, useCallback, useRef, useState } from 'react';

const DRAFT_PREFIX = 'oik_draft_';
const DRAFT_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

interface DraftMetadata {
  savedAt: number;
  route: string;
}

interface DraftData<T> {
  data: T;
  meta: DraftMetadata;
}

/**
 * Hook for auto-saving form drafts to localStorage
 * Prevents data loss when user switches tabs/windows
 */
export function useDraftPersistence<T extends Record<string, any>>(
  draftKey: string,
  options: {
    debounceMs?: number;
    enabled?: boolean;
  } = {}
) {
  const { debounceMs = 2000, enabled = true } = options;
  const [restoredDraft, setRestoredDraft] = useState<T | null>(null);
  const [wasRestored, setWasRestored] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedRef = useRef<string>('');

  const fullKey = `${DRAFT_PREFIX}${draftKey}`;

  // Load draft on mount
  useEffect(() => {
    if (!enabled) return;

    // CRITICAL: Check if user just logged out - skip restoration to avoid race condition
    // The logout flow sets this flag before the component mounts
    const wasLoggedOut = sessionStorage.getItem('oik:just_logged_out');
    if (wasLoggedOut) {
      // Don't restore drafts after logout - let the cleanup effect handle it
      console.log('[Draft] Skipping restoration - user just logged out');
      return;
    }

    try {
      const stored = localStorage.getItem(fullKey);
      if (stored) {
        const parsed: DraftData<T> = JSON.parse(stored);
        
        // Check if draft is expired
        if (Date.now() - parsed.meta.savedAt > DRAFT_EXPIRY_MS) {
          localStorage.removeItem(fullKey);
          return;
        }

        setRestoredDraft(parsed.data);
        setWasRestored(true);
      }
    } catch (e) {
      console.warn('[Draft] Failed to restore draft:', e);
      localStorage.removeItem(fullKey);
    }
  }, [fullKey, enabled]);

  // Save draft with debounce
  const saveDraft = useCallback((data: T) => {
    if (!enabled) return;

    // Clear pending save
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      try {
        const serialized = JSON.stringify(data);
        
        // Skip if nothing changed
        if (serialized === lastSavedRef.current) return;
        
        const draftData: DraftData<T> = {
          data,
          meta: {
            savedAt: Date.now(),
            route: window.location.pathname,
          },
        };

        localStorage.setItem(fullKey, JSON.stringify(draftData));
        lastSavedRef.current = serialized;
        console.log('[Draft] Saved draft for:', draftKey);
      } catch (e) {
        console.warn('[Draft] Failed to save draft:', e);
      }
    }, debounceMs);
  }, [fullKey, draftKey, debounceMs, enabled]);

  // Clear draft (call on successful save)
  const clearDraft = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    localStorage.removeItem(fullKey);
    lastSavedRef.current = '';
    setRestoredDraft(null);
    setWasRestored(false);
    console.log('[Draft] Cleared draft for:', draftKey);
  }, [fullKey, draftKey]);

  // Dismiss restoration notification
  const dismissRestoreNotice = useCallback(() => {
    setWasRestored(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    restoredDraft,
    wasRestored,
    saveDraft,
    clearDraft,
    dismissRestoreNotice,
  };
}

/**
 * Clear all expired drafts (call on app init)
 */
export function clearExpiredDrafts() {
  try {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(DRAFT_PREFIX)) {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Date.now() - parsed.meta?.savedAt > DRAFT_EXPIRY_MS) {
              keysToRemove.push(key);
            }
          }
        } catch {
          keysToRemove.push(key);
        }
      }
    }

    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    if (keysToRemove.length > 0) {
      console.log('[Draft] Cleared', keysToRemove.length, 'expired drafts');
    }
  } catch (e) {
    console.warn('[Draft] Failed to clear expired drafts:', e);
  }
}
