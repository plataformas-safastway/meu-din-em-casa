import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initGlobalErrorHandlers } from "./components/ErrorBoundary";

// Initialize global error capture before rendering
initGlobalErrorHandlers();

createRoot(document.getElementById("root")!).render(<App />);
