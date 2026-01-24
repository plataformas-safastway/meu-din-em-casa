import React from "react";
import { reportError } from "@/hooks/useSupportModule";

type Props = {
  children: React.ReactNode;
  title?: string;
  description?: string;
  onReload?: () => void;
  /** Safe context for logs (no PII / no transaction contents). */
  logContext?: Record<string, string | number | boolean | null | undefined>;
  /** Module name for error tracking */
  module?: string;
};

type State = { hasError: boolean; error?: Error };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // ⚠️ Nunca logar dados sensíveis.
    console.error("[OIK][RenderError]", {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      context: this.props.logContext,
    });

    // Report to support_errors table
    reportError({
      errorMessage: error.message,
      errorStack: error.stack,
      errorType: 'ui',
      module: this.props.module || 'unknown',
      screen: window.location.pathname,
      userAction: 'component_render',
      metadata: {
        componentStack: errorInfo.componentStack?.substring(0, 2000),
        ...this.props.logContext,
      },
    });
  }

  private handleReload = () => {
    if (this.props.onReload) return this.props.onReload();
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-background">
        <main className="container px-4 py-10">
          <div className="max-w-lg mx-auto rounded-2xl border border-border bg-card p-5">
            <h1 className="text-lg font-semibold text-foreground">
              {this.props.title ?? "Ops, algo deu errado."}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {this.props.description ??
                "Tente recarregar a página. Se persistir, o erro já foi registrado automaticamente para nossa equipe de suporte."}
            </p>
            <div className="mt-4">
              <button
                type="button"
                onClick={this.handleReload}
                className="inline-flex items-center justify-center h-10 px-4 rounded-md text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition"
              >
                Recarregar
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }
}

// =====================================================
// Global Error Handlers Setup
// =====================================================

let globalHandlersInitialized = false;

export function initGlobalErrorHandlers() {
  if (globalHandlersInitialized) return;
  globalHandlersInitialized = true;

  // Unhandled JS errors
  window.addEventListener('error', (event) => {
    // Ignore script loading errors from extensions
    if (event.filename?.includes('extension://')) return;
    
    reportError({
      errorMessage: event.message || 'Unknown error',
      errorStack: event.error?.stack,
      errorType: 'runtime',
      screen: window.location.pathname,
      userAction: 'global_error',
      metadata: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      },
    });
  });

  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason;
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? error.stack : undefined;

    reportError({
      errorMessage: message,
      errorStack: stack,
      errorType: 'promise',
      screen: window.location.pathname,
      userAction: 'unhandled_rejection',
    });
  });

  console.log('[OIK] Global error handlers initialized');
}
