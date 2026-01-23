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
  
  // Extract statement period
  const periodMatch = cleanedText.match(/entre\s+(\d{2})\/(\d{2})\/(\d{4})\s+e\s+(\d{2})\/(\d{2})\/(\d{4})/i);
  let periodStart: string | null = null;
  let periodEnd: string | null = null;
  
  if (periodMatch) {
    const [, d1, m1, y1, d2, m2, y2] = periodMatch;
    periodStart = `${y1}-${m1}-${d1}`;
    periodEnd = `${y2}-${m2}-${d2}`;
    console.log(`[parseBradescoText] Statement period: ${periodStart} to ${periodEnd}`);
  }
  
  // ============================================
  // STEP 2: Remove noise sections BEFORE parsing
  // ============================================
  
  // Find and remove "Últimos Lançamentos" section (Jan/26 data)
  const noiseMarkers = [
    'últimos lançamentos', 'ultimos lancamentos',
    'saldos invest', 'telefones úteis', 'ouvidoria',
    'dados acima têm'
  ];
  
  for (const marker of noiseMarkers) {
    const idx = cleanedText.toLowerCase().indexOf(marker);
    if (idx !== -1 && idx < cleanedText.length * 0.9) {
      // Only truncate if marker is before 90% of text
      cleanedText = cleanedText.substring(0, idx);
      console.log(`[parseBradescoText] Truncated at '${marker}' (index ${idx})`);
      break;
    }
  }
  
  console.log(`[parseBradescoText] After noise removal, length: ${cleanedText.length}`);
  
  // ============================================
  // STEP 3: Strategy A - Find structured date+description+amount patterns
  // Using regex to find all occurrences of date patterns (DD/MM/YY or DD/MM/YYYY)
  // ============================================
  
  // Pattern: Date followed by text and amounts
  // Bradesco format: DD/MM/YY followed by description and BR amounts
  const datePattern = /(\d{2})\/(\d{2})\/(\d{2,4})/g;
  const amountPattern = /(-?\s*)(\d{1,3}(?:\.\d{3})*,\d{2})/g;
  
  // Find all dates in text
  const dateMatches: { date: string; index: number }[] = [];
  let match;
  
  while ((match = datePattern.exec(cleanedText)) !== null) {
    const [, day, month, year] = match;
    const fullYear = year.length === 2 ? `20${year}` : year;
    const dateStr = `${fullYear}-${month}-${day}`;
    
    // Validate date
    const dayNum = parseInt(day);
    const monthNum = parseInt(month);
    if (dayNum < 1 || dayNum > 31 || monthNum < 1 || monthNum > 12) continue;
    
    // Check if within statement period
    if (periodStart && periodEnd) {
      if (dateStr < periodStart || dateStr > periodEnd) {
        console.log(`[parseBradescoText] Skipping date ${dateStr} (outside period)`);
        continue;
      }
    }
    
    dateMatches.push({ date: dateStr, index: match.index });
  }
  
  console.log(`[parseBradescoText] Found ${dateMatches.length} dates within period`);
  
  // ============================================
  // STEP 4: For each date, extract text segment and find amounts
  // ============================================
  
  const TX_MARKERS = [
    'transfe pix', 'pix recebido', 'pix enviado', 'pix qrcode',
    'rem:', 'des:',
    'resgate inv', 'rent.inv', 'apl.invest', 'aplicacao inv',
    'prest fin imob', 'amortiz', 'bx.ant.fin',
    'encargo', 'iof util', 'enc lim',
    'contr ', 'parc cred',
    'bradesco vida', 'seguro', 'receb pagfor',
    'gasto c credito',
    'ted', 'doc', 'saque', 'deposito', 'tarifa',
    'cartao credito', 'pagamento'
  ];
  
  const SKIP_PATTERNS = [
    /^saldo\s*anterior/i,
    /^saldo\s*final/i,
    /^saldo\s*total/i,
    /^\s*total\s*$/i,
  ];
  
  function hasTransactionMarker(text: string): boolean {
    const lower = text.toLowerCase();
    for (const marker of TX_MARKERS) {
      if (lower.includes(marker)) return true;
    }
    return false;
  }
  
  function shouldSkip(text: string): boolean {
    for (const p of SKIP_PATTERNS) {
      if (p.test(text)) return true;
    }
    return false;
  }
  
  function extractAmounts(text: string): Array<{ amount: number; isNegative: boolean; index: number }> {
    const results: Array<{ amount: number; isNegative: boolean; index: number }> = [];
    const amtRegex = /(-?\s*)(\d{1,3}(?:\.\d{3})*,\d{2})/g;
    let m;
    
    while ((m = amtRegex.exec(text)) !== null) {
      const isNeg = m[1].includes('-');
      const val = parseBrazilianAmount(m[2]);
      if (val !== null && val >= 0.01 && val < 100000000) {
        results.push({ amount: val, isNegative: isNeg, index: m.index });
      }
    }
    
    return results;
  }
  
  // Process each date and its following segment
  for (let i = 0; i < dateMatches.length; i++) {
    const current = dateMatches[i];
    const next = dateMatches[i + 1];
    
    // Get text segment from this date to next date (or end of text)
    const segmentEnd = next ? next.index : cleanedText.length;
    const segment = cleanedText.substring(current.index, segmentEnd);
    
    if (shouldSkip(segment)) continue;
    
    // Extract amounts from this segment
    const amounts = extractAmounts(segment);
    if (amounts.length === 0) continue;
    
    // Build description by removing dates and amounts
    let description = segment
      .replace(/\d{2}\/\d{2}(\/\d{2,4})?\s*/g, '')
      .replace(/-?\s*\d{1,3}(?:\.\d{3})*,\d{2}/g, '')
      .replace(/\b\d{6,}\b/g, '') // Remove document numbers
      .replace(/\|/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    // If no description or just noise, try to use transaction marker
    if (description.length < 3) {
      description = '(Transação Bradesco)';
    }
    
    // For each amount in segment, create a transaction
    // But be smart about grouping - if there's a clear description pattern, use it
    if (amounts.length === 1) {
      // Simple case: one amount per date
      const a = amounts[0];
      transactions.push({
        date: current.date,
        description: description.substring(0, 500),
        amount: a.amount,
        type: a.isNegative ? "expense" : "income",
        raw_data: { source: "bradesco-pdf-single" },
      });
    } else {
      // Multiple amounts - try to split by transaction markers
      const segmentLower = segment.toLowerCase();
      let usedAmounts = 0;
      
      for (const marker of TX_MARKERS) {
        const markerIdx = segmentLower.indexOf(marker);
        if (markerIdx !== -1 && usedAmounts < amounts.length) {
          // Find the closest amount after this marker
          for (const a of amounts) {
            if (a.index > markerIdx && usedAmounts < amounts.length) {
              const markerEnd = markerIdx + marker.length + 50;
              const txDesc = segment.substring(markerIdx, Math.min(markerEnd, segment.length))
                .replace(/-?\s*\d{1,3}(?:\.\d{3})*,\d{2}/g, '')
                .replace(/\b\d{6,}\b/g, '')
                .replace(/\s+/g, ' ')
                .trim();
              
              if (txDesc.length > 2) {
                transactions.push({
                  date: current.date,
                  description: txDesc.substring(0, 500),
                  amount: a.amount,
                  type: a.isNegative ? "expense" : "income",
                  raw_data: { source: "bradesco-pdf-multi" },
                });
                usedAmounts++;
              }
              break;
            }
          }
        }
      }
      
      // If we couldn't match markers, just create transactions for each amount
      if (usedAmounts === 0) {
        for (const a of amounts) {
          transactions.push({
            date: current.date,
            description: description.substring(0, 300) || "(Transação Bradesco)",
            amount: a.amount,
            type: a.isNegative ? "expense" : "income",
            raw_data: { source: "bradesco-pdf-fallback" },
          });
        }
      }
    }
  }
  
  console.log(`[parseBradescoText] Strategy A extracted: ${transactions.length} transactions`);
  
  // ============================================
  // STEP 5: If Strategy A found nothing, try Strategy B (generic regex scan)
  // ============================================
  
  if (transactions.length === 0) {
    console.log("[parseBradescoText] Strategy A failed, trying Strategy B (regex scan)");
    
    // Pattern: Look for date followed by optional text and amount
    const combinedPattern = /(\d{2})\/(\d{2})\/(\d{2,4})\s+([^-\d]*?)\s*(-?\s*)(\d{1,3}(?:\.\d{3})*,\d{2})/g;
    
    while ((match = combinedPattern.exec(cleanedText)) !== null) {
      const [, day, month, year, desc, neg, amt] = match;
      const fullYear = year.length === 2 ? `20${year}` : year;
      const dateStr = `${fullYear}-${month}-${day}`;
      
      // Validate date
      const dayNum = parseInt(day);
      const monthNum = parseInt(month);
      if (dayNum < 1 || dayNum > 31 || monthNum < 1 || monthNum > 12) continue;
      
      // Check period
      if (periodStart && periodEnd) {
        if (dateStr < periodStart || dateStr > periodEnd) continue;
      }
      
      const amount = parseBrazilianAmount(amt);
      if (!amount || amount < 0.01) continue;
      
      const description = desc.trim() || "(Transação Bradesco)";
      if (shouldSkip(description)) continue;
      
      transactions.push({
        date: dateStr,
        description: description.substring(0, 500),
        amount,
        type: neg.includes('-') ? "expense" : "income",
        raw_data: { source: "bradesco-pdf-strategyB" },
      });
    }
    
    console.log(`[parseBradescoText] Strategy B found: ${transactions.length} transactions`);
  }
  
  // ============================================
  // STEP 6: Deduplication by composite key
  // ============================================
  
  const normalizeForDedup = (d: string): string => {
    return d.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '')
      .substring(0, 20);
  };
  
  const seen = new Set<string>();
  const dedupedTxs: ParsedTransaction[] = [];
  
  for (const tx of transactions) {
    const key = `${tx.date}-${tx.amount.toFixed(2)}-${tx.type}-${normalizeForDedup(tx.description)}`;
    
    if (!seen.has(key)) {
      seen.add(key);
      dedupedTxs.push(tx);
    }
  }
  
  console.log(`[parseBradescoText] After deduplication: ${dedupedTxs.length} transactions`);
  
  // ============================================
  // STEP 7: Sort by date ascending
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

function parseXLSRows(rows: string[][], bank: DetectedBank): ParsedTransaction[] {
  if (rows.length === 0) return [];
  
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
  
  // Extract statement period from header
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
  
  // Collect transactions with carry-forward logic for multi-line descriptions
  interface BradescoTx {
    date: string;
    historico: string;
    docto: string;
    credit: number | null;
    debit: number | null;
  }
  
  const pendingTxs: BradescoTx[] = [];
  let currentDate: string | null = null;
  let currentTx: BradescoTx | null = null;
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < 2) continue;
    
    // Columns: Data | Histórico | Docto. | Crédito (R$) | Débito (R$) | Saldo (R$)
    const dateCell = (row[0] || "").toString().trim();
    const historico = (row[1] || "").toString().trim();
    const doctoCell = (row[2] || "").toString().trim();
    const creditCell = (row[3] || "").toString().trim();
    const debitCell = (row[4] || "").toString().trim();
    
    // Skip header rows
    if (/^data$/i.test(dateCell) && /histórico/i.test(historico)) continue;
    
    // Skip noise rows
    if (/últimos\s*lançamentos/i.test(historico)) break; // Stop at "Últimos Lançamentos"
    if (/saldos?\s*invest/i.test(historico)) continue;
    if (/^saldo\s*anterior$/i.test(historico)) continue;
    if (/^\s*total\s*$/i.test(historico)) continue;
    if (/telefones?\s*úteis/i.test(historico)) continue;
    if (/dados\s*acima\s*têm/i.test(historico)) continue;
    
    // Check for date in first column (DD/MM/YY format)
    const parsedDate = parseFlexibleDate(dateCell);
    
    if (parsedDate) {
      // New date row - finalize previous transaction
      if (currentTx) {
        pendingTxs.push(currentTx);
      }
      
      // Check if date is within period
      if (periodStart && periodEnd) {
        if (parsedDate < periodStart || parsedDate > periodEnd) {
          // Skip SALDO ANTERIOR (usually before period)
          currentTx = null;
          currentDate = null;
          continue;
        }
      }
      
      currentDate = parsedDate;
      
      // Skip "SALDO ANTERIOR" row even if within date range
      if (/saldo\s*anterior/i.test(historico)) {
        currentTx = null;
        continue;
      }
      
      // Parse credit and debit
      let credit: number | null = null;
      let debit: number | null = null;
      
      if (creditCell) {
        const val = parseBrazilianAmount(creditCell);
        if (val !== null && val > 0) credit = val;
      }
      if (debitCell) {
        const val = parseBrazilianAmount(debitCell);
        if (val !== null) debit = Math.abs(val);
      }
      
      // Create new transaction
      currentTx = {
        date: currentDate,
        historico,
        docto: doctoCell,
        credit,
        debit,
      };
      
    } else if (currentDate && dateCell === "" && historico) {
      // Continuation row (Rem:/Des: or extra description)
      if (currentTx) {
        // Append to current transaction description
        if (historico.startsWith("Rem:") || historico.startsWith("Des:") || 
            historico.startsWith("Contr ") || historico.startsWith("Encargo") ||
            historico.startsWith("Amortiz")) {
          currentTx.historico += ` | ${historico}`;
        }
      }
    }
  }
  
  // Don't forget the last transaction
  if (currentTx) {
    pendingTxs.push(currentTx);
  }
  
  console.log(`[parseBradescoXLSRows] Found ${pendingTxs.length} pending transactions`);
  
  // Convert to ParsedTransaction format
  for (const tx of pendingTxs) {
    const amount = tx.credit ?? tx.debit;
    if (!amount || amount < 0.01) continue;
    
    transactions.push({
      date: tx.date,
      description: tx.historico.substring(0, 500),
      amount,
      type: tx.credit ? "income" : "expense",
      raw_data: { source: "bradesco_xls", docto: tx.docto },
    });
  }
  
  console.log(`[parseBradescoXLSRows] Final count: ${transactions.length} transactions`);
  
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

// ============================================
// ACCOUNT INFO EXTRACTION
// ============================================

function extractAccountInfo(content: string): { agency?: string; accountNumber?: string } {
  const result: { agency?: string; accountNumber?: string } = {};
  
  // Bradesco: "Ag: 1472 | Conta: 134020-4"
  const bradescoMatch = content.match(/ag[:\s]*(\d{4,5})\s*\|\s*conta[:\s]*([\d\-]+)/i);
  if (bradescoMatch) {
    result.agency = bradescoMatch[1];
    result.accountNumber = bradescoMatch[2];
    return result;
  }
  
  // Santander: "Agência e Conta: 1772 / 01003626-3"
  const santanderMatch = content.match(/ag[eê]ncia\s+e\s+conta[:\s]*(\d{4,5})\s*\/\s*([\d\-\.]+)/i);
  if (santanderMatch) {
    result.agency = santanderMatch[1];
    result.accountNumber = santanderMatch[2];
    return result;
  }
  
  // Itaú: "agência: 0414 conta: 02939-7"
  const itauMatch = content.match(/ag[eê]ncia[:\s]*(\d{4,5})[\s\S]{0,20}conta[:\s]*([\d\-]+)/i);
  if (itauMatch) {
    result.agency = itauMatch[1];
    result.accountNumber = itauMatch[2];
    return result;
  }
  
  // Generic
  const agencyMatch = content.match(/ag[eê]ncia[:\s]*(\d{4,5})/i);
  if (agencyMatch) result.agency = agencyMatch[1];
  
  const accountMatch = content.match(/conta[:\s]*([\d\-]{5,15})/i);
  if (accountMatch) result.accountNumber = accountMatch[1];
  
  return result;
}

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
    let import_type: string;
    let source_id: string;
    let invoice_month: string | undefined;
    let file_name = `import_${Date.now()}`;
    let fileBytes: Uint8Array | null = null;
    let fileContent = "";

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        import_type = formData.get("importType") as string || "";
        source_id = formData.get("sourceId") as string || "";
        invoice_month = formData.get("invoiceMonth") as string || undefined;

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

    if (!file_type || !import_type || !source_id) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`Processing ${file_type} file for ${import_type}, source: ${source_id}`);

    let transactions: ParsedTransaction[] = [];
    let detectedBankName: string | null = null;
    let detectedBank: DetectedBank = "unknown";

    // Parse based on file type
    if (file_type === "ofx") {
      transactions = parseOFX(fileContent);
      detectedBankName = "OFX Import";
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
      const rawText = rows.map(r => r.join(" ")).join("\n");
      const detection = detectBank(rawText);
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
      
      const text = extractPDFTextRobust(binaryString);
      console.log(`[PDF] Extracted text length: ${text.length} chars`);
      
      // Log first 500 chars for debugging (no sensitive data)
      if (text.length > 0) {
        console.log(`[PDF] Text preview (first 500): ${text.substring(0, 500).replace(/\s+/g, ' ')}`);
      }
      
      if (text.length < 50) {
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
      const detection = detectBank(text);
      detectedBank = detection.bank;
      detectedBankName = detection.displayName;
      
      console.log(`[PDF] Detected bank: ${detectedBankName}`);
      
      transactions = parseTextContent(text, detectedBank);
      console.log(`[PDF] Final transaction count: ${transactions.length}`);
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

    return new Response(JSON.stringify({
      success: true,
      import_id: importId,
      transactions_count: itemsPersistedCount,
    } as ProcessResponse), {
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
