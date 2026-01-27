import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initGlobalErrorHandlers } from "./components/ErrorBoundary";
import { initWebVitals } from "./lib/performance";
import { initReloadDiagnostics, logAppBoot } from "./lib/reloadDiagnostics";

// Initialize diagnostics FIRST (before anything else)
initReloadDiagnostics();

// Initialize global error capture before rendering
initGlobalErrorHandlers();

// Initialize Web Vitals performance monitoring
initWebVitals();

// Log app boot for reload detection
logAppBoot();

createRoot(document.getElementById("root")!).render(<App />);
