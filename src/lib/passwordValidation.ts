import { z } from "zod";

/**
 * Password validation schema
 * Requirements:
 * - Minimum 8 characters
 * - At least one letter (a-z or A-Z)
 * - At least one number (0-9)
 */
export const passwordSchema = z
  .string()
  .min(8, "A senha deve ter pelo menos 8 caracteres")
  .regex(/[a-zA-Z]/, "A senha deve conter pelo menos uma letra")
  .regex(/[0-9]/, "A senha deve conter pelo menos um número");

/**
 * Validate password and return error message if invalid
 */
export function validatePassword(password: string): string | null {
  const result = passwordSchema.safeParse(password);
  if (!result.success) {
    return result.error.errors[0]?.message || "Senha inválida";
  }
  return null;
}

/**
 * Get password strength indicators for UI feedback
 */
export function getPasswordStrength(password: string): {
  hasMinLength: boolean;
  hasLetter: boolean;
  hasNumber: boolean;
  isValid: boolean;
} {
  const hasMinLength = password.length >= 8;
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const isValid = hasMinLength && hasLetter && hasNumber;

  return {
    hasMinLength,
    hasLetter,
    hasNumber,
    isValid,
  };
}
