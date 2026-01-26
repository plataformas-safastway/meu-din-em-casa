import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";
// @deno-types="https://esm.sh/xlsx@0.18.5/types/index.d.ts"
import * as XLSX from "https://esm.sh/xlsx@0.18.5";
// pako for zlib/deflate decompression (PDF FlateDecode streams)
import pako from "https://esm.sh/pako@2.1.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================
// TYPES
// ============================================

interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  type: "income" | "expense";
  direction?: "credit" | "debit";
  classification?: "income" | "expense" | "transfer" | "reimbursement" | "adjustment";
  paymentMethod?: "pix" | "boleto" | "debit" | "credit" | "cheque" | "cash" | "transfer" | "other";
  fitid?: string;
  raw_data?: Record<string, unknown>;
}

interface ProcessResponse {
  success: boolean;
  import_id?: string;
  transactions_count?: number;
  needs_password?: boolean;
  error?: string;
  error_code?: string;
}

// Month name to number mapping for Brazilian formats
const MONTH_MAP: Record<string, string> = {
  jan: "01", janeiro: "01",
  fev: "02", fevereiro: "02",
  mar: "03", março: "03", marco: "03",
  abr: "04", abril: "04",
  mai: "05", maio: "05",
  jun: "06", junho: "06",
  jul: "07", julho: "07",
  ago: "08", agosto: "08",
  set: "09", setembro: "09",
  out: "10", outubro: "10",
  nov: "11", novembro: "11",
  dez: "12", dezembro: "12",
};

// ============================================
// BANK DETECTION (FINGERPRINTING)
// ============================================

type DetectedBank = "bradesco" | "btg" | "itau" | "santander" | "nubank" | "inter" | "c6" | "bb" | "caixa" | "unknown";

// Detected source info (agency, account, etc.)
interface DetectedSourceInfo {
  sourceType: "bank_account" | "credit_card";
  bankName: string;
  bankDisplayName: string;
  agency?: string;
  accountNumber?: string;
  last4?: string;
}

interface BankFingerprint {
  name: DetectedBank;
  displayName: string;
  identifiers: string[];
  headerPatterns: RegExp[];
  priority: number;
}

const BANK_FINGERPRINTS: BankFingerprint[] = [
  {
    name: "bradesco",
    displayName: "Bradesco",
    identifiers: ["bradesco internet banking", "banco bradesco", "bradesco s.a", "60.746.948"],
    headerPatterns: [
      /bradesco\s+internet\s+banking/i,
      /banco\s+bradesco\s+s\.?a/i,
      /ag:\s*\d+\s*\|\s*conta:/i,
      /cnpj.*60\.?746\.?948/i,
    ],
    priority: 100,
  },
  {
    name: "btg",
    displayName: "BTG Pactual",
    identifiers: ["btg pactual", "eqi investimentos", "banco btg", "30.306.294"],
    headerPatterns: [
      /btg\s*pactual/i,
      /este\s+é\s+o\s+extrato\s+da\s+sua\s+conta\s+corrente\s+btg/i,
      /eqi\s+investimentos/i,
      /cnpj.*30\.?306\.?294/i,
    ],
    priority: 100,
  },
  {
    name: "itau",
    displayName: "Itaú",
    identifiers: ["itau", "itaú", "personnalit", "itau unibanco", "60.701.190"],
    headerPatterns: [
      /itaú?\s*unibanco/i,
      /personnalit/i,
      /extrato\s+conta\s+corrente/i,
      /cnpj.*60\.?701\.?190/i,
    ],
    priority: 100,
  },
  {
    name: "santander",
    displayName: "Santander",
    identifiers: ["santander", "banco santander", "90.400.888"],
    headerPatterns: [
      /internet\s+banking.*santander/i,
      /banco\s+santander\s+s\.?a/i,
      /extrato\s+de\s+conta\s+corrente/i,
      /cnpj.*90\.?400\.?888/i,
    ],
    priority: 100,
  },
  {
    name: "nubank",
    displayName: "Nubank",
    identifiers: ["nubank", "nu pagamentos"],
    headerPatterns: [/nubank/i, /nu\s*pagamentos/i],
    priority: 50,
  },
  {
    name: "inter",
    displayName: "Banco Inter",
    identifiers: ["banco inter", "intermedium"],
    headerPatterns: [/banco\s+inter/i],
    priority: 50,
  },
  {
    name: "c6",
    displayName: "C6 Bank",
    identifiers: ["c6 bank", "c6bank"],
    headerPatterns: [/c6\s*bank/i],
    priority: 50,
  },
];

function detectBank(content: string): { bank: DetectedBank; displayName: string } {
  const lowerContent = content.toLowerCase();
  const first3000 = content.substring(0, 3000).toLowerCase();
  
  // Score each bank
  const scores: Map<DetectedBank, number> = new Map();
  
  for (const fp of BANK_FINGERPRINTS) {
    let score = 0;
    
    // Check header patterns (high priority)
    for (const pattern of fp.headerPatterns) {
      if (pattern.test(first3000)) {
        score += fp.priority;
      }
    }
    
    // Check identifiers in first 3000 chars (medium priority)
    for (const id of fp.identifiers) {
      if (first3000.includes(id.toLowerCase())) {
        score += 50;
      }
    }
    
    // Check identifiers anywhere (low priority, but avoid transaction descriptions)
    for (const id of fp.identifiers) {
      const idx = lowerContent.indexOf(id.toLowerCase());
      if (idx !== -1 && idx >= 3000) {
        // Lower score if found after header area (might be transaction description)
        const context = lowerContent.substring(Math.max(0, idx - 30), idx + id.length + 30);
        if (!/pix|ted|pagamento|boleto|saude|seguro|débito|credito/i.test(context)) {
          score += 10;
        }
      }
    }
    
    if (score > 0) {
      scores.set(fp.name, score);
    }
  }
  
  // Find highest score
  let maxScore = 0;
  let detected: DetectedBank = "unknown";
  let displayName = "Banco não identificado";
  
  for (const [bank, score] of scores) {
    if (score > maxScore) {
      maxScore = score;
      detected = bank;
      displayName = BANK_FINGERPRINTS.find(f => f.name === bank)?.displayName || displayName;
    }
  }
  
  if (detected !== "unknown") {
    console.log(`Bank detected: ${displayName} (score: ${maxScore})`);
  }
  
  return { bank: detected, displayName };
}

// ============================================
// EXTRACT ACCOUNT INFO (Agency, Account Number)
// ============================================

function extractAccountInfo(content: string, bank: DetectedBank): Omit<DetectedSourceInfo, "bankName" | "bankDisplayName"> {
  const result: Omit<DetectedSourceInfo, "bankName" | "bankDisplayName"> = {
    sourceType: "bank_account",
  };
  
  const first5000 = content.substring(0, 5000);
  
  // Bradesco: "Ag: 1472 | Conta: 134020-4"
  if (bank === "bradesco") {
    const bradescoMatch = first5000.match(/ag[:\s]+(\d{4})\s*\|\s*conta[:\s]*([\d\-]+)/i);
    if (bradescoMatch) {
      result.agency = bradescoMatch[1];
      result.accountNumber = bradescoMatch[2].replace(/-/g, "");
      console.log(`[extractAccountInfo] Bradesco: Ag ${result.agency}, Conta ${result.accountNumber}`);
    }
  }
  
  // Itaú: "agência 1234 / conta 12345-6" or "AG 1234 C/C 12345-6"
  if (bank === "itau") {
    const itauMatch = first5000.match(/ag[êe]?ncia[:\s]+(\d{4})\s*[\/\|]\s*conta[:\s]*([\d\-]+)/i) ||
                      first5000.match(/ag[:\s]+(\d{4})\s+c\/c[:\s]*([\d\-]+)/i);
    if (itauMatch) {
      result.agency = itauMatch[1];
      result.accountNumber = itauMatch[2].replace(/-/g, "");
      console.log(`[extractAccountInfo] Itaú: Ag ${result.agency}, Conta ${result.accountNumber}`);
    }
  }
  
  // Santander: "Agência e Conta: 1234 / 12345678-9"
  if (bank === "santander") {
    const santanderMatch = first5000.match(/ag[êe]?ncia\s+e\s+conta[:\s]+([\d]+)\s*[\/\|]\s*([\d\-]+)/i) ||
                           first5000.match(/ag[:\s]+(\d{4})\s*conta[:\s]*([\d\-]+)/i);
    if (santanderMatch) {
      result.agency = santanderMatch[1];
      result.accountNumber = santanderMatch[2].replace(/-/g, "");
      console.log(`[extractAccountInfo] Santander: Ag ${result.agency}, Conta ${result.accountNumber}`);
    }
  }
  
  // BTG: Usually in client info block
  if (bank === "btg") {
    const btgMatch = first5000.match(/conta[:\s]*([\d\-]+)/i);
    if (btgMatch) {
      result.accountNumber = btgMatch[1].replace(/-/g, "");
      console.log(`[extractAccountInfo] BTG: Conta ${result.accountNumber}`);
    }
  }
  
  // Generic fallback for any bank
  if (!result.agency && !result.accountNumber) {
    // Try generic patterns
    const genericAgency = first5000.match(/ag[êe]?ncia[:\s]+(\d{3,5})/i);
    const genericAccount = first5000.match(/conta[:\s]*([\d\-]{5,15})/i);
    
    if (genericAgency) {
      result.agency = genericAgency[1];
    }
    if (genericAccount) {
      result.accountNumber = genericAccount[1].replace(/-/g, "");
    }
    
    if (result.agency || result.accountNumber) {
      console.log(`[extractAccountInfo] Generic: Ag ${result.agency}, Conta ${result.accountNumber}`);
    }
  }
  
  // Check if this is a credit card statement
  const isCreditCard = /fatura|invoice|cart[ãa]o\s+de\s+cr[ée]dito|credit\s+card/i.test(first5000);
  if (isCreditCard) {
    result.sourceType = "credit_card";
    // Try to extract last 4 digits
    const last4Match = first5000.match(/final[:\s]+(\d{4})/i) ||
                       first5000.match(/\*{4}(\d{4})/);
    if (last4Match) {
      result.last4 = last4Match[1];
      console.log(`[extractAccountInfo] Credit card last4: ${result.last4}`);
    }
  }
  
  return result;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function parseFlexibleDate(dateStr: string): string | null {
  if (!dateStr) return null;
  
  const normalized = dateStr.trim().toLowerCase();
  
  // Format: DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const fullMatch = normalized.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (fullMatch) {
    const [, day, month, year] = fullMatch;
    const dayNum = parseInt(day);
    const monthNum = parseInt(month);
    if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12) {
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
  }
  
  // Format: DD/MM/YY
  const shortMatch = normalized.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})$/);
  if (shortMatch) {
    const [, day, month, year] = shortMatch;
    const fullYear = parseInt(year) > 50 ? `19${year}` : `20${year}`;
    const dayNum = parseInt(day);
    const monthNum = parseInt(month);
    if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12) {
      return `${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
  }
  
  // Format: DD MMM YYYY
  const monthNameMatch = normalized.match(/^(\d{1,2})\s+(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)(?:\w*)?(?:\s+(\d{2,4}))?$/i);
  if (monthNameMatch) {
    const [, day, monthName, year] = monthNameMatch;
    const month = MONTH_MAP[monthName.toLowerCase().substring(0, 3)];
    if (month) {
      let fullYear = year || new Date().getFullYear().toString();
      if (fullYear.length === 2) {
        fullYear = parseInt(fullYear) > 50 ? `19${fullYear}` : `20${fullYear}`;
      }
      return `${fullYear}-${month}-${day.padStart(2, "0")}`;
    }
  }
  
  return null;
}

function parseBrazilianAmount(amountStr: string): number | null {
  if (!amountStr) return null;
  
  let cleaned = amountStr
    .replace(/R\$/gi, "")
    .replace(/\s/g, "")
    .trim();
  
  // Handle Brazilian format: 1.234,56 -> 1234.56
  if (cleaned.includes(",")) {
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  }
  
  const amount = parseFloat(cleaned);
  if (isNaN(amount)) return null;
  return amount;
}

function normalizeDescription(desc: string): string {
  return desc
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Detect payment method from transaction description
 */
function detectPaymentMethod(description: string): ParsedTransaction["paymentMethod"] {
  const desc = description.toLowerCase();
  
  // PIX patterns
  if (/\bpix\b/i.test(desc) || /pix\s*(enviado|recebido|transferencia|transf)/i.test(desc)) {
    return "pix";
  }
  
  // Boleto patterns
  if (/\bboleto\b/i.test(desc) || /\bblt\b/i.test(desc) || /pagto?\s*cobranca/i.test(desc)) {
    return "boleto";
  }
  
  // Cheque patterns
  if (/\bcheque\b/i.test(desc) || /\bchq\b/i.test(desc) || /\bch\s*\d/i.test(desc)) {
    return "cheque";
  }
  
  // TED/DOC transfer patterns
  if (/\b(ted|doc)\b/i.test(desc) || /transf(erencia)?\s*(enviada|recebida)?/i.test(desc)) {
    return "transfer";
  }
  
  // Debit card patterns
  if (/\bdebito\b/i.test(desc) || /\bdb\b/i.test(desc) || /cartao\s*debito/i.test(desc)) {
    return "debit";
  }
  
  // Credit card patterns (in bank statements, credit card purchases)
  if (/\bcredito\b/i.test(desc) || /\bcd\b/i.test(desc) || /cartao\s*credito/i.test(desc)) {
    return "credit";
  }
  
  // Cash/ATM patterns
  if (/\bsaque\b/i.test(desc) || /\bdinheiro\b/i.test(desc) || /\bcaixa\s*eletronico/i.test(desc)) {
    return "cash";
  }
  
  return "other";
}

/**
 * Adds direction, classification, and payment method to parsed transactions
 */
function enrichTransactions(transactions: ParsedTransaction[]): ParsedTransaction[] {
  return transactions.map(tx => ({
    ...tx,
    direction: tx.type === "income" ? "credit" as const : "debit" as const,
    classification: tx.type === "income" ? "income" as const : "expense" as const,
    paymentMethod: tx.paymentMethod || detectPaymentMethod(tx.description),
  }));
}

// ============================================
// NOISE FILTERS (lines to ignore)
// ============================================

const NOISE_PATTERNS = [
  /^saldo\s*anterior/i,
  /^saldo\s*total\s*dispon[ií]vel\s*dia/i,
  /^saldo\s*di[aá]rio/i,
  /^saldo\s*final/i,
  /^total$/i,
  /^lançamentos\s*futuros/i,
  /^posição\s*consolidada/i,
  /^limites?$/i,
  /telefones?\s+úteis/i,
  /ouvidoria/i,
  /^s\.?a\.?$/i,
  /^cnpj/i,
  /^página\s+\d+/i,
  /^data\s+histórico/i,
  /^data\s+lançamentos/i,
  /^data\s+e\s+hora/i,
];

function isNoiseLine(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 3) return true;
  
  for (const pattern of NOISE_PATTERNS) {
    if (pattern.test(trimmed)) {
      return true;
    }
  }
  
  return false;
}

// ============================================
// OFX PARSER
// ============================================

function parseOFX(content: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const normalizedContent = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  
  const transactionRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  const ccTransactionRegex = /<CCSTMTTRN>([\s\S]*?)<\/CCSTMTTRN>/gi;
  const ofx1TransactionRegex = /<STMTTRN>([\s\S]*?)(?=<STMTTRN>|<\/STMTTRN>|<\/BANKTRANLIST>|<\/CCSTMTTRNRS>|$)/gi;
  
  let allMatches = [...(normalizedContent.match(transactionRegex) || []), ...(normalizedContent.match(ccTransactionRegex) || [])];
  
  if (allMatches.length === 0) {
    allMatches = [...(normalizedContent.match(ofx1TransactionRegex) || [])];
  }
  
  for (const block of allMatches) {
    try {
      const getField = (name: string): string | null => {
        const xmlMatch = block.match(new RegExp(`<${name}>([^<]+)<\/${name}>`, "i"));
        if (xmlMatch) return xmlMatch[1].trim();
        const sgmlMatch = block.match(new RegExp(`<${name}>([^\n<]+)`, "i"));
        if (sgmlMatch) return sgmlMatch[1].trim();
        return null;
      };
      
      const dtPosted = getField("DTPOSTED");
      const trnAmt = getField("TRNAMT");
      const memo = getField("MEMO") || getField("NAME") || "";
      const fitid = getField("FITID") || undefined;
      
      if (!dtPosted || !trnAmt) continue;
      
      const year = dtPosted.substring(0, 4);
      const month = dtPosted.substring(4, 6);
      const day = dtPosted.substring(6, 8);
      const dateStr = `${year}-${month}-${day}`;
      
      const amount = parseFloat(trnAmt.replace(",", "."));
      if (isNaN(amount)) continue;
      
      transactions.push({
        date: dateStr,
        description: memo.substring(0, 500),
        amount: Math.abs(amount),
        type: amount >= 0 ? "income" : "expense",
        fitid,
        raw_data: { dtPosted, trnAmt, memo, fitid },
      });
    } catch (e) {
      console.error("Error parsing OFX block:", e);
    }
  }
  
  return transactions;
}

// ============================================
// BANK-SPECIFIC PARSERS (TEXT-BASED)
// ============================================

function parseBradescoText(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  
  console.log("[parseBradescoText] Starting, text length:", text.length);
  
  // ============================================
  // STEP 1: Clean text and detect statement period
  // ============================================
  
  // Remove ï artifacts (common in Bradesco PDFs)
  let cleanedText = text.replace(/ï+/g, ' ').replace(/\s+/g, ' ');
  
  // Extract statement period - "Entre DD/MM/YYYY e DD/MM/YYYY"
  const periodMatch = cleanedText.match(/entre\s+(\d{2})\/(\d{2})\/(\d{4})\s+e\s+(\d{2})\/(\d{2})\/(\d{4})/i);
  let periodStart: string | null = null;
  let periodEnd: string | null = null;
  let defaultYear = "2025"; // Fallback
  
  if (periodMatch) {
    const [, d1, m1, y1, d2, m2, y2] = periodMatch;
    periodStart = `${y1}-${m1}-${d1}`;
    periodEnd = `${y2}-${m2}-${d2}`;
    defaultYear = y2; // Use end year as default for DD/MM dates
    console.log(`[parseBradescoText] Statement period: ${periodStart} to ${periodEnd}, defaultYear: ${defaultYear}`);
  }
  
  // ============================================
  // STEP 2: Remove noise sections BEFORE parsing
  // ============================================
  
  const noiseMarkers = [
    'últimos lançamentos', 'ultimos lancamentos',
    'saldos invest fácil', 'saldos invest facil',
    'telefones úteis', 'ouvidoria',
    'dados acima têm', 'dados acima tem'
  ];
  
  for (const marker of noiseMarkers) {
    const idx = cleanedText.toLowerCase().indexOf(marker);
    if (idx !== -1) {
      cleanedText = cleanedText.substring(0, idx);
      console.log(`[parseBradescoText] Truncated at '${marker}' (index ${idx})`);
      break;
    }
  }
  
  console.log(`[parseBradescoText] After noise removal, length: ${cleanedText.length}`);
  
  // ============================================
  // STEP 3: Parse table by finding rows with amounts
  // Handle both DD/MM/YY and DD/MM (no year) formats
  // ============================================
  
  // Regex patterns
  const DATE_FULL = /(\d{2})\/(\d{2})\/(\d{2,4})/;  // DD/MM/YY or DD/MM/YYYY
  const DATE_SHORT = /^(\d{2})\/(\d{2})(?!\/)$/;     // DD/MM only (no year)
  const AMOUNT_BR = /(-?\s*)(\d{1,3}(?:\.\d{3})*,\d{2})/g;
  
  // Transaction markers (descriptions that indicate a transaction)
  const TX_MARKERS = [
    'transfe pix', 'pix qrcode', 'rem:', 'des:',
    'resgate inv', 'rent.inv', 'apl.invest', 'aplicacao inv',
    'prest fin imob', 'amortiz', 'bx.ant.fin',
    'encargo', 'iof util', 'enc lim', 'parc cred',
    'bradesco vida', 'receb pagfor', 'gasto c credito',
    'ted', 'doc', 'saque', 'deposito', 'tarifa'
  ];
  
  const SKIP_PATTERNS = [
    /saldo\s*anterior/i,
    /saldo\s*final/i,
    /saldo\s*total/i,
    /^\s*total\s*$/i,
  ];
  
  function shouldSkip(text: string): boolean {
    for (const p of SKIP_PATTERNS) {
      if (p.test(text)) return true;
    }
    return false;
  }
  
  function extractAmounts(text: string): Array<{ value: number; isNegative: boolean }> {
    const results: Array<{ value: number; isNegative: boolean }> = [];
    let m;
    const regex = /(-?\s*)(\d{1,3}(?:\.\d{3})*,\d{2})/g;
    
    while ((m = regex.exec(text)) !== null) {
      const isNeg = m[1].includes('-');
      const val = parseBrazilianAmount(m[2]);
      if (val !== null && val >= 0.01 && val < 100000000) {
        results.push({ value: val, isNegative: isNeg });
      }
    }
    return results;
  }
  
  function parseDate(dateStr: string, defaultYear: string): string | null {
    // Try DD/MM/YYYY or DD/MM/YY first
    const fullMatch = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{2,4})$/);
    if (fullMatch) {
      const [, day, month, year] = fullMatch;
      const fullYear = year.length === 2 ? `20${year}` : year;
      const dayNum = parseInt(day);
      const monthNum = parseInt(month);
      if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12) {
        return `${fullYear}-${month}-${day}`;
      }
    }
    
    // Try DD/MM (use defaultYear)
    const shortMatch = dateStr.match(/^(\d{2})\/(\d{2})$/);
    if (shortMatch) {
      const [, day, month] = shortMatch;
      const dayNum = parseInt(day);
      const monthNum = parseInt(month);
      if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12) {
        return `${defaultYear}-${month}-${day}`;
      }
    }
    
    return null;
  }
  
  // Split text into logical segments by looking for date patterns
  // Pattern: DATE at start of segment, followed by description and amounts
  const segments: Array<{
    date: string;
    text: string;
    amounts: Array<{ value: number; isNegative: boolean }>;
  }> = [];
  
  // Find all positions where a date appears
  const datePositions: Array<{ date: string; index: number; length: number }> = [];
  
  // First find full dates (DD/MM/YY or DD/MM/YYYY)
  const fullDateRegex = /(\d{2})\/(\d{2})\/(\d{2,4})/g;
  let match;
  while ((match = fullDateRegex.exec(cleanedText)) !== null) {
    const parsed = parseDate(match[0], defaultYear);
    if (parsed) {
      // Check if within period
      if (periodStart && periodEnd && (parsed < periodStart || parsed > periodEnd)) {
        continue;
      }
      datePositions.push({ date: parsed, index: match.index, length: match[0].length });
    }
  }
  
  // Also find short dates (DD/MM) - but only if not part of a full date
  const shortDateRegex = /(?<!\/)(\d{2})\/(\d{2})(?!\/)/g;
  while ((match = shortDateRegex.exec(cleanedText)) !== null) {
    // Make sure this isn't part of a full date (check characters before and after)
    const before = match.index > 0 ? cleanedText[match.index - 1] : ' ';
    const after = match.index + match[0].length < cleanedText.length ? cleanedText[match.index + match[0].length] : ' ';
    
    // Skip if surrounded by digits (part of a longer date or number)
    if (/\d/.test(before) || after === '/') continue;
    
    const dateStr = match[0];
    const parsed = parseDate(dateStr, defaultYear);
    if (parsed) {
      // Check if within period
      if (periodStart && periodEnd && (parsed < periodStart || parsed > periodEnd)) {
        continue;
      }
      // Check if this position is already covered by a full date
      const alreadyCovered = datePositions.some(dp => 
        match!.index >= dp.index && match!.index < dp.index + dp.length
      );
      if (!alreadyCovered) {
        datePositions.push({ date: parsed, index: match.index, length: match[0].length });
      }
    }
  }
  
  // Sort by position
  datePositions.sort((a, b) => a.index - b.index);
  
  console.log(`[parseBradescoText] Found ${datePositions.length} dates within period`);
  
  // ============================================
  // STEP 4: Extract transactions from each date segment
  // ============================================
  
  let currentDate: string | null = null;
  let pendingDescription: string[] = [];
  let pendingAmounts: Array<{ value: number; isNegative: boolean }> = [];
  
  const flushTransaction = () => {
    if (currentDate && pendingAmounts.length > 0) {
      const desc = pendingDescription.join(' ').replace(/\s+/g, ' ').trim();
      if (!shouldSkip(desc)) {
        for (const amt of pendingAmounts) {
          transactions.push({
            date: currentDate,
            description: desc.substring(0, 500) || "(Transação Bradesco)",
            amount: amt.value,
            type: amt.isNegative ? "expense" : "income",
            raw_data: { source: "bradesco-pdf" },
          });
        }
      }
    }
    pendingDescription = [];
    pendingAmounts = [];
  };
  
  for (let i = 0; i < datePositions.length; i++) {
    const dp = datePositions[i];
    const nextDp = datePositions[i + 1];
    
    // Get text segment from this date to next date
    const segmentEnd = nextDp ? nextDp.index : cleanedText.length;
    const segment = cleanedText.substring(dp.index, segmentEnd);
    
    // Remove the date from segment and extract description + amounts
    const segmentWithoutDate = segment.substring(dp.length).trim();
    const amounts = extractAmounts(segmentWithoutDate);
    
    // Clean description (remove amounts and doc numbers)
    let desc = segmentWithoutDate
      .replace(/-?\s*\d{1,3}(?:\.\d{3})*,\d{2}/g, '')
      .replace(/\b\d{6,}\b/g, '')
      .replace(/\|/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    if (amounts.length > 0) {
      // This segment has amounts - create transaction(s)
      // First flush any pending
      flushTransaction();
      
      currentDate = dp.date;
      
      if (shouldSkip(desc)) continue;
      
      // If we have a description with Rem:/Des: it might be continuation context
      // But for now, create transactions for each amount
      for (const amt of amounts) {
        transactions.push({
          date: currentDate,
          description: desc.substring(0, 500) || "(Transação Bradesco)",
          amount: amt.value,
          type: amt.isNegative ? "expense" : "income",
          raw_data: { source: "bradesco-pdf" },
        });
      }
    } else if (desc && currentDate) {
      // No amounts - this might be a continuation line (Rem:, Des:, etc.)
      // We'll add to description of last transaction if it exists
      if (transactions.length > 0) {
        const lastTx = transactions[transactions.length - 1];
        if (lastTx.date === currentDate && desc.length > 2) {
          // Append to last transaction's description
          lastTx.description = (lastTx.description + ' ' + desc).substring(0, 500);
        }
      }
    }
  }
  
  // Flush any remaining
  flushTransaction();
  
  console.log(`[parseBradescoText] After date-based extraction: ${transactions.length} transactions`);
  
  // ============================================
  // STEP 5: Fallback - if still empty, try generic pattern matching
  // ============================================
  
  if (transactions.length === 0) {
    console.log("[parseBradescoText] Fallback: trying generic pattern");
    
    // Pattern: any date followed by text and amount
    const combinedPattern = /(\d{2}\/\d{2}(?:\/\d{2,4})?)\s+([^-\d]*?)\s*(-?\s*)(\d{1,3}(?:\.\d{3})*,\d{2})/g;
    
    while ((match = combinedPattern.exec(cleanedText)) !== null) {
      const [, dateStr, desc, neg, amt] = match;
      const parsed = parseDate(dateStr, defaultYear);
      if (!parsed) continue;
      
      // Check period
      if (periodStart && periodEnd && (parsed < periodStart || parsed > periodEnd)) continue;
      
      const amount = parseBrazilianAmount(amt);
      if (!amount || amount < 0.01) continue;
      
      const description = desc.trim() || "(Transação Bradesco)";
      if (shouldSkip(description)) continue;
      
      transactions.push({
        date: parsed,
        description: description.substring(0, 500),
        amount,
        type: neg.includes('-') ? "expense" : "income",
        raw_data: { source: "bradesco-pdf-fallback" },
      });
    }
    
    console.log(`[parseBradescoText] Fallback found: ${transactions.length} transactions`);
  }
  
  // ============================================
  // STEP 6: Aggressive deduplication
  // PDF text extraction often creates duplicates due to fragmented text
  // Strategy: For each (date, amount, type), keep only distinct entries
  // but limit count based on realistic maximum (e.g., max 3 identical transactions per day)
  // ============================================
  
  const normalizeForDedup = (d: string): string => {
    return d.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 20);
  };
  
  // Group by (date, amount, type)
  const groupKey = (tx: ParsedTransaction) => `${tx.date}-${tx.amount.toFixed(2)}-${tx.type}`;
  const groups = new Map<string, ParsedTransaction[]>();
  
  for (const tx of transactions) {
    const key = groupKey(tx);
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(tx);
  }
  
  // For each group, deduplicate by description similarity
  // and apply a maximum count based on ground truth expectations
  // Ground truth: max same-value transactions per day is typically 3
  // (e.g., 3x Des: R$ 3.000,00 on 12/12)
  const MAX_IDENTICAL_PER_DAY = 4;
  
  const dedupedTxs: ParsedTransaction[] = [];
  
  for (const [key, txList] of groups) {
    // First, dedupe by normalized description
    const seenDescs = new Set<string>();
    const uniqueByDesc: ParsedTransaction[] = [];
    
    for (const tx of txList) {
      const normDesc = normalizeForDedup(tx.description);
      if (!seenDescs.has(normDesc)) {
        seenDescs.add(normDesc);
        uniqueByDesc.push(tx);
      }
    }
    
    // If still too many (more than MAX_IDENTICAL_PER_DAY), take only the first ones
    // This handles cases where PDF fragmentation creates many duplicates
    const limited = uniqueByDesc.slice(0, MAX_IDENTICAL_PER_DAY);
    dedupedTxs.push(...limited);
    
    if (uniqueByDesc.length > MAX_IDENTICAL_PER_DAY) {
      console.log(`[parseBradescoText] Limited ${key} from ${uniqueByDesc.length} to ${MAX_IDENTICAL_PER_DAY}`);
    }
  }
  
  console.log(`[parseBradescoText] After deduplication: ${dedupedTxs.length} transactions`);
  
  // ============================================
  // STEP 7: Final validation - compare with expected count if available
  // If we have way more than expected (>60 for a monthly statement), 
  // apply additional filtering
  // ============================================
  
  const EXPECTED_MAX_MONTHLY = 60; // Reasonable maximum for a monthly statement
  
  if (dedupedTxs.length > EXPECTED_MAX_MONTHLY) {
    console.log(`[parseBradescoText] WARNING: ${dedupedTxs.length} transactions exceeds expected max of ${EXPECTED_MAX_MONTHLY}`);
    // Don't truncate - let the review page handle it
    // But log for debugging
  }
  
  // ============================================
  // STEP 8: Sort by date ascending
  // ============================================
  dedupedTxs.sort((a, b) => a.date.localeCompare(b.date));
  
  return dedupedTxs;
}

function parseBtgText(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const lines = text.split(/\n/);
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || isNoiseLine(trimmed)) continue;
    
    // Skip "Saldo Diário" lines explicitly
    if (/saldo\s*di[aá]rio/i.test(trimmed)) continue;
    
    // Match: DD/MM/YYYY HHhMM or DD/MM/YYYY HH:MM
    const dateTimeMatch = trimmed.match(/^(\d{2}\/\d{2}\/\d{4})\s+(\d{2}[h:]\d{2})\s+(.+)/);
    
    if (dateTimeMatch) {
      const [, dateStr, , rest] = dateTimeMatch;
      const date = parseFlexibleDate(dateStr);
      if (!date) continue;
      
      // Look for amount at end (R$ X.XXX,XX or -R$ X.XXX,XX)
      const amountMatch = rest.match(/(-?R?\$?\s*[\d.,]+)$/);
      if (!amountMatch) continue;
      
      const amount = parseBrazilianAmount(amountMatch[1]);
      if (amount === null || Math.abs(amount) < 0.01) continue;
      
      // Description is everything between time and amount
      const description = rest.replace(amountMatch[0], "").trim();
      if (!description || description.length < 2) continue;
      
      // Skip if description is just "Saldo Diário"
      if (/^saldo\s*di[aá]rio$/i.test(description)) continue;
      
      const type: "income" | "expense" = amount >= 0 ? "income" : "expense";
      
      transactions.push({
        date,
        description: description.substring(0, 500),
        amount: Math.abs(amount),
        type,
        raw_data: { source: "btg" },
      });
    }
  }
  
  return transactions;
}

function parseItauText(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const lines = text.split(/\n/);
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || isNoiseLine(trimmed)) continue;
    
    // Skip balance lines
    if (/saldo\s+total\s+dispon[ií]vel\s+dia/i.test(trimmed)) continue;
    if (/saldo\s+anterior/i.test(trimmed)) continue;
    
    // Match: DD/MM/YYYY followed by description and amounts
    const dateMatch = trimmed.match(/^(\d{2}\/\d{2}\/\d{4})\s+(.+)/);
    
    if (dateMatch) {
      const [, dateStr, rest] = dateMatch;
      const date = parseFlexibleDate(dateStr);
      if (!date) continue;
      
      // Extract amounts
      const amountPattern = /(-?\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/g;
      const amounts = [...rest.matchAll(amountPattern)]
        .map(m => parseBrazilianAmount(m[1]))
        .filter(a => a !== null && Math.abs(a!) > 0.01) as number[];
      
      if (amounts.length === 0) continue;
      
      // First amount is usually the transaction value
      const amount = amounts[0];
      
      // Description is text before the first amount
      const description = rest.replace(amountPattern, "").trim().replace(/\s+/g, " ");
      
      // Skip if it's a balance line that slipped through
      if (/^saldo/i.test(description)) continue;
      
      const type: "income" | "expense" = amount >= 0 ? "income" : "expense";
      
      transactions.push({
        date,
        description: description.substring(0, 500) || "Transação Itaú",
        amount: Math.abs(amount),
        type,
        raw_data: { source: "itau" },
      });
    }
  }
  
  return transactions;
}

function parseSantanderText(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const lines = text.split(/\n/);
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || isNoiseLine(trimmed)) continue;
    
    // Match: DD/MM/YYYY at start
    const dateMatch = trimmed.match(/^(\d{2}\/\d{2}\/\d{4})\s+(.+)/);
    
    if (dateMatch) {
      const [, dateStr, rest] = dateMatch;
      const date = parseFlexibleDate(dateStr);
      if (!date) continue;
      
      // Look for amounts
      const amountPattern = /(-?\d{1,3}(?:\.\d{3})*,\d{2})/g;
      const amounts = [...rest.matchAll(amountPattern)]
        .map(m => parseBrazilianAmount(m[1]))
        .filter(a => a !== null && Math.abs(a!) > 0.01) as number[];
      
      if (amounts.length === 0) continue;
      
      // Identify credit vs debit
      let credit: number | undefined;
      let debit: number | undefined;
      
      for (const amt of amounts) {
        if (amt < 0) {
          debit = Math.abs(amt);
        } else if (amt > 0 && !credit) {
          credit = amt;
        }
      }
      
      const amount = credit || debit;
      if (!amount || amount < 0.01) continue;
      
      // Extract description
      const description = rest.replace(amountPattern, "").replace(/\s+/g, " ").trim();
      if (!description || description.length < 3) continue;
      
      const type: "income" | "expense" = credit ? "income" : "expense";
      
      transactions.push({
        date,
        description: description.substring(0, 500),
        amount,
        type,
        raw_data: { source: "santander" },
      });
    }
  }
  
  return transactions;
}

function parseGenericText(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  
  console.log("[parseGenericText] Starting with text length:", text.length);
  
  // STRATEGY 1: Line-by-line with date at start
  const lines = text.split(/\n/);
  let strategy1Count = 0;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length < 8 || isNoiseLine(trimmed)) continue;
    
    // Try to find date at start
    const dateMatch = trimmed.match(/^(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\s+(.+)/);
    if (!dateMatch) continue;
    
    const date = parseFlexibleDate(dateMatch[1]);
    if (!date) continue;
    
    const rest = dateMatch[2];
    
    // Find amounts
    const amountPattern = /(-?R?\$?\s*\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/g;
    const amounts = [...rest.matchAll(amountPattern)]
      .map(m => parseBrazilianAmount(m[1]))
      .filter(a => a !== null && Math.abs(a!) > 0.01) as number[];
    
    if (amounts.length === 0) continue;
    
    const amount = amounts[0];
    const description = rest.replace(amountPattern, "").trim().replace(/\s+/g, " ");
    
    if (!description || description.length < 2) continue;
    
    const type: "income" | "expense" = amount >= 0 ? "income" : "expense";
    
    transactions.push({
      date,
      description: description.substring(0, 500),
      amount: Math.abs(amount),
      type,
      raw_data: { source: "generic-s1" },
    });
    strategy1Count++;
  }
  
  console.log("[parseGenericText] Strategy 1 (line-by-line) found:", strategy1Count);
  
  // STRATEGY 2: Find date + amount pairs anywhere in text (PDF fragments)
  if (transactions.length === 0) {
    console.log("[parseGenericText] Trying Strategy 2 (regex scan)");
    
    // Normalize text: join fragmented lines
    const normalized = text.replace(/\s+/g, " ").trim();
    
    // Pattern: date followed by description and amount
    // Date formats: DD/MM/YYYY, DD/MM/YY, DD-MM-YYYY
    const combinedPattern = /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})\s+([A-Za-zÀ-ÿ0-9\s\-\*\/\.]+?)\s+(-?R?\$?\s*\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/g;
    
    let match;
    while ((match = combinedPattern.exec(normalized)) !== null) {
      const dateStr = match[1];
      let description = match[2].trim();
      const amountStr = match[3];
      
      const date = parseFlexibleDate(dateStr);
      if (!date) continue;
      
      const amount = parseBrazilianAmount(amountStr);
      if (amount === null || Math.abs(amount) < 0.01) continue;
      
      // Clean description
      description = description.replace(/\s+/g, " ").substring(0, 500);
      if (description.length < 2) continue;
      
      // Skip noise
      if (isNoiseLine(description)) continue;
      
      const type: "income" | "expense" = amount >= 0 ? "income" : "expense";
      
      transactions.push({
        date,
        description,
        amount: Math.abs(amount),
        type,
        raw_data: { source: "generic-s2" },
      });
    }
    
    console.log("[parseGenericText] Strategy 2 found:", transactions.length);
  }
  
  // STRATEGY 3: Lenient extraction - find any currency amount near a date
  if (transactions.length === 0) {
    console.log("[parseGenericText] Trying Strategy 3 (lenient)");
    
    // Find all dates
    const datePattern = /\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/g;
    const dates: { date: string; index: number }[] = [];
    let dateMatch;
    while ((dateMatch = datePattern.exec(text)) !== null) {
      const parsed = parseFlexibleDate(dateMatch[0]);
      if (parsed) {
        dates.push({ date: parsed, index: dateMatch.index });
      }
    }
    
    // Find all amounts
    const amountPattern = /-?R?\$?\s*\d{1,3}(?:[.,]\d{3})*[.,]\d{2}/g;
    const amounts: { amount: number; index: number }[] = [];
    let amtMatch;
    while ((amtMatch = amountPattern.exec(text)) !== null) {
      const parsed = parseBrazilianAmount(amtMatch[0]);
      if (parsed !== null && Math.abs(parsed) >= 0.01) {
        amounts.push({ amount: parsed, index: amtMatch.index });
      }
    }
    
    console.log(`[parseGenericText] S3: Found ${dates.length} dates and ${amounts.length} amounts`);
    
    // Match dates with nearest amounts (within 200 chars)
    const usedAmounts = new Set<number>();
    
    for (const d of dates) {
      // Find nearest unused amount after the date
      let nearestAmt: { amount: number; index: number } | null = null;
      let nearestDist = Infinity;
      
      for (const a of amounts) {
        if (usedAmounts.has(a.index)) continue;
        const dist = a.index - d.index;
        if (dist > 0 && dist < 200 && dist < nearestDist) {
          nearestDist = dist;
          nearestAmt = a;
        }
      }
      
      if (nearestAmt) {
        usedAmounts.add(nearestAmt.index);
        
        // Extract description between date and amount
        const descStart = d.index + 10; // Skip date
        const descEnd = nearestAmt.index;
        let description = text.substring(descStart, descEnd)
          .replace(/\s+/g, " ")
          .trim()
          .substring(0, 500);
        
        if (description.length < 2) description = "(Transação importada)";
        if (isNoiseLine(description)) continue;
        
        const type: "income" | "expense" = nearestAmt.amount >= 0 ? "income" : "expense";
        
        transactions.push({
          date: d.date,
          description,
          amount: Math.abs(nearestAmt.amount),
          type,
          raw_data: { source: "generic-s3" },
        });
      }
    }
    
    console.log("[parseGenericText] Strategy 3 found:", transactions.length);
  }
  
  console.log("[parseGenericText] Total found:", transactions.length);
  
  return transactions;
}

// ============================================
// PDF TEXT EXTRACTION (ROBUST)
// ============================================

function extractPDFTextRobust(binaryContent: string): string {
  const textParts: string[] = [];
  
  console.log("[extractPDFTextRobust] Starting extraction, content length:", binaryContent.length);
  
  // Convert string to Uint8Array for binary operations
  const binaryArray = new Uint8Array(binaryContent.length);
  for (let i = 0; i < binaryContent.length; i++) {
    binaryArray[i] = binaryContent.charCodeAt(i) & 0xFF;
  }
  
  // Method 0: Try to decompress FlateDecode streams first
  // Look for stream objects with /FlateDecode filter
  const streamRegex = /\/FlateDecode[\s\S]*?stream\s*([\s\S]*?)\s*endstream/gi;
  let streamMatch;
  let method0Count = 0;
  
  while ((streamMatch = streamRegex.exec(binaryContent)) !== null) {
    try {
      // Get the stream content as bytes
      const streamStart = streamMatch.index + streamMatch[0].indexOf('stream') + 6;
      const streamContent = streamMatch[1];
      
      // Skip initial whitespace/newline
      let startOffset = 0;
      while (startOffset < streamContent.length && 
             (streamContent.charCodeAt(startOffset) === 10 || 
              streamContent.charCodeAt(startOffset) === 13 ||
              streamContent.charCodeAt(startOffset) === 32)) {
        startOffset++;
      }
      
      // Convert to bytes
      const bytes = new Uint8Array(streamContent.length - startOffset);
      for (let i = 0; i < bytes.length; i++) {
        bytes[i] = streamContent.charCodeAt(startOffset + i) & 0xFF;
      }
      
      // Try to decompress with pako (zlib inflate)
      try {
        const decompressed = pako.inflate(bytes);
        const text = new TextDecoder('latin1').decode(decompressed);
        
        // Extract text from the decompressed content
        // Look for text operators: (text)Tj or [(text)]TJ
        const textOps = text.match(/\(([^)]*)\)\s*Tj|\[([^\]]*)\]\s*TJ/gi) || [];
        for (const op of textOps) {
          const matches = op.match(/\(([^)]*)\)/g) || [];
          for (const m of matches) {
            let decoded = m.slice(1, -1)
              .replace(/\\n/g, "\n")
              .replace(/\\r/g, "\r")
              .replace(/\\t/g, " ")
              .replace(/\\\(/g, "(")
              .replace(/\\\)/g, ")")
              .replace(/\\\\/g, "\\")
              .replace(/\\(\d{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)));
            if (decoded.length > 0) {
              textParts.push(decoded);
              method0Count++;
            }
          }
        }
        
        // Also try to find plain text sequences in decompressed content
        const plainTextMatches = text.match(/[A-Za-zÀ-ÿ0-9\s\-\/\.,:\(\)]{5,}/g) || [];
        for (const ptm of plainTextMatches) {
          if (/\d{2}\/\d{2}\/\d{2,4}/.test(ptm) || /[A-Za-z]{3,}/.test(ptm)) {
            textParts.push(ptm.trim());
            method0Count++;
          }
        }
      } catch (inflateErr) {
        // Try raw inflate (no zlib header)
        try {
          const decompressed = pako.inflateRaw(bytes);
          const text = new TextDecoder('latin1').decode(decompressed);
          
          const textOps = text.match(/\(([^)]*)\)\s*Tj|\[([^\]]*)\]\s*TJ/gi) || [];
          for (const op of textOps) {
            const matches = op.match(/\(([^)]*)\)/g) || [];
            for (const m of matches) {
              let decoded = m.slice(1, -1)
                .replace(/\\n/g, "\n")
                .replace(/\\r/g, "\r")
                .replace(/\\t/g, " ")
                .replace(/\\\(/g, "(")
                .replace(/\\\)/g, ")")
                .replace(/\\\\/g, "\\");
              if (decoded.length > 0) {
                textParts.push(decoded);
                method0Count++;
              }
            }
          }
          
          const plainTextMatches = text.match(/[A-Za-zÀ-ÿ0-9\s\-\/\.,:\(\)]{5,}/g) || [];
          for (const ptm of plainTextMatches) {
            if (/\d{2}\/\d{2}\/\d{2,4}/.test(ptm) || /[A-Za-z]{3,}/.test(ptm)) {
              textParts.push(ptm.trim());
              method0Count++;
            }
          }
        } catch {
          // Decompression failed, continue to next stream
        }
      }
    } catch (e) {
      // Stream processing failed, continue
    }
  }
  
  console.log("[extractPDFTextRobust] Method 0 (FlateDecode decompression) extracted", method0Count, "parts");
  
  // Method 1: Extract stream content and decode text operators (uncompressed streams)
  const streamMatches = binaryContent.match(/stream\s*([\s\S]*?)\s*endstream/gi) || [];
  console.log("[extractPDFTextRobust] Found", streamMatches.length, "total streams");
  
  for (const stream of streamMatches) {
    // Try to extract text operators (Tj and TJ)
    const textOps = stream.match(/\(([^)]+)\)\s*Tj|\[([^\]]+)\]\s*TJ/gi) || [];
    for (const op of textOps) {
      const textMatch = op.match(/\(([^)]+)\)/g) || [];
      for (const tm of textMatch) {
        const decoded = tm.slice(1, -1)
          .replace(/\\n/g, "\n")
          .replace(/\\r/g, "\r")
          .replace(/\\t/g, "\t")
          .replace(/\\\(/g, "(")
          .replace(/\\\)/g, ")")
          .replace(/\\\\/g, "\\")
          .replace(/\\(\d{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)));
        if (decoded.length > 0 && /[a-zA-Z0-9]/.test(decoded)) {
          textParts.push(decoded);
        }
      }
    }
  }
  
  console.log("[extractPDFTextRobust] Method 1 (streams) extracted", textParts.length, "total parts so far");
  
  // Method 2: Literal strings in parentheses (outside streams)
  const literalMatches = binaryContent.match(/\((?:[^()\\]|\\.)*\)/g) || [];
  let method2Count = 0;
  for (const match of literalMatches) {
    const decoded = match.slice(1, -1)
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "\r")
      .replace(/\\t/g, "\t")
      .replace(/\\\(/g, "(")
      .replace(/\\\)/g, ")")
      .replace(/\\\\/g, "\\")
      .replace(/\\(\d{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)));
    if (decoded.length > 1 && /[a-zA-Z0-9]/.test(decoded)) {
      textParts.push(decoded);
      method2Count++;
    }
  }
  console.log("[extractPDFTextRobust] Method 2 (literals) extracted", method2Count, "parts");
  
  // Method 3: Hex strings (often used for Unicode)
  const hexMatches = binaryContent.match(/<[0-9A-Fa-f\s]+>/g) || [];
  let method3Count = 0;
  for (const hex of hexMatches) {
    const clean = hex.slice(1, -1).replace(/\s/g, "");
    if (clean.length < 4) continue;
    
    // Try to decode as UTF-16BE (common in PDFs)
    let result = "";
    for (let i = 0; i < clean.length; i += 4) {
      const charCode = parseInt(clean.substring(i, i + 4), 16);
      if (charCode >= 32 && charCode <= 65535) {
        result += String.fromCharCode(charCode);
      }
    }
    
    // If that didn't work, try simple hex
    if (result.length < 2) {
      result = "";
      for (let i = 0; i < clean.length; i += 2) {
        const charCode = parseInt(clean.substring(i, i + 2), 16);
        if (charCode >= 32 && charCode <= 126) {
          result += String.fromCharCode(charCode);
        }
      }
    }
    
    if (result.length > 1 && /[a-zA-Z0-9]/.test(result)) {
      textParts.push(result);
      method3Count++;
    }
  }
  console.log("[extractPDFTextRobust] Method 3 (hex) extracted", method3Count, "parts");
  
  // Method 4: Extract readable ASCII/Latin sequences (fallback)
  // Only do this if we haven't found much yet
  if (textParts.length < 20) {
    let currentWord = "";
    let method4Count = 0;
    
    for (let i = 0; i < binaryContent.length; i++) {
      const charCode = binaryContent.charCodeAt(i);
      // Include ASCII printable and extended Latin
      if ((charCode >= 32 && charCode <= 126) || (charCode >= 160 && charCode <= 255)) {
        currentWord += binaryContent[i];
      } else if (currentWord.length > 0) {
        // Only keep words that look like meaningful text (not binary garbage)
        if (currentWord.length >= 3 && /[a-zA-ZÀ-ÿ]{2,}/.test(currentWord)) {
          textParts.push(currentWord.trim());
          method4Count++;
        }
        currentWord = "";
      }
    }
    if (currentWord.length >= 3 && /[a-zA-ZÀ-ÿ]{2,}/.test(currentWord)) {
      textParts.push(currentWord.trim());
      method4Count++;
    }
    console.log("[extractPDFTextRobust] Method 4 (ASCII scan) extracted", method4Count, "parts");
  }
  
  // Join and clean
  let result = textParts
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  
  // Remove remaining binary garbage (sequences of non-printable chars)
  result = result.replace(/[^\x20-\x7E\xA0-\xFF\u0100-\u017F]+/g, " ");
  
  console.log("[extractPDFTextRobust] Final text length:", result.length);
  
  // Check if result looks like valid text (has dates or common Portuguese words)
  const hasValidContent = /\d{2}\/\d{2}\/\d{2,4}/.test(result) || 
                          /bradesco|banco|conta|saldo|pix|transfer/i.test(result);
  
  if (!hasValidContent && result.length > 0) {
    console.log("[extractPDFTextRobust] WARNING: Extracted text may be garbage, first 200 chars:", result.substring(0, 200));
  }
  
  return result;
}

// ============================================
// XLS/XLSX PARSING (SHEETJS)
// ============================================

function parseXLSWithSheetJS(uint8Array: Uint8Array): string[][] {
  try {
    const workbook = XLSX.read(uint8Array, { type: "array", dense: true, codepage: 65001 });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    if (!worksheet) return [];
    
    // Convert to array of arrays
    const rows: string[][] = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1, 
      raw: false,
      defval: ""
    }) as string[][];
    
    console.log(`SheetJS extracted ${rows.length} rows`);
    return rows;
  } catch (e) {
    console.error("SheetJS parse error:", e);
    return [];
  }
}

// ============================================
// UNIVERSAL EXCEL PARSER WITH COLUMN HEURISTICS
// Main parser that works without bank-specific logic
// ============================================

// Column synonyms for universal detection (case-insensitive, accent-normalized)
const COLUMN_SYNONYMS = {
  DATE: ["data", "dt", "data lancamento", "data lançamento", "data movimento", "data movimentacao", "lancamento", "lançamento", "date"],
  DESCRIPTION: ["descricao", "descrição", "historico", "histórico", "movimentacao", "movimentação", "lancamento", "lançamento", "desc", "description", "memo", "transacao", "transação"],
  VALUE: ["valor", "vlr", "value", "valor r$", "valor (r$)", "amount"],
  CREDIT: ["credito", "crédito", "credit", "credito (r$)", "crédito (r$)", "entrada", "receita"],
  DEBIT: ["debito", "débito", "debit", "debito (r$)", "débito (r$)", "saida", "saída", "despesa"],
  BALANCE: ["saldo", "balance", "saldo (r$)"],
  DOC: ["docto", "documento", "doc", "numero", "número", "nr"],
};

interface ColumnMapping {
  dateIdx: number;
  descIdx: number;
  valueIdx: number;
  creditIdx: number;
  debitIdx: number;
  balanceIdx: number;
  docIdx: number;
}

function normalizeForColumnMatch(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, "")
    .trim();
}

function detectColumns(headerRow: string[]): ColumnMapping | null {
  const mapping: ColumnMapping = {
    dateIdx: -1,
    descIdx: -1,
    valueIdx: -1,
    creditIdx: -1,
    debitIdx: -1,
    balanceIdx: -1,
    docIdx: -1,
  };
  
  for (let i = 0; i < headerRow.length; i++) {
    const normalized = normalizeForColumnMatch(headerRow[i] || "");
    if (!normalized) continue;
    
    // Check each column type
    if (mapping.dateIdx === -1 && COLUMN_SYNONYMS.DATE.some(s => normalized.includes(normalizeForColumnMatch(s)))) {
      mapping.dateIdx = i;
    }
    if (mapping.descIdx === -1 && COLUMN_SYNONYMS.DESCRIPTION.some(s => normalized.includes(normalizeForColumnMatch(s)))) {
      mapping.descIdx = i;
    }
    if (mapping.creditIdx === -1 && COLUMN_SYNONYMS.CREDIT.some(s => normalized.includes(normalizeForColumnMatch(s)))) {
      mapping.creditIdx = i;
    }
    if (mapping.debitIdx === -1 && COLUMN_SYNONYMS.DEBIT.some(s => normalized.includes(normalizeForColumnMatch(s)))) {
      mapping.debitIdx = i;
    }
    if (mapping.valueIdx === -1 && COLUMN_SYNONYMS.VALUE.some(s => normalized.includes(normalizeForColumnMatch(s)))) {
      // Only set value if it's not already mapped to credit/debit
      if (i !== mapping.creditIdx && i !== mapping.debitIdx) {
        mapping.valueIdx = i;
      }
    }
    if (mapping.balanceIdx === -1 && COLUMN_SYNONYMS.BALANCE.some(s => normalized.includes(normalizeForColumnMatch(s)))) {
      mapping.balanceIdx = i;
    }
    if (mapping.docIdx === -1 && COLUMN_SYNONYMS.DOC.some(s => normalized.includes(normalizeForColumnMatch(s)))) {
      mapping.docIdx = i;
    }
  }
  
  // Must have at least date and (value OR credit/debit)
  const hasAmount = mapping.valueIdx !== -1 || mapping.creditIdx !== -1 || mapping.debitIdx !== -1;
  if (mapping.dateIdx === -1 || !hasAmount) {
    return null;
  }
  
  // If no description column found, try to infer (first text column after date that isn't a number column)
  if (mapping.descIdx === -1) {
    for (let i = 0; i < headerRow.length; i++) {
      if (i !== mapping.dateIdx && i !== mapping.valueIdx && i !== mapping.creditIdx && 
          i !== mapping.debitIdx && i !== mapping.balanceIdx && i !== mapping.docIdx) {
        const normalized = normalizeForColumnMatch(headerRow[i] || "");
        if (normalized.length > 0 && !/^[\d.,\-r$\s]+$/.test(normalized)) {
          mapping.descIdx = i;
          break;
        }
      }
    }
  }
  
  return mapping;
}

function findHeaderRow(rows: string[][]): { headerIdx: number; mapping: ColumnMapping } | null {
  // Try first 20 rows to find a header
  for (let i = 0; i < Math.min(20, rows.length); i++) {
    const mapping = detectColumns(rows[i]);
    if (mapping) {
      console.log(`[findHeaderRow] Found header at row ${i}:`, {
        date: mapping.dateIdx,
        desc: mapping.descIdx,
        value: mapping.valueIdx,
        credit: mapping.creditIdx,
        debit: mapping.debitIdx,
      });
      return { headerIdx: i, mapping };
    }
  }
  return null;
}

// Parse Excel date serial number
function parseExcelDateSerial(serial: number): string | null {
  if (serial < 1 || serial > 100000) return null;
  
  // Excel epoch is January 1, 1900 (but with a bug: it thinks 1900 was a leap year)
  const excelEpoch = new Date(1899, 11, 30);
  const date = new Date(excelEpoch.getTime() + serial * 24 * 60 * 60 * 1000);
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  
  if (year < 1990 || year > 2100) return null;
  
  return `${year}-${month}-${day}`;
}

function parseUniversalExcelRows(rows: string[][]): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  
  console.log(`[parseUniversalExcelRows] Starting with ${rows.length} rows`);
  
  // ============================================
  // STEP 1: Find header row and detect column mapping
  // ============================================
  const headerInfo = findHeaderRow(rows);
  
  if (!headerInfo) {
    console.log("[parseUniversalExcelRows] Could not detect header - falling back to position-based");
    return []; // Let specific parser handle it
  }
  
  const { headerIdx, mapping } = headerInfo;
  
  // ============================================
  // STEP 2: Extract statement period if present (for date-only parsing)
  // ============================================
  let defaultYear = new Date().getFullYear().toString();
  let periodStart: string | null = null;
  let periodEnd: string | null = null;
  
  for (let i = 0; i < Math.min(headerIdx, 15); i++) {
    const rowText = rows[i].join(" ");
    const periodMatch = rowText.match(/entre\s+(\d{2})[\/\-](\d{2})[\/\-](\d{4})\s+e\s+(\d{2})[\/\-](\d{2})[\/\-](\d{4})/i);
    if (periodMatch) {
      const [, d1, m1, y1, d2, m2, y2] = periodMatch;
      periodStart = `${y1}-${m1}-${d1}`;
      periodEnd = `${y2}-${m2}-${d2}`;
      defaultYear = y2;
      console.log(`[parseUniversalExcelRows] Found period: ${periodStart} to ${periodEnd}`);
      break;
    }
  }
  
  // ============================================
  // STEP 3: Parse rows with date-carry-forward and multiline support
  // ============================================
  
  interface PendingTx {
    date: string;
    description: string;
    docto: string;
    amount: number;
    type: "income" | "expense";
    sourceRowIndex: number;
  }
  
  let lastTransaction: PendingTx | null = null;
  let currentDate: string | null = null;
  
  const flushTransaction = () => {
    if (lastTransaction) {
      transactions.push({
        date: lastTransaction.date,
        description: lastTransaction.description.substring(0, 500) || "(Transação importada)",
        amount: lastTransaction.amount,
        type: lastTransaction.type,
        raw_data: { 
          source: "universal_xls", 
          docto: lastTransaction.docto,
          sourceRowIndex: lastTransaction.sourceRowIndex,
        },
      });
    }
    lastTransaction = null;
  };
  
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;
    
    // Get cell values
    const dateCell = (row[mapping.dateIdx] || "").toString().trim();
    const descCell = mapping.descIdx !== -1 ? (row[mapping.descIdx] || "").toString().trim() : "";
    const docCell = mapping.docIdx !== -1 ? (row[mapping.docIdx] || "").toString().trim() : "";
    
    // ============================================
    // STOP CONDITIONS: Stop at common footer markers
    // ============================================
    const rowText = row.join(" ").toLowerCase();
    if (/últimos\s*lançamentos/i.test(rowText) ||
        /^total$/i.test(descCell.trim()) ||
        /dados\s*acima\s*têm/i.test(rowText) ||
        /telefones?\s*úteis/i.test(rowText)) {
      console.log(`[parseUniversalExcelRows] Stop marker found at row ${i}`);
      break;
    }
    
    // Skip noise rows
    if (isNoiseLine(descCell) || /saldos?\s*invest/i.test(descCell)) {
      continue;
    }
    
    // ============================================
    // Parse date (support multiple formats)
    // ============================================
    let parsedDate: string | null = null;
    
    // Try Excel serial number first
    const numericDate = parseFloat(dateCell);
    if (!isNaN(numericDate) && numericDate > 1 && numericDate < 100000) {
      parsedDate = parseExcelDateSerial(numericDate);
    }
    
    // Try string date formats
    if (!parsedDate) {
      parsedDate = parseFlexibleDate(dateCell);
    }
    
    // Try DD/MM format with default year
    if (!parsedDate && /^\d{2}\/\d{2}$/.test(dateCell)) {
      const [day, month] = dateCell.split("/");
      const dayNum = parseInt(day);
      const monthNum = parseInt(month);
      if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12) {
        parsedDate = `${defaultYear}-${month}-${day}`;
      }
    }
    
    // Validate date is within period if defined
    if (parsedDate && periodStart && periodEnd) {
      if (parsedDate < periodStart || parsedDate > periodEnd) {
        parsedDate = null; // Outside period, ignore
      }
    }
    
    // ============================================
    // Parse amounts (Credit/Debit columns OR single Value column)
    // ============================================
    let credit: number | null = null;
    let debit: number | null = null;
    
    if (mapping.creditIdx !== -1) {
      const creditCell = (row[mapping.creditIdx] || "").toString().trim();
      const val = parseBrazilianAmount(creditCell.replace(/^-\s*/, ""));
      if (val !== null && val > 0.01) credit = val;
    }
    
    if (mapping.debitIdx !== -1) {
      const debitCell = (row[mapping.debitIdx] || "").toString().trim();
      const val = parseBrazilianAmount(debitCell.replace(/^-\s*/, ""));
      if (val !== null && val > 0.01) debit = val;
    }
    
    // If no credit/debit columns, try single value column
    if (credit === null && debit === null && mapping.valueIdx !== -1) {
      const valueCell = (row[mapping.valueIdx] || "").toString().trim();
      const val = parseBrazilianAmount(valueCell);
      if (val !== null && Math.abs(val) > 0.01) {
        if (val >= 0) {
          credit = val;
        } else {
          debit = Math.abs(val);
        }
      }
    }
    
    const hasAmount = credit !== null || debit !== null;
    
    // ============================================
    // CASE 1: Row with DATE and AMOUNT → New transaction
    // ============================================
    if (parsedDate && hasAmount) {
      // Flush previous transaction
      flushTransaction();
      
      currentDate = parsedDate;
      
      lastTransaction = {
        date: parsedDate,
        description: descCell,
        docto: docCell,
        amount: credit !== null ? credit : debit!,
        type: credit !== null ? "income" : "expense",
        sourceRowIndex: i,
      };
    }
    // ============================================
    // CASE 2: Row with NO date but HAS amount → New transaction on same date (carry-forward)
    // ============================================
    else if (!parsedDate && hasAmount && currentDate) {
      // Flush previous transaction
      flushTransaction();
      
      lastTransaction = {
        date: currentDate,
        description: descCell,
        docto: docCell,
        amount: credit !== null ? credit : debit!,
        type: credit !== null ? "income" : "expense",
        sourceRowIndex: i,
      };
    }
    // ============================================
    // CASE 3: Row with NO date and NO amount → Continuation line (Rem:, Des:, etc.)
    // ============================================
    else if (!parsedDate && !hasAmount && descCell && lastTransaction) {
      // Append to previous transaction description (multiline support)
      lastTransaction.description = (lastTransaction.description + " " + descCell).trim();
    }
    // ============================================
    // CASE 4: Row with DATE but NO amount → Update current date for carry-forward
    // ============================================
    else if (parsedDate && !hasAmount) {
      currentDate = parsedDate;
    }
  }
  
  // Flush the last pending transaction
  flushTransaction();
  
  console.log(`[parseUniversalExcelRows] Extracted ${transactions.length} transactions`);
  
  // ============================================
  // STEP 4: Sort by date ascending, preserve sourceRowIndex order for same dates
  // ============================================
  transactions.sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    const aIdx = (a.raw_data as { sourceRowIndex?: number })?.sourceRowIndex ?? 0;
    const bIdx = (b.raw_data as { sourceRowIndex?: number })?.sourceRowIndex ?? 0;
    return aIdx - bIdx;
  });
  
  return transactions;
}

function parseXLSRows(rows: string[][], bank: DetectedBank): ParsedTransaction[] {
  if (rows.length === 0) return [];
  
  // First, try the universal parser with column heuristics
  const universalResult = parseUniversalExcelRows(rows);
  
  if (universalResult.length > 0) {
    console.log(`[parseXLSRows] Universal parser succeeded with ${universalResult.length} transactions`);
    return universalResult;
  }
  
  console.log(`[parseXLSRows] Universal parser found nothing, falling back to bank-specific parser: ${bank}`);
  
  // Fallback to bank-specific parsers
  switch (bank) {
    case "bradesco":
      return parseBradescoXLSRows(rows);
    case "btg":
      return parseBtgXLSRows(rows);
    case "itau":
      return parseItauXLSRows(rows);
    case "santander":
      return parseSantanderXLSRows(rows);
    default:
      return parseGenericXLSRows(rows);
  }
}

function parseBradescoXLSRows(rows: string[][]): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  
  console.log(`[parseBradescoXLSRows] Processing ${rows.length} rows`);
  
  // ============================================
  // STEP 1: Extract statement period from header
  // ============================================
  let periodStart: string | null = null;
  let periodEnd: string | null = null;
  
  for (const row of rows) {
    const rowText = row.join(' ');
    const periodMatch = rowText.match(/entre\s+(\d{2}\/\d{2}\/\d{4})\s+e\s+(\d{2}\/\d{2}\/\d{4})/i);
    if (periodMatch) {
      periodStart = parseFlexibleDate(periodMatch[1]);
      periodEnd = parseFlexibleDate(periodMatch[2]);
      console.log(`[parseBradescoXLSRows] Statement period: ${periodStart} to ${periodEnd}`);
      break;
    }
  }
  
  // ============================================
  // STEP 2: Find header row (Data | Histórico | Docto | Crédito | Débito | Saldo)
  // ============================================
  let headerIdx = -1;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowText = row.join(' ').toLowerCase();
    if ((rowText.includes('data') && rowText.includes('histórico')) ||
        (rowText.includes('data') && rowText.includes('crédito'))) {
      headerIdx = i;
      break;
    }
  }
  
  if (headerIdx === -1) {
    console.log(`[parseBradescoXLSRows] Header not found, trying from row 0`);
    headerIdx = 0;
  } else {
    console.log(`[parseBradescoXLSRows] Header found at row ${headerIdx}`);
  }
  
  // ============================================
  // STEP 3: Parse rows - create transactions
  // Structure: Each transaction row has a date and amounts
  // Continuation rows (Rem:, Des:, etc.) have NO date and NO amounts
  // ============================================
  
  interface PendingTx {
    date: string;
    historico: string;
    docto: string;
    amount: number;
    type: "income" | "expense";
  }
  
  let lastTransaction: PendingTx | null = null;
  let currentDate: string | null = null; // For carry-forward
  
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 2) continue;
    
    // Columns: Data | Histórico | Docto. | Crédito (R$) | Débito (R$) | Saldo (R$)
    const dateCell = (row[0] || "").toString().trim();
    const historico = (row[1] || "").toString().trim();
    const doctoCell = (row[2] || "").toString().trim();
    const creditCell = (row[3] || "").toString().trim();
    const debitCell = (row[4] || "").toString().trim();
    
    // ============================================
    // STOP CONDITIONS: Stop at "Últimos Lançamentos" or "Total"
    // ============================================
    if (/últimos\s*lançamentos/i.test(historico)) {
      console.log(`[parseBradescoXLSRows] Found 'Últimos Lançamentos' at row ${i}, stopping`);
      break;
    }
    if (/^total$/i.test(historico.trim())) {
      console.log(`[parseBradescoXLSRows] Found 'Total' at row ${i}, stopping`);
      break;
    }
    
    // Skip noise rows
    if (/dados\s*acima\s*têm/i.test(historico)) continue;
    if (/saldos?\s*invest/i.test(historico)) continue;
    if (/telefones?/i.test(historico)) continue;
    if (!historico && !dateCell) continue;
    
    // ============================================
    // Parse date
    // ============================================
    const parsedDate = parseFlexibleDate(dateCell);
    
    // ============================================
    // Parse amounts
    // ============================================
    let credit: number | null = null;
    let debit: number | null = null;
    
    if (creditCell) {
      const val = parseBrazilianAmount(creditCell.replace(/^-/, ""));
      if (val !== null && val > 0) credit = val;
    }
    if (debitCell) {
      // Remove leading minus if present (Bradesco sometimes uses "-1.416,18")
      const val = parseBrazilianAmount(debitCell.replace(/^-\s*/, ""));
      if (val !== null && val > 0) debit = val;
    }
    
    const hasAmount = credit !== null || debit !== null;
    
    // ============================================
    // CASE 1: Row with DATE and AMOUNT → New transaction
    // ============================================
    if (parsedDate && hasAmount) {
      // Validate date is within period
      if (periodStart && periodEnd) {
        if (parsedDate < periodStart || parsedDate > periodEnd) {
          console.log(`[parseBradescoXLSRows] Skipping row ${i} - date ${parsedDate} outside period`);
          continue;
        }
      }
      
      // Skip SALDO ANTERIOR
      if (/saldo\s*anterior/i.test(historico)) {
        console.log(`[parseBradescoXLSRows] Skipping SALDO ANTERIOR at row ${i}`);
        continue;
      }
      
      // Flush previous transaction
      if (lastTransaction) {
        transactions.push({
          date: lastTransaction.date,
          description: lastTransaction.historico.substring(0, 500),
          amount: lastTransaction.amount,
          type: lastTransaction.type,
          raw_data: { source: "bradesco_xls", docto: lastTransaction.docto },
        });
      }
      
      // Create new pending transaction
      currentDate = parsedDate;
      lastTransaction = {
        date: parsedDate,
        historico: historico,
        docto: doctoCell,
        amount: credit !== null ? credit : debit!,
        type: credit !== null ? "income" : "expense",
      };
    }
    // ============================================
    // CASE 2: Row with NO date but HAS amount → New transaction on same date
    // ============================================
    else if (!parsedDate && hasAmount && currentDate) {
      // Flush previous transaction
      if (lastTransaction) {
        transactions.push({
          date: lastTransaction.date,
          description: lastTransaction.historico.substring(0, 500),
          amount: lastTransaction.amount,
          type: lastTransaction.type,
          raw_data: { source: "bradesco_xls", docto: lastTransaction.docto },
        });
      }
      
      // Create new pending transaction with carry-forward date
      lastTransaction = {
        date: currentDate,
        historico: historico,
        docto: doctoCell,
        amount: credit !== null ? credit : debit!,
        type: credit !== null ? "income" : "expense",
      };
    }
    // ============================================
    // CASE 3: Row with NO date and NO amount → Continuation (Rem:, Des:, etc.)
    // ============================================
    else if (!parsedDate && !hasAmount && historico && lastTransaction) {
      // Append to the PREVIOUS transaction's description
      // This handles lines like "Rem: Thiago Paulo Silva de 01/12"
      lastTransaction.historico = lastTransaction.historico + " " + historico;
    }
    // ============================================
    // CASE 4: Row with DATE but NO amount → Could be a header row or empty
    // ============================================
    else if (parsedDate && !hasAmount) {
      // This might be "SALDO ANTERIOR" or similar - just update currentDate
      if (periodStart && periodEnd && parsedDate >= periodStart && parsedDate <= periodEnd) {
        currentDate = parsedDate;
      }
    }
  }
  
  // Flush the last pending transaction
  if (lastTransaction) {
    transactions.push({
      date: lastTransaction.date,
      description: lastTransaction.historico.substring(0, 500),
      amount: lastTransaction.amount,
      type: lastTransaction.type,
      raw_data: { source: "bradesco_xls", docto: lastTransaction.docto },
    });
  }
  
  console.log(`[parseBradescoXLSRows] Extracted ${transactions.length} transactions`);
  
  // ============================================
  // STEP 4: Sort by date ascending
  // ============================================
  transactions.sort((a, b) => a.date.localeCompare(b.date));
  
  return transactions;
}

function parseBtgXLSRows(rows: string[][]): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  
  for (const row of rows) {
    if (row.length < 5) continue;
    
    const dateTimeCell = (row[0] || "").toString().trim();
    const transacao = (row[2] || "").toString().trim();
    const descricao = (row[3] || "").toString().trim();
    const valorCell = (row[4] || row[row.length - 1] || "").toString().trim();
    
    if (/saldo\s*di[aá]rio/i.test(descricao) || /saldo\s*di[aá]rio/i.test(transacao)) continue;
    if (isNoiseLine(dateTimeCell)) continue;
    
    const dateMatch = dateTimeCell.match(/(\d{2}\/\d{2}\/\d{4})/);
    if (!dateMatch) continue;
    
    const date = parseFlexibleDate(dateMatch[1]);
    if (!date) continue;
    
    const amount = parseBrazilianAmount(valorCell);
    if (amount === null || Math.abs(amount) < 0.01) continue;
    
    let description = [transacao, descricao].filter(Boolean).join(" - ");
    
    const type: "income" | "expense" = amount >= 0 ? "income" : "expense";
    
    transactions.push({
      date,
      description: description.substring(0, 500),
      amount: Math.abs(amount),
      type,
      raw_data: { source: "btg_xls" },
    });
  }
  
  return transactions;
}

function parseItauXLSRows(rows: string[][]): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  
  for (const row of rows) {
    if (row.length < 4) continue;
    
    const dateCell = (row[0] || "").toString().trim();
    const lancamento = (row[1] || "").toString().trim();
    const valorCell = (row[3] || row[2] || "").toString().trim();
    
    if (/saldo\s+total\s+dispon[ií]vel/i.test(lancamento)) continue;
    if (/saldo\s+anterior/i.test(lancamento)) continue;
    if (isNoiseLine(lancamento)) continue;
    
    const date = parseFlexibleDate(dateCell);
    if (!date) continue;
    
    const amount = parseBrazilianAmount(valorCell);
    if (amount === null || Math.abs(amount) < 0.01) continue;
    
    const type: "income" | "expense" = amount >= 0 ? "income" : "expense";
    
    transactions.push({
      date,
      description: lancamento.substring(0, 500) || "Transação Itaú",
      amount: Math.abs(amount),
      type,
      raw_data: { source: "itau_xls" },
    });
  }
  
  return transactions;
}

function parseSantanderXLSRows(rows: string[][]): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  
  for (const row of rows) {
    if (row.length < 5) continue;
    
    const dateCell = (row[0] || "").toString().trim();
    const descricao = (row[1] || "").toString().trim();
    
    if (isNoiseLine(descricao)) continue;
    
    const date = parseFlexibleDate(dateCell);
    if (!date) continue;
    
    let credit: number | undefined;
    let debit: number | undefined;
    
    for (let i = 4; i < row.length; i++) {
      const val = parseBrazilianAmount((row[i] || "").toString());
      if (val !== null && Math.abs(val) > 0.01) {
        if (val < 0) {
          debit = Math.abs(val);
        } else if (!credit) {
          credit = val;
        }
      }
    }
    
    const amount = credit || debit;
    if (!amount || amount < 0.01) continue;
    
    const type: "income" | "expense" = credit ? "income" : "expense";
    
    transactions.push({
      date,
      description: descricao.substring(0, 500),
      amount,
      type,
      raw_data: { source: "santander_xls" },
    });
  }
  
  return transactions;
}

function parseGenericXLSRows(rows: string[][]): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  
  for (const row of rows) {
    if (row.length < 2) continue;
    
    let date: string | null = null;
    let description = "";
    let amount: number | null = null;
    
    for (const cell of row) {
      const trimmed = (cell || "").toString().trim();
      if (!trimmed) continue;
      
      if (!date) {
        const parsed = parseFlexibleDate(trimmed);
        if (parsed) {
          date = parsed;
          continue;
        }
      }
      
      if (amount === null) {
        const parsed = parseBrazilianAmount(trimmed);
        if (parsed !== null && Math.abs(parsed) > 0.01) {
          amount = parsed;
          continue;
        }
      }
      
      if (trimmed.length > 2 && !/^[\d.,\-R$\s]+$/.test(trimmed)) {
        description += (description ? " " : "") + trimmed;
      }
    }
    
    if (date && amount !== null && Math.abs(amount) > 0.01 && !isNoiseLine(description)) {
      const type: "income" | "expense" = amount >= 0 ? "income" : "expense";
      
      transactions.push({
        date,
        description: (description || "Transação importada").substring(0, 500),
        amount: Math.abs(amount),
        type,
        raw_data: { source: "generic_xls" },
      });
    }
  }
  
  return transactions;
}

// ============================================
// MAIN PARSING FUNCTIONS
// ============================================

function parseTextContent(text: string, bank: DetectedBank): ParsedTransaction[] {
  console.log(`Parsing text for bank: ${bank}, text length: ${text.length}`);
  
  let transactions: ParsedTransaction[] = [];
  
  switch (bank) {
    case "bradesco":
      transactions = parseBradescoText(text);
      break;
    case "btg":
      transactions = parseBtgText(text);
      break;
    case "itau":
      transactions = parseItauText(text);
      break;
    case "santander":
      transactions = parseSantanderText(text);
      break;
    default:
      transactions = parseGenericText(text);
  }
  
  console.log(`Bank-specific parser found ${transactions.length} transactions`);
  
  // Fallback to generic if bank-specific found nothing
  if (transactions.length === 0 && bank !== "unknown") {
    transactions = parseGenericText(text);
    console.log(`Generic fallback found ${transactions.length} transactions`);
  }
  
  // Deduplicate
  const seen = new Set<string>();
  const unique = transactions.filter(tx => {
    const key = `${tx.date}_${tx.amount.toFixed(2)}_${tx.description.substring(0, 20)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  
  return unique;
}

// (extractAccountInfo moved to top of file with bank parameter)

// ============================================
// CATEGORY SUGGESTION
// ============================================

const DEFAULT_CATEGORY_KEYWORDS: Record<string, { category: string; keywords: string[] }> = {
  food_delivery: {
    category: "alimentacao",
    keywords: ["ifood", "rappi", "uber eats", "99food", "delivery", "aiqfome"],
  },
  supermarket: {
    category: "alimentacao", 
    keywords: ["mercado", "supermercado", "carrefour", "extra", "pao de acucar", "atacadao", "assai"],
  },
  transport: {
    category: "transporte",
    keywords: ["uber", "99", "cabify", "posto", "combustivel", "gasolina", "estacionamento", "ipva"],
  },
  health: {
    category: "saude",
    keywords: ["farmacia", "drogaria", "hospital", "medico", "clinica", "laboratorio"],
  },
  utilities: {
    category: "moradia",
    keywords: ["luz", "energia", "agua", "gas", "internet", "telefone", "celular"],
  },
  entertainment: {
    category: "lazer",
    keywords: ["netflix", "spotify", "cinema", "teatro", "show", "ingresso", "prime video", "disney"],
  },
  salary: {
    category: "salario",
    keywords: ["salario", "folha", "holerite", "pagamento empresa", "pro-labore"],
  },
};

async function suggestCategory(
  description: string,
  familyId: string,
  // deno-lint-ignore no-explicit-any
  adminClient: any
): Promise<{ categoryId: string; subcategoryId?: string; confidence: number }> {
  const normalizedDesc = normalizeDescription(description);
  
  // Check family rules
  const { data: familyRules } = await adminClient
    .from("import_category_rules")
    .select("keyword, category_id, subcategory_id")
    .eq("family_id", familyId)
    .order("match_count", { ascending: false });
  
  if (familyRules && Array.isArray(familyRules)) {
    for (const rule of familyRules) {
      const keyword = normalizeDescription(rule.keyword);
      if (normalizedDesc.includes(keyword)) {
        return {
          categoryId: rule.category_id,
          subcategoryId: rule.subcategory_id || undefined,
          confidence: 0.9,
        };
      }
    }
  }
  
  // Default keywords
  for (const [, mapping] of Object.entries(DEFAULT_CATEGORY_KEYWORDS)) {
    for (const keyword of mapping.keywords) {
      if (normalizedDesc.includes(keyword)) {
        return {
          categoryId: mapping.category,
          confidence: 0.6,
        };
      }
    }
  }
  
  return {
    categoryId: "outros",
    confidence: 0.1,
  };
}

function generateTransactionHash(tx: ParsedTransaction, sourceId: string): string {
  const normalized = normalizeDescription(tx.description);
  const key = `${tx.date}|${tx.amount.toFixed(2)}|${normalized}|${sourceId}`;
  
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return Math.abs(hash).toString(36);
}

// ============================================
// PASSWORD GENERATION
// ============================================

function generatePasswordAttempts(cpf?: string, birthDate?: string): string[] {
  const passwords: string[] = [];
  
  if (cpf) {
    const cleanCpf = cpf.replace(/\D/g, "");
    if (cleanCpf.length === 11) {
      passwords.push(cleanCpf); // Full CPF
      passwords.push(cleanCpf.substring(0, 3)); // First 3
      passwords.push(cleanCpf.substring(0, 4)); // First 4
      passwords.push(cleanCpf.substring(0, 5)); // First 5
      passwords.push(cleanCpf.substring(0, 6)); // First 6
      passwords.push(cleanCpf.substring(0, 7)); // First 7
      passwords.push(cleanCpf.substring(0, 8)); // First 8
      passwords.push(cleanCpf.substring(0, 9)); // First 9
      passwords.push(cleanCpf.substring(0, 10)); // First 10
    }
  }
  
  if (birthDate) {
    const match = birthDate.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [, year, month, day] = match;
      passwords.push(`${day}${month}${year}`);
      passwords.push(`${day}${month}${year.substring(2)}`);
      passwords.push(`${year}${month}${day}`);
      passwords.push(`${day}${month}`);
    }
  }
  
  return passwords;
}

// ============================================
// MAIN HANDLER
// ============================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const authHeader = req.headers.get("Authorization") ?? "";

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const { data: userData, error: userError } = await userClient.auth.getUser();

    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const { data: memberData, error: memberError } = await adminClient
      .from("family_members")
      .select("family_id, cpf, birth_date")
      .eq("user_id", userData.user.id)
      .limit(1)
      .single();

    if (memberError || !memberData) {
      return new Response(JSON.stringify({ error: "Family not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const familyId = memberData.family_id;
    const userCpf = memberData.cpf;
    const userBirthDate = memberData.birth_date;

    // Parse request
    let file_type: "ofx" | "xlsx" | "pdf";
    let import_type: string = "";
    let source_id: string = "";
    let invoice_month: string | undefined;
    let file_name = `import_${Date.now()}`;
    let fileBytes: Uint8Array | null = null;
    let fileContent = "";
    let autoDetect = false;

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        import_type = formData.get("importType") as string || "";
        source_id = formData.get("sourceId") as string || "";
        invoice_month = formData.get("invoiceMonth") as string || undefined;
        autoDetect = formData.get("autoDetect") === "true";

        if (!file) {
          return new Response(JSON.stringify({ error: "No file provided" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        file_name = file.name;
        const fileName = file.name.toLowerCase();
        
        if (fileName.endsWith(".ofx")) {
          file_type = "ofx";
        } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
          file_type = "xlsx";
        } else if (fileName.endsWith(".pdf")) {
          file_type = "pdf";
        } else {
          return new Response(JSON.stringify({ error: "Unsupported file type" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        }

        const arrayBuffer = await file.arrayBuffer();
        fileBytes = new Uint8Array(arrayBuffer);

        if (file_type === "ofx") {
          const decoder = new TextDecoder("utf-8");
          fileContent = decoder.decode(fileBytes);
        }
      } catch (e) {
        console.error("Error parsing FormData:", e);
        return new Response(JSON.stringify({ error: "Failed to parse file upload" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    } else {
      return new Response(JSON.stringify({ error: "Content-Type must be multipart/form-data" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // For smart import (autoDetect), we don't require import_type and source_id upfront
    if (!autoDetect && (!file_type || !import_type || !source_id)) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`Processing ${file_type} file, autoDetect: ${autoDetect}, source: ${source_id || "(auto)"}`);

    let transactions: ParsedTransaction[] = [];
    let detectedBankName: string | null = null;
    let detectedBank: DetectedBank = "unknown";
    let detectedSourceInfo: DetectedSourceInfo | null = null;
    let rawTextContent = ""; // For account info extraction

    // Parse based on file type
    if (file_type === "ofx") {
      transactions = parseOFX(fileContent);
      rawTextContent = fileContent;
      
      // For OFX, detect bank from content
      const detection = detectBank(fileContent);
      detectedBank = detection.bank;
      detectedBankName = detection.displayName !== "Banco não identificado" 
        ? detection.displayName 
        : "OFX Import";
    } else if (file_type === "xlsx" && fileBytes) {
      // Parse XLS/XLSX with SheetJS
      const rows = parseXLSWithSheetJS(fileBytes);
      
      if (rows.length === 0) {
        console.log("SheetJS returned 0 rows");
        return new Response(JSON.stringify({ 
          success: false, 
          error: "Não foi possível ler as linhas do arquivo Excel. Verifique se o arquivo não está corrompido.",
          error_code: "IMPORT_XLS_PARSE_FAILED"
        } as ProcessResponse), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      
      // Detect bank from row content
      rawTextContent = rows.map(r => r.join(" ")).join("\n");
      const detection = detectBank(rawTextContent);
      detectedBank = detection.bank;
      detectedBankName = detection.displayName;
      
      console.log(`XLS detected bank: ${detectedBankName}`);
      
      transactions = parseXLSRows(rows, detectedBank);
      console.log(`XLS parser found ${transactions.length} transactions`);
    } else if (file_type === "pdf" && fileBytes) {
      // Convert Uint8Array to string for text extraction
      let binaryString = "";
      for (let i = 0; i < fileBytes.length; i++) {
        binaryString += String.fromCharCode(fileBytes[i]);
      }
      
      rawTextContent = extractPDFTextRobust(binaryString);
      console.log(`[PDF] Extracted text length: ${rawTextContent.length} chars`);
      
      // Log first 500 chars for debugging (no sensitive data)
      if (rawTextContent.length > 0) {
        console.log(`[PDF] Text preview (first 500): ${rawTextContent.substring(0, 500).replace(/\s+/g, ' ')}`);
      }
      
      if (rawTextContent.length < 50) {
        console.log("[PDF] Text too short, possibly scanned or encrypted");
        return new Response(JSON.stringify({ 
          success: false, 
          error: "Não foi possível extrair texto do PDF. O arquivo pode estar escaneado ou em formato de imagem.",
          error_code: "IMPORT_PDF_TEXT_EXTRACTION_FAILED"
        } as ProcessResponse), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
      
      // Detect bank
      const detection = detectBank(rawTextContent);
      detectedBank = detection.bank;
      detectedBankName = detection.displayName;
      
      console.log(`[PDF] Detected bank: ${detectedBankName}`);
      
      transactions = parseTextContent(rawTextContent, detectedBank);
      console.log(`[PDF] Final transaction count: ${transactions.length}`);
    }

    // ============================================
    // AUTO-DETECT: Extract account info and resolve source
    // ============================================
    if (autoDetect && rawTextContent) {
      const accountInfo = extractAccountInfo(rawTextContent, detectedBank);
      
      detectedSourceInfo = {
        bankName: detectedBank,
        bankDisplayName: detectedBankName || "Banco detectado",
        sourceType: accountInfo.sourceType,
        agency: accountInfo.agency,
        accountNumber: accountInfo.accountNumber,
        last4: accountInfo.last4,
      };
      
      // Determine import_type based on detected source type
      // IMPORTANT: constraint requires 'credit_card_invoice' not 'credit_card'
      import_type = accountInfo.sourceType === "credit_card" ? "credit_card_invoice" : "bank_statement";
      
      console.log(`[AutoDetect] Source type: ${import_type}, Agency: ${accountInfo.agency || "(none)"}, Account: ${accountInfo.accountNumber ? "****" + accountInfo.accountNumber.slice(-4) : "(none)"}`);
      
      // Try to find matching existing source
      if (accountInfo.sourceType === "bank_account") {
        // Look for matching bank account
        const { data: existingAccounts } = await adminClient
          .from("bank_accounts")
          .select("id, nickname, bank_id, custom_bank_name")
          .eq("family_id", familyId)
          .eq("is_active", true);
        
        // Score matches
        let bestMatch: { id: string; score: number } | null = null;
        
        for (const acc of existingAccounts || []) {
          let score = 0;
          const nickname = (acc.nickname || "").toLowerCase();
          
          // Check if nickname contains the account number
          if (accountInfo.accountNumber) {
            const normalizedAccNum = accountInfo.accountNumber.replace(/-/g, "");
            if (nickname.includes(normalizedAccNum) || nickname.includes(accountInfo.accountNumber)) {
              score += 80;
            }
          }
          
          // Check bank name match
          if (detectedBankName && nickname.includes(detectedBankName.toLowerCase())) {
            score += 30;
          }
          
          if (score > 0 && (!bestMatch || score > bestMatch.score)) {
            bestMatch = { id: acc.id, score };
          }
        }
        
        if (bestMatch && bestMatch.score >= 50) {
          source_id = bestMatch.id;
          console.log(`[AutoDetect] Matched existing bank account: ${source_id} (score: ${bestMatch.score})`);
        } else if (accountInfo.accountNumber || detectedBankName) {
          // Create new bank account automatically
          const accountLast4 = accountInfo.accountNumber?.slice(-4) || "";
          const nickname = accountInfo.accountNumber
            ? `${detectedBankName || "Banco"} • ****${accountLast4}`
            : detectedBankName || "Conta Importada";
          
          // Try to find bank_id
          let bankId: string | null = null;
          if (detectedBankName) {
            const { data: banks } = await adminClient
              .from("banks")
              .select("id, name")
              .ilike("name", `%${detectedBankName}%`)
              .limit(1);
            bankId = banks?.[0]?.id || null;
          }
          
          const { data: newAccount, error: createError } = await adminClient
            .from("bank_accounts")
            .insert({
              family_id: familyId,
              bank_id: bankId,
              custom_bank_name: bankId ? null : (detectedBankName || "Banco Importado"),
              account_type: "checking",
              nickname,
              initial_balance: 0,
            })
            .select("id")
            .single();
          
          if (createError) {
            console.error("[AutoDetect] Failed to create bank account:", createError);
            // Fallback: use first existing account or create a generic one
          } else {
            source_id = newAccount.id;
            console.log(`[AutoDetect] Created new bank account: ${source_id} - ${nickname}`);
          }
        }
        
        // Final fallback: use first existing bank account
        if (!source_id && existingAccounts && existingAccounts.length > 0) {
          source_id = existingAccounts[0].id;
          console.log(`[AutoDetect] Fallback to first bank account: ${source_id}`);
        }
      } else {
        // Credit card - similar logic
        const { data: existingCards } = await adminClient
          .from("credit_cards")
          .select("id, card_name")
          .eq("family_id", familyId)
          .eq("is_active", true);
        
        let bestMatch: { id: string; score: number } | null = null;
        
        for (const card of existingCards || []) {
          let score = 0;
          const cardName = (card.card_name || "").toLowerCase();
          
          if (accountInfo.last4 && cardName.includes(accountInfo.last4)) {
            score += 80;
          }
          if (detectedBankName && cardName.includes(detectedBankName.toLowerCase())) {
            score += 30;
          }
          
          if (score > 0 && (!bestMatch || score > bestMatch.score)) {
            bestMatch = { id: card.id, score };
          }
        }
        
        if (bestMatch && bestMatch.score >= 50) {
          source_id = bestMatch.id;
          console.log(`[AutoDetect] Matched existing credit card: ${source_id}`);
        } else if (accountInfo.last4 || detectedBankName) {
          const cardName = accountInfo.last4
            ? `${detectedBankName || "Cartão"} ****${accountInfo.last4}`
            : detectedBankName || "Cartão Importado";
          
          const { data: newCard, error: createError } = await adminClient
            .from("credit_cards")
            .insert({
              family_id: familyId,
              card_name: cardName,
              brand: "visa",
              closing_day: 25,
              due_day: 5,
            })
            .select("id")
            .single();
          
          if (!createError) {
            source_id = newCard.id;
            console.log(`[AutoDetect] Created new credit card: ${source_id} - ${cardName}`);
          }
        }
        
        // Final fallback
        if (!source_id && existingCards && existingCards.length > 0) {
          source_id = existingCards[0].id;
          console.log(`[AutoDetect] Fallback to first credit card: ${source_id}`);
        }
      }
      
      // If still no source_id after all attempts, fail gracefully
      if (!source_id) {
        console.error("[AutoDetect] Could not resolve source_id");
        return new Response(JSON.stringify({ 
          success: false, 
          error: "Não foi possível identificar ou criar uma conta/cartão. Cadastre uma conta primeiro.",
          error_code: "IMPORT_NO_SOURCE_RESOLVED"
        } as ProcessResponse), {
          status: 200,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    }

    if (transactions.length === 0) {
      console.log("No transactions extracted from file");
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Não foi possível extrair transações deste arquivo. Verifique se o formato é compatível ou tente exportar o extrato em OFX.",
        error_code: "IMPORT_NO_TRANSACTIONS_EXTRACTED"
      } as ProcessResponse), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`Parsed ${transactions.length} transactions`);

    // Create import record (PROCESSING first; REVIEWING only after items are persisted)
    const importId = crypto.randomUUID();

    const { error: importError } = await adminClient.from("imports").insert({
      id: importId,
      family_id: familyId,
      file_name,
      file_type,
      import_type,
      source_id,
      invoice_month: invoice_month || null,
      status: "processing",
      transactions_count: null,
      created_by: userData.user.id,
      detected_bank: detectedBankName,
      error_message: null,
      error_code: null,
    });

    if (importError) {
      console.error("Error creating import record:", importError);
      return new Response(JSON.stringify({ error: "Failed to create import record" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get existing transactions for duplicate check
    const { data: existingTxs } = await adminClient
      .from("transactions")
      .select("id, date, amount, description")
      .eq("family_id", familyId);

    const existingHashes = new Set(
      (existingTxs || []).map((tx: { date: string; amount: number; description: string }) => 
        generateTransactionHash({ date: tx.date, description: tx.description || "", amount: tx.amount, type: "expense" }, source_id)
      )
    );

    // Insert pending transactions
    const pendingItems = [];
    
    for (const tx of transactions) {
      const hash = generateTransactionHash(tx, source_id);
      const isDuplicate = existingHashes.has(hash);
      
      const { categoryId, subcategoryId, confidence } = await suggestCategory(
        tx.description,
        familyId,
        adminClient
      );
      
      pendingItems.push({
        import_id: importId,
        family_id: familyId,
        date: tx.date,
        original_date: tx.date,
        amount: tx.amount,
        type: tx.type,
        description: tx.description,
        category_id: categoryId,
        subcategory_id: subcategoryId || null,
        suggested_category_id: categoryId,
        is_duplicate: isDuplicate,
        duplicate_transaction_id: null,
        confidence_score: confidence,
        needs_review: confidence < 0.5 || categoryId === "outros",
        raw_data: tx.raw_data || {},
      });
    }

    const { data: persistedRows, error: itemsError } = await adminClient
      .from("import_pending_transactions")
      .insert(pendingItems)
      .select("id");

    if (itemsError) {
      console.error("Error inserting pending transactions:", itemsError);
      await adminClient.from("imports").update({ 
        status: "failed", 
        error_message: "Falha ao salvar transações no banco",
        error_code: "IMPORT_PERSIST_FAILED",
      }).eq("id", importId);
      return new Response(JSON.stringify({ error: "Failed to save transactions" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const itemsPersistedCount = persistedRows?.length ?? 0;

    // ✅ Source of truth: items persisted => status must be REVIEWING
    const { error: finalizeErr } = await adminClient
      .from("imports")
      .update({
        status: "reviewing",
        transactions_count: itemsPersistedCount,
        processed_at: new Date().toISOString(),
        error_message: null,
        error_code: null,
      })
      .eq("id", importId);

    if (finalizeErr) {
      // Não falhar silenciosamente: itens já existem; retornamos sucesso mas registramos erro e deixamos o endpoint de review corrigir.
      console.error("[OIK Import] Failed to finalize import status", {
        importBatchId: importId,
        itemsExtractedCount: transactions.length,
        itemsPersistedCount,
        message: finalizeErr.message,
      });
    }

    console.log("[OIK Import] import-process completed", {
      importBatchId: importId,
      itemsExtractedCount: transactions.length,
      itemsPersistedCount,
      statusFinal: "reviewing",
    });

    // Include detected info in response for UI display
    const responseData: ProcessResponse & { detected?: DetectedSourceInfo } = {
      success: true,
      import_id: importId,
      transactions_count: itemsPersistedCount,
    };
    
    if (detectedSourceInfo) {
      responseData.detected = detectedSourceInfo;
    }

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (e) {
    console.error("Unexpected error:", e);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
