/**
 * Utility functions for generating display labels for bank accounts and credit cards
 * 
 * Examples:
 * - "Itaú (341) • Ag 1234 / Cc 56789 • Thiago"
 * - "Nubank • Conta conjunta • Thiago + Suellen"
 * - "Itaú • Mastercard • Thiago • **** 4587"
 */

export interface BankAccountLabelData {
  bankName?: string | null;
  bankCode?: string | null;
  customBankName?: string | null;
  agency?: string | null;
  accountNumber?: string | null;
  accountDigit?: string | null;
  ownershipType?: 'individual' | 'joint' | null;
  titleholders?: string[] | null;
  nickname?: string | null;
}

export interface CreditCardLabelData {
  bankName?: string | null;
  brand?: string | null;
  cardHolder?: string | null;
  lastFourDigits?: string | null;
  cardName?: string | null;
}

// Brand display names
const BRAND_LABELS: Record<string, string> = {
  visa: 'Visa',
  mastercard: 'Mastercard',
  elo: 'Elo',
  amex: 'American Express',
  hipercard: 'Hipercard',
};

/**
 * Generate a display label for a bank account
 * Format: "Itaú (341) • Ag 1234 / Cc 56789 • Thiago"
 */
export function formatBankAccountLabel(data: BankAccountLabelData): string {
  const parts: string[] = [];
  
  // 1. Bank name with code
  const bankName = data.bankName || data.customBankName || 'Banco';
  if (data.bankCode) {
    parts.push(`${bankName} (${data.bankCode})`);
  } else {
    parts.push(bankName);
  }
  
  // 2. Agency and account (if available)
  if (data.agency || data.accountNumber) {
    const accountParts: string[] = [];
    if (data.agency) {
      accountParts.push(`Ag ${data.agency}`);
    }
    if (data.accountNumber) {
      const accountStr = data.accountDigit 
        ? `${data.accountNumber}-${data.accountDigit}`
        : data.accountNumber;
      accountParts.push(`Cc ${accountStr}`);
    }
    if (accountParts.length > 0) {
      parts.push(accountParts.join(' / '));
    }
  }
  
  // 3. Titleholders
  if (data.titleholders && data.titleholders.length > 0) {
    if (data.ownershipType === 'joint' && data.titleholders.length > 1) {
      parts.push(data.titleholders.join(' + '));
    } else {
      parts.push(data.titleholders[0]);
    }
  } else if (data.ownershipType === 'joint') {
    parts.push('Conta conjunta');
  }
  
  return parts.join(' • ');
}

/**
 * Generate a short display label for a bank account (for compact views)
 * Format: "Itaú • Thiago" or nickname if available
 */
export function formatBankAccountShortLabel(data: BankAccountLabelData): string {
  if (data.nickname) {
    return data.nickname;
  }
  
  const parts: string[] = [];
  const bankName = data.bankName || data.customBankName || 'Banco';
  parts.push(bankName);
  
  if (data.titleholders && data.titleholders.length > 0) {
    parts.push(data.titleholders[0]);
  }
  
  return parts.join(' • ');
}

/**
 * Generate a display label for a credit card
 * Format: "Itaú • Mastercard • Thiago • **** 4587"
 */
export function formatCreditCardLabel(data: CreditCardLabelData): string {
  const parts: string[] = [];
  
  // 1. Bank name (if available)
  if (data.bankName) {
    parts.push(data.bankName);
  }
  
  // 2. Brand
  if (data.brand) {
    parts.push(BRAND_LABELS[data.brand] || data.brand);
  }
  
  // 3. Cardholder
  if (data.cardHolder) {
    parts.push(data.cardHolder);
  }
  
  // 4. Last 4 digits (masked)
  if (data.lastFourDigits) {
    parts.push(`**** ${data.lastFourDigits}`);
  }
  
  return parts.join(' • ');
}

/**
 * Generate a short display label for a credit card
 * Format: "Mastercard • **** 4587" or card name if available
 */
export function formatCreditCardShortLabel(data: CreditCardLabelData): string {
  if (data.cardName) {
    return data.cardName;
  }
  
  const parts: string[] = [];
  
  if (data.brand) {
    parts.push(BRAND_LABELS[data.brand] || data.brand);
  }
  
  if (data.lastFourDigits) {
    parts.push(`**** ${data.lastFourDigits}`);
  }
  
  return parts.join(' • ') || 'Cartão';
}

/**
 * Mask account number for display (show only last 4 digits)
 * Example: "123456789" -> "••••6789"
 */
export function maskAccountNumber(accountNumber: string): string {
  if (accountNumber.length <= 4) {
    return accountNumber;
  }
  const lastFour = accountNumber.slice(-4);
  return `••••${lastFour}`;
}

/**
 * Format titleholders for display
 * Example: ["Thiago", "Suellen"] -> "Thiago + Suellen"
 */
export function formatTitleholders(titleholders: string[]): string {
  if (!titleholders || titleholders.length === 0) {
    return '';
  }
  return titleholders.join(' + ');
}

/**
 * Get ownership type label
 */
export function getOwnershipLabel(type: 'individual' | 'joint' | null | undefined): string {
  if (type === 'joint') {
    return 'Conta conjunta';
  }
  return 'Conta individual';
}
