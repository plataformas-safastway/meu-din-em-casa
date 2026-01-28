/**
 * Auth Debug Module - DEV-ONLY diagnostics for authentication flow
 * 
 * Enable via querystring: ?debugAuth=1
 * 
 * Logs all authentication stages, errors, and timing for diagnosis.
 */

export type AuthStage = 
  | 'AUTH_INIT_START'
  | 'AUTH_SESSION_READ'
  | 'AUTH_REFRESH_START'
  | 'AUTH_REFRESH_SUCCESS'
  | 'AUTH_REFRESH_FAIL'
  | 'AUTH_USER_READY'
  | 'AUTH_LOADING_END'
  | 'AUTH_TIMEOUT'
  | 'AUTH_ERROR'
  | 'AUTH_NETWORK_REQUEST'
  | 'AUTH_NETWORK_RESPONSE'
  | 'AUTH_STATE_CHANGE'
  | 'AUTH_CLEAR_SESSION';

interface AuthLogEntry {
  stage: AuthStage;
  timestamp: number;
  elapsed?: number;
  data?: Record<string, unknown>;
}

// Global state
let authDebugEnabled = false;
let authLogs: AuthLogEntry[] = [];
let authStartTime: number | null = null;

/**
 * Check if auth debug mode is enabled via querystring
 */
export function isAuthDebugEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Cache the result after first check
  if (authDebugEnabled) return true;
  
  try {
    const params = new URLSearchParams(window.location.search);
    authDebugEnabled = params.get('debugAuth') === '1';
    return authDebugEnabled;
  } catch {
    return false;
  }
}

/**
 * Log an auth stage event
 */
export function logAuthStage(stage: AuthStage, data?: Record<string, unknown>): void {
  const now = Date.now();
  
  if (stage === 'AUTH_INIT_START') {
    authStartTime = now;
  }
  
  const entry: AuthLogEntry = {
    stage,
    timestamp: now,
    elapsed: authStartTime ? now - authStartTime : undefined,
    data,
  };
  
  authLogs.push(entry);
  
  // Always log to console if debug is enabled
  if (isAuthDebugEnabled()) {
    const prefix = `[AuthDebug] ${stage}`;
    const elapsedStr = entry.elapsed !== undefined ? ` (+${entry.elapsed}ms)` : '';
    
    if (stage.includes('FAIL') || stage.includes('ERROR') || stage.includes('TIMEOUT')) {
      console.error(`${prefix}${elapsedStr}`, data ?? '');
    } else {
      console.log(`${prefix}${elapsedStr}`, data ?? '');
    }
  }
}

/**
 * Get all auth logs (for debugging UI)
 */
export function getAuthLogs(): AuthLogEntry[] {
  return [...authLogs];
}

/**
 * Clear auth logs
 */
export function clearAuthLogs(): void {
  authLogs = [];
  authStartTime = null;
}

/**
 * Install global error handlers for auth debugging
 */
export function installAuthErrorHandlers(): void {
  if (!isAuthDebugEnabled()) return;
  
  // Capture unhandled errors
  const originalOnError = window.onerror;
  window.onerror = (message, source, lineno, colno, error) => {
    logAuthStage('AUTH_ERROR', {
      type: 'window.onerror',
      message: String(message),
      source,
      lineno,
      colno,
      stack: error?.stack,
    });
    
    if (originalOnError) {
      return originalOnError(message, source, lineno, colno, error);
    }
    return false;
  };
  
  // Capture unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason;
    logAuthStage('AUTH_ERROR', {
      type: 'unhandledrejection',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  });
  
  console.log('[AuthDebug] Error handlers installed');
}

/**
 * Wrap a Supabase auth call with timing and logging
 */
export async function wrapAuthCall<T>(
  name: string,
  endpoint: string,
  call: () => Promise<T>
): Promise<T> {
  if (!isAuthDebugEnabled()) {
    return call();
  }
  
  const startTime = Date.now();
  logAuthStage('AUTH_NETWORK_REQUEST', { name, endpoint });
  
  try {
    const result = await call();
    const duration = Date.now() - startTime;
    logAuthStage('AUTH_NETWORK_RESPONSE', { 
      name, 
      endpoint, 
      duration,
      status: 'success',
    });
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    logAuthStage('AUTH_NETWORK_RESPONSE', {
      name,
      endpoint,
      duration,
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
