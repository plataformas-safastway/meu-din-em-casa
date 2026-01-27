/**
 * RELOAD DIAGNOSTICS - DEV ONLY
 * 
 * Sistema de instrumentação para identificar a causa raiz de reloads
 * indesejados durante troca de aba do navegador.
 */

const isDev = import.meta.env.DEV;

// Track boot timestamp
let bootTimestamp: number | null = null;

interface DiagnosticEvent {
  type: string;
  timestamp: number;
  pathname: string;
  visibilityState: DocumentVisibilityState;
  navigationType: string | null;
  details?: Record<string, unknown>;
}

const diagnosticLog: DiagnosticEvent[] = [];

function getNavigationType(): string | null {
  try {
    const entries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    return entries[0]?.type ?? null;
  } catch {
    return null;
  }
}

function logDiagnostic(type: string, details?: Record<string, unknown>) {
  if (!isDev) return;
  
  const event: DiagnosticEvent = {
    type,
    timestamp: Date.now(),
    pathname: location.pathname + location.search,
    visibilityState: document.visibilityState,
    navigationType: getNavigationType(),
    details,
  };
  
  diagnosticLog.push(event);
  
  // Keep only last 50 events
  if (diagnosticLog.length > 50) {
    diagnosticLog.shift();
  }
  
  console.log(`[DIAG] ${type}`, {
    path: event.pathname,
    visibility: event.visibilityState,
    navType: event.navigationType,
    ...details,
  });
}

/**
 * Log app boot - called from main.tsx
 */
export function logAppBoot() {
  bootTimestamp = Date.now();
  const navType = getNavigationType();
  
  console.log('%c[BOOT] App mounted', 'color: #00ff00; font-weight: bold', {
    timestamp: new Date().toISOString(),
    navigationType: navType,
    pathname: location.pathname,
    referrer: document.referrer,
  });
  
  // If this is a reload, log it prominently
  if (navType === 'reload') {
    console.warn('%c[BOOT] ⚠️ APP RELOADED', 'color: #ff6600; font-weight: bold; font-size: 14px', {
      previousPath: sessionStorage.getItem('oik:last_route'),
      currentPath: location.pathname,
    });
  }
}

/**
 * Get time since last boot
 */
export function getTimeSinceBoot(): number | null {
  return bootTimestamp ? Date.now() - bootTimestamp : null;
}

/**
 * Initialize all diagnostic listeners
 */
export function initReloadDiagnostics() {
  if (!isDev) {
    console.log('[DIAG] Diagnostics disabled in production');
    return;
  }
  
  console.log('%c[DIAG] 🔍 Reload diagnostics initialized', 'color: #00aaff; font-weight: bold');
  
  // ============= EVENT LISTENERS =============
  
  // Visibility change
  document.addEventListener('visibilitychange', () => {
    logDiagnostic('visibilitychange', {
      newState: document.visibilityState,
      timeSinceBoot: getTimeSinceBoot(),
    });
  });
  
  // Focus/Blur
  window.addEventListener('focus', () => {
    logDiagnostic('window:focus', { timeSinceBoot: getTimeSinceBoot() });
  });
  
  window.addEventListener('blur', () => {
    logDiagnostic('window:blur', { timeSinceBoot: getTimeSinceBoot() });
  });
  
  // Page lifecycle
  window.addEventListener('pageshow', (e) => {
    logDiagnostic('pageshow', { 
      persisted: e.persisted,
      timeSinceBoot: getTimeSinceBoot(),
    });
  });
  
  window.addEventListener('pagehide', (e) => {
    logDiagnostic('pagehide', { persisted: e.persisted });
  });
  
  window.addEventListener('beforeunload', () => {
    logDiagnostic('beforeunload', {});
    // Save current path before potential reload
    sessionStorage.setItem('oik:pre_unload_path', location.pathname + location.search);
  });
  
  window.addEventListener('unload', () => {
    logDiagnostic('unload', {});
  });
  
  // ============= MONKEY PATCH HARD NAVIGATION =============
  // Note: These may fail in some browsers due to security restrictions
  // We wrap in try-catch to handle gracefully
  
  try {
    // Patch location.reload
    const originalReload = location.reload.bind(location);
    Object.defineProperty(location, 'reload', {
      value: function(...args: any[]) {
        console.error('%c[HARD-NAV DETECTED] location.reload() called!', 'color: #ff0000; font-weight: bold; font-size: 14px');
        console.trace('Stack trace for reload:');
        logDiagnostic('HARD_NAV:reload', { args });
        return originalReload(...args);
      },
      writable: true,
      configurable: true,
    });
    console.log('[DIAG] location.reload patched');
  } catch (e) {
    console.log('[DIAG] Could not patch location.reload (security restriction)');
  }
  
  try {
    // Patch location.assign
    const originalAssign = location.assign.bind(location);
    Object.defineProperty(location, 'assign', {
      value: function(url: string) {
        console.error('%c[HARD-NAV DETECTED] location.assign() called!', 'color: #ff0000; font-weight: bold; font-size: 14px', { to: url });
        console.trace('Stack trace for assign:');
        logDiagnostic('HARD_NAV:assign', { to: url });
        return originalAssign(url);
      },
      writable: true,
      configurable: true,
    });
    console.log('[DIAG] location.assign patched');
  } catch (e) {
    console.log('[DIAG] Could not patch location.assign (security restriction)');
  }
  
  try {
    // Patch location.replace
    const originalReplace = location.replace.bind(location);
    Object.defineProperty(location, 'replace', {
      value: function(url: string) {
        console.error('%c[HARD-NAV DETECTED] location.replace() called!', 'color: #ff0000; font-weight: bold; font-size: 14px', { to: url });
        console.trace('Stack trace for replace:');
        logDiagnostic('HARD_NAV:replace', { to: url });
        return originalReplace(url);
      },
      writable: true,
      configurable: true,
    });
    console.log('[DIAG] location.replace patched');
  } catch (e) {
    console.log('[DIAG] Could not patch location.replace (security restriction)');
  }
  
  // Try to intercept location.href setter
  try {
    const locationDescriptor = Object.getOwnPropertyDescriptor(window, 'location');
    if (locationDescriptor && locationDescriptor.configurable) {
      // This may not work in all browsers due to security restrictions
      console.log('[DIAG] location.href interception not possible (security restriction)');
    }
  } catch (e) {
    // Expected - location is usually not configurable
  }
  
  // ============= SERVICE WORKER CHECK =============
  
  checkServiceWorker();
}

/**
 * Check for service workers and their update behavior
 */
async function checkServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.log('[DIAG] Service Worker not supported');
    return;
  }
  
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    
    if (registrations.length === 0) {
      console.log('[DIAG] No Service Workers registered');
      return;
    }
    
    console.log('%c[DIAG] Service Workers found:', 'color: #ffaa00; font-weight: bold', registrations.length);
    
    registrations.forEach((reg, i) => {
      console.log(`[DIAG] SW ${i + 1}:`, {
        scope: reg.scope,
        updateViaCache: reg.updateViaCache,
        active: reg.active?.state,
        waiting: reg.waiting?.state,
        installing: reg.installing?.state,
      });
      
      // Listen for updates
      reg.addEventListener('updatefound', () => {
        console.warn('[DIAG] ⚠️ Service Worker update found!');
        const newWorker = reg.installing;
        
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            console.log('[DIAG] New SW state:', newWorker.state);
            
            if (newWorker.state === 'activated') {
              console.warn('[DIAG] ⚠️ New SW activated - checking for reload trigger...');
            }
          });
        }
      });
    });
    
    // Listen for controller change (potential reload trigger)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.error('%c[DIAG] ⚠️ SW Controller changed! This often triggers reload!', 'color: #ff0000; font-weight: bold');
      console.trace('Controller change stack:');
    });
    
  } catch (e) {
    console.error('[DIAG] Error checking service workers:', e);
  }
}

/**
 * Get diagnostic summary for debugging
 */
export function getDiagnosticSummary() {
  return {
    bootTimestamp,
    timeSinceBoot: getTimeSinceBoot(),
    navigationType: getNavigationType(),
    recentEvents: diagnosticLog.slice(-10),
    serviceWorkerSupported: 'serviceWorker' in navigator,
  };
}

// Export for console access
if (isDev && typeof window !== 'undefined') {
  (window as any).__oikDiagnostics = {
    getLog: () => diagnosticLog,
    getSummary: getDiagnosticSummary,
    getTimeSinceBoot,
  };
}
