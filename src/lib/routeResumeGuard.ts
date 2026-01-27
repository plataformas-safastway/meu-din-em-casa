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

function isHomeLike(path: string) {
  // Treat both '/' and '/login' as “public home surfaces”; still, we want to preserve
  // query params such as ?next=...
  return path === "/" || path.startsWith("/login");
}

function reportIfUnexpectedHome(nextPath: string, source: string) {
  const saved = readState();
  const current = getFullPath();

  // We care when navigation *lands* on '/' (or /login without query) from a non-home route.
  // The user bug is: /login?next=... -> '/' on tab return.
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

    // Restore when we land on '/' or '/login' but we had a more specific route saved.
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
      // Only store non-home routes as "resume" targets.
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
