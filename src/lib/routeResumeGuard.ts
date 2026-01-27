/**
 * Route Resume Guard v3
 * 
 * Handles route restoration after preview reload (navigationType = "reload").
 * 
 * CRITICAL: This runs BEFORE React renders to restore the last valid route
 * when the preview iframe is reloaded by the platform.
 * 
 * Improvements in v3:
 * - Anti-loop protection (restoreAttempt tracking)
 * - Proper flag release timing
 * - Full path saving (pathname + search + hash)
 * - Public route filtering
 * - Fallback for React-side restoration
 */

type ResumeState = {
  path: string; // Full path: pathname + search + hash
  pathname: string;
  search: string;
  hash: string;
  ts: number;
  context: "admin" | "consumer";
};

const STORAGE_KEY = "oik:route_resume";
const RESTORE_ATTEMPT_KEY = "oik:restore_attempt";

// Global state to prevent guards from redirecting during restore
let isRestoringRoute = false;
let restoreCompleted = false;

// TTL: 30 minutes
const MAX_AGE_MS = 30 * 60 * 1000;

// Public routes that should never be saved or restored to
const PUBLIC_ROUTES = ["/", "/login", "/signup", "/termos", "/privacidade", "/reset-password", "/invite"];

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

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(route + "?"));
}

function readState(): ResumeState | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ResumeState;
    if (!parsed?.path || typeof parsed.path !== "string") return null;
    if (!parsed?.ts || typeof parsed.ts !== "number") return null;
    if (!parsed?.pathname) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeState(pathname: string, search: string, hash: string) {
  // Don't save public routes
  if (isPublicRoute(pathname)) {
    return;
  }

  try {
    const fullPath = `${pathname}${search}${hash}`;
    const context = determineContext(pathname);
    const state: ResumeState = { 
      path: fullPath, 
      pathname,
      search,
      hash,
      ts: Date.now(), 
      context 
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    // Clear any previous restore attempt when we save a new route
    sessionStorage.removeItem(RESTORE_ATTEMPT_KEY);
  } catch {
    // ignore
  }
}

export function clearRouteResumeState() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(RESTORE_ATTEMPT_KEY);
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
 * Check if restore has already been completed this session.
 * Used by React-side fallback to avoid duplicate restores.
 */
export function hasRestoreCompleted(): boolean {
  return restoreCompleted;
}

/**
 * Mark restore as completed (called after React processes the restore).
 */
export function markRestoreCompleted() {
  restoreCompleted = true;
  isRestoringRoute = false;
}

/**
 * Get the saved route for React-side fallback restoration.
 */
export function getSavedRoute(): ResumeState | null {
  return readState();
}

/**
 * Anti-loop: Check if we already attempted to restore this session.
 */
function hasRestoreAttempted(): boolean {
  try {
    return sessionStorage.getItem(RESTORE_ATTEMPT_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Anti-loop: Mark that we attempted a restore.
 */
function markRestoreAttempted() {
  try {
    sessionStorage.setItem(RESTORE_ATTEMPT_KEY, "1");
  } catch {
    // ignore
  }
}

/**
 * Validates if a saved route should be restored.
 */
function isValidRestore(saved: ResumeState, currentPath: string): boolean {
  // Anti-loop: Don't restore if already attempted
  if (hasRestoreAttempted()) {
    console.log("[RouteResume] Already attempted restore this session, skipping");
    return false;
  }

  // Anti-loop: Don't restore if we're already at the target
  if (currentPath === saved.path) {
    console.log("[RouteResume] Already at saved path, skipping");
    return false;
  }

  // Check TTL
  const age = Date.now() - saved.ts;
  if (age > MAX_AGE_MS) {
    console.log("[RouteResume] Saved route expired", { age, maxAge: MAX_AGE_MS });
    clearRouteResumeState();
    return false;
  }

  // Don't restore to public routes
  if (isPublicRoute(saved.pathname)) {
    console.log("[RouteResume] Saved route is public, skipping");
    return false;
  }

  // Context validation: if saved context is admin, path must start with /admin
  if (saved.context === "admin" && !saved.pathname.startsWith("/admin")) {
    console.log("[RouteResume] Context mismatch: admin context but non-admin path");
    return false;
  }

  // Context validation: if saved context is consumer, path must NOT start with /admin
  if (saved.context === "consumer" && saved.pathname.startsWith("/admin")) {
    console.log("[RouteResume] Context mismatch: consumer context but admin path");
    return false;
  }

  return true;
}

/**
 * Perform the route restoration.
 * Uses history.replaceState to avoid polluting the history stack.
 */
function performRestore(saved: ResumeState, source: string): boolean {
  console.log(`[RouteResume] 🔄 RESTORING route via ${source}`, {
    from: getFullPath(),
    to: saved.path,
    context: saved.context,
    ageMs: Date.now() - saved.ts,
  });

  // Mark that we're attempting restore (anti-loop)
  markRestoreAttempted();
  isRestoringRoute = true;

  try {
    // Use replaceState to avoid history stack pollution
    history.replaceState(null, "", saved.path);
    
    // Dispatch popstate to notify React Router
    window.dispatchEvent(new PopStateEvent("popstate"));
    
    console.log("[RouteResume] ✅ Route restored successfully to:", saved.path);
    
    // Release flag after a short delay to let React Router process
    // This is critical: guards only operate after route is in place
    setTimeout(() => {
      isRestoringRoute = false;
      restoreCompleted = true;
      console.log("[RouteResume] Restore complete, guards can proceed");
    }, 150);
    
    return true;
  } catch (err) {
    console.error("[RouteResume] Failed to restore route", err);
    isRestoringRoute = false;
    // Clear saved route on failure to prevent loops
    clearRouteResumeState();
    return false;
  }
}

/**
 * CRITICAL: Runs BEFORE React renders.
 * 
 * Detects if:
 * 1. This is a reload (navigationType === "reload")
 * 2. Or we landed at a public route but have a valid saved route
 * 
 * If so, restores the last known route immediately.
 */
export function tryInitialRouteRestore(): boolean {
  if (typeof window === "undefined") return false;

  const navType = getNavigationType();
  const currentPath = getFullPath();
  const currentPathname = window.location.pathname;
  const saved = readState();

  console.log("[RouteResume] Initial check", {
    navType,
    currentPath,
    currentPathname,
    hasSaved: !!saved,
    savedPath: saved?.path,
    savedContext: saved?.context,
    hasAttempted: hasRestoreAttempted(),
  });

  // If no saved state, nothing to restore
  if (!saved) {
    console.log("[RouteResume] No saved route, skipping restore");
    return false;
  }

  // Validate the restore
  if (!isValidRestore(saved, currentPath)) {
    return false;
  }

  // Case 1: Page reload - always try to restore if at different path
  if (navType === "reload") {
    return performRestore(saved, "reload");
  }

  // Case 2: Landed at public route but have a saved route
  if (isPublicRoute(currentPathname)) {
    return performRestore(saved, "public-landing");
  }

  console.log("[RouteResume] No restoration needed");
  return false;
}

/**
 * React-side fallback: Called after React mounts to handle cases
 * where pre-React restore didn't work.
 */
export function tryFallbackRestore(currentPathname: string, isAuthenticated: boolean): string | null {
  // Skip if restore already completed or in progress
  if (restoreCompleted || isRestoringRoute) {
    return null;
  }

  // Skip if not authenticated (can't restore protected routes)
  if (!isAuthenticated) {
    return null;
  }

  // Only trigger if we're at a public route
  if (!isPublicRoute(currentPathname)) {
    return null;
  }

  const saved = readState();
  if (!saved) {
    return null;
  }

  // Check TTL and anti-loop
  const age = Date.now() - saved.ts;
  if (age > MAX_AGE_MS || hasRestoreAttempted()) {
    return null;
  }

  // Context validation
  if (saved.context === "admin" && !saved.pathname.startsWith("/admin")) {
    return null;
  }
  if (saved.context === "consumer" && saved.pathname.startsWith("/admin")) {
    return null;
  }

  console.log("[RouteResume] React fallback restore triggered", {
    from: currentPathname,
    to: saved.path,
  });

  markRestoreAttempted();
  restoreCompleted = true;
  
  return saved.path;
}

let installed = false;

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

  console.log("[RouteResume] Installing guard v3...", {
    initialPath: getFullPath(),
    navType: getNavigationType(),
  });

  // Save initial path if not public
  const initialPathname = window.location.pathname;
  const initialSearch = window.location.search;
  const initialHash = window.location.hash;
  
  if (!isPublicRoute(initialPathname)) {
    writeState(initialPathname, initialSearch, initialHash);
  }

  // Track route changes via history patches
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function patchedPushState(...args) {
    const ret = originalPushState.apply(this, args as any);
    
    // Don't save during restore
    if (!isRestoringRoute) {
      const pathname = window.location.pathname;
      const search = window.location.search;
      const hash = window.location.hash;
      writeState(pathname, search, hash);
    }
    
    return ret;
  } as typeof history.pushState;

  history.replaceState = function patchedReplaceState(...args) {
    const ret = originalReplaceState.apply(this, args as any);
    
    // Don't save during restore
    if (!isRestoringRoute) {
      const pathname = window.location.pathname;
      const search = window.location.search;
      const hash = window.location.hash;
      writeState(pathname, search, hash);
    }
    
    return ret;
  } as typeof history.replaceState;

  // Track popstate
  window.addEventListener("popstate", () => {
    if (!isRestoringRoute) {
      const pathname = window.location.pathname;
      const search = window.location.search;
      const hash = window.location.hash;
      writeState(pathname, search, hash);
    }
  }, true);

  // Save route when tab goes to background
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      const pathname = window.location.pathname;
      const search = window.location.search;
      const hash = window.location.hash;
      
      if (!isPublicRoute(pathname)) {
        writeState(pathname, search, hash);
        console.log("[RouteResume] Saved before hidden", { 
          path: `${pathname}${search}${hash}` 
        });
      }
    }

    // When visible, check if we need to restore (but respect anti-loop)
    if (document.visibilityState === "visible" && !hasRestoreAttempted()) {
      const currentPath = getFullPath();
      const saved = readState();
      
      if (saved && isPublicRoute(window.location.pathname) && isValidRestore(saved, currentPath)) {
        performRestore(saved, "visibilitychange");
      }
    }
  }, true);

  // Handle focus as fallback
  window.addEventListener("focus", () => {
    if (hasRestoreAttempted()) return;
    
    const currentPath = getFullPath();
    const saved = readState();
    
    if (saved && isPublicRoute(window.location.pathname) && isValidRestore(saved, currentPath)) {
      performRestore(saved, "focus");
    }
  }, true);

  // Handle pageshow for BFCache scenarios
  window.addEventListener("pageshow", (e) => {
    if (hasRestoreAttempted()) return;
    
    const currentPath = getFullPath();
    const saved = readState();
    
    if (saved && isPublicRoute(window.location.pathname) && isValidRestore(saved, currentPath)) {
      performRestore(saved, e.persisted ? "pageshow:bfcache" : "pageshow");
    }
  }, true);

  console.log("[RouteResume] Guard v3 installed ✅");
}
