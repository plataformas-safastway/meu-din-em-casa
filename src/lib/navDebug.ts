/**
 * Enable navigation diagnostics only when explicitly requested.
 *
 * Usage: append `?debugNav=1` to the URL.
 *
 * IMPORTANT: This must remain side-effect-free and safe in production.
 */
export function isNavDebugEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return new URLSearchParams(window.location.search).get("debugNav") === "1";
  } catch {
    return false;
  }
}
