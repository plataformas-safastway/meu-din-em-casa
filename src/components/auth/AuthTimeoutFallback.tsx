import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, LogOut, ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { clearRouteResumeState } from '@/lib/routeResumeGuard';
import { logAuthStage } from '@/lib/authDebug';
import { addBreadcrumb } from '@/lib/observability';
import oikSymbol from '@/assets/oik-symbol.svg';

interface AuthTimeoutFallbackProps {
  onRetry: () => void;
  timeoutSeconds: number;
  /** Current time remaining (for progressive messaging) */
  remainingSeconds?: number;
  /** Whether this is in "soft" mode (overlay over content) vs "blocking" mode */
  mode?: 'soft' | 'blocking';
  /** Whether to show "Voltar ao Dashboard" option (admin context) */
  showDashboardReturn?: boolean;
  /** Custom message override */
  message?: string;
}

/**
 * AuthTimeoutFallback - Non-blocking fallback for auth loading timeouts
 * 
 * BEHAVIOR:
 * - In "soft" mode: Shows as an overlay with progressive messaging
 * - In "blocking" mode: Full-screen fallback (legacy behavior)
 * - NEVER redirects automatically
 * - NEVER alters authorization state
 * - Only provides manual CTAs for user-initiated recovery
 */
export function AuthTimeoutFallback({ 
  onRetry, 
  timeoutSeconds,
  remainingSeconds,
  mode = 'blocking',
  showDashboardReturn = false,
  message,
}: AuthTimeoutFallbackProps) {
  const [clearing, setClearing] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const handleClearSession = async () => {
    setClearing(true);
    
    addBreadcrumb('auth', 'user_clear_session', { reason: 'timeout_fallback' });
    logAuthStage('AUTH_CLEAR_SESSION', { reason: 'user_initiated_timeout' });
    
    try {
      // Clear all auth-related storage
      localStorage.removeItem('sb-wnagybpurqweowmievji-auth-token');
      sessionStorage.clear();
      
      // Clear route resume state
      clearRouteResumeState();
      
      // Sign out from Supabase (may fail if already invalid)
      try {
        await supabase.auth.signOut({ scope: 'local' });
      } catch (e) {
        // Ignore - session may already be invalid
        console.log('[AuthTimeout] signOut failed (expected if session invalid):', e);
      }
      
      // Hard reload to /login
      window.location.href = '/login';
    } catch (error) {
      console.error('[AuthTimeout] Clear session error:', error);
      // Force reload anyway
      window.location.href = '/login';
    }
  };

  const handleRetry = async () => {
    setRetrying(true);
    addBreadcrumb('auth', 'user_retry', { context: 'timeout_fallback' });
    
    try {
      // Try to refresh session first
      const { error } = await supabase.auth.refreshSession();
      
      if (error) {
        logAuthStage('AUTH_REFRESH_FAIL', { 
          error: error.message,
          context: 'timeout_retry',
        });
        // Don't auto-clear - let user decide
        console.warn('[AuthTimeout] Refresh failed:', error.message);
      } else {
        logAuthStage('AUTH_REFRESH_SUCCESS', { context: 'timeout_retry' });
      }
      
      onRetry();
    } catch (e) {
      console.error('[AuthTimeout] Retry error:', e);
      // Still call onRetry to reset state
      onRetry();
    } finally {
      setRetrying(false);
    }
  };

  const handleReturnToDashboard = () => {
    addBreadcrumb('auth', 'return_to_dashboard', { context: 'timeout_fallback' });
    window.location.href = '/admin';
  };

  // Progressive messaging based on remaining time
  const getProgressiveMessage = (): string => {
    if (message) return message;
    
    if (remainingSeconds !== undefined && remainingSeconds > 0) {
      return `Verificando sessão... (${remainingSeconds}s)`;
    }
    
    return 'O carregamento está demorando mais que o normal.';
  };

  const getSubMessage = (): string => {
    if (remainingSeconds !== undefined && remainingSeconds > 5) {
      return 'Aguarde enquanto verificamos sua sessão.';
    }
    return 'Isso pode acontecer por problemas de conexão ou sessão expirada.';
  };

  // Soft mode: Overlay that doesn't block completely
  if (mode === 'soft') {
    return (
      <div 
        className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm flex items-center justify-center"
        style={{ touchAction: 'none' }}
      >
        <div className="bg-background border border-border rounded-2xl shadow-xl p-6 max-w-sm mx-4 space-y-5">
          {/* Símbolo */}
          <div className="flex justify-center">
            <img src={oikSymbol} alt="Oik" className="w-8 h-8 object-contain" />
          </div>

          {/* Icon */}
          <div className="flex justify-center">
            <div className="w-12 h-12 rounded-full bg-warning/20 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-warning" />
            </div>
          </div>

          {/* Message */}
          <div className="space-y-1 text-center">
            <p className="text-sm font-medium text-foreground">
              {getProgressiveMessage()}
            </p>
            <p className="text-xs text-muted-foreground">
              {getSubMessage()}
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <Button
              onClick={handleRetry}
              className="w-full h-10 rounded-xl font-medium"
              disabled={clearing || retrying}
              size="sm"
            >
              {retrying ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Tentar novamente
                </>
              )}
            </Button>
            
            {showDashboardReturn && (
              <Button
                onClick={handleReturnToDashboard}
                variant="outline"
                className="w-full h-10 rounded-xl font-medium"
                disabled={clearing || retrying}
                size="sm"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar ao Dashboard
              </Button>
            )}
            
            <Button
              onClick={handleClearSession}
              variant="ghost"
              className="w-full h-10 rounded-xl font-medium text-muted-foreground"
              disabled={clearing || retrying}
              size="sm"
            >
              {clearing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saindo...
                </>
              ) : (
                <>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sair
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Blocking mode: Full-screen fallback (original behavior)
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-8 text-center">
        {/* Símbolo */}
        <div className="flex justify-center">
          <img src={oikSymbol} alt="Oik" className="w-12 h-12 object-contain" />
        </div>

        {/* Error Icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
        </div>

        {/* Message */}
        <div className="space-y-2">
          <h1 className="text-xl font-semibold text-foreground">
            Não foi possível concluir o login
          </h1>
          <p className="text-sm text-muted-foreground">
            O carregamento excedeu {timeoutSeconds} segundos. 
            Isso pode acontecer por problemas de conexão ou sessão expirada.
          </p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <Button
            onClick={handleRetry}
            className="w-full h-12 rounded-xl font-medium"
            disabled={clearing || retrying}
          >
            {retrying ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Tentando...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Tentar novamente
              </>
            )}
          </Button>
          
          {showDashboardReturn && (
            <Button
              onClick={handleReturnToDashboard}
              variant="outline"
              className="w-full h-12 rounded-xl font-medium"
              disabled={clearing || retrying}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Dashboard
            </Button>
          )}
          
          <Button
            onClick={handleClearSession}
            variant="outline"
            className="w-full h-12 rounded-xl font-medium"
            disabled={clearing || retrying}
          >
            {clearing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Limpando...
              </>
            ) : (
              <>
                <LogOut className="w-4 h-4 mr-2" />
                Limpar sessão e reconectar
              </>
            )}
          </Button>
        </div>

        {/* Help text */}
        <p className="text-xs text-muted-foreground">
          Se o problema persistir, tente limpar a sessão ou entre em contato com o suporte.
        </p>
      </div>
    </div>
  );
}
