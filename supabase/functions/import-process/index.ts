import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.90.1";

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

interface ProcessRequest {
  file_content: string;
  file_type: "ofx" | "xlsx" | "pdf";
  import_type: "bank_statement" | "credit_card_invoice";
  source_id: string;
  invoice_month?: string;
  password?: string;
  auto_password?: boolean;
  cpf?: string;
  birth_date?: string;
}

interface ProcessResponse {
  success: boolean;
  import_id?: string;
  transactions_count?: number;
  needs_password?: boolean;
  error?: string;
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
  exclusionPatterns?: RegExp[];
}

const BANK_FINGERPRINTS: BankFingerprint[] = [
  {
    name: "bradesco",
    displayName: "Bradesco",
    identifiers: ["bradesco internet banking", "banco bradesco", "bradesco s.a"],
    headerPatterns: [
      /bradesco\s+internet\s+banking/i,
      /extrato\s+de:\s+ag:\s*\d+/i,
      /ag:\s*\d+\s*\|\s*conta:\s*[\d\-]+/i,
    ],
  },
  {
    name: "btg",
    displayName: "BTG Pactual",
    identifiers: ["btg pactual", "eqi investimentos", "banco btg"],
    headerPatterns: [
      /btg\s*pactual/i,
      /extrato\s+de\s+conta\s+corrente.*btg/i,
      /este\s+é\s+o\s+extrato\s+da\s+sua\s+conta\s+corrente\s+btg/i,
      /eqi\s+investimentos/i,
    ],
  },
  {
    name: "itau",
    displayName: "Itaú",
    identifiers: ["itau", "itaú", "personnalit", "itau unibanco"],
    headerPatterns: [
      /itaú?\s*unibanco/i,
      /personnalit/i,
      /extrato\s+conta\s+corrente.*itau/i,
      /banco\s+itau/i,
    ],
    exclusionPatterns: [/itau\s+black/i, /itauportosegur/i],
  },
  {
    name: "santander",
    displayName: "Santander",
    identifiers: ["santander", "banco santander"],
    headerPatterns: [
      /extrato\s+de\s+conta\s+corrente.*santander/i,
      /internet\s+banking.*santander/i,
      /banco\s+santander/i,
      /santander\s+brasil/i,
    ],
  },
  {
    name: "nubank",
    displayName: "Nubank",
    identifiers: ["nubank", "nu pagamentos", "nu financeira"],
    headerPatterns: [/nu\s*pagamentos/i, /nubank/i],
  },
  {
    name: "inter",
    displayName: "Banco Inter",
    identifiers: ["banco inter", "intermedium"],
    headerPatterns: [/banco\s+inter/i, /intermedium/i],
  },
  {
    name: "c6",
    displayName: "C6 Bank",
    identifiers: ["c6 bank", "c6bank"],
    headerPatterns: [/c6\s*bank/i],
  },
  {
    name: "bb",
    displayName: "Banco do Brasil",
    identifiers: ["banco do brasil", "bb s.a"],
    headerPatterns: [/banco\s+do\s+brasil/i],
  },
  {
    name: "caixa",
    displayName: "Caixa Econômica Federal",
    identifiers: ["caixa economica", "caixa federal", "cef"],
    headerPatterns: [/caixa\s+econ[oô]mica/i],
  },
];

function detectBank(content: string): { bank: DetectedBank; displayName: string } {
  const lowerContent = content.toLowerCase();
  const first5000 = content.substring(0, 5000);
  
  for (const fp of BANK_FINGERPRINTS) {
    // Check header patterns first (highest priority, at beginning of document)
    for (const pattern of fp.headerPatterns) {
      if (pattern.test(first5000)) {
        // Check exclusions
        if (fp.exclusionPatterns?.some(ex => ex.test(content))) {
          continue;
        }
        console.log(`Bank detected via header pattern: ${fp.displayName}`);
        return { bank: fp.name, displayName: fp.displayName };
      }
    }
    
    // Check identifiers
    for (const id of fp.identifiers) {
      const idIndex = lowerContent.indexOf(id.toLowerCase());
      if (idIndex !== -1 && idIndex < 3000) {
        // Verify it's not in a transaction context
        const context = lowerContent.substring(Math.max(0, idIndex - 30), idIndex + id.length + 30);
        const isTransaction = /pix|ted|pagamento|boleto|saude|seguro|débito|credito/i.test(context);
        if (!isTransaction) {
          console.log(`Bank detected via identifier: ${fp.displayName}`);
          return { bank: fp.name, displayName: fp.displayName };
        }
      }
    }
  }
  
  return { bank: "unknown", displayName: "Banco não identificado" };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function parseFlexibleDate(dateStr: string): string | null {
  if (!dateStr) return null;
  
  const normalized = dateStr.trim().toLowerCase();
  
  // Format: DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY or DD/MM/YY
  const slashMatch = normalized.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.]?(\d{2,4})?$/);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    let fullYear = year || new Date().getFullYear().toString();
    if (fullYear.length === 2) {
      fullYear = parseInt(fullYear) > 50 ? `19${fullYear}` : `20${fullYear}`;
    }
    
    const dayNum = parseInt(day);
    const monthNum = parseInt(month);
    
    if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12) {
      return `${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
  }
  
  // Format: DD MMM (YYYY optional)
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
  /^total/i,
  /^lançamentos\s*futuros/i,
  /^posição\s*consolidada/i,
  /^limites?$/i,
  /telefones?\s+úteis/i,
  /ouvidoria/i,
  /^s\.?a\.?$/i,
  /cnpj/i,
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
// BANK-SPECIFIC PARSERS (PDF)
// ============================================

/**
 * BRADESCO PDF Parser
 * Format: Data | Histórico | Docto | Crédito (R$) | Débito (R$) | Saldo (R$)
 * Multi-line transactions with "Rem:" or "Des:" continuations
 */
function parseBradescoPDF(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const lines = text.split(/\n/);
  
  let currentTx: { date: string; description: string; docto?: string; credit?: number; debit?: number } | null = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || isNoiseLine(line)) continue;
    
    // Check for date at start of line (DD/MM/YY format)
    const dateMatch = line.match(/^(\d{2}\/\d{2}\/\d{2})\s+(.+)/);
    
    if (dateMatch) {
      // Save previous transaction if exists
      if (currentTx) {
        const amount = currentTx.credit ?? currentTx.debit ?? 0;
        if (amount > 0) {
          transactions.push({
            date: currentTx.date,
            description: currentTx.description.trim().substring(0, 500),
            amount,
            type: currentTx.credit ? "income" : "expense",
            raw_data: { source: "bradesco_pdf", docto: currentTx.docto },
          });
        }
      }
      
      const date = parseFlexibleDate(dateMatch[1]);
      if (!date) continue;
      
      const rest = dateMatch[2];
      
      // Parse the rest: Histórico | Docto | Crédito | Débito | Saldo
      // Look for amounts (Brazilian format with dots and commas)
      const amountPattern = /(-?\s?\d{1,3}(?:\.\d{3})*,\d{2})/g;
      const amounts = [...rest.matchAll(amountPattern)].map(m => parseBrazilianAmount(m[1]));
      
      // Extract description (text before first number)
      const descMatch = rest.match(/^([A-Za-zÀ-ÿ\s\*\.\-]+?)(?:\s+\d|$)/);
      const description = descMatch ? descMatch[1].trim() : rest.split(/\s+\d/)[0].trim();
      
      // Extract docto (usually a number sequence after description)
      const doctoMatch = rest.match(/\s(\d{6,})\s/);
      const docto = doctoMatch ? doctoMatch[1] : undefined;
      
      // Determine credit vs debit from amounts
      let credit: number | undefined;
      let debit: number | undefined;
      
      // In Bradesco, negative amounts in Débito column are debits
      for (const amt of amounts) {
        if (amt !== null && Math.abs(amt) > 0.01) {
          if (amt < 0) {
            debit = Math.abs(amt);
          } else if (!credit) {
            credit = amt;
          }
        }
      }
      
      currentTx = { date, description, docto, credit, debit };
    } else if (currentTx) {
      // Check for continuation lines (Rem: or Des:)
      const remMatch = line.match(/^Rem:\s*(.+)/i);
      const desMatch = line.match(/^Des:\s*(.+)/i);
      const contrMatch = line.match(/^Contr\s+(.+)/i);
      const encargoMatch = line.match(/^Encargo\s*[-–]\s*(.+)/i);
      
      if (remMatch) {
        currentTx.description += ` | Rem: ${remMatch[1]}`;
      } else if (desMatch) {
        currentTx.description += ` | Des: ${desMatch[1]}`;
      } else if (contrMatch) {
        currentTx.description += ` | ${contrMatch[1]}`;
      } else if (encargoMatch) {
        currentTx.description += ` (${encargoMatch[1]})`;
      }
    }
  }
  
  // Don't forget the last transaction
  if (currentTx) {
    const amount = currentTx.credit ?? currentTx.debit ?? 0;
    if (amount > 0) {
      transactions.push({
        date: currentTx.date,
        description: currentTx.description.trim().substring(0, 500),
        amount,
        type: currentTx.credit ? "income" : "expense",
        raw_data: { source: "bradesco_pdf", docto: currentTx.docto },
      });
    }
  }
  
  return transactions;
}

/**
 * BTG PDF Parser
 * Format: Data e hora | Categoria | Transação | Descrição | Valor
 * Filter out "Saldo Diário" lines
 */
function parseBtgPDF(text: string): ParsedTransaction[] {
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
        raw_data: { source: "btg_pdf" },
      });
    }
  }
  
  return transactions;
}

/**
 * ITAÚ PDF Parser
 * Format: data | lançamentos | valor (R$) | saldo (R$)
 * Filter out "SALDO TOTAL DISPONÍVEL DIA" lines
 */
function parseItauPDF(text: string): ParsedTransaction[] {
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
      
      // Extract amounts (negative or positive, Brazilian format)
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
        raw_data: { source: "itau_pdf" },
      });
    }
  }
  
  return transactions;
}

/**
 * SANTANDER PDF Parser
 * Format: Data | Descrição | Docto | Situação | Crédito (R$) | Débito (R$) | Saldo (R$)
 */
function parseSantanderPDF(text: string): ParsedTransaction[] {
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
      
      // Look for amounts (Brazilian format, possibly negative)
      const amountPattern = /(-?\d{1,3}(?:\.\d{3})*,\d{2})/g;
      const amounts = [...rest.matchAll(amountPattern)]
        .map(m => parseBrazilianAmount(m[1]))
        .filter(a => a !== null && Math.abs(a!) > 0.01) as number[];
      
      if (amounts.length === 0) continue;
      
      // Santander: negative in Débito, positive in Crédito
      // We need to identify credit vs debit by the column position or sign
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
        raw_data: { source: "santander_pdf" },
      });
    }
  }
  
  return transactions;
}

// ============================================
// BANK-SPECIFIC PARSERS (XLS/XLSX)
// ============================================

/**
 * BRADESCO XLS Parser
 * Uses table format with columns: Data | Histórico | Docto. | Crédito (R$) | Débito (R$) | Saldo (R$)
 */
function parseBradescoXLS(rows: string[][]): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  
  let currentTx: { date: string; description: string; credit?: number; debit?: number } | null = null;
  
  for (const row of rows) {
    if (row.length < 2) continue;
    
    const firstCell = (row[0] || "").trim();
    const secondCell = (row[1] || "").trim();
    
    // Skip noise
    if (isNoiseLine(firstCell) || isNoiseLine(secondCell)) continue;
    
    // Check if first cell is a date (DD/MM/YY)
    const date = parseFlexibleDate(firstCell);
    
    if (date) {
      // Save previous transaction
      if (currentTx) {
        const amount = currentTx.credit ?? currentTx.debit ?? 0;
        if (amount > 0.01) {
          transactions.push({
            date: currentTx.date,
            description: currentTx.description.trim().substring(0, 500),
            amount,
            type: currentTx.credit ? "income" : "expense",
            raw_data: { source: "bradesco_xls" },
          });
        }
      }
      
      const description = secondCell;
      
      // Parse credit/debit from remaining columns
      let credit: number | undefined;
      let debit: number | undefined;
      
      for (let i = 2; i < row.length; i++) {
        const val = parseBrazilianAmount(row[i]);
        if (val !== null && Math.abs(val) > 0.01) {
          if (val < 0) {
            debit = Math.abs(val);
          } else if (!credit) {
            credit = val;
          }
        }
      }
      
      currentTx = { date, description, credit, debit };
    } else if (currentTx && firstCell === "") {
      // Continuation line (Rem: or Des:)
      if (secondCell.startsWith("Rem:") || secondCell.startsWith("Des:") || secondCell.startsWith("Contr")) {
        currentTx.description += ` | ${secondCell}`;
      }
    }
  }
  
  // Last transaction
  if (currentTx) {
    const amount = currentTx.credit ?? currentTx.debit ?? 0;
    if (amount > 0.01) {
      transactions.push({
        date: currentTx.date,
        description: currentTx.description.trim().substring(0, 500),
        amount,
        type: currentTx.credit ? "income" : "expense",
        raw_data: { source: "bradesco_xls" },
      });
    }
  }
  
  return transactions;
}

/**
 * BTG XLS Parser
 * Columns: Data e hora | Categoria | Transação | Descrição | Valor
 */
function parseBtgXLS(rows: string[][]): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  
  for (const row of rows) {
    if (row.length < 5) continue;
    
    const dateTimeCell = (row[0] || "").trim();
    const categoria = (row[1] || "").trim();
    const transacao = (row[2] || "").trim();
    const descricao = (row[3] || "").trim();
    const valorCell = (row[4] || row[row.length - 1] || "").trim();
    
    // Skip "Saldo Diário" and noise
    if (/saldo\s*di[aá]rio/i.test(descricao) || /saldo\s*di[aá]rio/i.test(transacao)) continue;
    if (isNoiseLine(dateTimeCell)) continue;
    
    // Parse date (DD/MM/YYYY HH:MM or DD/MM/YYYY)
    const dateMatch = dateTimeCell.match(/(\d{2}\/\d{2}\/\d{4})/);
    if (!dateMatch) continue;
    
    const date = parseFlexibleDate(dateMatch[1]);
    if (!date) continue;
    
    const amount = parseBrazilianAmount(valorCell);
    if (amount === null || Math.abs(amount) < 0.01) continue;
    
    // Build description
    let description = [transacao, descricao].filter(Boolean).join(" - ");
    if (categoria && !description.includes(categoria)) {
      description = `[${categoria}] ${description}`;
    }
    
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

/**
 * ITAÚ XLS Parser
 * Columns: data | lançamento | ag./origem | valor (R$) | saldos (R$)
 */
function parseItauXLS(rows: string[][]): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  
  for (const row of rows) {
    if (row.length < 4) continue;
    
    const dateCell = (row[0] || "").trim();
    const lancamento = (row[1] || "").trim();
    const valorCell = (row[3] || row[2] || "").trim();
    
    // Skip balance and noise lines
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

/**
 * SANTANDER XLS Parser
 * Columns: Data | Descrição | Docto | Situação | Crédito (R$) | Débito (R$) | Saldo (R$)
 */
function parseSantanderXLS(rows: string[][]): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  
  for (const row of rows) {
    if (row.length < 5) continue;
    
    const dateCell = (row[0] || "").trim();
    const descricao = (row[1] || "").trim();
    
    if (isNoiseLine(descricao)) continue;
    
    const date = parseFlexibleDate(dateCell);
    if (!date) continue;
    
    // Find credit and debit values
    let credit: number | undefined;
    let debit: number | undefined;
    
    for (let i = 4; i < row.length; i++) {
      const val = parseBrazilianAmount(row[i]);
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

// ============================================
// GENERIC PARSERS (FALLBACK)
// ============================================

function parseGenericPDF(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const lines = text.split(/\n/);
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length < 8 || isNoiseLine(trimmed)) continue;
    
    // Try to find date at start
    const dateMatch = trimmed.match(/^(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]?\d{0,4})\s+(.+)/);
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
      raw_data: { source: "generic_pdf" },
    });
  }
  
  return transactions;
}

function parseGenericXLS(rows: string[][]): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  
  for (const row of rows) {
    if (row.length < 2) continue;
    
    let date: string | null = null;
    let description = "";
    let amount: number | null = null;
    
    for (const cell of row) {
      const trimmed = (cell || "").trim();
      if (!trimmed) continue;
      
      // Try date
      if (!date) {
        const parsed = parseFlexibleDate(trimmed);
        if (parsed) {
          date = parsed;
          continue;
        }
      }
      
      // Try amount
      if (amount === null) {
        const parsed = parseBrazilianAmount(trimmed);
        if (parsed !== null && Math.abs(parsed) > 0.01) {
          amount = parsed;
          continue;
        }
      }
      
      // Accumulate description
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
// PDF TEXT EXTRACTION
// ============================================

function extractPDFText(binaryContent: string): string {
  const textParts: string[] = [];
  
  // Method 1: Literal strings in parentheses
  const literalMatches = binaryContent.match(/\((?:[^()\\]|\\.)*\)/g) || [];
  for (const match of literalMatches) {
    const decoded = decodePDFLiteralString(match.slice(1, -1));
    if (decoded.length > 1 && /[a-zA-Z0-9]/.test(decoded)) {
      textParts.push(decoded);
    }
  }
  
  // Method 2: Tj operator
  const tjMatches = binaryContent.match(/\((?:[^()\\]|\\.)*\)\s*Tj/gi) || [];
  for (const tj of tjMatches) {
    const textMatch = tj.match(/\(((?:[^()\\]|\\.)*)\)/);
    if (textMatch) {
      const decoded = decodePDFLiteralString(textMatch[1]);
      textParts.push(decoded);
    }
  }
  
  // Method 3: TJ arrays
  const tjArrays = binaryContent.match(/\[((?:\([^)]*\)|[^\]])*)\]\s*TJ/gi) || [];
  for (const tjArr of tjArrays) {
    const innerStrings = tjArr.match(/\((?:[^()\\]|\\.)*\)/g) || [];
    const combined = innerStrings.map(s => decodePDFLiteralString(s.slice(1, -1))).join("");
    if (combined.length > 0) {
      textParts.push(combined);
    }
  }
  
  // Method 4: Hex strings
  const hexMatches = binaryContent.match(/<[0-9A-Fa-f\s]+>/g) || [];
  for (const hex of hexMatches) {
    const decoded = decodeHexString(hex.slice(1, -1));
    if (decoded.length > 1 && /[a-zA-Z0-9]/.test(decoded)) {
      textParts.push(decoded);
    }
  }
  
  return textParts
    .join(" ")
    .replace(/\s+/g, " ")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, " ")
    .trim();
}

function decodePDFLiteralString(str: string): string {
  return str
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\")
    .replace(/\\(\d{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)));
}

function decodeHexString(hex: string): string {
  const clean = hex.replace(/\s/g, "");
  let result = "";
  for (let i = 0; i < clean.length; i += 2) {
    const charCode = parseInt(clean.substring(i, i + 2), 16);
    if (charCode >= 32 && charCode <= 126) {
      result += String.fromCharCode(charCode);
    }
  }
  return result;
}

// ============================================
// XLS/XLSX PARSING
// ============================================

function parseXLSX(content: string, _password?: string): { transactions: ParsedTransaction[]; needsPassword?: boolean; rows: string[][] } {
  try {
    const binaryContent = atob(content);
    
    // Check for encryption
    const isEncrypted = binaryContent.includes("EncryptedPackage") || 
                        binaryContent.includes("StrongEncryptionDataSpace");
    
    if (isEncrypted) {
      return { transactions: [], needsPassword: true, rows: [] };
    }
    
    // Extract rows from XLS/XLSX
    const rows = extractXLSRows(binaryContent);
    
    return { transactions: [], rows };
  } catch (e) {
    console.error("Error parsing XLSX:", e);
    return { transactions: [], rows: [] };
  }
}

function extractXLSRows(binaryContent: string): string[][] {
  const rows: string[][] = [];
  
  // Try XML extraction first (for modern xlsx)
  const sharedStrings = extractSharedStrings(binaryContent);
  const xmlRows = extractRowsFromXML(binaryContent, sharedStrings);
  if (xmlRows.length > 0) {
    return xmlRows;
  }
  
  // Fallback: extract readable text and split by common patterns
  const readableText = extractReadableText(binaryContent);
  const lines = readableText.split(/[\n\r]+/).filter(l => l.trim().length > 0);
  
  for (const line of lines) {
    const cells = line.split(/\||\t/).map(c => c.trim()).filter(c => c.length > 0);
    if (cells.length >= 2) {
      rows.push(cells);
    }
  }
  
  return rows;
}

function extractSharedStrings(content: string): string[] {
  const strings: string[] = [];
  
  // Look for shared strings in xlsx format
  const siPattern = /<si><t[^>]*>([^<]*)<\/t><\/si>/gi;
  let match;
  while ((match = siPattern.exec(content)) !== null) {
    strings.push(match[1]);
  }
  
  // Also try simple <t> tags
  const tPattern = /<t[^>]*>([^<]+)<\/t>/gi;
  while ((match = tPattern.exec(content)) !== null) {
    if (!strings.includes(match[1])) {
      strings.push(match[1]);
    }
  }
  
  return strings;
}

function extractRowsFromXML(content: string, sharedStrings: string[]): string[][] {
  const rows: string[][] = [];
  
  const rowPattern = /<row[^>]*>([\s\S]*?)<\/row>/gi;
  let rowMatch;
  
  while ((rowMatch = rowPattern.exec(content)) !== null) {
    const rowContent = rowMatch[1];
    const cells: string[] = [];
    
    const cellPattern = /<c\s+[^>]*(?:t="([^"]*)")?[^>]*>(?:[\s\S]*?<v>([^<]+)<\/v>)?[\s\S]*?<\/c>/gi;
    let cellMatch;
    
    while ((cellMatch = cellPattern.exec(rowContent)) !== null) {
      const cellType = cellMatch[1] || "";
      let cellValue = cellMatch[2] || "";
      
      if (cellType === "s" && sharedStrings.length > 0) {
        const index = parseInt(cellValue);
        if (!isNaN(index) && index < sharedStrings.length) {
          cellValue = sharedStrings[index];
        }
      }
      
      cells.push(cellValue);
    }
    
    if (cells.length > 0) {
      rows.push(cells);
    }
  }
  
  return rows;
}

function extractReadableText(binaryContent: string): string {
  const parts: string[] = [];
  let currentWord = "";
  
  for (let i = 0; i < binaryContent.length; i++) {
    const charCode = binaryContent.charCodeAt(i);
    
    // Printable ASCII and extended Latin
    if ((charCode >= 32 && charCode <= 126) || (charCode >= 160 && charCode <= 255)) {
      currentWord += binaryContent[i];
    } else if (currentWord.length > 0) {
      if (currentWord.length >= 2 && /[a-zA-Z0-9]/.test(currentWord)) {
        parts.push(currentWord.trim());
      }
      currentWord = "";
    }
  }
  
  if (currentWord.length >= 2 && /[a-zA-Z0-9]/.test(currentWord)) {
    parts.push(currentWord.trim());
  }
  
  return parts.join(" ");
}

// ============================================
// PDF PARSING (MAIN)
// ============================================

function parsePDF(content: string, _password?: string): { transactions: ParsedTransaction[]; needsPassword?: boolean } {
  try {
    const binaryContent = atob(content);
    
    // Check for encryption
    const isEncrypted = binaryContent.includes("/Encrypt") && 
                        !binaryContent.includes("/Encrypt <<>>") &&
                        !binaryContent.includes("/Encrypt<<>>");
    
    if (isEncrypted) {
      return { transactions: [], needsPassword: true };
    }
    
    // Extract text
    const text = extractPDFText(binaryContent);
    console.log(`Extracted PDF text: ${text.length} chars`);
    
    if (text.length < 50) {
      console.log("PDF text too short, possibly scanned");
      return { transactions: [] };
    }
    
    // Detect bank
    const { bank, displayName } = detectBank(text);
    console.log(`Detected bank: ${displayName}`);
    
    // Use bank-specific parser
    let transactions: ParsedTransaction[] = [];
    
    switch (bank) {
      case "bradesco":
        transactions = parseBradescoPDF(text);
        break;
      case "btg":
        transactions = parseBtgPDF(text);
        break;
      case "itau":
        transactions = parseItauPDF(text);
        break;
      case "santander":
        transactions = parseSantanderPDF(text);
        break;
      default:
        transactions = parseGenericPDF(text);
    }
    
    console.log(`Bank-specific parser found ${transactions.length} transactions`);
    
    // Fallback to generic if bank-specific found nothing
    if (transactions.length === 0 && bank !== "unknown") {
      transactions = parseGenericPDF(text);
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
    
    return { transactions: unique };
  } catch (e) {
    console.error("Error parsing PDF:", e);
    return { transactions: [] };
  }
}

// ============================================
// XLS PARSING (MAIN)
// ============================================

function parseXLS(content: string): { transactions: ParsedTransaction[]; needsPassword?: boolean } {
  const { transactions: _, needsPassword, rows } = parseXLSX(content);
  
  if (needsPassword) {
    return { transactions: [], needsPassword: true };
  }
  
  if (rows.length === 0) {
    return { transactions: [] };
  }
  
  // Get raw text for bank detection
  const rawText = rows.map(r => r.join(" ")).join("\n");
  const { bank, displayName } = detectBank(rawText);
  console.log(`XLS detected bank: ${displayName}`);
  
  let transactions: ParsedTransaction[] = [];
  
  switch (bank) {
    case "bradesco":
      transactions = parseBradescoXLS(rows);
      break;
    case "btg":
      transactions = parseBtgXLS(rows);
      break;
    case "itau":
      transactions = parseItauXLS(rows);
      break;
    case "santander":
      transactions = parseSantanderXLS(rows);
      break;
    default:
      transactions = parseGenericXLS(rows);
  }
  
  console.log(`XLS parser found ${transactions.length} transactions`);
  
  // Fallback
  if (transactions.length === 0 && bank !== "unknown") {
    transactions = parseGenericXLS(rows);
  }
  
  // Deduplicate
  const seen = new Set<string>();
  const unique = transactions.filter(tx => {
    const key = `${tx.date}_${tx.amount.toFixed(2)}_${tx.description.substring(0, 20)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  
  return { transactions: unique };
}

// ============================================
// ACCOUNT INFO EXTRACTION
// ============================================

function extractAccountInfo(content: string): { agency?: string; accountNumber?: string; last4?: string } {
  const result: { agency?: string; accountNumber?: string; last4?: string } = {};
  
  // Bradesco: "Ag: 1472 | Conta: 134020-4"
  const bradescoMatch = content.match(/ag[:\s]*(\d{4,5})\s*\|\s*conta[:\s]*([\d\-]+)/i);
  if (bradescoMatch) {
    result.agency = bradescoMatch[1];
    result.accountNumber = bradescoMatch[2];
  }
  
  // Santander: "Agência e Conta: 1772 / 01003626-3"
  const santanderMatch = content.match(/ag[eê]ncia\s+e\s+conta[:\s]*(\d{4,5})\s*\/\s*([\d\-\.]+)/i);
  if (santanderMatch) {
    result.agency = santanderMatch[1];
    result.accountNumber = santanderMatch[2];
  }
  
  // Itaú: "agência: 0414 conta: 02939-7"
  const itauMatch = content.match(/ag[eê]ncia[:\s]*(\d{4,5})[\s\S]{0,20}conta[:\s]*([\d\-]+)/i);
  if (itauMatch) {
    result.agency = itauMatch[1];
    result.accountNumber = itauMatch[2];
  }
  
  // BTG: "Agência: 20 Conta: 168546-5"
  const btgMatch = content.match(/ag[eê]ncia[:\s]*(\d{2,5})[\s\S]{0,30}conta[:\s]*([\d\-]+)/i);
  if (btgMatch) {
    result.agency = btgMatch[1];
    result.accountNumber = btgMatch[2];
  }
  
  // Generic agency pattern
  if (!result.agency) {
    const agencyMatch = content.match(/ag[eê]ncia[:\s]*(\d{4,5})/i);
    if (agencyMatch) result.agency = agencyMatch[1];
  }
  
  // Generic account pattern
  if (!result.accountNumber) {
    const accountMatch = content.match(/conta[:\s]*([\d\-]{5,15})/i);
    if (accountMatch) result.accountNumber = accountMatch[1];
  }
  
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
    keywords: ["mercado", "supermercado", "carrefour", "extra", "pao de acucar", "atacadao", "assai", "dia", "makro"],
  },
  transport: {
    category: "transporte",
    keywords: ["uber", "99", "cabify", "posto", "combustivel", "gasolina", "estacionamento", "ipva", "detran", "pedagio"],
  },
  health: {
    category: "saude",
    keywords: ["farmacia", "drogaria", "hospital", "medico", "clinica", "laboratorio", "droga", "raia", "ultrafarma"],
  },
  utilities: {
    category: "moradia",
    keywords: ["luz", "energia", "agua", "gas", "internet", "telefone", "celular", "cpfl", "cemig", "enel", "vivo", "claro", "tim", "oi"],
  },
  education: {
    category: "educacao",
    keywords: ["escola", "faculdade", "curso", "livro", "papelaria", "universidade"],
  },
  entertainment: {
    category: "lazer",
    keywords: ["netflix", "spotify", "cinema", "teatro", "show", "ingresso", "prime video", "disney", "hbo", "globoplay"],
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
      passwords.push(cleanCpf);
      passwords.push(cleanCpf.substring(2));
      passwords.push(cleanCpf.substring(5));
      passwords.push(cleanCpf.substring(0, 6));
      passwords.push(cleanCpf.substring(0, 4));
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
    let file_content: string;
    let file_type: "ofx" | "xlsx" | "pdf";
    let import_type: string;
    let source_id: string;
    let invoice_month: string | undefined;
    let password: string | undefined;
    let auto_password = true;
    let file_name = `import_${Date.now()}`;

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        import_type = formData.get("importType") as string || "";
        source_id = formData.get("sourceId") as string || "";
        invoice_month = formData.get("invoiceMonth") as string || undefined;
        password = formData.get("password") as string || undefined;

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
        const uint8Array = new Uint8Array(arrayBuffer);

        if (file_type === "ofx") {
          const decoder = new TextDecoder("utf-8");
          file_content = decoder.decode(uint8Array);
        } else {
          let binary = "";
          for (let i = 0; i < uint8Array.length; i++) {
            binary += String.fromCharCode(uint8Array[i]);
          }
          file_content = btoa(binary);
        }
      } catch (e) {
        console.error("Error parsing FormData:", e);
        return new Response(JSON.stringify({ error: "Failed to parse file upload" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    } else {
      try {
        const body: ProcessRequest = await req.json();
        file_content = body.file_content;
        file_type = body.file_type;
        import_type = body.import_type;
        source_id = body.source_id;
        invoice_month = body.invoice_month;
        password = body.password;
        auto_password = body.auto_password ?? true;
      } catch {
        return new Response(JSON.stringify({ error: "Invalid request body" }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }
    }

    if (!file_content || !file_type || !import_type || !source_id) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`Processing ${file_type} file for ${import_type}, source: ${source_id}`);

    let transactions: ParsedTransaction[] = [];
    let needsPassword = false;
    let detectedBankName: string | null = null;

    // Parse based on file type
    if (file_type === "ofx") {
      transactions = parseOFX(file_content);
    } else if (file_type === "xlsx") {
      // Try auto-password first
      if (auto_password && !password) {
        const passwordAttempts = generatePasswordAttempts(userCpf, userBirthDate);
        for (const attempt of passwordAttempts) {
          const result = parseXLS(file_content);
          if (!result.needsPassword && result.transactions.length > 0) {
            transactions = result.transactions;
            break;
          }
        }
      }
      
      if (transactions.length === 0) {
        const result = parseXLS(file_content);
        if (result.needsPassword) {
          needsPassword = true;
        } else {
          transactions = result.transactions;
        }
      }
      
      // Detect bank from content
      const binaryContent = atob(file_content);
      const { displayName } = detectBank(binaryContent);
      detectedBankName = displayName;
    } else if (file_type === "pdf") {
      // Try auto-password first
      if (auto_password && !password) {
        const passwordAttempts = generatePasswordAttempts(userCpf, userBirthDate);
        for (const attempt of passwordAttempts) {
          const result = parsePDF(file_content, attempt);
          if (!result.needsPassword && result.transactions.length > 0) {
            transactions = result.transactions;
            break;
          }
        }
      }
      
      if (transactions.length === 0) {
        const result = parsePDF(file_content, password);
        if (result.needsPassword) {
          needsPassword = true;
        } else {
          transactions = result.transactions;
        }
      }
      
      // Detect bank from content
      const binaryContent = atob(file_content);
      const { displayName } = detectBank(extractPDFText(binaryContent));
      detectedBankName = displayName;
    }

    if (needsPassword) {
      return new Response(JSON.stringify({ 
        success: false, 
        needs_password: true,
        error: "File is password protected" 
      } as ProcessResponse), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (transactions.length === 0) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: "Não foi possível extrair transações deste arquivo. Verifique se o formato é compatível ou tente exportar o extrato em OFX." 
      } as ProcessResponse), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`Parsed ${transactions.length} transactions`);

    // Detect document type and account info
    let detectedDocType: string | null = null;
    let detectedInfo: { agency?: string; accountNumber?: string; last4?: string } = {};

    if (file_type === "xlsx" || file_type === "pdf") {
      const contentForDetection = atob(file_content).substring(0, 50000);
      detectedInfo = extractAccountInfo(contentForDetection);
      
      const contentLower = contentForDetection.toLowerCase();
      if (contentLower.includes("fatura") || contentLower.includes("cartão de crédito") || 
          contentLower.includes("limite disponível") || contentLower.includes("pagamento mínimo")) {
        detectedDocType = "credit_card";
      } else if (contentLower.includes("extrato") || contentLower.includes("conta corrente") || 
                 contentLower.includes("agência") || contentLower.includes("saldo")) {
        detectedDocType = "bank_statement";
      }
    }

    // Create import record
    const importId = crypto.randomUUID();
    
    const { error: importError } = await adminClient.from("imports").insert({
      id: importId,
      family_id: familyId,
      file_name,
      file_type,
      import_type: detectedDocType || import_type,
      source_id,
      invoice_month: invoice_month || null,
      status: "reviewing",
      transactions_count: transactions.length,
      created_by: userData.user.id,
      detected_bank: detectedBankName,
      detected_document_type: detectedDocType,
    });

    if (importError) {
      console.error("Error creating import record:", importError);
      return new Response(JSON.stringify({ error: "Failed to create import record" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Save detected source info for user confirmation
    if (detectedBankName && detectedBankName !== "Banco não identificado") {
      const sourceType = detectedDocType === "credit_card" ? "credit_card" : "bank_account";
      
      const { error: sourceError } = await adminClient.from("import_detected_sources").insert({
        family_id: familyId,
        import_id: importId,
        source_type: sourceType,
        detected_bank_name: detectedBankName,
        detected_agency: detectedInfo.agency || null,
        detected_account_number: detectedInfo.accountNumber || null,
        detected_last4: detectedInfo.last4 || null,
        status: "pending",
      });
      if (sourceError) console.log("Detected source insert skipped:", sourceError.message);
    }

    // Get existing transactions for duplicate check
    const { data: existingTxs } = await adminClient
      .from("transactions")
      .select("id, date, amount, description")
      .eq("family_id", familyId)
      .eq("source_id", source_id);

    const existingHashes = new Set(
      (existingTxs || []).map((tx: { date: string; amount: number; description: string }) => 
        generateTransactionHash({ date: tx.date, description: tx.description, amount: tx.amount, type: "expense" }, source_id)
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

    const { error: itemsError } = await adminClient
      .from("import_pending_transactions")
      .insert(pendingItems);

    if (itemsError) {
      console.error("Error inserting pending transactions:", itemsError);
      // Update import status to failed
      await adminClient.from("imports").update({ status: "failed", error_message: "Failed to save transactions" }).eq("id", importId);
      return new Response(JSON.stringify({ error: "Failed to save transactions" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`Import ${importId} created with ${transactions.length} transactions`);

    return new Response(JSON.stringify({
      success: true,
      import_id: importId,
      transactions_count: transactions.length,
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
