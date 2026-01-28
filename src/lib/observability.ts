/**
 * Production Observability Module
 * 
 * Captures errors, performance metrics, and critical events in production.
 * Works with both internal logging (support_errors table) and optional Sentry.
 * 
 * ALWAYS ACTIVE in production - no querystring required.
 */

import { supabase } from '@/integrations/supabase/client';

// =====================================================
// Types
// =====================================================

export type ErrorSeverity = 'fatal' | 'error' | 'warning' | 'info';

export type EventCategory = 
  | 'auth'
  | 'chunk'
  | 'network'
  | 'render'
  | 'performance'
  | 'navigation'
  | 'storage';

export interface ObservabilityEvent {
  category: EventCategory;
  name: string;
  severity: ErrorSeverity;
  message: string;
  data?: Record<string, unknown>;
  error?: Error;
  timestamp?: number;
}

interface Breadcrumb {
  category: string;
  message: string;
  timestamp: number;
  data?: Record<string, unknown>;
}

interface PerformanceMark {
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
}

// =====================================================
// State
// =====================================================

const MAX_BREADCRUMBS = 50;
const breadcrumbs: Breadcrumb[] = [];
const performanceMarks: Map<string, PerformanceMark> = new Map();
let sessionId: string | null = null;

// Sentry-like interface (will be populated if Sentry is loaded)
let sentryClient: {
  captureException: (error: Error, context?: Record<string, unknown>) => void;
  captureMessage: (message: string, level?: string) => void;
  addBreadcrumb: (crumb: { category: string; message: string; data?: Record<string, unknown> }) => void;
  setTag: (key: string, value: string) => void;
  setUser: (user: { id: string; email?: string } | null) => void;
} | null = null;

// =====================================================
// Session ID
// =====================================================

function getSessionId(): string {
  if (sessionId) return sessionId;
  
  try {
    const stored = sessionStorage.getItem('oik_session_id');
    if (stored) {
      sessionId = stored;
    } else {
      sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      sessionStorage.setItem('oik_session_id', sessionId);
    }
  } catch {
    sessionId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
  
  return sessionId;
}

// =====================================================
// Breadcrumbs
// =====================================================

export function addBreadcrumb(category: string, message: string, data?: Record<string, unknown>): void {
  const crumb: Breadcrumb = {
    category,
    message,
    timestamp: Date.now(),
    data,
  };
  
  breadcrumbs.push(crumb);
  
  // Keep only last N breadcrumbs
  if (breadcrumbs.length > MAX_BREADCRUMBS) {
    breadcrumbs.shift();
  }
  
  // Forward to Sentry if available
  sentryClient?.addBreadcrumb(crumb);
}

export function getBreadcrumbs(): Breadcrumb[] {
  return [...breadcrumbs];
}

// =====================================================
// Performance Tracking
// =====================================================

export function startMark(name: string): void {
  performanceMarks.set(name, {
    name,
    startTime: performance.now(),
  });
  
  addBreadcrumb('performance', `Start: ${name}`);
}

export function endMark(name: string): number | null {
  const mark = performanceMarks.get(name);
  if (!mark) return null;
  
  const endTime = performance.now();
  const duration = endTime - mark.startTime;
  
  mark.endTime = endTime;
  mark.duration = duration;
  
  addBreadcrumb('performance', `End: ${name}`, { duration: Math.round(duration) });
  
  // Log slow operations
  if (duration > 3000) {
    captureEvent({
      category: 'performance',
      name: 'slow_operation',
      severity: 'warning',
      message: `Slow operation: ${name} took ${Math.round(duration)}ms`,
      data: { name, duration },
    });
  }
  
  return duration;
}

export function getMarks(): Map<string, PerformanceMark> {
  return new Map(performanceMarks);
}

// =====================================================
// Event Capture
// =====================================================

export function captureEvent(event: ObservabilityEvent): void {
  const timestamp = event.timestamp ?? Date.now();
  
  // Always log to console in a structured way
  const logData = {
    ...event,
    timestamp,
    sessionId: getSessionId(),
    path: window.location.pathname,
    breadcrumbs: getBreadcrumbs().slice(-10),
  };
  
  if (event.severity === 'fatal' || event.severity === 'error') {
    console.error(`[OBS] ${event.category}:${event.name}`, logData);
  } else if (event.severity === 'warning') {
    console.warn(`[OBS] ${event.category}:${event.name}`, logData);
  } else {
    console.log(`[OBS] ${event.category}:${event.name}`, logData);
  }
  
  // Forward to Sentry if available
  if (sentryClient) {
    if (event.error) {
      sentryClient.captureException(event.error, {
        tags: { category: event.category, eventName: event.name },
        extra: event.data,
      });
    } else if (event.severity === 'error' || event.severity === 'fatal') {
      sentryClient.captureMessage(event.message, event.severity);
    }
  }
  
  // Persist critical events to database (non-blocking)
  if (event.severity === 'error' || event.severity === 'fatal') {
    persistEvent(event, timestamp);
  }
}

export function captureException(error: Error, context?: Record<string, unknown>): void {
  captureEvent({
    category: 'render',
    name: 'exception',
    severity: 'error',
    message: error.message,
    error,
    data: {
      stack: error.stack,
      ...context,
    },
  });
}

// =====================================================
// Database Persistence
// =====================================================

async function persistEvent(event: ObservabilityEvent, timestamp: number): Promise<void> {
  try {
    // Get current user if available (non-blocking)
    const { data: { session } } = await supabase.auth.getSession();
    
    // Convert breadcrumbs to JSON-safe format
    const safeBreadcrumbs = getBreadcrumbs().slice(-5).map((b) => ({
      category: b.category,
      message: b.message,
      timestamp: b.timestamp,
      data: b.data ? JSON.parse(JSON.stringify(b.data)) : undefined,
    }));
    
    // Convert performance marks to JSON-safe format
    const safeMarks: Record<string, number | null> = {};
    performanceMarks.forEach((v, k) => {
      safeMarks[k] = v.duration ?? null;
    });
    
    // Build metadata as plain object
    const metadata: Record<string, unknown> = {
      severity: event.severity,
      sessionId: getSessionId(),
      timestamp,
      breadcrumbs: safeBreadcrumbs,
      performanceMarks: safeMarks,
      userAgent: navigator.userAgent,
    };
    
    // Merge event data safely
    if (event.data) {
      Object.entries(event.data).forEach(([key, value]) => {
        try {
          // Ensure value is JSON-serializable
          metadata[key] = JSON.parse(JSON.stringify(value));
        } catch {
          metadata[key] = String(value);
        }
      });
    }
    
    // Use the existing support_errors table
    await supabase.from('support_errors').insert([{
      user_id: session?.user?.id ?? null,
      family_id: null,
      error_type: event.category,
      error_message: event.message,
      error_stack: event.error?.stack ?? null,
      screen: window.location.pathname,
      user_action: event.name,
      metadata: metadata as Record<string, never>,
    }]);
  } catch (err) {
    // Silent fail - don't cause more errors
    console.warn('[OBS] Failed to persist event:', err);
  }
}

// =====================================================
// Auth Flow Instrumentation
// =====================================================

export type AuthStage = 
  | 'AUTH_START'
  | 'SESSION_READ_START'
  | 'SESSION_READ_END'
  | 'TOKEN_REFRESH_START'
  | 'TOKEN_REFRESH_SUCCESS'
  | 'TOKEN_REFRESH_FAIL'
  | 'USER_CONTEXT_READY'
  | 'PROFILE_LOAD_START'
  | 'PROFILE_LOAD_END'
  | 'AUTH_DONE'
  | 'AUTH_TIMEOUT'
  | 'AUTH_ERROR';

const authFlowStart = { time: 0 };

export function logAuthFlow(stage: AuthStage, data?: Record<string, unknown>): void {
  const now = Date.now();
  
  if (stage === 'AUTH_START') {
    authFlowStart.time = now;
  }
  
  const elapsed = authFlowStart.time ? now - authFlowStart.time : 0;
  
  addBreadcrumb('auth', stage, { elapsed, ...data });
  
  const severity: ErrorSeverity = 
    stage.includes('FAIL') || stage.includes('ERROR') || stage === 'AUTH_TIMEOUT' 
      ? 'error' 
      : 'info';
  
  captureEvent({
    category: 'auth',
    name: stage,
    severity,
    message: `Auth stage: ${stage} (+${elapsed}ms)`,
    data: { elapsed, ...data },
  });
}

// =====================================================
// Chunk Error Handling
// =====================================================

export function captureChunkError(error: Error, chunkId?: string): void {
  captureEvent({
    category: 'chunk',
    name: 'load_failed',
    severity: 'fatal',
    message: `Failed to load chunk: ${chunkId ?? 'unknown'}`,
    error,
    data: {
      chunkId,
      url: window.location.href,
      timestamp: Date.now(),
    },
  });
}

// =====================================================
// Navigation Tracking
// =====================================================

export function trackNavigation(from: string, to: string, reason?: string): void {
  addBreadcrumb('navigation', `${from} → ${to}`, { reason });
  
  // Capture unexpected navigations to login or home
  if (to === '/login' || to === '/') {
    captureEvent({
      category: 'navigation',
      name: 'redirect_to_auth',
      severity: 'warning',
      message: `Redirect: ${from} → ${to}`,
      data: { from, to, reason },
    });
  }
}

// =====================================================
// Global Error Handlers
// =====================================================

let handlersInstalled = false;

export function installGlobalHandlers(): void {
  if (handlersInstalled) return;
  handlersInstalled = true;
  
  // Unhandled errors
  window.addEventListener('error', (event) => {
    // Ignore extension errors
    if (event.filename?.includes('extension://')) return;
    
    const isChunkError = 
      event.message?.includes('Loading chunk') ||
      event.message?.includes('Failed to fetch dynamically imported module') ||
      event.message?.includes('ChunkLoadError');
    
    if (isChunkError) {
      captureChunkError(event.error || new Error(event.message));
    } else {
      captureException(event.error || new Error(event.message), {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
      });
    }
  });
  
  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason instanceof Error 
      ? event.reason 
      : new Error(String(event.reason));
    
    const isChunkError = 
      error.message?.includes('Loading chunk') ||
      error.message?.includes('Failed to fetch dynamically imported module');
    
    if (isChunkError) {
      captureChunkError(error);
    } else {
      captureException(error, { type: 'unhandledrejection' });
    }
  });
  
  // Page visibility changes
  document.addEventListener('visibilitychange', () => {
    addBreadcrumb('navigation', `Visibility: ${document.visibilityState}`);
  });
  
  // Before unload
  window.addEventListener('beforeunload', () => {
    addBreadcrumb('navigation', 'beforeunload');
  });
  
  console.log('[OBS] Global handlers installed');
}

// =====================================================
// Sentry Integration (Optional)
// =====================================================

export function setSentryClient(client: typeof sentryClient): void {
  sentryClient = client;
  console.log('[OBS] Sentry client connected');
}

// =====================================================
// User Context
// =====================================================

export function setUserContext(userId: string | null, email?: string): void {
  if (userId) {
    sentryClient?.setUser({ id: userId, email });
    addBreadcrumb('auth', 'user_set', { userId: userId.substring(0, 8) + '...' });
  } else {
    sentryClient?.setUser(null);
    addBreadcrumb('auth', 'user_cleared');
  }
}

// =====================================================
// Diagnostics Export
// =====================================================

export function getDiagnostics(): Record<string, unknown> {
  return {
    sessionId: getSessionId(),
    breadcrumbs: getBreadcrumbs(),
    performanceMarks: Object.fromEntries(performanceMarks),
    path: window.location.pathname,
    timestamp: Date.now(),
    userAgent: navigator.userAgent,
  };
}
