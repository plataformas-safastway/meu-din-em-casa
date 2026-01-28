/**
 * Cloudflare Turnstile types and configuration
 */

export interface TurnstileResponse {
  success: boolean;
  challenge_ts?: string;
  hostname?: string;
  'error-codes'?: string[];
  action?: string;
  cdata?: string;
}

export interface TurnstileVerifyRequest {
  token: string;
  remoteIp?: string;
}

export interface TurnstileVerifyResult {
  valid: boolean;
  error?: string;
}

// Risk levels for progressive security
export type RiskLevel = 'low' | 'medium' | 'high';

export interface RiskAssessment {
  level: RiskLevel;
  requiresChallenge: boolean;
  failedAttempts: number;
  lastAttemptAt?: Date;
}

// Security events for logging
export type SecurityEventType = 
  | 'TURNSTILE_REQUIRED'
  | 'TURNSTILE_VERIFIED'
  | 'TURNSTILE_FAILED'
  | 'RATE_LIMIT_TRIGGERED'
  | 'LOGIN_ATTEMPT'
  | 'LOGIN_FAILED'
  | 'LOGIN_SUCCESS';

export interface SecurityEvent {
  type: SecurityEventType;
  email?: string;
  ip?: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}
