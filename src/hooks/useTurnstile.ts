import { useEffect, useRef, useCallback, useState } from 'react';
import { TURNSTILE_SITE_KEY, isTurnstileConfigured } from '@/lib/turnstile/config';
import { shouldRequireChallenge } from '@/lib/turnstile/riskAssessment';

declare global {
  interface Window {
    turnstile?: {
      render: (container: string | HTMLElement, options: TurnstileRenderOptions) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
      getResponse: (widgetId: string) => string | undefined;
      execute: (container: string | HTMLElement, options?: TurnstileRenderOptions) => void;
    };
    onloadTurnstileCallback?: () => void;
  }
}

interface TurnstileRenderOptions {
  sitekey: string;
  callback?: (token: string) => void;
  'error-callback'?: (error: unknown) => void;
  'expired-callback'?: () => void;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'normal' | 'compact' | 'invisible' | 'flexible';
  appearance?: 'always' | 'execute' | 'interaction-only';
  action?: string;
  cData?: string;
  'response-field'?: boolean;
  'response-field-name'?: string;
  retry?: 'auto' | 'never';
  'retry-interval'?: number;
  'refresh-expired'?: 'auto' | 'manual' | 'never';
  language?: string;
}

interface UseTurnstileOptions {
  onSuccess?: (token: string) => void;
  onError?: (error: unknown) => void;
  onExpired?: () => void;
  action?: string;
  invisible?: boolean;
  forceChallenge?: boolean;
}

interface UseTurnstileReturn {
  token: string | null;
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
  requiresChallenge: boolean;
  containerRef: React.RefCallback<HTMLDivElement>;
  reset: () => void;
  execute: () => void;
}

// Track script loading globally
let scriptLoaded = false;
let scriptLoading = false;
const loadCallbacks: (() => void)[] = [];

function loadTurnstileScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (scriptLoaded && window.turnstile) {
      resolve();
      return;
    }

    if (scriptLoading) {
      loadCallbacks.push(() => resolve());
      return;
    }

    scriptLoading = true;

    const script = document.createElement('script');
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onloadTurnstileCallback&render=explicit';
    script.async = true;
    script.defer = true;

    window.onloadTurnstileCallback = () => {
      scriptLoaded = true;
      scriptLoading = false;
      loadCallbacks.forEach(cb => cb());
      loadCallbacks.length = 0;
      resolve();
    };

    script.onerror = () => {
      scriptLoading = false;
      reject(new Error('Failed to load Turnstile script'));
    };

    document.head.appendChild(script);
  });
}

export function useTurnstile(options: UseTurnstileOptions = {}): UseTurnstileReturn {
  const {
    onSuccess,
    onError,
    onExpired,
    action = 'login',
    invisible = true,
    forceChallenge = false,
  } = options;

  const [token, setToken] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const widgetIdRef = useRef<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mountedRef = useRef(true);

  // Determine if challenge is required
  const riskRequiresChallenge = shouldRequireChallenge();
  const requiresChallenge = forceChallenge || riskRequiresChallenge;
  const isConfigured = isTurnstileConfigured();

  const handleSuccess = useCallback((newToken: string) => {
    if (!mountedRef.current) return;
    console.log('[Turnstile] Token received');
    setToken(newToken);
    setIsLoading(false);
    setError(null);
    onSuccess?.(newToken);
  }, [onSuccess]);

  const handleError = useCallback((err: unknown) => {
    if (!mountedRef.current) return;
    console.error('[Turnstile] Error:', err);
    setError('Verificação de segurança falhou');
    setIsLoading(false);
    onError?.(err);
  }, [onError]);

  const handleExpired = useCallback(() => {
    if (!mountedRef.current) return;
    console.log('[Turnstile] Token expired');
    setToken(null);
    onExpired?.();
  }, [onExpired]);

  const reset = useCallback(() => {
    if (widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current);
      setToken(null);
      setError(null);
    }
  }, []);

  const execute = useCallback(() => {
    if (!isConfigured || !requiresChallenge) {
      // If not configured or not required, skip
      return;
    }

    if (widgetIdRef.current && window.turnstile) {
      setIsLoading(true);
      // For invisible widgets, we need to re-render to trigger
      if (invisible && containerRef.current) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: handleSuccess,
          'error-callback': handleError,
          'expired-callback': handleExpired,
          size: 'invisible',
          action,
        });
      }
    }
  }, [isConfigured, requiresChallenge, invisible, action, handleSuccess, handleError, handleExpired]);

  // Container ref callback
  const setContainerRef = useCallback((node: HTMLDivElement | null) => {
    containerRef.current = node;

    if (!node || !isConfigured) return;

    // Load script and render widget
    setIsLoading(true);
    loadTurnstileScript()
      .then(() => {
        if (!mountedRef.current || !window.turnstile || !containerRef.current) return;

        // Remove existing widget if any
        if (widgetIdRef.current) {
          window.turnstile.remove(widgetIdRef.current);
        }

        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: TURNSTILE_SITE_KEY,
          callback: handleSuccess,
          'error-callback': handleError,
          'expired-callback': handleExpired,
          size: invisible ? 'invisible' : 'normal',
          appearance: invisible ? 'execute' : 'always',
          action,
          theme: 'auto',
        });

        setIsReady(true);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error('[Turnstile] Failed to load:', err);
        setError('Falha ao carregar verificação de segurança');
        setIsLoading(false);
      });
  }, [isConfigured, invisible, action, handleSuccess, handleError, handleExpired]);

  // Cleanup
  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }
    };
  }, []);

  return {
    token,
    isReady,
    isLoading,
    error,
    requiresChallenge,
    containerRef: setContainerRef,
    reset,
    execute,
  };
}
