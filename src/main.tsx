import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initGlobalErrorHandlers } from "./components/ErrorBoundary";
import { initWebVitals } from "./lib/performance";

// Initialize global error capture before rendering
initGlobalErrorHandlers();

// Initialize Web Vitals performance monitoring
initWebVitals();

createRoot(document.getElementById("root")!).render(<App />);
