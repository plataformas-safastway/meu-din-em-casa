type ResumeState = {
  path: string;
  ts: number;
};

const STORAGE_KEY = "oik:route_resume";

function getFullPath(): string {
  return `${window.location.pathname}${window.location.search ?? ""}${window.location.hash ?? ""}`;
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
    const state: ResumeState = { path, ts: Date.now() };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function clearRouteResumeState() {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/**
 * If the browser/tab resumes and somehow the URL becomes '/', restore the last
 * known route that was active right before the tab was hidden.
 *
 * This addresses the critical bug: tab switch -> return -> URL flips to '/'
 * even without explicit app navigation.
 */
export function installRouteResumeGuard() {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  // Persist the route when the tab goes to background.
  const onVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      const current = getFullPath();
      writeState(current);
      console.log("[RouteResume] Saved before hidden", { path: current });
    }

    if (document.visibilityState === "visible") {
      const current = getFullPath();
      const saved = readState();

      // Only restore when we *unexpectedly* land on '/', but we had a different
      // route right before going hidden.
      if (current === "/" && saved?.path && saved.path !== "/") {
        // 10 minutes max window to avoid restoring stale routes.
        const MAX_AGE_MS = 10 * 60 * 1000;
        const age = Date.now() - saved.ts;
        if (age <= MAX_AGE_MS) {
          console.error("[RouteResume] RESTORE_FROM_UNEXPECTED_HOME", {
            from: current,
            to: saved.path,
            ageMs: age,
          });
          console.trace("[RouteResume] stack");

          history.replaceState(null, "", saved.path);
          // Notify react-router (BrowserRouter listens to popstate)
          window.dispatchEvent(new PopStateEvent("popstate"));
        } else {
          console.log("[RouteResume] Saved route too old, not restoring", {
            saved: saved.path,
            ageMs: age,
          });
        }
      }
    }
  };

  document.addEventListener("visibilitychange", onVisibilityChange, true);

  // Also handle bfcache restore scenarios.
  window.addEventListener(
    "pageshow",
    () => {
      const current = getFullPath();
      const saved = readState();
      if (current === "/" && saved?.path && saved.path !== "/") {
        console.warn("[RouteResume] pageshow on '/', attempting restore", {
          to: saved.path,
        });
        history.replaceState(null, "", saved.path);
        window.dispatchEvent(new PopStateEvent("popstate"));
      }
    },
    true
  );
}

/**
 * Runs BEFORE React renders (call at module init). If we boot at '/', but we
 * have a recently saved route from a tab-hidden event, restore it immediately
 * so BrowserRouter starts on the correct location.
 */
export function tryInitialRouteRestore() {
  if (typeof window === "undefined") return;
  const current = getFullPath();
  if (current !== "/") return;

  const saved = readState();
  if (!saved?.path || saved.path === "/") return;

  const MAX_AGE_MS = 10 * 60 * 1000;
  const age = Date.now() - saved.ts;
  if (age > MAX_AGE_MS) return;

  console.error("[RouteResume] INITIAL_RESTORE", {
    from: current,
    to: saved.path,
    ageMs: age,
  });
  console.trace("[RouteResume] initial stack");
  history.replaceState(null, "", saved.path);
}
