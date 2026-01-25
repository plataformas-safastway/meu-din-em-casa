/**
 * Performance Monitoring & Web Vitals
 * 
 * Instrumenta TTFB, FCP, LCP, INP, CLS
 * + First load metrics for Home
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
  HOME_RENDER: { good: 500, poor: 1500 },
  HOME_DATA: { good: 1000, poor: 3000 },
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

// Timing marks for first load
let appStartTime: number | null = null;
let homeRenderTime: number | null = null;
let homeDataTime: number | null = null;

export function markAppStart() {
  appStartTime = performance.now();
  if (import.meta.env.DEV) {
    console.log('%c[Perf] App start marked', 'color: #60a5fa;');
  }
}

export function markHomeRender() {
  if (appStartTime === null) return;
  homeRenderTime = performance.now() - appStartTime;
  logMetric('HOME_RENDER', homeRenderTime);
}

export function markHomeDataReady() {
  if (appStartTime === null) return;
  homeDataTime = performance.now() - appStartTime;
  logMetric('HOME_DATA', homeDataTime);
}

export function getFirstLoadMetrics() {
  return {
    homeRender: homeRenderTime,
    homeData: homeDataTime,
  };
}

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

export function measureEndpointTTFB(endpoint: string, ttfb: number, payloadSize?: number) {
  const timings = endpointTimings.get(endpoint) || [];
  timings.push(ttfb);
  endpointTimings.set(endpoint, timings.slice(-10)); // Keep last 10
  
  if (import.meta.env.DEV) {
    const avg = timings.reduce((a, b) => a + b, 0) / timings.length;
    const sizeStr = payloadSize ? ` | ${(payloadSize / 1024).toFixed(1)}KB` : '';
    console.log(`[TTFB] ${endpoint}: ${Math.round(ttfb)}ms (avg: ${Math.round(avg)}ms)${sizeStr}`);
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

  // Mark app start immediately
  markAppStart();

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

// Fetch wrapper that measures TTFB and payload size
export async function fetchWithTTFB<T>(
  url: string,
  options?: RequestInit
): Promise<{ data: T; ttfb: number; payloadSize: number }> {
  const start = performance.now();
  
  const response = await fetch(url, options);
  const ttfb = performance.now() - start;
  
  // Get response text to measure payload
  const text = await response.text();
  const payloadSize = new Blob([text]).size;
  
  // Extract endpoint name
  const endpoint = url.replace(/\?.*$/, '').split('/').pop() || url;
  measureEndpointTTFB(endpoint, ttfb, payloadSize);
  
  const data = JSON.parse(text) as T;
  return { data, ttfb, payloadSize };
}
