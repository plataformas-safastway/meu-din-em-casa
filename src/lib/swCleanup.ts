/**
 * Service Worker Cleanup
 * 
 * This module ensures that old Service Workers that may have
 * auto-update/reload behavior are properly cleaned up.
 * 
 * IMPORTANT: This runs once per version to clean up legacy SW.
 */

const SW_CLEANUP_VERSION = 'sw-cleanup-v3';

export async function cleanupLegacyServiceWorkers() {
  // Only run in browser
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;
  
  // Check if we already cleaned up this version
  try {
    const cleaned = localStorage.getItem(SW_CLEANUP_VERSION);
    if (cleaned) {
      console.log('[SW-Cleanup] Already cleaned for this version');
      return;
    }
  } catch {
    // localStorage not available, continue anyway
  }
  
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    
    if (registrations.length === 0) {
      console.log('[SW-Cleanup] No Service Workers to clean');
      markCleaned();
      return;
    }
    
    console.log(`[SW-Cleanup] Found ${registrations.length} Service Worker(s), cleaning up...`);
    
    for (const registration of registrations) {
      try {
        // Check if this SW has auto-update behavior
        const scriptURL = registration.active?.scriptURL || registration.waiting?.scriptURL || '';
        
        // Log what we found
        console.log('[SW-Cleanup] SW found:', {
          scope: registration.scope,
          scriptURL: scriptURL,
          active: registration.active?.state,
          waiting: registration.waiting?.state,
        });
        
        // Unregister ALL service workers to ensure clean slate
        // The new SW with prompt behavior will be registered on next load
        const success = await registration.unregister();
        
        if (success) {
          console.log('[SW-Cleanup] ✅ Unregistered SW:', registration.scope);
        } else {
          console.warn('[SW-Cleanup] ⚠️ Failed to unregister SW:', registration.scope);
        }
      } catch (err) {
        console.error('[SW-Cleanup] Error unregistering SW:', err);
      }
    }
    
    markCleaned();
    console.log('[SW-Cleanup] ✅ Cleanup complete');
    
  } catch (err) {
    console.error('[SW-Cleanup] Error during cleanup:', err);
  }
}

function markCleaned() {
  try {
    localStorage.setItem(SW_CLEANUP_VERSION, Date.now().toString());
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Force unregister all SWs (for debugging)
 */
export async function forceUnregisterAllServiceWorkers() {
  if (!('serviceWorker' in navigator)) return;
  
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    
    for (const registration of registrations) {
      await registration.unregister();
      console.log('[SW-Force] Unregistered:', registration.scope);
    }
    
    console.log('[SW-Force] All Service Workers unregistered');
    
    // Clear the cleanup flag so it runs again
    try {
      localStorage.removeItem(SW_CLEANUP_VERSION);
    } catch {
      // Ignore
    }
  } catch (err) {
    console.error('[SW-Force] Error:', err);
  }
}

// Export for console access
if (typeof window !== 'undefined') {
  (window as any).__oikSWCleanup = {
    cleanup: cleanupLegacyServiceWorkers,
    forceUnregister: forceUnregisterAllServiceWorkers,
  };
}
