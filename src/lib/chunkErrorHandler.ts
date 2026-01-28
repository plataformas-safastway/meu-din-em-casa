/**
 * Chunk Error Handler
 * 
 * Handles dynamic import failures gracefully.
 * Common causes: PWA cache issues, deployment during user session.
 */

import { captureChunkError, addBreadcrumb } from './observability';

// =====================================================
// State
// =====================================================

let chunkErrorOccurred = false;
let chunkErrorCallbacks: Array<(error: Error) => void> = [];

// =====================================================
// Detection
// =====================================================

export function isChunkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  
  const message = error.message.toLowerCase();
  const name = error.name.toLowerCase();
  
  return (
    name.includes('chunkloaderror') ||
    message.includes('loading chunk') ||
    message.includes('failed to fetch dynamically imported module') ||
    message.includes('loading css chunk') ||
    message.includes('unable to preload css')
  );
}

// =====================================================
// Handler
// =====================================================

export function handleChunkError(error: Error, chunkId?: string): void {
  // Only handle once per session
  if (chunkErrorOccurred) return;
  chunkErrorOccurred = true;
  
  // Log to observability
  captureChunkError(error, chunkId);
  
  // Notify registered callbacks
  chunkErrorCallbacks.forEach((cb) => {
    try {
      cb(error);
    } catch {
      // Ignore callback errors
    }
  });
}

export function onChunkError(callback: (error: Error) => void): () => void {
  chunkErrorCallbacks.push(callback);
  return () => {
    chunkErrorCallbacks = chunkErrorCallbacks.filter((cb) => cb !== callback);
  };
}

export function hasChunkErrorOccurred(): boolean {
  return chunkErrorOccurred;
}

// =====================================================
// Safe Dynamic Import
// =====================================================

/**
 * Wraps a dynamic import with chunk error handling.
 * Use this for lazy-loaded routes and components.
 */
export async function safeDynamicImport<T>(
  importFn: () => Promise<T>,
  fallback?: T
): Promise<T> {
  try {
    return await importFn();
  } catch (error) {
    if (isChunkError(error as Error)) {
      handleChunkError(error as Error);
      
      if (fallback !== undefined) {
        return fallback;
      }
    }
    throw error;
  }
}

// =====================================================
// Cache Busting
// =====================================================

/**
 * Forces a hard reload to bypass cache.
 * Use when chunk errors occur to get fresh assets.
 */
export function forceRefresh(): void {
  addBreadcrumb('chunk', 'force_refresh');
  
  // Clear service worker caches if possible
  if ('caches' in window) {
    caches.keys().then((names) => {
      names.forEach((name) => {
        caches.delete(name);
      });
    }).catch(() => {
      // Ignore errors
    });
  }
  
  // Hard reload with cache bypass
  window.location.href = window.location.href + '?t=' + Date.now();
}

// =====================================================
// Vite HMR Error Handler
// =====================================================

export function setupViteErrorHandler(): void {
  // Handle Vite HMR errors in development
  if (import.meta.hot) {
    import.meta.hot.on('vite:error', (payload) => {
      addBreadcrumb('chunk', 'vite_error', { 
        message: payload?.err?.message,
      });
    });
  }
}
