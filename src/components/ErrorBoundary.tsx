import React from "react";

type Props = {
  children: React.ReactNode;
  title?: string;
  description?: string;
  onReload?: () => void;
  /** Safe context for logs (no PII / no transaction contents). */
  logContext?: Record<string, string | number | boolean | null | undefined>;
};

type State = { hasError: boolean; error?: Error };

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // ⚠️ Nunca logar dados sensíveis.
    console.error("[OIK Import][RenderError]", {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      context: this.props.logContext,
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
              {this.props.title ?? "Ops, algo deu errado ao exibir a revisão."}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {this.props.description ??
                "Tente recarregar a página. Se persistir, fale com o suporte e informe o ID da importação."}
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
