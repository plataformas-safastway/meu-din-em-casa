/**
 * DEV-ONLY Navigation Instrumentation v2
 * 
 * Comprehensive instrumentation to capture:
 * 1. All browser lifecycle events (focus, blur, visibility, pagehide, pageshow, etc.)
 * 2. Navigation via window.location (assign, replace, href setter)
 * 3. Reload detection via Performance API
 * 4. Service Worker / PWA interference
 * 5. BFCache restore
 * 
 * All logs prefixed with [DEV-NAV] or [DEV-NAV2]
 */

const IS_DEV = import.meta.env.DEV;

let installed = false;
let installedV2 = false;

function getFullPath(): string {
  return `${window.location.pathname}${window.location.search ?? ""}${window.location.hash ?? ""}`;
}

function getTimestamp(): string {
  return new Date().toISOString();
}

function getVisibilityInfo() {
  return {
    visibilityState: document.visibilityState,
    hidden: document.hidden,
    hasFocus: document.hasFocus(),
  };
}

function getNavigationType(): string | null {
  try {
    const entries = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
    return entries[0]?.type ?? null;
  } catch {
    return null;
  }
}

function getLocationInfo() {
  return {
    href: window.location.href,
    pathname: window.location.pathname,
    search: window.location.search,
    hash: window.location.hash,
    referrer: document.referrer,
  };
}

/**
 * Logs when we detect a navigation TO "/" and includes a stack trace
 */
function logHomeNavigation(method: string, targetUrl: string | URL | null | undefined) {
  if (!IS_DEV) return;
  
  // Normalize the target path
  let targetPath = "/";
  try {
    if (targetUrl) {
      if (typeof targetUrl === "string") {
        if (targetUrl.startsWith("http")) {
          targetPath = new URL(targetUrl).pathname;
        } else {
          targetPath = targetUrl.split("?")[0].split("#")[0];
        }
      } else if (targetUrl instanceof URL) {
        targetPath = targetUrl.pathname;
      }
    }
  } catch {
    targetPath = String(targetUrl);
  }

  const isHomeLike = targetPath === "/" || targetPath === "/login";
  if (!isHomeLike) return;

  const currentPath = getFullPath();
  if (currentPath === "/" || currentPath === "/login") return;

  console.error(`[DEV-NAV] 🚨 HOME_NAVIGATION_DETECTED via ${method}`, {
    from: currentPath,
    to: targetPath,
    timestamp: getTimestamp(),
    visibility: getVisibilityInfo(),
  });
  console.trace(`[DEV-NAV] Stack trace for ${method} -> "${targetPath}"`);
}

/**
 * Logs browser events that might trigger re-renders or auth checks
 */
function logBrowserEvent(eventName: string, event?: Event) {
  if (!IS_DEV) return;
  
  console.log(`[DEV-NAV] 📡 Browser event: ${eventName}`, {
    path: getFullPath(),
    timestamp: getTimestamp(),
    visibility: getVisibilityInfo(),
    eventType: event?.type,
  });
}

export function installDevNavigationInstrumentation() {
  if (!IS_DEV) return;
  if (installed) return;
  if (typeof window === "undefined") return;
  
  installed = true;
  
  console.log("[DEV-NAV] 🔧 Installing navigation instrumentation v1...");

  // Intercept history.pushState and history.replaceState
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function devPushState(state: any, unused: string, url?: string | URL | null) {
    logHomeNavigation("history.pushState", url);
    return originalPushState.call(this, state, unused, url);
  };

  history.replaceState = function devReplaceState(state: any, unused: string, url?: string | URL | null) {
    logHomeNavigation("history.replaceState", url);
    return originalReplaceState.call(this, state, unused, url);
  };

  // Log browser visibility/focus events
  document.addEventListener("visibilitychange", (e) => {
    logBrowserEvent("visibilitychange", e);
  }, true);

  window.addEventListener("focus", (e) => {
    logBrowserEvent("window.focus", e);
  }, true);

  window.addEventListener("blur", (e) => {
    logBrowserEvent("window.blur", e);
  }, true);

  window.addEventListener("popstate", (e) => {
    logBrowserEvent("popstate", e);
    const currentPath = getFullPath();
    if (currentPath === "/" || currentPath === "/login") {
      console.error("[DEV-NAV] 🚨 POPSTATE landed on home-like route", {
        path: currentPath,
        timestamp: getTimestamp(),
        visibility: getVisibilityInfo(),
        state: e.state,
      });
      console.trace("[DEV-NAV] popstate -> home stack trace");
    }
  }, true);

  window.addEventListener("pageshow", (e) => {
    logBrowserEvent(`pageshow (persisted=${(e as PageTransitionEvent).persisted})`, e);
  }, true);

  window.addEventListener("pagehide", (e) => {
    logBrowserEvent("pagehide", e);
  }, true);

  // Periodic path check
  let lastPath = getFullPath();
  const checkInterval = setInterval(() => {
    const currentPath = getFullPath();
    if (currentPath !== lastPath) {
      const wasHome = lastPath === "/" || lastPath === "/login";
      const isHome = currentPath === "/" || currentPath === "/login";
      
      if (!wasHome && isHome) {
        console.error("[DEV-NAV] 🚨 PATH_CHANGED_TO_HOME (detected by interval)", {
          from: lastPath,
          to: currentPath,
          timestamp: getTimestamp(),
          visibility: getVisibilityInfo(),
        });
        console.trace("[DEV-NAV] interval check -> home stack trace");
      } else {
        console.log("[DEV-NAV] Path changed", { from: lastPath, to: currentPath });
      }
      lastPath = currentPath;
    }
  }, 500);

  window.addEventListener("beforeunload", () => {
    clearInterval(checkInterval);
  });

  console.log("[DEV-NAV] ✅ Navigation instrumentation v1 installed", {
    initialPath: getFullPath(),
    timestamp: getTimestamp(),
  });
}

/**
 * V2 Instrumentation: Complete lifecycle + location.* + reload detection + SW check
 */
export function installDevNavigationInstrumentationV2() {
  if (!IS_DEV) return;
  if (installedV2) return;
  if (typeof window === "undefined") return;
  
  installedV2 = true;
  
  const navType = getNavigationType();
  
  console.log("[DEV-NAV2] 🔧 Installing COMPLETE navigation instrumentation v2...", {
    initialPath: getFullPath(),
    navigationType: navType,
    location: getLocationInfo(),
    timestamp: getTimestamp(),
  });

  // =====================================================
  // 1. LIFECYCLE EVENTS
  // =====================================================
  
  window.addEventListener("focus", () => {
    console.log("[DEV-NAV2] 👁️ window.focus", {
      path: getFullPath(),
      visibility: getVisibilityInfo(),
      navigationType: getNavigationType(),
      ts: getTimestamp(),
    });
  }, true);

  window.addEventListener("blur", () => {
    console.log("[DEV-NAV2] 👁️ window.blur", {
      path: getFullPath(),
      visibility: getVisibilityInfo(),
      ts: getTimestamp(),
    });
  }, true);

  document.addEventListener("visibilitychange", () => {
    console.log("[DEV-NAV2] 👁️ visibilitychange", {
      path: getFullPath(),
      state: document.visibilityState,
      hidden: document.hidden,
      navigationType: getNavigationType(),
      ts: getTimestamp(),
    });
  }, true);

  window.addEventListener("pagehide", (e) => {
    console.warn("[DEV-NAV2] ⚠️ pagehide", {
      path: getFullPath(),
      persisted: (e as PageTransitionEvent).persisted,
      ts: getTimestamp(),
    });
  }, true);

  window.addEventListener("pageshow", (e) => {
    const persisted = (e as PageTransitionEvent).persisted;
    const currentPath = getFullPath();
    const navType = getNavigationType();
    
    console.warn("[DEV-NAV2] ⚠️ pageshow", {
      path: currentPath,
      persisted,
      navigationType: navType,
      isBFCacheRestore: persisted,
      ts: getTimestamp(),
    });

    // Check if we're at "/" unexpectedly after pageshow
    if (currentPath === "/" || currentPath === "/login") {
      console.error("[DEV-NAV2] 🚨 PAGESHOW_AT_HOME", {
        path: currentPath,
        persisted,
        navigationType: navType,
        location: getLocationInfo(),
      });
      console.trace("[DEV-NAV2] pageshow at home stack");
    }

    // BFCache restore detection
    if (persisted) {
      console.error("[DEV-NAV2] 🔄 BFCACHE_RESTORE_DETECTED", {
        path: currentPath,
        ts: getTimestamp(),
      });
    }
  }, true);

  window.addEventListener("beforeunload", (e) => {
    console.warn("[DEV-NAV2] ⚠️ beforeunload", {
      path: getFullPath(),
      ts: getTimestamp(),
    });
  }, true);

  window.addEventListener("unload", () => {
    console.warn("[DEV-NAV2] ⚠️ unload", {
      path: getFullPath(),
      ts: getTimestamp(),
    });
  }, true);

  // freeze/resume (Page Lifecycle API)
  if ("onfreeze" in document) {
    document.addEventListener("freeze", () => {
      console.warn("[DEV-NAV2] ❄️ freeze (page frozen)", {
        path: getFullPath(),
        ts: getTimestamp(),
      });
    }, true);
  }

  if ("onresume" in document) {
    document.addEventListener("resume", () => {
      console.warn("[DEV-NAV2] 🔥 resume (page unfrozen)", {
        path: getFullPath(),
        navigationType: getNavigationType(),
        ts: getTimestamp(),
      });
    }, true);
  }

  // =====================================================
  // 2. INTERCEPT window.location NAVIGATION
  // =====================================================
  
  try {
    // Intercept location.assign
    const originalAssign = window.location.assign.bind(window.location);
    window.location.assign = function devAssign(url: string) {
      console.error("[DEV-NAV2] 🚨 location.assign CALLED", {
        from: getFullPath(),
        to: url,
        ts: getTimestamp(),
      });
      console.trace("[DEV-NAV2] location.assign stack");
      return originalAssign(url);
    };

    // Intercept location.replace
    const originalReplace = window.location.replace.bind(window.location);
    window.location.replace = function devReplace(url: string) {
      console.error("[DEV-NAV2] 🚨 location.replace CALLED", {
        from: getFullPath(),
        to: url,
        ts: getTimestamp(),
      });
      console.trace("[DEV-NAV2] location.replace stack");
      return originalReplace(url);
    };

    console.log("[DEV-NAV2] ✅ location.assign/replace intercepted");
  } catch (err) {
    console.warn("[DEV-NAV2] Could not intercept location methods", err);
  }

  // Note: location.href setter cannot be intercepted directly
  // We rely on the periodic check to detect changes

  // =====================================================
  // 3. RELOAD DETECTION
  // =====================================================
  
  // Check navigation type on load
  const initialNavType = getNavigationType();
  if (initialNavType === "reload") {
    console.error("[DEV-NAV2] 🔄 PAGE_RELOAD_DETECTED on init", {
      path: getFullPath(),
      navigationType: initialNavType,
      location: getLocationInfo(),
    });
  } else if (initialNavType === "back_forward") {
    console.warn("[DEV-NAV2] ⏮️ BACK_FORWARD_NAVIGATION on init", {
      path: getFullPath(),
      navigationType: initialNavType,
    });
  }

  // =====================================================
  // 4. SERVICE WORKER / PWA CHECK
  // =====================================================
  
  checkServiceWorkers();

  // =====================================================
  // 5. ENHANCED PERIODIC CHECK
  // =====================================================
  
  let lastPathV2 = getFullPath();
  let lastNavType = initialNavType;
  
  setInterval(() => {
    const currentPath = getFullPath();
    const currentNavType = getNavigationType();
    
    // Detect path change
    if (currentPath !== lastPathV2) {
      const wasHome = lastPathV2 === "/" || lastPathV2 === "/login";
      const isHome = currentPath === "/" || currentPath === "/login";
      
      if (!wasHome && isHome) {
        console.error("[DEV-NAV2] 🚨 PATH_CHANGED_TO_HOME (interval)", {
          from: lastPathV2,
          to: currentPath,
          navigationType: currentNavType,
          visibility: getVisibilityInfo(),
          ts: getTimestamp(),
        });
        console.trace("[DEV-NAV2] interval -> home stack");
      }
      
      lastPathV2 = currentPath;
    }
    
    // Detect navigation type change (reload during session)
    if (currentNavType !== lastNavType && currentNavType === "reload") {
      console.error("[DEV-NAV2] 🔄 RELOAD_DETECTED_DURING_SESSION", {
        path: currentPath,
        previousNavType: lastNavType,
        currentNavType,
        ts: getTimestamp(),
      });
    }
    lastNavType = currentNavType;
  }, 300);

  // =====================================================
  // 6. TEST START LOG
  // =====================================================
  
  console.log("[DEV-NAV2] ✅ TEST_START - Complete instrumentation active", {
    href: window.location.href,
    pathname: window.location.pathname,
    navigationType: initialNavType,
    referrer: document.referrer,
    visibility: getVisibilityInfo(),
    ts: getTimestamp(),
  });
}

/**
 * Check and log Service Worker status
 */
async function checkServiceWorkers() {
  if (!IS_DEV) return;
  if (!("serviceWorker" in navigator)) {
    console.log("[DEV-NAV2] 🔧 No Service Worker support in this browser");
    return;
  }

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    
    if (registrations.length === 0) {
      console.log("[DEV-NAV2] 🔧 No Service Workers registered");
      return;
    }

    console.warn("[DEV-NAV2] ⚠️ SERVICE_WORKERS_FOUND", {
      count: registrations.length,
      registrations: registrations.map(r => ({
        scope: r.scope,
        active: r.active?.state,
        waiting: r.waiting?.state,
        installing: r.installing?.state,
      })),
    });

    // Log if any SW is active
    for (const reg of registrations) {
      if (reg.active) {
        console.warn("[DEV-NAV2] ⚠️ ACTIVE_SERVICE_WORKER", {
          scope: reg.scope,
          state: reg.active.state,
          scriptURL: reg.active.scriptURL,
        });
      }
    }
  } catch (err) {
    console.error("[DEV-NAV2] Error checking service workers", err);
  }
}

/**
 * DEV-ONLY: Unregister all service workers for testing
 */
export async function unregisterAllServiceWorkers() {
  if (!IS_DEV) return;
  if (!("serviceWorker" in navigator)) return;

  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    for (const reg of registrations) {
      await reg.unregister();
      console.log("[DEV-NAV2] 🗑️ Unregistered SW:", reg.scope);
    }
    console.log("[DEV-NAV2] ✅ All Service Workers unregistered");
  } catch (err) {
    console.error("[DEV-NAV2] Error unregistering service workers", err);
  }
}

/**
 * Call this from React components to log navigation attempts
 */
export function logNavigationAttempt(method: string, to: string, context?: Record<string, unknown>) {
  if (!IS_DEV) return;
  
  const isHomeLike = to === "/" || to === "/login" || to.startsWith("/login?");
  const currentPath = getFullPath();
  
  if (isHomeLike && currentPath !== "/" && currentPath !== "/login") {
    console.error(`[DEV-NAV] 🚨 React navigation to home via ${method}`, {
      from: currentPath,
      to,
      context,
      timestamp: getTimestamp(),
      visibility: getVisibilityInfo(),
    });
    console.trace(`[DEV-NAV] React ${method} -> home stack trace`);
  }
}
