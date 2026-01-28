/**
 * LIFECYCLE TRACER - DEV ONLY
 * 
 * Traces mount/unmount of critical components to diagnose
 * unexpected remounts on tab switch.
 * 
 * Enable with ?debugLifecycle=1 in URL
 */

// Module-level singleton identities to prove instances are NOT recreated
export const INSTANCE_SIGNATURES = {
  queryClient: `qc_${Math.random().toString(36).slice(2, 8)}`,
  router: `rt_${Math.random().toString(36).slice(2, 8)}`,
  supabaseClient: `sb_${Math.random().toString(36).slice(2, 8)}`,
  app: `app_${Math.random().toString(36).slice(2, 8)}`,
} as const;

// Mount counters
declare global {
  interface Window {
    __oikMountCounts?: Record<string, number>;
    __oikLifecycleLog?: LifecycleEvent[];
    __oikEventLog?: TabEvent[];
  }
}

interface LifecycleEvent {
  type: 'MOUNT' | 'UNMOUNT';
  component: string;
  timestamp: number;
  pathname: string;
  signature?: string;
}

interface TabEvent {
  type: 'visibilitychange' | 'focus' | 'blur' | 'pageshow' | 'pagehide';
  timestamp: number;
  visibilityState?: DocumentVisibilityState;
  persisted?: boolean;
  pathname: string;
}

// Check if lifecycle debugging is enabled
export function isLifecycleDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  const params = new URLSearchParams(window.location.search);
  return params.get('debugLifecycle') === '1';
}

// Initialize counters
function ensureCounters() {
  if (!window.__oikMountCounts) {
    window.__oikMountCounts = {};
  }
  if (!window.__oikLifecycleLog) {
    window.__oikLifecycleLog = [];
  }
  if (!window.__oikEventLog) {
    window.__oikEventLog = [];
  }
}

/**
 * Log a component lifecycle event
 */
export function logLifecycle(
  type: 'MOUNT' | 'UNMOUNT',
  componentName: string,
  signature?: string
) {
  if (!isLifecycleDebugEnabled()) return;
  
  ensureCounters();
  
  const event: LifecycleEvent = {
    type,
    component: componentName,
    timestamp: Date.now(),
    pathname: window.location.pathname + window.location.search,
    signature,
  };
  
  window.__oikLifecycleLog!.push(event);
  
  // Keep only last 100 events
  if (window.__oikLifecycleLog!.length > 100) {
    window.__oikLifecycleLog!.shift();
  }
  
  // Update counter
  if (type === 'MOUNT') {
    window.__oikMountCounts![componentName] = 
      (window.__oikMountCounts![componentName] || 0) + 1;
  }
  
  // Log with prominent styling
  const style = type === 'MOUNT' 
    ? 'color: #00ff00; font-weight: bold; font-size: 12px'
    : 'color: #ff6600; font-weight: bold; font-size: 12px';
  
  console.error(
    `%c[LIFECYCLE] ${type} ${componentName}`,
    style,
    {
      timestamp: new Date().toISOString(),
      pathname: event.pathname,
      signature,
      mountCount: window.__oikMountCounts![componentName],
    }
  );
  
  // Alert on suspicious remounts (mount count > 1 for singletons)
  const singletons = ['App', 'BrowserRouter', 'QueryClientProvider', 'AuthProvider'];
  if (type === 'MOUNT' && singletons.includes(componentName)) {
    const count = window.__oikMountCounts![componentName];
    if (count > 1) {
      console.error(
        `%c⚠️ SINGLETON REMOUNT DETECTED: ${componentName} mounted ${count} times!`,
        'color: #ff0000; font-weight: bold; font-size: 14px; background: #ffeeee; padding: 4px 8px;'
      );
    }
  }
}

/**
 * Log a tab/visibility event
 */
export function logTabEvent(
  type: TabEvent['type'],
  details?: { visibilityState?: DocumentVisibilityState; persisted?: boolean }
) {
  if (!isLifecycleDebugEnabled()) return;
  
  ensureCounters();
  
  const event: TabEvent = {
    type,
    timestamp: Date.now(),
    pathname: window.location.pathname + window.location.search,
    ...details,
  };
  
  window.__oikEventLog!.push(event);
  
  // Keep only last 50 events
  if (window.__oikEventLog!.length > 50) {
    window.__oikEventLog!.shift();
  }
  
  console.log(
    `%c[TAB] ${type}`,
    'color: #00aaff; font-weight: bold',
    {
      timestamp: new Date().toISOString(),
      ...details,
      pathname: event.pathname,
    }
  );
}

/**
 * Install global tab event listeners
 */
let tabListenersInstalled = false;

export function installTabEventListeners() {
  if (!isLifecycleDebugEnabled()) return;
  if (tabListenersInstalled) return;
  tabListenersInstalled = true;
  
  console.log('%c[LIFECYCLE] 🔍 Tab event listeners installed', 'color: #00aaff; font-weight: bold');
  
  document.addEventListener('visibilitychange', () => {
    logTabEvent('visibilitychange', { visibilityState: document.visibilityState });
  });
  
  window.addEventListener('focus', () => {
    logTabEvent('focus');
  });
  
  window.addEventListener('blur', () => {
    logTabEvent('blur');
  });
  
  window.addEventListener('pageshow', (e) => {
    logTabEvent('pageshow', { persisted: e.persisted });
  });
  
  window.addEventListener('pagehide', (e) => {
    logTabEvent('pagehide', { persisted: e.persisted });
  });
}

/**
 * Log singleton instance signatures to prove they're not recreated
 */
export function logSingletonSignatures() {
  if (!isLifecycleDebugEnabled()) return;
  
  console.log(
    '%c[LIFECYCLE] Singleton Signatures (should never change):',
    'color: #aa00ff; font-weight: bold',
    INSTANCE_SIGNATURES
  );
}

/**
 * Get diagnostic summary
 */
export function getLifecycleSummary() {
  return {
    mountCounts: window.__oikMountCounts || {},
    recentLifecycle: (window.__oikLifecycleLog || []).slice(-20),
    recentTabEvents: (window.__oikEventLog || []).slice(-10),
    signatures: INSTANCE_SIGNATURES,
  };
}

// Export for console access
if (typeof window !== 'undefined') {
  (window as any).__oikLifecycle = {
    getSummary: getLifecycleSummary,
    getLog: () => window.__oikLifecycleLog || [],
    getTabEvents: () => window.__oikEventLog || [],
    getMountCounts: () => window.__oikMountCounts || {},
    getSignatures: () => INSTANCE_SIGNATURES,
  };
}
