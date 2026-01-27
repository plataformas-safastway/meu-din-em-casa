type ResumeState = {
  path: string;
  ts: number;
};

const STORAGE_KEY = "oik:route_resume";

let installed = false;

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

/**
 * Determines if a path is "home-like" (a public surface with no navigation context).
 * 
 * CRITICAL: '/login?next=...' is NOT home-like because it has navigation context we want to preserve.
 * Only exact '/' and '/login' (without query) are considered home-like.
 */
function isHomeLike(path: string): boolean {
  // '/' is always home-like - no context to preserve.
  if (path === "/") return true;

  // '/login' without query params is home-like.
  if (path === "/login") return true;

  // Everything else, including '/login?next=...' and '/admin', is NOT home-like.
  return false;
}

function reportIfUnexpectedHome(nextPath: string, source: string) {
  const saved = readState();
  const current = getFullPath();

  // We care when navigation *lands* on a home-like surface from a non-home route.
  if (isHomeLike(nextPath) && saved?.path && !isHomeLike(saved.path)) {
    console.error("[RouteResume] HOME_LIKE_NAV_DETECTED", {
      fromSaved: saved.path,
      to: nextPath,
      current,
      source,
    });
    console.trace("[RouteResume] home-like nav stack");
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
  if (installed) return;
  installed = true;

  // Track route changes continuously, not only on visibility hidden.
  // This gives us a reliable lastRoute even when visibility events are flaky.
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function patchedPushState(...args) {
    // eslint-disable-next-line prefer-rest-params
    const ret = originalPushState.apply(this, args as any);
    const nextPath = getFullPath();
    if (!isHomeLike(nextPath)) {
      writeState(nextPath);
    } else {
      reportIfUnexpectedHome(nextPath, "history.pushState");
    }
    return ret;
  } as any;

  history.replaceState = function patchedReplaceState(...args) {
    // eslint-disable-next-line prefer-rest-params
    const ret = originalReplaceState.apply(this, args as any);
    const nextPath = getFullPath();
    if (!isHomeLike(nextPath)) {
      writeState(nextPath);
    } else {
      reportIfUnexpectedHome(nextPath, "history.replaceState");
    }
    return ret;
  } as any;

  window.addEventListener(
    "popstate",
    () => {
      const nextPath = getFullPath();
      if (!isHomeLike(nextPath)) {
        writeState(nextPath);
      } else {
        reportIfUnexpectedHome(nextPath, "popstate");
      }
    },
    true
  );

  // Persist the route when the tab goes to background.
  const tryRestore = (source: string) => {
    const current = getFullPath();
    const saved = readState();

    // Restore when we land on a home-like surface but we had a non-home route saved.
    if (isHomeLike(current) && saved?.path && !isHomeLike(saved.path)) {
      const MAX_AGE_MS = 10 * 60 * 1000;
      const age = Date.now() - saved.ts;
      if (age <= MAX_AGE_MS) {
        console.error("[RouteResume] RESTORE_FROM_HOME_LIKE", {
          from: current,
          to: saved.path,
          ageMs: age,
          source,
        });
        console.trace("[RouteResume] restore stack");

        history.replaceState(null, "", saved.path);
        window.dispatchEvent(new PopStateEvent("popstate"));
      }
    }
  };

  const onVisibilityChange = () => {
    if (document.visibilityState === "hidden") {
      const current = getFullPath();
      // Always store the current path (except pure home-like) as resume target.
      if (!isHomeLike(current)) {
        writeState(current);
      }
      console.log("[RouteResume] Saved before hidden", { path: current });
    }

    if (document.visibilityState === "visible") {
      tryRestore("visibilitychange:visible");
    }
  };

  document.addEventListener("visibilitychange", onVisibilityChange, true);

  // Some browsers don't reliably fire visibilitychange on tab return; focus is a fallback.
  window.addEventListener(
    "focus",
    () => {
      tryRestore("window:focus");
    },
    true
  );

  // Also handle bfcache restore scenarios.
  window.addEventListener(
    "pageshow",
    () => {
      tryRestore("pageshow");
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
  if (!isHomeLike(current)) return;

  const saved = readState();
  if (!saved?.path || isHomeLike(saved.path)) return;

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
