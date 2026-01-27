import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initGlobalErrorHandlers } from "./components/ErrorBoundary";
import { initWebVitals } from "./lib/performance";
import { initReloadDiagnostics, logAppBoot } from "./lib/reloadDiagnostics";
import { cleanupLegacyServiceWorkers } from "./lib/swCleanup";

// CRITICAL: Clean up legacy Service Workers that may cause reload on tab switch
// This runs before anything else to prevent SW interference
cleanupLegacyServiceWorkers();

// Initialize diagnostics (only when ?debugNav=1)
initReloadDiagnostics();

// Initialize global error capture before rendering
initGlobalErrorHandlers();

// Initialize Web Vitals performance monitoring
initWebVitals();

// Log app boot for reload detection (only when ?debugNav=1)
logAppBoot();

createRoot(document.getElementById("root")!).render(<App />);
