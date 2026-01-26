import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfterSec: number;
}

export interface RateLimitConfig {
  limit: number;
  windowSec: number;
}

// Default rate limits per endpoint type
export const RATE_LIMITS = {
  // Import operations
  import: { limit: 20, windowSec: 60 },      // 20 req/min
  importProcess: { limit: 10, windowSec: 60 }, // 10 req/min (heavy)
  
  // OCR (expensive)
  ocr: { limit: 10, windowSec: 60 },          // 10 req/min
  
  // Open Finance
  openFinance: { limit: 6, windowSec: 60 },   // 6 req/min
  
  // Home summary (cached, lighter)
  homeSummary: { limit: 60, windowSec: 60 },  // 60 req/min
  
  // General API
  default: { limit: 30, windowSec: 60 },      // 30 req/min
  
  // Auth (strict)
  auth: { limit: 5, windowSec: 600 },         // 5 attempts / 10 min
} as const;

/**
 * Check and update rate limit for a given key
 * Uses Supabase table for persistence
 */
export async function checkRateLimit(
  supabaseAdmin: SupabaseClient,
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const now = new Date();
  const resetAt = new Date(now.getTime() + config.windowSec * 1000);

  try {
    // Get current rate limit entry
    const { data, error } = await supabaseAdmin
      .from("rate_limits")
      .select("count, reset_at")
      .eq("key", key)
      .maybeSingle();

    if (error) {
      console.error("[rateLimit] DB error:", error);
      // Fail open on DB errors (don't block legitimate requests)
      return { allowed: true, remaining: config.limit, resetAt, retryAfterSec: 0 };
    }

    // No existing entry or window expired
    if (!data || new Date(data.reset_at) <= now) {
      await supabaseAdmin
        .from("rate_limits")
        .upsert({ 
          key, 
          count: 1, 
          reset_at: resetAt.toISOString() 
        });
      
      return { 
        allowed: true, 
        remaining: config.limit - 1, 
        resetAt, 
        retryAfterSec: 0 
      };
    }

    // Check if limit exceeded
    if (data.count >= config.limit) {
      const existingResetAt = new Date(data.reset_at);
      const retryAfterSec = Math.ceil((existingResetAt.getTime() - now.getTime()) / 1000);
      
      return { 
        allowed: false, 
        remaining: 0, 
        resetAt: existingResetAt, 
        retryAfterSec: Math.max(1, retryAfterSec)
      };
    }

    // Increment counter
    await supabaseAdmin
      .from("rate_limits")
      .update({ count: data.count + 1 })
      .eq("key", key);

    return { 
      allowed: true, 
      remaining: config.limit - (data.count + 1), 
      resetAt: new Date(data.reset_at),
      retryAfterSec: 0
    };
  } catch (err) {
    console.error("[rateLimit] Unexpected error:", err);
    // Fail open
    return { allowed: true, remaining: config.limit, resetAt, retryAfterSec: 0 };
  }
}

/**
 * Generate rate limit key from request context
 */
export function getRateLimitKey(
  endpoint: string,
  userId?: string,
  ip?: string
): string {
  if (userId) {
    return `user:${userId}:${endpoint}`;
  }
  if (ip) {
    return `ip:${ip}:${endpoint}`;
  }
  return `anon:${endpoint}`;
}

/**
 * Get client IP from request headers
 */
export function getClientIP(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    req.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

/**
 * Create 429 rate limit response
 */
export function rateLimitResponse(
  result: RateLimitResult,
  corsHeaders: Record<string, string>
): Response {
  return new Response(
    JSON.stringify({
      error: "rate_limited",
      message: "Muitas tentativas. Aguarde antes de tentar novamente.",
      retry_after_sec: result.retryAfterSec,
      reset_at: result.resetAt.toISOString(),
    }),
    {
      status: 429,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Retry-After": String(result.retryAfterSec),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": result.resetAt.toISOString(),
      },
    }
  );
}

/**
 * Add rate limit headers to successful response
 */
export function addRateLimitHeaders(
  headers: Record<string, string>,
  result: RateLimitResult,
  limit: number
): Record<string, string> {
  return {
    ...headers,
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": result.resetAt.toISOString(),
  };
}
