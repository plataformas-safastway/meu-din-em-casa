import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import oikSymbol from '@/assets/oik-symbol.svg';
import { isChunkError, handleChunkError, forceRefresh } from '@/lib/chunkErrorHandler';
import { captureEvent, addBreadcrumb } from '@/lib/observability';

interface ChunkErrorBoundaryState {
  hasChunkError: boolean;
  error: Error | null;
}

interface ChunkErrorBoundaryProps {
  children: React.ReactNode;
}

/**
 * Error Boundary specifically for chunk loading errors
 * 
 * Catches errors like:
 * - ChunkLoadError
 * - Failed to fetch dynamically imported module
 * - Loading chunk X failed
 * 
 * Shows a friendly UI with option to hard reload.
 */
export class ChunkErrorBoundary extends React.Component<
  ChunkErrorBoundaryProps,
  ChunkErrorBoundaryState
> {
  state: ChunkErrorBoundaryState = {
    hasChunkError: false,
    error: null,
  };

  static getDerivedStateFromError(error: Error): ChunkErrorBoundaryState | null {
    if (isChunkError(error)) {
      return {
        hasChunkError: true,
        error,
      };
    }
    
    // Not a chunk error, let it propagate
    return null;
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log via centralized handler
    handleChunkError(error, 'unknown');
    
    // Also capture in observability
    captureEvent({
      category: 'chunk',
      name: 'boundary_caught',
      severity: 'fatal',
      message: `ChunkErrorBoundary caught: ${error.message}`,
      error,
      data: {
        componentStack: errorInfo.componentStack?.substring(0, 1000),
      },
    });
    
    addBreadcrumb('chunk', 'error_boundary_triggered', {
      message: error.message,
    });
    
    console.error('[ChunkError] Caught chunk loading error:', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  handleHardReload = () => {
    addBreadcrumb('chunk', 'user_clicked_reload');
    forceRefresh();
  };

  handleSoftReload = () => {
    addBreadcrumb('chunk', 'user_clicked_soft_reload');
    // Just try to re-render
    this.setState({ hasChunkError: false, error: null });
  };

  render() {
    if (this.state.hasChunkError) {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
          <div className="w-full max-w-sm space-y-8 text-center">
            {/* Símbolo */}
            <div className="flex justify-center">
              <img src={oikSymbol} alt="Oik" className="w-12 h-12 object-contain" />
            </div>

            {/* Warning Icon */}
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-warning/10 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-warning" />
              </div>
            </div>

            {/* Message */}
            <div className="space-y-2">
              <h1 className="text-xl font-semibold text-foreground">
                Atualização disponível
              </h1>
              <p className="text-sm text-muted-foreground">
                Uma nova versão do aplicativo está disponível. 
                Por favor, atualize a página para continuar.
              </p>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <Button
                onClick={this.handleHardReload}
                className="w-full h-12 rounded-xl font-medium"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Atualizar página
              </Button>
            </div>

            {/* Technical details (collapsed) */}
            <details className="text-left">
              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                Detalhes técnicos
              </summary>
              <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-32">
                {this.state.error?.message}
              </pre>
            </details>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
