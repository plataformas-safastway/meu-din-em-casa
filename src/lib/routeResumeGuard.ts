/**
 * Route Resume Guard v2
 * 
 * Handles route restoration after preview reload (navigationType = "reload").
 * 
 * CRITICAL: This runs BEFORE React renders to restore the last valid route
 * when the preview iframe is reloaded by the platform.
 */

type ResumeState = {
  path: string;
  ts: number;
  context: "admin" | "consumer";
};

const STORAGE_KEY = "oik:route_resume";
const CONTEXT_KEY = "oik:route_context";

// Global state to prevent guards from redirecting during restore
let isRestoringRoute = false;
let installed = false;

// TTL: 30 minutes
const MAX_AGE_MS = 30 * 60 * 1000;

function getFullPath(): string {
  return `${window.location.pathname}${window.location.search ?? ""}${window.location.hash ?? ""}`;
}

function getNavigationType(): string | null {
  try {
    const entries = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
    return entries[0]?.type ?? null;
  } catch {
    return null;
  }
}

function determineContext(path: string): "admin" | "consumer" {
  if (path.startsWith("/admin")) {
    return "admin";
  }
  return "consumer";
}

function readState(): ResumeState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ResumeState;
    if (!parsed?.path || typeof parsed.path !== "string") return null;
    if (!parsed?.ts || typeof parsed.ts !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeState(path: string) {
  try {
    const context = determineContext(path);
    const state: ResumeState = { path, ts: Date.now(), context };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    sessionStorage.setItem(CONTEXT_KEY, context);
  } catch {
    // ignore
  }
}

export function clearRouteResumeState() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(CONTEXT_KEY);
  } catch {
    // ignore
  }
}

/**
 * Check if we're currently in the process of restoring a route.
 * Guards should NOT redirect while this is true.
 */
export function isRouteRestoreInProgress(): boolean {
  return isRestoringRoute;
}

/**
 * Determines if a path is "home-like" (a public surface with no navigation context).
 * Only exact '/' and '/login' (without query) are considered home-like.
 */
function isHomeLike(path: string): boolean {
  if (path === "/") return true;
  if (path === "/login") return true;
  return false;
}

/**
 * Validates if a saved route should be restored.
 */
function isValidRestore(saved: ResumeState, currentPath: string): boolean {
  // Check TTL
  const age = Date.now() - saved.ts;
  if (age > MAX_AGE_MS) {
    console.log("[RouteResume] Saved route expired", { age, maxAge: MAX_AGE_MS });
    return false;
  }

  // Don't restore to home-like routes
  if (isHomeLike(saved.path)) {
    console.log("[RouteResume] Saved route is home-like, skipping");
    return false;
  }

  // Don't restore if we're already at the saved path
  if (currentPath === saved.path) {
    console.log("[RouteResume] Already at saved path");
    return false;
  }

  // Context validation: if saved context is admin, path must start with /admin
  if (saved.context === "admin" && !saved.path.startsWith("/admin")) {
    console.log("[RouteResume] Context mismatch: admin context but non-admin path");
    return false;
  }

  // Context validation: if saved context is consumer, path must NOT start with /admin
  if (saved.context === "consumer" && saved.path.startsWith("/admin")) {
    console.log("[RouteResume] Context mismatch: consumer context but admin path");
    return false;
  }

  return true;
}

/**
 * Perform the route restoration.
 * Uses history.replaceState to avoid polluting the history stack.
 */
function performRestore(saved: ResumeState, source: string) {
  console.log(`[RouteResume] 🔄 RESTORING route via ${source}`, {
    from: getFullPath(),
    to: saved.path,
    context: saved.context,
    ageMs: Date.now() - saved.ts,
  });

  isRestoringRoute = true;

  try {
    // Use replaceState to avoid history stack pollution
    history.replaceState(null, "", saved.path);
    
    // Dispatch popstate to notify React Router
    window.dispatchEvent(new PopStateEvent("popstate"));
    
    console.log("[RouteResume] ✅ Route restored successfully");
  } catch (err) {
    console.error("[RouteResume] Failed to restore route", err);
  } finally {
    // Clear restoring flag after a short delay to let React Router process
    setTimeout(() => {
      isRestoringRoute = false;
      console.log("[RouteResume] Restore complete, guards can proceed");
    }, 100);
  }
}

/**
 * CRITICAL: Runs BEFORE React renders.
 * 
 * Detects if:
 * 1. This is a reload (navigationType === "reload")
 * 2. Or we landed at "/" but have a valid saved route
 * 
 * If so, restores the last known route immediately.
 */
export function tryInitialRouteRestore() {
  if (typeof window === "undefined") return;

  const navType = getNavigationType();
  const currentPath = getFullPath();
  const saved = readState();

  console.log("[RouteResume] Initial check", {
    navType,
    currentPath,
    hasSaved: !!saved,
    savedPath: saved?.path,
    savedContext: saved?.context,
  });

  // Case 1: Page reload - always try to restore
  if (navType === "reload") {
    if (saved && isValidRestore(saved, currentPath)) {
      // Only restore if we're at a home-like route or different from saved
      if (isHomeLike(currentPath) || currentPath !== saved.path) {
        performRestore(saved, "reload");
        return;
      }
    }
    console.log("[RouteResume] Reload detected but no valid restore needed");
    return;
  }

  // Case 2: Landed at "/" but have a saved route (tab resume scenario)
  if (isHomeLike(currentPath) && saved && isValidRestore(saved, currentPath)) {
    performRestore(saved, "home-landing");
    return;
  }

  console.log("[RouteResume] No restoration needed");
}

/**
 * Installs the route resume guard.
 * 
 * This:
 * 1. Tracks route changes and saves them to sessionStorage
 * 2. Handles visibility changes to restore routes
 * 3. Patches history methods to intercept navigation
 */
export function installRouteResumeGuard() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  if (installed) return;
  installed = true;

  console.log("[RouteResume] Installing guard...", {
    initialPath: getFullPath(),
    navType: getNavigationType(),
  });

  // Save initial path if not home-like
  const initialPath = getFullPath();
  if (!isHomeLike(initialPath)) {
    writeState(initialPath);
  }

  // Track route changes via history patches
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function patchedPushState(...args) {
    const ret = originalPushState.apply(this, args as any);
    const nextPath = getFullPath();
    if (!isHomeLike(nextPath)) {
      writeState(nextPath);
    }
    return ret;
  } as typeof history.pushState;

  history.replaceState = function patchedReplaceState(...args) {
    const ret = originalReplaceState.apply(this, args as any);
    const nextPath = getFullPath();
    // Don't save during restore to avoid overwriting with "/" 
    if (!isHomeLike(nextPath) && !isRestoringRoute) {
      writeState(nextPath);
    }
    return ret;
  } as typeof history.replaceState;

  // Track popstate
  window.addEventListener("popstate", () => {
    const nextPath = getFullPath();
    if (!isHomeLike(nextPath) && !isRestoringRoute) {
      writeState(nextPath);
    }
  }, true);

  // Save route when tab goes to background
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      const currentPath = getFullPath();
      if (!isHomeLike(currentPath)) {
        writeState(currentPath);
        console.log("[RouteResume] Saved before hidden", { path: currentPath });
      }
    }

    // When visible, check if we need to restore
    if (document.visibilityState === "visible") {
      const currentPath = getFullPath();
      const saved = readState();
      
      if (isHomeLike(currentPath) && saved && isValidRestore(saved, currentPath)) {
        performRestore(saved, "visibilitychange");
      }
    }
  }, true);

  // Handle focus as fallback
  window.addEventListener("focus", () => {
    const currentPath = getFullPath();
    const saved = readState();
    
    if (isHomeLike(currentPath) && saved && isValidRestore(saved, currentPath)) {
      performRestore(saved, "focus");
    }
  }, true);

  // Handle pageshow for BFCache scenarios
  window.addEventListener("pageshow", (e) => {
    const currentPath = getFullPath();
    const saved = readState();
    
    if (isHomeLike(currentPath) && saved && isValidRestore(saved, currentPath)) {
      performRestore(saved, e.persisted ? "pageshow:bfcache" : "pageshow");
    }
  }, true);

  console.log("[RouteResume] Guard installed ✅");
}
