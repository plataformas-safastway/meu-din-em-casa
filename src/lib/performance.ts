/**
 * Performance Monitoring & Web Vitals
 * 
 * Instrumenta TTFB, FCP, LCP, INP, CLS
 */

interface PerformanceMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
}

// Thresholds based on Web Vitals
const THRESHOLDS = {
  FCP: { good: 1800, poor: 3000 },
  LCP: { good: 2500, poor: 4000 },
  INP: { good: 200, poor: 500 },
  CLS: { good: 0.1, poor: 0.25 },
  TTFB: { good: 800, poor: 1800 },
};

function getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const threshold = THRESHOLDS[name as keyof typeof THRESHOLDS];
  if (!threshold) return 'good';
  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

// Store metrics in memory for debugging
const metricsStore: PerformanceMetric[] = [];

export function logMetric(name: string, value: number) {
  const metric: PerformanceMetric = {
    name,
    value: Math.round(value),
    rating: getRating(name, value),
    timestamp: Date.now(),
  };
  
  metricsStore.push(metric);
  
  // Log to console in dev
  if (import.meta.env.DEV) {
    const color = metric.rating === 'good' ? '#22c55e' : 
                  metric.rating === 'needs-improvement' ? '#f59e0b' : '#ef4444';
    console.log(
      `%c[Perf] ${name}: ${metric.value}ms (${metric.rating})`,
      `color: ${color}; font-weight: bold;`
    );
  }
}

export function getMetrics(): PerformanceMetric[] {
  return [...metricsStore];
}

export function clearMetrics() {
  metricsStore.length = 0;
}

// Measure TTFB per endpoint
const endpointTimings = new Map<string, number[]>();

export function measureEndpointTTFB(endpoint: string, ttfb: number) {
  const timings = endpointTimings.get(endpoint) || [];
  timings.push(ttfb);
  endpointTimings.set(endpoint, timings.slice(-10)); // Keep last 10
  
  if (import.meta.env.DEV) {
    const avg = timings.reduce((a, b) => a + b, 0) / timings.length;
    console.log(`[TTFB] ${endpoint}: ${Math.round(ttfb)}ms (avg: ${Math.round(avg)}ms)`);
  }
}

export function getEndpointTTFB(endpoint: string): { latest: number; avg: number } | null {
  const timings = endpointTimings.get(endpoint);
  if (!timings || timings.length === 0) return null;
  return {
    latest: timings[timings.length - 1],
    avg: timings.reduce((a, b) => a + b, 0) / timings.length,
  };
}

// Initialize Web Vitals observation
export function initWebVitals() {
  if (typeof window === 'undefined') return;

  // FCP - First Contentful Paint
  const fcpObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.name === 'first-contentful-paint') {
        logMetric('FCP', entry.startTime);
      }
    }
  });
  try {
    fcpObserver.observe({ type: 'paint', buffered: true });
  } catch (e) {
    // Not supported
  }

  // LCP - Largest Contentful Paint
  const lcpObserver = new PerformanceObserver((list) => {
    const entries = list.getEntries();
    const lastEntry = entries[entries.length - 1];
    if (lastEntry) {
      logMetric('LCP', lastEntry.startTime);
    }
  });
  try {
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch (e) {
    // Not supported
  }

  // CLS - Cumulative Layout Shift
  let clsValue = 0;
  const clsObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      // @ts-ignore - layout-shift entries have `value`
      if (!entry.hadRecentInput) {
        // @ts-ignore
        clsValue += entry.value;
      }
    }
    logMetric('CLS', clsValue * 1000); // Log as pseudo-ms for consistency
  });
  try {
    clsObserver.observe({ type: 'layout-shift', buffered: true });
  } catch (e) {
    // Not supported
  }

  // Navigation timing for TTFB
  const navObserver = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      const navEntry = entry as PerformanceNavigationTiming;
      const ttfb = navEntry.responseStart - navEntry.requestStart;
      logMetric('TTFB', ttfb);
    }
  });
  try {
    navObserver.observe({ type: 'navigation', buffered: true });
  } catch (e) {
    // Not supported
  }
}

// Fetch wrapper that measures TTFB
export async function fetchWithTTFB<T>(
  url: string,
  options?: RequestInit
): Promise<{ data: T; ttfb: number }> {
  const start = performance.now();
  
  const response = await fetch(url, options);
  const ttfb = performance.now() - start;
  
  // Extract endpoint name
  const endpoint = url.replace(/\?.*$/, '').split('/').pop() || url;
  measureEndpointTTFB(endpoint, ttfb);
  
  const data = await response.json();
  return { data, ttfb };
}
