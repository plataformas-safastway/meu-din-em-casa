/**
 * Auth Flow Instrumentation
 * 
 * Detailed tracing for authentication flow with timing and state capture.
 * ALWAYS ACTIVE in production for diagnostics.
 */

import { 
  logAuthFlow, 
  captureEvent, 
  startMark, 
  endMark, 
  addBreadcrumb,
  setUserContext 
} from './observability';

// =====================================================
// Auth Flow State
// =====================================================

interface AuthFlowState {
  startedAt: number | null;
  stages: Array<{
    stage: string;
    timestamp: number;
    elapsed: number;
    data?: Record<string, unknown>;
  }>;
  errors: Array<{
    stage: string;
    error: string;
    timestamp: number;
  }>;
  completed: boolean;
  timedOut: boolean;
}

let currentFlow: AuthFlowState | null = null;

// =====================================================
// Flow Management
// =====================================================

export function startAuthFlow(): void {
  currentFlow = {
    startedAt: Date.now(),
    stages: [],
    errors: [],
    completed: false,
    timedOut: false,
  };
  
  startMark('auth_flow');
  logAuthFlow('AUTH_START', { 
    path: window.location.pathname,
    search: window.location.search,
  });
}

export function recordAuthStage(
  stage: string, 
  data?: Record<string, unknown>
): void {
  if (!currentFlow) {
    // Auto-start if not started
    startAuthFlow();
  }
  
  const now = Date.now();
  const elapsed = currentFlow!.startedAt ? now - currentFlow!.startedAt : 0;
  
  currentFlow!.stages.push({
    stage,
    timestamp: now,
    elapsed,
    data,
  });
  
  // Map internal stages to observability stages
  switch (stage) {
    case 'getSession_start':
      logAuthFlow('SESSION_READ_START');
      startMark('session_read');
      break;
    case 'getSession_end':
      logAuthFlow('SESSION_READ_END', data);
      endMark('session_read');
      break;
    case 'refresh_start':
      logAuthFlow('TOKEN_REFRESH_START');
      startMark('token_refresh');
      break;
    case 'refresh_success':
      logAuthFlow('TOKEN_REFRESH_SUCCESS', data);
      endMark('token_refresh');
      break;
    case 'refresh_fail':
      logAuthFlow('TOKEN_REFRESH_FAIL', data);
      endMark('token_refresh');
      currentFlow!.errors.push({
        stage,
        error: String(data?.error ?? 'Unknown'),
        timestamp: now,
      });
      break;
    case 'user_ready':
      logAuthFlow('USER_CONTEXT_READY', data);
      if (data?.userId) {
        setUserContext(data.userId as string);
      }
      break;
    case 'profile_start':
      logAuthFlow('PROFILE_LOAD_START');
      startMark('profile_load');
      break;
    case 'profile_end':
      logAuthFlow('PROFILE_LOAD_END', data);
      endMark('profile_load');
      break;
    case 'complete':
      completeAuthFlow(data);
      break;
    case 'timeout':
      timeoutAuthFlow();
      break;
    case 'error':
      recordAuthError(String(data?.error ?? 'Unknown error'), data);
      break;
    default:
      addBreadcrumb('auth', stage, data);
  }
}

function completeAuthFlow(data?: Record<string, unknown>): void {
  if (!currentFlow) return;
  
  currentFlow.completed = true;
  const duration = endMark('auth_flow');
  
  logAuthFlow('AUTH_DONE', { 
    duration,
    stageCount: currentFlow.stages.length,
    errorCount: currentFlow.errors.length,
    ...data,
  });
  
  // Capture slow auth flows
  if (duration && duration > 5000) {
    captureEvent({
      category: 'auth',
      name: 'slow_auth_flow',
      severity: 'warning',
      message: `Auth flow took ${Math.round(duration)}ms`,
      data: {
        duration,
        stages: currentFlow.stages,
      },
    });
  }
}

function timeoutAuthFlow(): void {
  if (!currentFlow) return;
  
  currentFlow.timedOut = true;
  const duration = endMark('auth_flow');
  
  logAuthFlow('AUTH_TIMEOUT', {
    duration,
    stages: currentFlow.stages,
    errors: currentFlow.errors,
  });
  
  captureEvent({
    category: 'auth',
    name: 'timeout',
    severity: 'fatal',
    message: 'Authentication timed out',
    data: {
      duration,
      stages: currentFlow.stages,
      errors: currentFlow.errors,
      path: window.location.pathname,
    },
  });
}

export function recordAuthError(error: string, context?: Record<string, unknown>): void {
  const now = Date.now();
  
  if (currentFlow) {
    currentFlow.errors.push({
      stage: 'error',
      error,
      timestamp: now,
    });
  }
  
  logAuthFlow('AUTH_ERROR', { error, ...context });
  
  captureEvent({
    category: 'auth',
    name: 'error',
    severity: 'error',
    message: `Auth error: ${error}`,
    data: {
      error,
      currentFlow: currentFlow ? {
        elapsed: currentFlow.startedAt ? now - currentFlow.startedAt : 0,
        stages: currentFlow.stages,
      } : null,
      ...context,
    },
  });
}

// =====================================================
// State Accessors
// =====================================================

export function getAuthFlowState(): AuthFlowState | null {
  return currentFlow ? { ...currentFlow } : null;
}

export function isAuthFlowActive(): boolean {
  return currentFlow !== null && !currentFlow.completed && !currentFlow.timedOut;
}

export function getAuthFlowDuration(): number | null {
  if (!currentFlow?.startedAt) return null;
  return Date.now() - currentFlow.startedAt;
}

// =====================================================
// Network Request Instrumentation
// =====================================================

export function wrapAuthRequest<T>(
  name: string,
  request: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  
  addBreadcrumb('auth', `request_start: ${name}`);
  
  return request()
    .then((result) => {
      const duration = Date.now() - startTime;
      addBreadcrumb('auth', `request_success: ${name}`, { duration });
      return result;
    })
    .catch((error) => {
      const duration = Date.now() - startTime;
      addBreadcrumb('auth', `request_fail: ${name}`, { 
        duration, 
        error: error.message,
      });
      recordAuthError(`${name} failed: ${error.message}`, { duration });
      throw error;
    });
}
