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
// XLSX PARSER (using base64 decode and simple parsing)
// ============================================

function parseXLSX(content: string, password?: string): { transactions: ParsedTransaction[]; needsPassword?: boolean } {
  // For encrypted files, we'd need a library that supports decryption
  // Since we're in Deno, we'll do basic parsing
  
  try {
    // Decode base64 content
    const binaryContent = atob(content);
    
    // Check for encryption marker (PK signature for zip + encryption flags)
    const isEncrypted = binaryContent.includes("EncryptedPackage") || 
                        binaryContent.includes("StrongEncryptionDataSpace");
    
    if (isEncrypted && !password) {
      return { transactions: [], needsPassword: true };
    }
    
    // For now, we'll extract what we can from the XML inside the xlsx
    // XLSX is a zip file containing XML files
    
    const transactions: ParsedTransaction[] = [];
    
    // Try to find shared strings and sheet data
    // This is a simplified parser - in production, use a proper library
    
    // Look for date, description, and amount patterns in the content
    const lines = binaryContent.split("\n");
    
    for (const line of lines) {
      // Try to extract structured data from XML cells
      const cellMatches = line.match(/<c[^>]*><v>([^<]+)<\/v><\/c>/g);
      if (cellMatches && cellMatches.length >= 3) {
        // Basic extraction attempt
        try {
          const values = cellMatches.map(m => {
            const match = m.match(/<v>([^<]+)<\/v>/);
            return match ? match[1] : "";
          });
          
          // Try to identify date, description, and amount columns
          // This is heuristic-based
          for (let i = 0; i < values.length - 2; i++) {
            const possibleDate = values[i];
            const possibleDesc = values[i + 1];
            const possibleAmount = values[i + 2];
            
            // Check if it looks like a date (Excel serial or ISO format)
            const dateNum = parseFloat(possibleDate);
            if (dateNum > 40000 && dateNum < 50000) {
              // Excel serial date
              const date = new Date((dateNum - 25569) * 86400 * 1000);
              const amount = parseFloat(possibleAmount.replace(",", "."));
              
              if (!isNaN(amount)) {
                transactions.push({
                  date: date.toISOString().split("T")[0],
                  description: possibleDesc.substring(0, 500),
                  amount: Math.abs(amount),
                  type: amount >= 0 ? "income" : "expense",
                });
              }
            }
          }
        } catch (e) {
          // Skip malformed rows
        }
      }
    }
    
    return { transactions };
  } catch (e) {
    console.error("Error parsing XLSX:", e);
    return { transactions: [] };
  }
}

// ============================================
// PDF PARSER (enhanced with OCR-like text extraction)
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
    
    console.log(`PDF text extraction: ${extractedText.length} characters extracted`);
    
    if (extractedText.length < 50) {
      // Very little text - likely scanned/image PDF
      console.log("PDF appears to be scanned/image-based, attempting pattern extraction");
      const ocrTransactions = extractTransactionsFromScannedPDF(binaryContent);
      return { 
        transactions: ocrTransactions, 
        confidence: "low" 
      };
    }
    
    // Parse the extracted text to find transactions
    const transactions = parseTransactionsFromText(extractedText);
    
    return { 
      transactions, 
      confidence: transactions.length > 0 ? "medium" : "low" 
    };
  } catch (e) {
    console.error("Error parsing PDF:", e);
    return { transactions: [], confidence: "low" };
  }
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
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, " ") // Keep printable chars
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

// Parse transactions from extracted text
function parseTransactionsFromText(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const seenHashes = new Set<string>();
  
  // Normalize text
  const normalized = text.replace(/\s+/g, " ");
  
  // Split into potential transaction lines
  // Look for date patterns as line starters
  const datePattern = /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.]?(\d{2,4})?/g;
  
  // Find all date occurrences
  let match;
  const datePositions: { date: string; isoDate: string; position: number }[] = [];
  
  while ((match = datePattern.exec(normalized)) !== null) {
    const [fullMatch, day, month, year] = match;
    const dayNum = parseInt(day);
    const monthNum = parseInt(month);
    
    // Validate date components
    if (dayNum >= 1 && dayNum <= 31 && monthNum >= 1 && monthNum <= 12) {
      const fullYear = year 
        ? (year.length === 2 ? `20${year}` : year)
        : new Date().getFullYear().toString();
      
      const isoDate = `${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
      datePositions.push({
        date: fullMatch,
        isoDate,
        position: match.index,
      });
    }
  }
  
  // For each date, extract the transaction info
  for (let i = 0; i < datePositions.length; i++) {
    const current = datePositions[i];
    const next = datePositions[i + 1];
    
    // Get text between this date and the next one
    const endPos = next ? next.position : Math.min(current.position + 300, normalized.length);
    const segment = normalized.substring(current.position, endPos);
    
    // Look for amount in segment
    // Brazilian format: 1.234,56 or R$ 1.234,56 or -1.234,56
    const amountPatterns = [
      /R\$\s*-?([\d.,]+)/i,
      /(-?\d{1,3}(?:\.\d{3})*,\d{2})/,
      /(-?\d+,\d{2})/,
    ];
    
    let amount: number | null = null;
    let amountStr = "";
    
    for (const pattern of amountPatterns) {
      const amountMatch = segment.match(pattern);
      if (amountMatch) {
        amountStr = amountMatch[1] || amountMatch[0];
        // Convert Brazilian format to number
        const cleaned = amountStr
          .replace(/[R$\s]/g, "")
          .replace(/\./g, "") // Remove thousand separators
          .replace(",", "."); // Decimal separator
        amount = parseFloat(cleaned);
        if (!isNaN(amount) && amount !== 0) {
          break;
        }
        amount = null;
      }
    }
    
    if (amount === null || Math.abs(amount) < 0.01) {
      continue;
    }
    
    // Extract description (text between date and amount)
    const dateEndPos = segment.indexOf(current.date) + current.date.length;
    const amountStartPos = segment.indexOf(amountStr);
    let description = "";
    
    if (amountStartPos > dateEndPos) {
      description = segment.substring(dateEndPos, amountStartPos).trim();
    } else {
      // Amount before description - try to get text after amount
      description = segment.substring(amountStartPos + amountStr.length).trim();
    }
    
    // Clean description
    description = description
      .replace(/^[\s\-:]+/, "") // Remove leading separators
      .replace(/[\s\-:]+$/, "") // Remove trailing separators
      .replace(/\s+/g, " ")
      .substring(0, 200);
    
    if (description.length < 3) {
      description = "Transação importada de PDF";
    }
    
    // Deduplicate
    const hash = `${current.isoDate}_${Math.abs(amount).toFixed(2)}_${description.substring(0, 20)}`;
    if (seenHashes.has(hash)) {
      continue;
    }
    seenHashes.add(hash);
    
    transactions.push({
      date: current.isoDate,
      description,
      amount: Math.abs(amount),
      type: amount < 0 ? "expense" : "expense", // Default to expense for PDF
      raw_data: { 
        source: "pdf_text", 
        confidence: "medium",
        original_segment: segment.substring(0, 100),
      },
    });
  }
  
  return transactions;
}

// Extract transactions from scanned/image PDFs (OCR-like heuristics)
function extractTransactionsFromScannedPDF(binaryContent: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  
  // For scanned PDFs, we look for raw byte patterns that might be dates and amounts
  // This is a last-resort heuristic
  
  // Look for patterns that survived encoding: date-like and number-like sequences
  const dateValuePattern = /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.]?(\d{2,4})?\s*[^\d]*?(\d{1,3}(?:[.,]\d{3})*[.,]\d{2})/g;
  
  let match;
  const seenHashes = new Set<string>();
  
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
    const cleanValue = valueStr.replace(/\./g, "").replace(",", ".");
    const amount = parseFloat(cleanValue);
    
    if (isNaN(amount) || amount <= 0 || amount > 1000000) {
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
// PASSWORD GENERATION (Brazil-specific)
// ============================================

function generatePasswordAttempts(cpf?: string, birthDate?: string): string[] {
  const passwords: string[] = [];
  
  if (cpf) {
    // Clean CPF (only numbers)
    const cleanCpf = cpf.replace(/\D/g, "");
    
    if (cleanCpf.length === 11) {
      // Option 1: Full CPF (11 digits)
      passwords.push(cleanCpf);
      
      // Option 2: CPF without first 2 digits (9 digits, from 3rd to 11th)
      passwords.push(cleanCpf.substring(2));
      
      // Option 3: Last 6 digits
      passwords.push(cleanCpf.substring(5));
    }
  }
  
  if (birthDate) {
    // Parse birth date (expected ISO format: YYYY-MM-DD)
    const match = birthDate.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      const [, year, month, day] = match;
      
      // Option 4: DDMMYYYY
      passwords.push(`${day}${month}${year}`);
      
      // Option 5: DDMMYY
      passwords.push(`${day}${month}${year.substring(2)}`);
      
      // Option 6: YYYYMMDD
      passwords.push(`${year}${month}${day}`);
    }
  }
  
  return passwords;
}

// ============================================
// DEDUPLICATION
// ============================================

function normalizeDescription(desc: string): string {
  return desc
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^\w\s]/g, "") // Remove special chars
    .replace(/\s+/g, " ") // Normalize spaces
    .trim();
}

function generateTransactionHash(tx: ParsedTransaction, sourceId: string): string {
  const normalized = normalizeDescription(tx.description);
  const key = `${tx.date}|${tx.amount.toFixed(2)}|${normalized}|${sourceId}`;
  
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    const char = key.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  return Math.abs(hash).toString(36);
}

// ============================================
// CATEGORY SUGGESTION
// ============================================

const DEFAULT_CATEGORY_KEYWORDS: Record<string, { category: string; keywords: string[] }> = {
  food_delivery: {
    category: "alimentacao",
    keywords: ["ifood", "rappi", "uber eats", "99food", "delivery"],
  },
  supermarket: {
    category: "alimentacao", 
    keywords: ["mercado", "supermercado", "carrefour", "extra", "pao de acucar", "atacadao"],
  },
  transport: {
    category: "transporte",
    keywords: ["uber", "99", "cabify", "posto", "combustivel", "gasolina", "estacionamento"],
  },
  health: {
    category: "saude",
    keywords: ["farmacia", "drogaria", "hospital", "medico", "clinica", "laboratorio"],
  },
  utilities: {
    category: "moradia",
    keywords: ["luz", "energia", "agua", "gas", "internet", "telefone", "celular"],
  },
  education: {
    category: "educacao",
    keywords: ["escola", "faculdade", "curso", "livro", "papelaria"],
  },
  entertainment: {
    category: "lazer",
    keywords: ["netflix", "spotify", "cinema", "teatro", "show", "ingresso"],
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

    // Parse request body - support both FormData and JSON
    let file_content: string;
    let file_type: "ofx" | "xlsx" | "pdf";
    let import_type: string;
    let source_id: string;
    let invoice_month: string | undefined;
    let password: string | undefined;
    let auto_password = true;

    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      // Parse FormData
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

        // Determine file type from extension
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

        // Read file content
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        if (file_type === "ofx") {
          // OFX is text-based, decode as string
          const decoder = new TextDecoder("utf-8");
          file_content = decoder.decode(uint8Array);
        } else {
          // XLSX and PDF need base64 encoding
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
      // Parse JSON body (for backwards compatibility and password retries)
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
      // Try auto-password if enabled
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
      // Try auto-password if enabled
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
        error: "Não foi possível extrair transações deste arquivo. Tente outro formato." 
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
      status: "pending",
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
      
      // Check for duplicates
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
      
      // Mark PDF transactions as needing review (low confidence)
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
      // Clean up import record
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
      transactions_count: transactions.length,
    } as ProcessResponse), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (err) {
    console.error("import-process: unexpected error", err);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
