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

// ============================================
// BRAZILIAN BANK PATTERNS (25+ Banks)
// ============================================

interface BankPattern {
  name: string;
  identifiers: string[];
  datePatterns: RegExp[];
  amountPatterns: RegExp[];
  linePattern?: RegExp;
  creditIndicators?: string[];
  debitIndicators?: string[];
}

const BRAZILIAN_BANK_PATTERNS: BankPattern[] = [
  // === BANCOS DIGITAIS ===
  {
    name: "Nubank",
    identifiers: ["nubank", "nu pagamentos", "nu financeira", "nu s.a"],
    datePatterns: [
      /(\d{2})\s+(?:jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)/gi,
      /(\d{2})\/(\d{2})(?:\/(\d{2,4}))?/g,
    ],
    amountPatterns: [
      /R\$\s*-?\s*([\d.,]+)/gi,
      /(-?\d{1,3}(?:\.\d{3})*,\d{2})\s*$/gm,
    ],
    linePattern: /(\d{2}\s+(?:JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ))\s+(.+?)\s+(R\$\s*-?\s*[\d.,]+|\d{1,3}(?:\.\d{3})*,\d{2})/gi,
    creditIndicators: ["pagamento recebido", "pix recebido", "ted recebida", "estorno", "cashback"],
    debitIndicators: ["compra", "pagamento", "pix enviado", "transferência"],
  },
  {
    name: "Banco Inter",
    identifiers: ["banco inter", "inter s.a", "intermedium"],
    datePatterns: [/(\d{2})\/(\d{2})(?:\/(\d{4}))?/g],
    amountPatterns: [/R\$\s*-?\s*([\d.,]+)/gi, /(-?\d{1,3}(?:\.\d{3})*,\d{2})/gm],
    linePattern: /(\d{2}\/\d{2}\/?\d{0,4})\s+(.+?)\s+(R\$\s*-?\s*[\d.,]+|\d{1,3}(?:\.\d{3})*,\d{2})/gi,
    creditIndicators: ["recebido", "pix in", "credito", "deposito", "ted in"],
    debitIndicators: ["pago", "pix out", "debito", "pagamento"],
  },
  {
    name: "C6 Bank",
    identifiers: ["c6 bank", "c6bank", "c6 s.a"],
    datePatterns: [/(\d{2})\/(\d{2})(?:\/(\d{4}))?/g],
    amountPatterns: [/R\$\s*-?\s*([\d.,]+)/gi, /(-?\d{1,3}(?:\.\d{3})*,\d{2})/gm],
    linePattern: /(\d{2}\/\d{2}\/?\d{0,4})\s+(.+?)\s+(R\$\s*-?\s*[\d.,]+|\d{1,3}(?:\.\d{3})*,\d{2})/gi,
    creditIndicators: ["recebido", "credito", "deposito"],
    debitIndicators: ["pago", "debito", "pagamento"],
  },
  {
    name: "Neon",
    identifiers: ["neon", "banco neon", "neon pagamentos"],
    datePatterns: [/(\d{2})\/(\d{2})(?:\/(\d{4}))?/g],
    amountPatterns: [/R\$\s*-?\s*([\d.,]+)/gi, /(-?\d{1,3}(?:\.\d{3})*,\d{2})/gm],
    linePattern: /(\d{2}\/\d{2}\/?\d{0,4})\s+(.+?)\s+(R\$\s*-?\s*[\d.,]+|\d{1,3}(?:\.\d{3})*,\d{2})/gi,
    creditIndicators: ["recebido", "credito", "deposito", "pix recebido"],
    debitIndicators: ["pago", "debito", "pagamento", "pix enviado"],
  },
  {
    name: "Banco Original",
    identifiers: ["banco original", "original s.a"],
    datePatterns: [/(\d{2})\/(\d{2})(?:\/(\d{4}))?/g],
    amountPatterns: [/R\$\s*-?\s*([\d.,]+)/gi, /(-?\d{1,3}(?:\.\d{3})*,\d{2})/gm],
    linePattern: /(\d{2}\/\d{2}\/?\d{0,4})\s+(.+?)\s+(R\$\s*-?\s*[\d.,]+|\d{1,3}(?:\.\d{3})*,\d{2})/gi,
    creditIndicators: ["recebido", "credito", "deposito"],
    debitIndicators: ["pago", "debito", "pagamento"],
  },
  
  // === BANCOS TRADICIONAIS ===
  // ITAÚ - Real pattern from actual statement
  // Format: DD/MM/YYYY | DESCRIPTION | VALUE | SALDO
  // Credits have positive values, debits have negative values with minus sign
  {
    name: "Itaú",
    identifiers: ["itau", "itaú", "banco itau", "itaú unibanco", "itau unibanco", "personnalit"],
    datePatterns: [/(\d{2})\/(\d{2})\/(\d{4})/g],
    amountPatterns: [/(-?\d{1,3}(?:\.\d{3})*,\d{2})/gm],
    linePattern: /(\d{2}\/\d{2}\/\d{4})\s+([A-Z][A-Z\s\d\-\/]+?)\s+(-?\d{1,3}(?:\.\d{3})*,\d{2})/gi,
    creditIndicators: ["pix transf", "rend pago", "ted recebida"],
    debitIndicators: ["juros limite", "iof", "financ imobiliario", "itau black", "sisdeb", "pix qrs"],
  },
  // BRADESCO - Real pattern from actual statement
  // Has separate Crédito (R$) and Débito (R$) columns
  // Debits shown with negative sign in Débito column
  {
    name: "Bradesco",
    identifiers: ["bradesco", "banco bradesco", "bradesco internet banking"],
    datePatterns: [/(\d{2})\/(\d{2})\/(\d{2})/g],
    amountPatterns: [/(-?\s?\d{1,3}(?:\.\d{3})*,\d{2})/gm],
    linePattern: /(\d{2}\/\d{2}\/\d{2})\s+([A-Za-z][A-Za-z\s\*]+?)\s+(\d+)?\s*(-?\s?\d{1,3}(?:\.\d{3})*,\d{2})/gi,
    creditIndicators: ["transfe pix", "rem:"],
    debitIndicators: ["parc cred pess", "enc lim credito", "iof util limite", "gasto c credito", "apl.invest"],
  },
  {
    name: "Banco do Brasil",
    identifiers: ["banco do brasil", "bb", "banco brasil", "bb s.a"],
    datePatterns: [/(\d{2})\/(\d{2})(?:\/(\d{4}))?/g],
    amountPatterns: [/(-?\d{1,3}(?:\.\d{3})*,\d{2})/gm],
    linePattern: /(\d{2}\/\d{2}\/?\d{0,4})\s+(.+?)\s+(-?\d{1,3}(?:\.\d{3})*,\d{2})/gi,
    creditIndicators: ["c", "cred", "dep", "credito"],
    debitIndicators: ["d", "deb", "pag", "debito"],
  },
  // SANTANDER - Real pattern from actual statement
  // Has separate Crédito (R$) and Débito (R$) columns
  // Format: DD/MM/YYYY | Description | Docto | Situação | Crédito | Débito | Saldo
  {
    name: "Santander",
    identifiers: ["santander", "banco santander", "internet banking"],
    datePatterns: [/(\d{2})\/(\d{2})\/(\d{4})/g],
    amountPatterns: [/(-?\d{1,3}(?:\.\d{3})*,\d{2})/gm],
    linePattern: /(\d{2}\/\d{2}\/\d{4})\s+([A-Z][A-Z\s\d\*\/\-]+?)\s+(\d+)?\s*[A-Za-z]*\s*(-?\d{1,3}(?:\.\d{3})*,\d{2})?/gi,
    creditIndicators: ["pix recebido", "ted recebida", "credito"],
    debitIndicators: ["pix enviado", "pagamento cartao", "juros saldo", "iof", "tarifa", "pagamento de boleto"],
  },
  {
    name: "Caixa Econômica Federal",
    identifiers: ["caixa economica", "caixa federal", "cef", "caixa economica federal"],
    datePatterns: [/(\d{2})\/(\d{2})(?:\/(\d{4}))?/g],
    amountPatterns: [/(-?\d{1,3}(?:\.\d{3})*,\d{2})/gm],
    linePattern: /(\d{2}\/\d{2}\/?\d{0,4})\s+(.+?)\s+(-?\d{1,3}(?:\.\d{3})*,\d{2})/gi,
    creditIndicators: ["cred", "dep", "sal", "credito"],
    debitIndicators: ["deb", "pag", "saque", "debito"],
  },
  
  // === FINTECHS / CARTEIRAS DIGITAIS ===
  {
    name: "Mercado Pago",
    identifiers: ["mercado pago", "mercadopago", "mercado livre", "mercadolivre"],
    datePatterns: [/(\d{2})\/(\d{2})(?:\/(\d{4}))?/g],
    amountPatterns: [/R\$\s*-?\s*([\d.,]+)/gi, /(-?\d{1,3}(?:\.\d{3})*,\d{2})/gm],
    linePattern: /(\d{2}\/\d{2}\/?\d{0,4})\s+(.+?)\s+(R\$\s*-?\s*[\d.,]+|\d{1,3}(?:\.\d{3})*,\d{2})/gi,
    creditIndicators: ["recebido", "venda", "credito", "deposito", "transferencia recebida"],
    debitIndicators: ["pago", "compra", "debito", "saque", "transferencia enviada"],
  },
  {
    name: "PicPay",
    identifiers: ["picpay", "pic pay"],
    datePatterns: [/(\d{2})\/(\d{2})(?:\/(\d{4}))?/g],
    amountPatterns: [/R\$\s*-?\s*([\d.,]+)/gi, /(-?\d{1,3}(?:\.\d{3})*,\d{2})/gm],
    linePattern: /(\d{2}\/\d{2}\/?\d{0,4})\s+(.+?)\s+(R\$\s*-?\s*[\d.,]+|\d{1,3}(?:\.\d{3})*,\d{2})/gi,
    creditIndicators: ["recebido", "credito", "cashback", "pix recebido"],
    debitIndicators: ["pago", "debito", "pagamento", "pix enviado"],
  },
  {
    name: "PagBank/PagSeguro",
    identifiers: ["pagbank", "pagseguro", "pag seguro", "pag bank"],
    datePatterns: [/(\d{2})\/(\d{2})(?:\/(\d{4}))?/g],
    amountPatterns: [/R\$\s*-?\s*([\d.,]+)/gi, /(-?\d{1,3}(?:\.\d{3})*,\d{2})/gm],
    linePattern: /(\d{2}\/\d{2}\/?\d{0,4})\s+(.+?)\s+(R\$\s*-?\s*[\d.,]+|\d{1,3}(?:\.\d{3})*,\d{2})/gi,
    creditIndicators: ["recebido", "venda", "credito"],
    debitIndicators: ["pago", "compra", "debito", "saque"],
  },
  {
    name: "Ame Digital",
    identifiers: ["ame digital", "ame"],
    datePatterns: [/(\d{2})\/(\d{2})(?:\/(\d{4}))?/g],
    amountPatterns: [/R\$\s*-?\s*([\d.,]+)/gi, /(-?\d{1,3}(?:\.\d{3})*,\d{2})/gm],
    linePattern: /(\d{2}\/\d{2}\/?\d{0,4})\s+(.+?)\s+(R\$\s*-?\s*[\d.,]+|\d{1,3}(?:\.\d{3})*,\d{2})/gi,
    creditIndicators: ["recebido", "credito", "cashback"],
    debitIndicators: ["pago", "debito", "pagamento"],
  },
  
  // === BANCOS MÉDIOS ===
  {
    name: "Banco PAN",
    identifiers: ["banco pan", "pan s.a", "panamericano"],
    datePatterns: [/(\d{2})\/(\d{2})(?:\/(\d{4}))?/g],
    amountPatterns: [/R\$\s*-?\s*([\d.,]+)/gi, /(-?\d{1,3}(?:\.\d{3})*,\d{2})/gm],
    linePattern: /(\d{2}\/\d{2}\/?\d{0,4})\s+(.+?)\s+(R\$\s*-?\s*[\d.,]+|\d{1,3}(?:\.\d{3})*,\d{2})/gi,
    creditIndicators: ["recebido", "credito", "deposito"],
    debitIndicators: ["pago", "debito", "pagamento"],
  },
  {
    name: "Banco BMG",
    identifiers: ["banco bmg", "bmg s.a", "bmg"],
    datePatterns: [/(\d{2})\/(\d{2})(?:\/(\d{4}))?/g],
    amountPatterns: [/R\$\s*-?\s*([\d.,]+)/gi, /(-?\d{1,3}(?:\.\d{3})*,\d{2})/gm],
    linePattern: /(\d{2}\/\d{2}\/?\d{0,4})\s+(.+?)\s+(R\$\s*-?\s*[\d.,]+|\d{1,3}(?:\.\d{3})*,\d{2})/gi,
    creditIndicators: ["recebido", "credito", "deposito"],
    debitIndicators: ["pago", "debito", "pagamento"],
  },
  {
    name: "Banco BV",
    identifiers: ["banco bv", "bv financeira", "banco votorantim"],
    datePatterns: [/(\d{2})\/(\d{2})(?:\/(\d{4}))?/g],
    amountPatterns: [/R\$\s*-?\s*([\d.,]+)/gi, /(-?\d{1,3}(?:\.\d{3})*,\d{2})/gm],
    linePattern: /(\d{2}\/\d{2}\/?\d{0,4})\s+(.+?)\s+(R\$\s*-?\s*[\d.,]+|\d{1,3}(?:\.\d{3})*,\d{2})/gi,
    creditIndicators: ["recebido", "credito", "deposito"],
    debitIndicators: ["pago", "debito", "pagamento"],
  },
  {
    name: "Banco Safra",
    identifiers: ["banco safra", "safra s.a"],
    datePatterns: [/(\d{2})\/(\d{2})(?:\/(\d{4}))?/g],
    amountPatterns: [/R\$\s*-?\s*([\d.,]+)/gi, /(-?\d{1,3}(?:\.\d{3})*,\d{2})/gm],
    linePattern: /(\d{2}\/\d{2}\/?\d{0,4})\s+(.+?)\s+(R\$\s*-?\s*[\d.,]+|\d{1,3}(?:\.\d{3})*,\d{2})/gi,
    creditIndicators: ["c", "credito", "deposito"],
    debitIndicators: ["d", "debito", "pagamento"],
  },
  // BTG PACTUAL - Real pattern from actual statement
  // Format: DD/MM/YYYY HHhMM | Categoria | Transação | Descrição | Valor (R$ or -R$)
  {
    name: "BTG Pactual",
    identifiers: ["btg pactual", "btg", "banco btg", "eqi investimentos"],
    datePatterns: [/(\d{2})\/(\d{2})\/(\d{4})/g],
    amountPatterns: [/(-?R\$\s*[\d.,]+)/gi, /(-?\d{1,3}(?:\.\d{3})*,\d{2})/gm],
    linePattern: /(\d{2}\/\d{2}\/\d{4})\s+\d{2}h\d{2}\s+([A-Za-zÀ-ÿ\s]+?)\s+([A-Za-zÀ-ÿ\s]+?)\s+([A-Za-zÀ-ÿ\s]+?)\s+(-?R\$\s*[\d.,]+)/gi,
    creditIndicators: ["pix recebido", "transferência recebida", "resgate de renda fixa"],
    debitIndicators: ["pix enviado", "pagamento de boleto", "juros", "iof", "encargos", "aplicação em renda fixa"],
  },
  
  // === COOPERATIVAS ===
  {
    name: "Sicredi",
    identifiers: ["sicredi", "banco sicredi"],
    datePatterns: [/(\d{2})\/(\d{2})(?:\/(\d{4}))?/g],
    amountPatterns: [/(-?\d{1,3}(?:\.\d{3})*,\d{2})/gm],
    linePattern: /(\d{2}\/\d{2}\/?\d{0,4})\s+(.+?)\s+(-?\d{1,3}(?:\.\d{3})*,\d{2})/gi,
    creditIndicators: ["c", "cred", "credito", "deposito"],
    debitIndicators: ["d", "deb", "debito", "pagamento"],
  },
  {
    name: "Sicoob",
    identifiers: ["sicoob", "banco sicoob"],
    datePatterns: [/(\d{2})\/(\d{2})(?:\/(\d{4}))?/g],
    amountPatterns: [/(-?\d{1,3}(?:\.\d{3})*,\d{2})/gm],
    linePattern: /(\d{2}\/\d{2}\/?\d{0,4})\s+(.+?)\s+(-?\d{1,3}(?:\.\d{3})*,\d{2})/gi,
    creditIndicators: ["c", "cred", "credito", "deposito"],
    debitIndicators: ["d", "deb", "debito", "pagamento"],
  },
  
  // === BANCOS REGIONAIS ===
  {
    name: "Banrisul",
    identifiers: ["banrisul", "banco banrisul", "banco do estado do rio grande do sul"],
    datePatterns: [/(\d{2})\/(\d{2})(?:\/(\d{4}))?/g],
    amountPatterns: [/(-?\d{1,3}(?:\.\d{3})*,\d{2})/gm],
    linePattern: /(\d{2}\/\d{2}\/?\d{0,4})\s+(.+?)\s+(-?\d{1,3}(?:\.\d{3})*,\d{2})/gi,
    creditIndicators: ["c", "cred", "credito", "deposito"],
    debitIndicators: ["d", "deb", "debito", "pagamento"],
  },
  {
    name: "Banco do Nordeste",
    identifiers: ["banco do nordeste", "bnb", "banco nordeste"],
    datePatterns: [/(\d{2})\/(\d{2})(?:\/(\d{4}))?/g],
    amountPatterns: [/(-?\d{1,3}(?:\.\d{3})*,\d{2})/gm],
    linePattern: /(\d{2}\/\d{2}\/?\d{0,4})\s+(.+?)\s+(-?\d{1,3}(?:\.\d{3})*,\d{2})/gi,
    creditIndicators: ["c", "cred", "credito", "deposito"],
    debitIndicators: ["d", "deb", "debito", "pagamento"],
  },
  {
    name: "Banco da Amazônia",
    identifiers: ["banco da amazonia", "basa", "banco amazonia"],
    datePatterns: [/(\d{2})\/(\d{2})(?:\/(\d{4}))?/g],
    amountPatterns: [/(-?\d{1,3}(?:\.\d{3})*,\d{2})/gm],
    linePattern: /(\d{2}\/\d{2}\/?\d{0,4})\s+(.+?)\s+(-?\d{1,3}(?:\.\d{3})*,\d{2})/gi,
    creditIndicators: ["c", "cred", "credito", "deposito"],
    debitIndicators: ["d", "deb", "debito", "pagamento"],
  },
  {
    name: "BRB",
    identifiers: ["brb", "banco de brasilia", "banco brb"],
    datePatterns: [/(\d{2})\/(\d{2})(?:\/(\d{4}))?/g],
    amountPatterns: [/(-?\d{1,3}(?:\.\d{3})*,\d{2})/gm],
    linePattern: /(\d{2}\/\d{2}\/?\d{0,4})\s+(.+?)\s+(-?\d{1,3}(?:\.\d{3})*,\d{2})/gi,
    creditIndicators: ["c", "cred", "credito", "deposito"],
    debitIndicators: ["d", "deb", "debito", "pagamento"],
  },
];

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
// OFX PARSER
// ============================================

function parseOFX(content: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  
  // Normalize content - handle different encodings and line endings
  const normalizedContent = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  
  // Try to find transaction blocks (STMTTRN for bank, CCSTMTTRN for credit card)
  const transactionRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
  const ccTransactionRegex = /<CCSTMTTRN>([\s\S]*?)<\/CCSTMTTRN>/gi;
  
  // Also handle OFX 1.x without closing tags
  const ofx1TransactionRegex = /<STMTTRN>([\s\S]*?)(?=<STMTTRN>|<\/STMTTRN>|<\/BANKTRANLIST>|<\/CCSTMTTRNRS>|$)/gi;
  
  // Collect all transaction blocks
  const matches1 = normalizedContent.match(transactionRegex) || [];
  const matches2 = normalizedContent.match(ccTransactionRegex) || [];
  const matches3 = normalizedContent.match(ofx1TransactionRegex) || [];
  
  // Merge all matches
  let allMatches: string[] = [...matches1, ...matches2];
  
  // If no matches with closing tags, try OFX 1.x format
  if (allMatches.length === 0) {
    allMatches = [...matches3];
  }
  
  for (const block of allMatches) {
    try {
      // Extract fields using regex for both OFX 1.x and 2.x formats
      const getField = (name: string): string | null => {
        // Try XML format first: <NAME>value</NAME>
        const xmlMatch = block.match(new RegExp(`<${name}>([^<]+)<\/${name}>`, "i"));
        if (xmlMatch) return xmlMatch[1].trim();
        
        // Try SGML format: <NAME>value\n
        const sgmlMatch = block.match(new RegExp(`<${name}>([^\n<]+)`, "i"));
        if (sgmlMatch) return sgmlMatch[1].trim();
        
        return null;
      };
      
      const dtPosted = getField("DTPOSTED");
      const trnAmt = getField("TRNAMT");
      const memo = getField("MEMO") || getField("NAME") || "";
      const fitid = getField("FITID") || undefined;
      
      if (!dtPosted || !trnAmt) continue;
      
      // Parse date (format: YYYYMMDDHHMMSS or YYYYMMDD)
      const year = dtPosted.substring(0, 4);
      const month = dtPosted.substring(4, 6);
      const day = dtPosted.substring(6, 8);
      const dateStr = `${year}-${month}-${day}`;
      
      // Parse amount
      const amount = parseFloat(trnAmt.replace(",", "."));
      if (isNaN(amount)) continue;
      
      transactions.push({
        date: dateStr,
        description: memo.substring(0, 500), // Limit description length
        amount: Math.abs(amount),
        type: amount >= 0 ? "income" : "expense",
        fitid,
        raw_data: { dtPosted, trnAmt, memo, fitid },
      });
    } catch (e) {
      console.error("Error parsing OFX transaction block:", e);
    }
  }
  
  return transactions;
}

// ============================================
// XLSX PARSER (Enhanced for Brazilian Banks)
// ============================================

function parseXLSX(content: string, password?: string): { transactions: ParsedTransaction[]; needsPassword?: boolean } {
  try {
    // Decode base64 content
    const binaryContent = atob(content);
    
    // Check for encryption marker
    const isEncrypted = binaryContent.includes("EncryptedPackage") || 
                        binaryContent.includes("StrongEncryptionDataSpace");
    
    if (isEncrypted && !password) {
      return { transactions: [], needsPassword: true };
    }
    
    const transactions: ParsedTransaction[] = [];
    const seenHashes = new Set<string>();
    
    // Extract shared strings from XLSX
    const sharedStrings = extractSharedStrings(binaryContent);
    console.log(`Extracted ${sharedStrings.length} shared strings from XLSX`);
    
    // Try to detect bank from content
    const detectedBank = detectBankFromContent(binaryContent + " " + sharedStrings.join(" "));
    console.log(`Detected bank: ${detectedBank?.name || "Unknown"}`);
    
    // Method 1: Parse using structured XML cells
    const xmlTransactions = parseXLSXFromXML(binaryContent, sharedStrings, detectedBank);
    transactions.push(...xmlTransactions);
    
    // Method 2: If no results, try pattern-based extraction
    if (transactions.length === 0) {
      const patternTransactions = parseXLSXByPatterns(binaryContent + " " + sharedStrings.join("\n"), detectedBank);
      transactions.push(...patternTransactions);
    }
    
    // Deduplicate
    const uniqueTransactions = transactions.filter(tx => {
      const hash = `${tx.date}_${tx.amount}_${tx.description.substring(0, 20)}`;
      if (seenHashes.has(hash)) return false;
      seenHashes.add(hash);
      return true;
    });
    
    console.log(`Parsed ${uniqueTransactions.length} transactions from XLSX`);
    return { transactions: uniqueTransactions };
  } catch (e) {
    console.error("Error parsing XLSX:", e);
    return { transactions: [] };
  }
}

function extractSharedStrings(content: string): string[] {
  const strings: string[] = [];
  
  // Look for shared strings table (sharedStrings.xml inside the xlsx zip)
  const siPattern = /<si[^>]*>[\s\S]*?<t[^>]*>([^<]+)<\/t>[\s\S]*?<\/si>/gi;
  let match;
  
  while ((match = siPattern.exec(content)) !== null) {
    strings.push(match[1].trim());
  }
  
  // Also extract direct text content
  const tPattern = /<t[^>]*>([^<]+)<\/t>/gi;
  while ((match = tPattern.exec(content)) !== null) {
    const text = match[1].trim();
    if (text.length > 0 && !strings.includes(text)) {
      strings.push(text);
    }
  }
  
  return strings;
}

function parseXLSXFromXML(content: string, sharedStrings: string[], detectedBank: BankPattern | null): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  
  // Look for rows in the sheet
  const rowPattern = /<row[^>]*>([\s\S]*?)<\/row>/gi;
  let rowMatch;
  
  while ((rowMatch = rowPattern.exec(content)) !== null) {
    const rowContent = rowMatch[1];
    
    // Extract all cells from the row
    const cellPattern = /<c\s+[^>]*r="([A-Z]+\d+)"[^>]*(?:t="([^"]*)")?[^>]*>[\s\S]*?<v>([^<]+)<\/v>[\s\S]*?<\/c>/gi;
    const cells: { col: string; type: string; value: string }[] = [];
    let cellMatch;
    
    while ((cellMatch = cellPattern.exec(rowContent)) !== null) {
      const colRef = cellMatch[1].replace(/\d+/g, "");
      const cellType = cellMatch[2] || "";
      let cellValue = cellMatch[3];
      
      // If type is 's' (shared string), look up the value
      if (cellType === "s") {
        const index = parseInt(cellValue);
        if (!isNaN(index) && index < sharedStrings.length) {
          cellValue = sharedStrings[index];
        }
      }
      
      cells.push({ col: colRef, type: cellType, value: cellValue });
    }
    
    if (cells.length < 2) continue;
    
    // Try to identify date, description, and amount columns
    let date: string | null = null;
    let description = "";
    let amount: number | null = null;
    let isCredit = false;
    
    for (const cell of cells) {
      const value = cell.value;
      
      // Check for Excel date (numeric, between 40000 and 50000)
      const numValue = parseFloat(value);
      if (!date && numValue > 40000 && numValue < 50000) {
        const excelDate = new Date((numValue - 25569) * 86400 * 1000);
        date = excelDate.toISOString().split("T")[0];
        continue;
      }
      
      // Check for date string
      if (!date) {
        const dateStr = parseFlexibleDate(value);
        if (dateStr) {
          date = dateStr;
          continue;
        }
      }
      
      // Check for amount (Brazilian format)
      if (amount === null) {
        const parsed = parseBrazilianAmount(value);
        if (parsed !== null && Math.abs(parsed) > 0.01) {
          amount = parsed;
          isCredit = parsed > 0;
          continue;
        }
      }
      
      // Collect description text
      if (value.length > 2 && !/^[\d.,\-R$\s]+$/.test(value)) {
        description += (description ? " " : "") + value;
      }
    }
    
    if (date && amount !== null && Math.abs(amount) > 0.01) {
      // Determine transaction type
      let type: "income" | "expense" = "expense";
      
      if (isCredit) {
        type = "income";
      } else if (detectedBank) {
        const descLower = description.toLowerCase();
        const isCreditByDesc = detectedBank.creditIndicators?.some(ind => descLower.includes(ind)) || false;
        if (isCreditByDesc) type = "income";
      }
      
      transactions.push({
        date,
        description: description.trim().substring(0, 500) || "Transação importada",
        amount: Math.abs(amount),
        type,
        raw_data: { source: "xlsx_xml", cells: cells.map(c => c.value) },
      });
    }
  }
  
  return transactions;
}

function parseXLSXByPatterns(text: string, detectedBank: BankPattern | null): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const lines = text.split(/[\n\r]+/);
  
  for (const line of lines) {
    if (line.length < 10) continue;
    
    // Try to find date, description, and amount
    let date: string | null = null;
    let description = "";
    let amount: number | null = null;
    
    // Extract date
    const dateMatch = line.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.]?(\d{2,4})?/);
    if (dateMatch) {
      date = parseFlexibleDate(dateMatch[0]);
    }
    
    if (!date) continue;
    
    // Extract amount
    const amountPatterns = [
      /R\$\s*-?\s*([\d.,]+)/i,
      /(-?\d{1,3}(?:\.\d{3})*,\d{2})(?:\s|$)/,
      /(-?\d+,\d{2})(?:\s|$)/,
    ];
    
    for (const pattern of amountPatterns) {
      const amountMatch = line.match(pattern);
      if (amountMatch) {
        const parsed = parseBrazilianAmount(amountMatch[1] || amountMatch[0]);
        if (parsed !== null) {
          amount = parsed;
          break;
        }
      }
    }
    
    if (amount === null || Math.abs(amount) < 0.01) continue;
    
    // Extract description (text between date and amount, or other non-numeric text)
    const parts = line.split(/\s+/);
    const descParts: string[] = [];
    
    for (const part of parts) {
      // Skip date and amount parts
      if (/^\d{1,2}[\/\-\.]\d{1,2}/.test(part)) continue;
      if (/^-?\d{1,3}(?:[.,]\d{3})*[.,]\d{2}$/.test(part)) continue;
      if (/^R\$/.test(part)) continue;
      if (part.length > 1) {
        descParts.push(part);
      }
    }
    
    description = descParts.join(" ").trim();
    
    if (description.length < 2) {
      description = "Transação importada";
    }
    
    // Determine type
    let type: "income" | "expense" = "expense";
    const descLower = description.toLowerCase();
    
    if (amount > 0) {
      type = "income";
    } else if (detectedBank) {
      const isCreditByDesc = detectedBank.creditIndicators?.some(ind => descLower.includes(ind)) || false;
      if (isCreditByDesc) type = "income";
    }
    
    transactions.push({
      date,
      description: description.substring(0, 500),
      amount: Math.abs(amount),
      type,
      raw_data: { source: "xlsx_pattern", line: line.substring(0, 100) },
    });
  }
  
  return transactions;
}

// ============================================
// PDF PARSER (Enhanced for Brazilian Banks)
// ============================================

function parsePDF(content: string, password?: string): { transactions: ParsedTransaction[]; needsPassword?: boolean; confidence: "high" | "medium" | "low" } {
  try {
    // Decode base64 content
    const binaryContent = atob(content);
    
    // Check for encryption
    const isEncrypted = binaryContent.includes("/Encrypt") && 
                        !binaryContent.includes("/Encrypt <<>>") &&
                        !binaryContent.includes("/Encrypt<<>>");
    
    if (isEncrypted && !password) {
      return { transactions: [], needsPassword: true, confidence: "low" };
    }
    
    // Extract all text using multiple methods
    const extractedText = extractPDFTextEnhanced(binaryContent);
    console.log(`PDF text extraction: ${extractedText.length} characters`);
    
    // Detect bank from content
    const detectedBank = detectBankFromContent(extractedText);
    console.log(`Detected bank in PDF: ${detectedBank?.name || "Unknown"}`);
    
    if (extractedText.length < 50) {
      // Very little text - likely scanned/image PDF
      console.log("PDF appears to be scanned/image-based, using heuristic extraction");
      const ocrTransactions = extractTransactionsFromScannedPDF(binaryContent);
      return { 
        transactions: ocrTransactions, 
        confidence: "low" 
      };
    }
    
    // Parse using bank-specific patterns
    let transactions: ParsedTransaction[] = [];
    
    if (detectedBank) {
      transactions = parsePDFWithBankPattern(extractedText, detectedBank);
      console.log(`Bank-specific parsing found ${transactions.length} transactions`);
    }
    
    // Fallback to generic parsing if bank-specific found nothing
    if (transactions.length === 0) {
      transactions = parseTransactionsFromTextGeneric(extractedText);
      console.log(`Generic parsing found ${transactions.length} transactions`);
    }
    
    // Deduplicate
    const seenHashes = new Set<string>();
    const uniqueTransactions = transactions.filter(tx => {
      const hash = `${tx.date}_${tx.amount}_${tx.description.substring(0, 20)}`;
      if (seenHashes.has(hash)) return false;
      seenHashes.add(hash);
      return true;
    });
    
    const confidence = detectedBank && uniqueTransactions.length > 0 ? "medium" : 
                       uniqueTransactions.length > 0 ? "low" : "low";
    
    return { 
      transactions: uniqueTransactions, 
      confidence 
    };
  } catch (e) {
    console.error("Error parsing PDF:", e);
    return { transactions: [], confidence: "low" };
  }
}

// High-priority header identifiers that strongly indicate the source bank
// These should be found in headers, titles, or bank logos - NOT in transaction descriptions
const HEADER_PRIORITY_IDENTIFIERS: Record<string, string[]> = {
  "Itaú": ["itaú unibanco", "itau unibanco", "banco itau s.a", "itaú-unibanco", "personnalit"],
  "Bradesco": ["bradesco internet banking", "banco bradesco s.a", "agência bradesco"],
  "Santander": ["internet banking santander", "banco santander s.a", "santander brasil"],
  "Banco do Brasil": ["banco do brasil s.a", "agência bb", "bb internet"],
  "Caixa Econômica Federal": ["caixa economica federal", "cef internet", "caixa tem"],
  "Nubank": ["nu pagamentos", "nu financeira", "nu s.a"],
  "Banco Inter": ["banco inter s.a", "intermedium"],
  "BTG Pactual": ["btg pactual", "eqi investimentos", "banco btg"],
  "Sicredi": ["banco sicredi", "sicredi cooperativo"],
  "Sicoob": ["banco sicoob", "sicoob cooperativo"],
  "Mercado Pago": ["mercado pago", "mercadopago", "conta mercado pago"],
  "C6 Bank": ["c6 bank", "c6 s.a"],
  "PagBank/PagSeguro": ["pagbank", "pagseguro", "pag bank"],
  "PicPay": ["picpay", "pic pay servicos"],
  "Neon": ["banco neon", "neon pagamentos"],
};

// Words that indicate a mention is likely a transaction description, not a bank header
const TRANSACTION_DESCRIPTION_INDICATORS = [
  "pago", "paga", "pagamento", "debito", "débito",
  "saude", "saúde", "seguro", "seguros", 
  "convenio", "convênio", "boleto", "conta",
  "cartao", "cartão", "fatura", "parcela",
  "transferencia", "transferência", "pix", "ted", "doc",
  "compra", "assinatura", "mensalidade",
];

function detectBankFromContent(text: string): BankPattern | null {
  const lowerText = text.toLowerCase();
  
  // Calculate scores for each bank
  const scores: Array<{ pattern: BankPattern; score: number; matchType: string }> = [];
  
  for (const pattern of BRAZILIAN_BANK_PATTERNS) {
    let score = 0;
    let matchType = "none";
    
    // Phase 1: Check for high-priority header identifiers (strongest signal)
    const headerIds = HEADER_PRIORITY_IDENTIFIERS[pattern.name];
    if (headerIds) {
      for (const headerId of headerIds) {
        const headerLower = headerId.toLowerCase();
        const headerIndex = lowerText.indexOf(headerLower);
        
        if (headerIndex !== -1) {
          // Check if this appears early in the document (likely a header)
          const isNearStart = headerIndex < 2000;
          // Check if it's not in a transaction context
          const surroundingText = lowerText.substring(
            Math.max(0, headerIndex - 50),
            Math.min(lowerText.length, headerIndex + headerId.length + 50)
          );
          
          const isTransactionContext = TRANSACTION_DESCRIPTION_INDICATORS.some(
            ind => surroundingText.includes(ind)
          );
          
          if (!isTransactionContext) {
            score += isNearStart ? 100 : 50;
            matchType = "header";
          }
        }
      }
    }
    
    // Phase 2: Check regular identifiers with context analysis
    for (const identifier of pattern.identifiers) {
      const idLower = identifier.toLowerCase();
      let searchIndex = 0;
      
      while (true) {
        const foundIndex = lowerText.indexOf(idLower, searchIndex);
        if (foundIndex === -1) break;
        
        // Get surrounding context
        const contextStart = Math.max(0, foundIndex - 100);
        const contextEnd = Math.min(lowerText.length, foundIndex + identifier.length + 100);
        const context = lowerText.substring(contextStart, contextEnd);
        
        // Check if this looks like a transaction description
        const isTransactionContext = TRANSACTION_DESCRIPTION_INDICATORS.some(
          ind => context.includes(ind)
        );
        
        // Check if it's a brand/product mention (e.g., "Bradesco Saúde")
        const isBrandMention = /saude|saúde|seguros?|dental|vida|previdencia|previdência|capitaliza/i.test(context);
        
        if (isTransactionContext || isBrandMention) {
          // This is likely a transaction, not a bank identifier
          score += 1; // Minimal weight
        } else {
          // Check position in document
          const isEarlyInDoc = foundIndex < 3000;
          score += isEarlyInDoc ? 20 : 10;
          if (matchType === "none") matchType = "identifier";
        }
        
        searchIndex = foundIndex + 1;
      }
    }
    
    if (score > 0) {
      scores.push({ pattern, score, matchType });
    }
  }
  
  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);
  
  // Log detection results for debugging
  if (scores.length > 0) {
    console.log(`Bank detection scores: ${scores.slice(0, 3).map(s => `${s.pattern.name}=${s.score}(${s.matchType})`).join(", ")}`);
  }
  
  // Return the highest scoring bank if it has a meaningful score
  if (scores.length > 0 && scores[0].score >= 10) {
    return scores[0].pattern;
  }
  
  return null;
}

function parsePDFWithBankPattern(text: string, bank: BankPattern): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  
  // Normalize text
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  
  // Try bank-specific line pattern first
  if (bank.linePattern) {
    const matches = [...normalized.matchAll(new RegExp(bank.linePattern.source, "gim"))];
    
    for (const match of matches) {
      try {
        const [, dateStr, description, amountStr, indicator] = match;
        
        const date = parseFlexibleDate(dateStr);
        if (!date) continue;
        
        const amount = parseBrazilianAmount(amountStr);
        if (amount === null || Math.abs(amount) < 0.01) continue;
        
        // Determine type based on indicator or amount sign
        let type: "income" | "expense" = "expense";
        
        if (indicator) {
          const indicatorLower = indicator.toLowerCase();
          const isCreditByIndicator = bank.creditIndicators?.some(ind => indicatorLower.includes(ind)) || false;
          if (isCreditByIndicator) type = "income";
        } else if (amount > 0) {
          const descLower = description.toLowerCase();
          const isCreditByDesc = bank.creditIndicators?.some(ind => descLower.includes(ind)) || false;
          if (isCreditByDesc) type = "income";
        }
        
        transactions.push({
          date,
          description: description.trim().substring(0, 500),
          amount: Math.abs(amount),
          type,
          raw_data: { source: "pdf_bank_pattern", bank: bank.name, match: match[0].substring(0, 100) },
        });
      } catch (e) {
        // Skip malformed matches
      }
    }
  }
  
  // If line pattern didn't work, try generic extraction
  if (transactions.length === 0) {
    return parseTransactionsFromTextGeneric(text);
  }
  
  return transactions;
}

function parseTransactionsFromTextGeneric(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  
  // Normalize text
  const normalized = text.replace(/\s+/g, " ");
  const lines = text.split(/[\n\r]+/);
  
  // Process line by line
  for (const line of lines) {
    if (line.length < 10) continue;
    
    // Find date in line
    const datePatterns = [
      /(\d{2})[\/\-\.](\d{2})[\/\-\.](\d{2,4})/,
      /(\d{2})\s+(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)(?:\s+(\d{2,4}))?/i,
    ];
    
    let date: string | null = null;
    let dateEndPos = 0;
    
    for (const pattern of datePatterns) {
      const match = line.match(pattern);
      if (match) {
        date = parseFlexibleDate(match[0]);
        if (date) {
          dateEndPos = match.index! + match[0].length;
          break;
        }
      }
    }
    
    if (!date) continue;
    
    // Find amount in line (after date)
    const afterDate = line.substring(dateEndPos);
    const amountPatterns = [
      /R\$\s*-?\s*([\d.,]+)/i,
      /(-?\d{1,3}(?:\.\d{3})*,\d{2})(?:\s|$|C|D)/,
      /(-?\d+,\d{2})(?:\s|$)/,
    ];
    
    let amount: number | null = null;
    let amountPos = -1;
    
    for (const pattern of amountPatterns) {
      const match = afterDate.match(pattern);
      if (match) {
        const parsed = parseBrazilianAmount(match[1] || match[0]);
        if (parsed !== null && Math.abs(parsed) > 0.01) {
          amount = parsed;
          amountPos = match.index!;
          break;
        }
      }
    }
    
    if (amount === null) continue;
    
    // Extract description (between date and amount)
    let description = "";
    if (amountPos > 0) {
      description = afterDate.substring(0, amountPos).trim();
    }
    
    // Clean description
    description = description
      .replace(/^[\s\-:\.]+/, "")
      .replace(/[\s\-:\.]+$/, "")
      .replace(/\s+/g, " ")
      .trim();
    
    if (description.length < 2) {
      description = "Transação importada de PDF";
    }
    
    // Determine type - default to expense, positive amounts from context might be income
    let type: "income" | "expense" = "expense";
    const descLower = description.toLowerCase();
    
    const incomeKeywords = ["recebido", "deposito", "depósito", "salario", "salário", "ted cred", "pix rec", "pagamento recebido", "estorno"];
    if (incomeKeywords.some(kw => descLower.includes(kw))) {
      type = "income";
    }
    
    transactions.push({
      date,
      description: description.substring(0, 500),
      amount: Math.abs(amount),
      type,
      raw_data: { source: "pdf_generic", line: line.substring(0, 100) },
    });
  }
  
  return transactions;
}

// Enhanced PDF text extraction using multiple methods
function extractPDFTextEnhanced(binaryContent: string): string {
  const textParts: string[] = [];
  
  // Method 1: Extract text from parentheses (literal strings)
  const literalMatches = binaryContent.match(/\((?:[^()\\]|\\.)*\)/g) || [];
  for (const match of literalMatches) {
    const decoded = decodePDFLiteralString(match.slice(1, -1));
    if (decoded.length > 1 && /[a-zA-Z0-9]/.test(decoded)) {
      textParts.push(decoded);
    }
  }
  
  // Method 2: Extract from stream content (Tj and TJ operators)
  const streamRegex = /stream\s*([\s\S]*?)\s*endstream/gi;
  let streamMatch;
  while ((streamMatch = streamRegex.exec(binaryContent)) !== null) {
    const streamContent = streamMatch[1];
    
    // Extract Tj operator strings
    const tjMatches = streamContent.match(/\((?:[^()\\]|\\.)*\)\s*Tj/gi) || [];
    for (const tj of tjMatches) {
      const textMatch = tj.match(/\(((?:[^()\\]|\\.)*)\)/);
      if (textMatch) {
        const decoded = decodePDFLiteralString(textMatch[1]);
        textParts.push(decoded);
      }
    }
    
    // Extract TJ operator arrays (more complex text positioning)
    const tjArrays = streamContent.match(/\[((?:\([^)]*\)|[^\]])*)\]\s*TJ/gi) || [];
    for (const tjArr of tjArrays) {
      const innerStrings = tjArr.match(/\((?:[^()\\]|\\.)*\)/g) || [];
      const combined = innerStrings.map(s => decodePDFLiteralString(s.slice(1, -1))).join("");
      if (combined.length > 0) {
        textParts.push(combined);
      }
    }
  }
  
  // Method 3: Extract from BT...ET blocks (text blocks)
  const btBlocks = binaryContent.match(/BT\s*([\s\S]*?)\s*ET/gi) || [];
  for (const block of btBlocks) {
    const innerStrings = block.match(/\((?:[^()\\]|\\.)*\)/g) || [];
    for (const s of innerStrings) {
      const decoded = decodePDFLiteralString(s.slice(1, -1));
      if (decoded.length > 0) {
        textParts.push(decoded);
      }
    }
  }
  
  // Method 4: Extract hex strings
  const hexMatches = binaryContent.match(/<[0-9A-Fa-f\s]+>/g) || [];
  for (const hex of hexMatches) {
    const decoded = decodeHexString(hex.slice(1, -1));
    if (decoded.length > 1 && /[a-zA-Z0-9]/.test(decoded)) {
      textParts.push(decoded);
    }
  }
  
  // Combine and clean up
  return textParts
    .join(" ")
    .replace(/\s+/g, " ")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, " ")
    .trim();
}

// Decode PDF literal string escapes
function decodePDFLiteralString(str: string): string {
  return str
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\b/g, "\b")
    .replace(/\\f/g, "\f")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\")
    .replace(/\\(\d{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)));
}

// Decode hex string to text
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

// Extract transactions from scanned/image PDFs (OCR-like heuristics)
function extractTransactionsFromScannedPDF(binaryContent: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const seenHashes = new Set<string>();
  
  // Look for patterns that might have survived encoding
  const dateValuePattern = /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.]?(\d{2,4})?\s*[^\d]*?(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/g;
  
  let match;
  while ((match = dateValuePattern.exec(binaryContent)) !== null) {
    const [, day, month, year, valueStr] = match;
    
    const dayNum = parseInt(day);
    const monthNum = parseInt(month);
    
    if (dayNum < 1 || dayNum > 31 || monthNum < 1 || monthNum > 12) {
      continue;
    }
    
    const fullYear = year 
      ? (year.length === 2 ? `20${year}` : year)
      : new Date().getFullYear().toString();
    
    const isoDate = `${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    
    // Parse value
    const amount = parseBrazilianAmount(valueStr);
    if (amount === null || amount <= 0 || amount > 1000000) {
      continue;
    }
    
    const hash = `${isoDate}_${amount.toFixed(2)}`;
    if (seenHashes.has(hash)) {
      continue;
    }
    seenHashes.add(hash);
    
    transactions.push({
      date: isoDate,
      description: "Transação extraída de PDF (revisar)",
      amount,
      type: "expense",
      raw_data: { 
        source: "pdf_ocr_heuristic", 
        confidence: "low" 
      },
    });
  }
  
  return transactions;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function parseFlexibleDate(dateStr: string): string | null {
  if (!dateStr) return null;
  
  const normalized = dateStr.trim().toLowerCase();
  
  // Format: DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const slashMatch = normalized.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.]?(\d{2,4})?$/);
  if (slashMatch) {
    const [, day, month, year] = slashMatch;
    const fullYear = year 
      ? (year.length === 2 ? `20${year}` : year)
      : new Date().getFullYear().toString();
    
    const dayNum = parseInt(day);
    const monthNum = parseInt(month);
    
    if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12) {
      return `${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
  }
  
  // Format: DD MMM (YYYY optional) - e.g., "15 JAN" or "15 JAN 2024"
  const monthNameMatch = normalized.match(/^(\d{1,2})\s+(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)(?:\w*)?(?:\s+(\d{2,4}))?$/i);
  if (monthNameMatch) {
    const [, day, monthName, year] = monthNameMatch;
    const month = MONTH_MAP[monthName.toLowerCase().substring(0, 3)];
    
    if (month) {
      const fullYear = year 
        ? (year.length === 2 ? `20${year}` : year)
        : new Date().getFullYear().toString();
      
      return `${fullYear}-${month}-${day.padStart(2, "0")}`;
    }
  }
  
  return null;
}

function parseBrazilianAmount(amountStr: string): number | null {
  if (!amountStr) return null;
  
  // Remove R$ and whitespace
  let cleaned = amountStr
    .replace(/R\$/gi, "")
    .replace(/\s/g, "")
    .trim();
  
  // Handle Brazilian format: 1.234,56 -> 1234.56
  // Check if it's Brazilian format (has comma as decimal separator)
  if (cleaned.includes(",")) {
    // Remove thousand separators (dots) and convert decimal comma to dot
    cleaned = cleaned.replace(/\./g, "").replace(",", ".");
  }
  
  const amount = parseFloat(cleaned);
  
  if (isNaN(amount)) return null;
  return amount;
}

// ============================================
// PASSWORD GENERATION (Brazil-specific)
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
// DEDUPLICATION & CATEGORIZATION
// ============================================

function normalizeDescription(desc: string): string {
  return desc
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
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
  
  // First, check family-specific rules
  const { data: familyRules } = await adminClient
    .from("import_category_rules")
    .select("keyword, category_id, subcategory_id")
    .eq("family_id", familyId)
    .order("match_count", { ascending: false });
  
  if (familyRules && Array.isArray(familyRules)) {
    for (const rule of familyRules) {
      const ruleData = rule as { keyword: string; category_id: string; subcategory_id: string | null };
      const keyword = normalizeDescription(ruleData.keyword);
      if (normalizedDesc.includes(keyword)) {
        return {
          categoryId: ruleData.category_id,
          subcategoryId: ruleData.subcategory_id || undefined,
          confidence: 0.9,
        };
      }
    }
  }
  
  // Fall back to default keywords
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
  
  // Default: unknown category, needs review
  return {
    categoryId: "outros",
    confidence: 0.1,
  };
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

    // Get user's family
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

    // Parse request body
    let file_content: string;
    let file_type: "ofx" | "xlsx" | "pdf";
    let import_type: string;
    let source_id: string;
    let invoice_month: string | undefined;
    let password: string | undefined;
    let auto_password = true;

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

    // Parse based on file type
    if (file_type === "ofx") {
      transactions = parseOFX(file_content);
    } else if (file_type === "xlsx") {
      if (auto_password && !password) {
        const passwordAttempts = generatePasswordAttempts(userCpf, userBirthDate);
        
        for (const attempt of passwordAttempts) {
          const result = parseXLSX(file_content, attempt);
          if (!result.needsPassword && result.transactions.length > 0) {
            transactions = result.transactions;
            break;
          }
        }
        
        if (transactions.length === 0) {
          const result = parseXLSX(file_content);
          if (result.needsPassword) {
            needsPassword = true;
          } else {
            transactions = result.transactions;
          }
        }
      } else {
        const result = parseXLSX(file_content, password);
        if (result.needsPassword) {
          needsPassword = true;
        } else {
          transactions = result.transactions;
        }
      }
    } else if (file_type === "pdf") {
      if (auto_password && !password) {
        const passwordAttempts = generatePasswordAttempts(userCpf, userBirthDate);
        
        for (const attempt of passwordAttempts) {
          const result = parsePDF(file_content, attempt);
          if (!result.needsPassword && result.transactions.length > 0) {
            transactions = result.transactions;
            break;
          }
        }
        
        if (transactions.length === 0) {
          const result = parsePDF(file_content);
          if (result.needsPassword) {
            needsPassword = true;
          } else {
            transactions = result.transactions;
          }
        }
      } else {
        const result = parsePDF(file_content, password);
        if (result.needsPassword) {
          needsPassword = true;
        } else {
          transactions = result.transactions;
        }
      }
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

    // Create import record
    const importId = crypto.randomUUID();
    
    const { error: importError } = await adminClient.from("imports").insert({
      id: importId,
      family_id: familyId,
      file_name: `import_${Date.now()}.${file_type}`,
      file_type,
      import_type,
      source_id,
      invoice_month: invoice_month || null,
      status: "reviewing",
      transactions_count: transactions.length,
      created_by: userData.user.id,
    });

    if (importError) {
      console.error("Error creating import record:", importError);
      return new Response(JSON.stringify({ error: "Failed to create import record" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Check for duplicates and suggest categories
    const existingTransactions = await adminClient
      .from("transactions")
      .select("id, date, amount, description")
      .eq("family_id", familyId)
      .gte("date", transactions.reduce((min, t) => t.date < min ? t.date : min, transactions[0]?.date || ""))
      .lte("date", transactions.reduce((max, t) => t.date > max ? t.date : max, transactions[0]?.date || ""));

    const existingHashes = new Set<string>();
    if (existingTransactions.data) {
      for (const tx of existingTransactions.data) {
        const hash = generateTransactionHash({
          date: tx.date,
          amount: tx.amount,
          description: tx.description || "",
          type: "expense",
        }, source_id);
        existingHashes.add(hash);
      }
    }

    // Process and insert pending transactions
    const pendingTransactions = [];
    
    for (const tx of transactions) {
      const hash = generateTransactionHash(tx, source_id);
      
      let isDuplicate = existingHashes.has(hash);
      if (!isDuplicate && tx.fitid) {
        const { data: existingByFitid } = await adminClient
          .from("transactions")
          .select("id")
          .eq("family_id", familyId)
          .eq("source_ref_id", tx.fitid)
          .limit(1);
        isDuplicate = (existingByFitid?.length || 0) > 0;
      }

      const categoryResult = await suggestCategory(tx.description, familyId, adminClient);
      
      const needsReview = file_type === "pdf" || categoryResult.confidence < 0.5;

      pendingTransactions.push({
        import_id: importId,
        family_id: familyId,
        date: tx.date,
        description: tx.description,
        amount: tx.amount,
        type: tx.type,
        category_id: categoryResult.categoryId,
        subcategory_id: categoryResult.subcategoryId || null,
        suggested_category_id: categoryResult.categoryId,
        confidence_score: categoryResult.confidence,
        is_duplicate: isDuplicate,
        needs_review: needsReview,
        original_date: tx.date,
        raw_data: tx.raw_data || null,
      });
    }

    const { error: pendingError } = await adminClient
      .from("import_pending_transactions")
      .insert(pendingTransactions);

    if (pendingError) {
      console.error("Error inserting pending transactions:", pendingError);
      await adminClient.from("imports").delete().eq("id", importId);
      return new Response(JSON.stringify({ error: "Failed to process transactions" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`Created ${pendingTransactions.length} pending transactions for import ${importId}`);

    return new Response(JSON.stringify({
      success: true,
      import_id: importId,
      transactions_count: pendingTransactions.length,
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
