import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { clearRouteResumeState } from '@/lib/routeResumeGuard';
import { logAuthStage } from '@/lib/authDebug';
import oikMarca from '@/assets/oik-marca.png';

interface AuthTimeoutFallbackProps {
  onRetry: () => void;
  timeoutSeconds: number;
}

export function AuthTimeoutFallback({ onRetry, timeoutSeconds }: AuthTimeoutFallbackProps) {
  const [clearing, setClearing] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const handleClearSession = async () => {
    setClearing(true);
    
    logAuthStage('AUTH_CLEAR_SESSION', { reason: 'user_initiated' });
    
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
    
    try {
      // Try to refresh session first
      const { error } = await supabase.auth.refreshSession();
      
      if (error) {
        logAuthStage('AUTH_REFRESH_FAIL', { 
          error: error.message,
          context: 'timeout_retry',
        });
        // If refresh fails, clear and redirect
        await handleClearSession();
        return;
      }
      
      logAuthStage('AUTH_REFRESH_SUCCESS', { context: 'timeout_retry' });
      onRetry();
    } catch (e) {
      console.error('[AuthTimeout] Retry failed:', e);
      await handleClearSession();
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-8 text-center">
        {/* Logo */}
        <div className="flex justify-center">
          <img src={oikMarca} alt="Oik" className="h-12 object-contain opacity-90" />
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
                <Trash2 className="w-4 h-4 mr-2" />
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
