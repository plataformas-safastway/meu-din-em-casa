// Shared validation utilities for edge functions

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  const trimmed = email.trim();
  return trimmed.length > 0 && trimmed.length <= 254 && EMAIL_REGEX.test(trimmed);
}

export function sanitizeString(value: unknown, maxLength: number = 200): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return null;
  // Trim and limit length
  const trimmed = value.trim().slice(0, maxLength);
  // Remove control characters except newlines and tabs
  return trimmed.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}

export function validateRequiredString(value: unknown, fieldName: string, minLength: number = 1, maxLength: number = 200): { valid: true; value: string } | { valid: false; error: string } {
  if (value === null || value === undefined || typeof value !== "string") {
    return { valid: false, error: `${fieldName} is required` };
  }
  const sanitized = sanitizeString(value, maxLength);
  if (!sanitized || sanitized.length < minLength) {
    return { valid: false, error: `${fieldName} must be at least ${minLength} character(s)` };
  }
  return { valid: true, value: sanitized };
}

export function validatePositiveNumber(value: unknown, fieldName: string): { valid: true; value: number } | { valid: false; error: string } {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) {
    return { valid: false, error: `${fieldName} must be a positive number` };
  }
  return { valid: true, value: num };
}

export function validateUrl(url: string, allowedDomains?: string[]): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }
    if (allowedDomains && allowedDomains.length > 0) {
      return allowedDomains.some(domain => parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`));
    }
    return true;
  } catch {
    return false;
  }
}
