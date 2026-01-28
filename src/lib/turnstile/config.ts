/**
 * Turnstile configuration
 * 
 * Site key is public and can be in codebase
 * Secret key is stored as Supabase secret (TURNSTILE_SECRET_KEY)
 */

// Public site key - safe to be in codebase
// This should be set by the user in their Cloudflare dashboard
export const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '';

// Thresholds for progressive security
export const SECURITY_CONFIG = {
  // Number of failed attempts before requiring challenge
  FAILED_ATTEMPTS_THRESHOLD: 3,
  
  // Time window for failed attempts (in minutes)
  FAILED_ATTEMPTS_WINDOW_MINUTES: 15,
  
  // Time-to-live for failed attempt records (in minutes)
  FAILED_ATTEMPTS_TTL_MINUTES: 30,
  
  // Whether Turnstile is enabled at all
  TURNSTILE_ENABLED: !!import.meta.env.VITE_TURNSTILE_SITE_KEY,
} as const;

// Check if Turnstile is properly configured
export function isTurnstileConfigured(): boolean {
  return !!TURNSTILE_SITE_KEY && TURNSTILE_SITE_KEY.length > 0;
}
