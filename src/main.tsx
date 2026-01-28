import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initGlobalErrorHandlers } from "./components/ErrorBoundary";
import { initWebVitals } from "./lib/performance";
import { initReloadDiagnostics, logAppBoot } from "./lib/reloadDiagnostics";
import { cleanupLegacyServiceWorkers } from "./lib/swCleanup";
import { installGlobalHandlers, addBreadcrumb } from "./lib/observability";
import { setupViteErrorHandler } from "./lib/chunkErrorHandler";

// CRITICAL: Install production observability FIRST
// This captures all errors including those during boot
installGlobalHandlers();

// CRITICAL: Clean up legacy Service Workers that may cause reload on tab switch
// This runs before anything else to prevent SW interference
cleanupLegacyServiceWorkers();

// Initialize diagnostics (only when ?debugNav=1)
initReloadDiagnostics();

// Initialize global error capture before rendering
initGlobalErrorHandlers();

// Initialize Web Vitals performance monitoring
initWebVitals();

// Setup Vite HMR error handler (dev only)
setupViteErrorHandler();

// Log app boot for reload detection (only when ?debugNav=1)
logAppBoot();

// Log boot breadcrumb
addBreadcrumb('navigation', 'app_boot', {
  path: window.location.pathname,
  search: window.location.search,
  referrer: document.referrer,
});

createRoot(document.getElementById("root")!).render(<App />);
