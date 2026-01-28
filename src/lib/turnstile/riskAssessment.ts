/**
 * Client-side risk assessment for progressive security
 * 
 * Tracks failed login attempts in localStorage with TTL
 * Determines when to require Turnstile challenge
 */

import { RiskAssessment, RiskLevel } from './types';
import { SECURITY_CONFIG } from './config';

const STORAGE_KEY = 'oik_login_risk';

interface StoredRiskData {
  attempts: number;
  lastAttemptAt: number;
  email?: string;
}

/**
 * Get current risk data from storage
 */
function getRiskData(): StoredRiskData | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    
    const data = JSON.parse(stored) as StoredRiskData;
    
    // Check if data has expired
    const expiryMs = SECURITY_CONFIG.FAILED_ATTEMPTS_TTL_MINUTES * 60 * 1000;
    if (Date.now() - data.lastAttemptAt > expiryMs) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    
    return data;
  } catch {
    return null;
  }
}

/**
 * Save risk data to storage
 */
function saveRiskData(data: StoredRiskData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Record a failed login attempt
 */
export function recordFailedAttempt(email?: string): void {
  const existing = getRiskData();
  const now = Date.now();
  
  // Check if within window
  const windowMs = SECURITY_CONFIG.FAILED_ATTEMPTS_WINDOW_MINUTES * 60 * 1000;
  const isWithinWindow = existing && (now - existing.lastAttemptAt) < windowMs;
  
  const newData: StoredRiskData = {
    attempts: isWithinWindow ? (existing?.attempts || 0) + 1 : 1,
    lastAttemptAt: now,
    email,
  };
  
  saveRiskData(newData);
  
  console.log('[Security] Failed attempt recorded:', {
    attempts: newData.attempts,
    threshold: SECURITY_CONFIG.FAILED_ATTEMPTS_THRESHOLD,
  });
}

/**
 * Clear failed attempts (on successful login)
 */
export function clearFailedAttempts(): void {
  localStorage.removeItem(STORAGE_KEY);
  console.log('[Security] Failed attempts cleared');
}

/**
 * Assess current risk level
 */
export function assessRisk(): RiskAssessment {
  const data = getRiskData();
  
  if (!data) {
    return {
      level: 'low',
      requiresChallenge: false,
      failedAttempts: 0,
    };
  }
  
  const { attempts, lastAttemptAt } = data;
  
  // Determine risk level
  let level: RiskLevel = 'low';
  let requiresChallenge = false;
  
  if (attempts >= SECURITY_CONFIG.FAILED_ATTEMPTS_THRESHOLD * 2) {
    level = 'high';
    requiresChallenge = true;
  } else if (attempts >= SECURITY_CONFIG.FAILED_ATTEMPTS_THRESHOLD) {
    level = 'medium';
    requiresChallenge = true;
  }
  
  return {
    level,
    requiresChallenge,
    failedAttempts: attempts,
    lastAttemptAt: new Date(lastAttemptAt),
  };
}

/**
 * Check if challenge is required based on current risk
 */
export function shouldRequireChallenge(): boolean {
  const assessment = assessRisk();
  return assessment.requiresChallenge;
}
