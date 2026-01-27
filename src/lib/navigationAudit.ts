import { getAuthDebugSnapshot } from "@/lib/devDiagnostics";

let installed = false;

function getFullPath() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function getNavigationType(): string | undefined {
  try {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    return nav?.type;
  } catch {
    return undefined;
  }
}

export function installNavigationAudit() {
  if (installed) return;
  if (typeof window === "undefined") return;
  installed = true;

  let lastPath = getFullPath();

  const reportIfHome = (source: string) => {
    const currentPath = getFullPath();

    // Only report transitions INTO '/', to keep noise low
    if (currentPath === "/" && lastPath !== "/") {
      console.error("[NavAudit] REDIRECT_TO_HOME_TRIGGERED", {
        from: lastPath,
        to: currentPath,
        source,
        visibility: document.visibilityState,
        navType: getNavigationType(),
        auth: getAuthDebugSnapshot(),
      });
      console.trace("[NavAudit] stack");
    }

    lastPath = currentPath;
  };

  // Patch history state changes (react-router uses these under the hood)
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;

  history.pushState = function patchedPushState(...args) {
    // eslint-disable-next-line prefer-rest-params
    const ret = originalPushState.apply(this, args as any);
    reportIfHome("history.pushState");
    return ret;
  } as any;

  history.replaceState = function patchedReplaceState(...args) {
    // eslint-disable-next-line prefer-rest-params
    const ret = originalReplaceState.apply(this, args as any);
    reportIfHome("history.replaceState");
    return ret;
  } as any;

  window.addEventListener(
    "popstate",
    () => {
      reportIfHome("popstate");
    },
    true
  );

  window.addEventListener(
    "hashchange",
    () => {
      reportIfHome("hashchange");
    },
    true
  );

  document.addEventListener(
    "visibilitychange",
    () => {
      // When returning to foreground, immediately check if the URL flipped
      if (document.visibilityState === "visible") {
        reportIfHome("visibilitychange:visible");
      }
    },
    true
  );

  window.addEventListener(
    "pageshow",
    (e) => {
      reportIfHome(e.persisted ? "pageshow:bfcache" : "pageshow");
    },
    true
  );

  console.log("[NavAudit] installed", { initialPath: lastPath });
}
