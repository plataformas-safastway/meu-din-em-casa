/**
 * SessionOverlayWithTimeout - Enhanced session overlay with timeout fallback
 * 
 * BEHAVIOR:
 * - Shows soft overlay during session verification
 * - After timeout threshold, adds recovery CTAs
 * - NEVER unmounts children
 * - NEVER redirects automatically
 */

import { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuthTimeout } from '@/hooks/useAuthTimeout';
import { AuthTimeoutFallback } from './AuthTimeoutFallback';

interface SessionOverlayWithTimeoutProps {
  /** Whether auth is currently loading/verifying */
  isLoading: boolean;
  /** Children to keep mounted behind the overlay */
  children: ReactNode;
  /** Custom message to show */
  message?: string;
  /** Timeout in milliseconds (default: 10000) */
  timeoutMs?: number;
  /** Whether to show "Voltar ao Dashboard" option */
  showDashboardReturn?: boolean;
}

export function SessionOverlayWithTimeout({
  isLoading,
  children,
  message = 'Verificando acesso…',
  timeoutMs = 10000,
  showDashboardReturn = false,
}: SessionOverlayWithTimeoutProps) {
  const { 
    hasTimedOut, 
    resetTimeout, 
    remainingSeconds,
    isSlowLoading,
  } = useAuthTimeout({
    isLoading,
    timeoutMs,
    softMode: true,
  });

  // If not loading, just render children
  if (!isLoading) {
    return <>{children}</>;
  }

  // If timed out, show soft fallback overlay
  if (hasTimedOut) {
    return (
      <>
        {children}
        <AuthTimeoutFallback
          onRetry={resetTimeout}
          timeoutSeconds={Math.ceil(timeoutMs / 1000)}
          remainingSeconds={0}
          mode="soft"
          showDashboardReturn={showDashboardReturn}
        />
      </>
    );
  }

  // Show soft loading overlay (keeps children mounted)
  return (
    <>
      {children}
      <div 
        className="fixed inset-0 z-40 bg-background/30 backdrop-blur-[2px] flex items-center justify-center pointer-events-auto animate-in fade-in duration-300"
        style={{ touchAction: 'none' }}
      >
        <div className="bg-background/90 backdrop-blur-sm rounded-lg px-6 py-4 shadow-lg flex items-center gap-3">
          <Loader2 className="h-5 w-5 text-primary animate-spin" />
          <div className="flex flex-col">
            <span className="text-sm text-muted-foreground">{message}</span>
            {isSlowLoading && remainingSeconds > 0 && (
              <span className="text-xs text-muted-foreground/70">
                {remainingSeconds}s restantes...
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
