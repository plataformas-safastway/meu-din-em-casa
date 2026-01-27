/**
 * DEV-ONLY Navigation Instrumentation
 * 
 * This file intercepts ALL navigation attempts to "/" and logs a full stack trace.
 * It also logs visibility/focus events to help debug tab-switch issues.
 * 
 * This file should ONLY run in development mode.
 */

const IS_DEV = import.meta.env.DEV;

let installed = false;

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
        // Could be full URL or just path
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

  // Only log if navigating to "/" or "/login" (home-like surfaces)
  const isHomeLike = targetPath === "/" || targetPath === "/login";
  if (!isHomeLike) return;

  const currentPath = getFullPath();
  
  // Don't log if we're already at home
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
  
  console.log("[DEV-NAV] 🔧 Installing navigation instrumentation...");

  // =====================================================
  // 1. Intercept history.pushState and history.replaceState
  // =====================================================
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

  // =====================================================
  // 2. Intercept window.location assignments
  // =====================================================
  // We can't directly intercept location.href, but we can detect changes via popstate
  // and also log when location changes via other means

  // =====================================================
  // 3. Log browser visibility/focus events
  // =====================================================
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
    // Check if we landed on "/"
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

  // =====================================================
  // 4. Periodic path check (detect external changes)
  // =====================================================
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

  // Cleanup not needed for dev instrumentation, but good practice
  window.addEventListener("beforeunload", () => {
    clearInterval(checkInterval);
  });

  console.log("[DEV-NAV] ✅ Navigation instrumentation installed", {
    initialPath: getFullPath(),
    timestamp: getTimestamp(),
  });
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
