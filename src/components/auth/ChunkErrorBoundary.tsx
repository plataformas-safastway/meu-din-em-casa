import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import oikMarca from '@/assets/oik-marca.png';

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
    // Check if this is a chunk loading error
    const isChunkError = 
      error.name === 'ChunkLoadError' ||
      error.message.includes('Failed to fetch dynamically imported module') ||
      error.message.includes('Loading chunk') ||
      error.message.includes('Loading CSS chunk') ||
      error.message.includes('Unable to preload CSS');
    
    if (isChunkError) {
      return {
        hasChunkError: true,
        error,
      };
    }
    
    // Not a chunk error, let it propagate
    return null;
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ChunkError] Caught chunk loading error:', {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
    });
  }

  handleHardReload = () => {
    // Clear service worker cache if possible
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name);
        });
      });
    }
    
    // Force a hard reload bypassing cache
    window.location.reload();
  };

  handleSoftReload = () => {
    // Just try to re-render
    this.setState({ hasChunkError: false, error: null });
  };

  render() {
    if (this.state.hasChunkError) {
      return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
          <div className="w-full max-w-sm space-y-8 text-center">
            {/* Logo */}
            <div className="flex justify-center">
              <img src={oikMarca} alt="Oik" className="h-12 object-contain opacity-90" />
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
