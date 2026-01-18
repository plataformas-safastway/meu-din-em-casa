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
// PDF PARSER (basic text extraction)
// ============================================

function parsePDF(content: string, password?: string): { transactions: ParsedTransaction[]; needsPassword?: boolean } {
  try {
    // Decode base64 content
    const binaryContent = atob(content);
    
    // Check for encryption
    const isEncrypted = binaryContent.includes("/Encrypt") && 
                        !binaryContent.includes("/Encrypt <<>>"); // Empty encrypt = no encryption
    
    if (isEncrypted && !password) {
      return { transactions: [], needsPassword: true };
    }
    
    const transactions: ParsedTransaction[] = [];
    
    // Extract text streams from PDF
    // This is a very basic extractor - production should use a proper library
    const textMatches = binaryContent.match(/\(([^)]+)\)/g) || [];
    const textContent = textMatches.map(m => m.slice(1, -1)).join(" ");
    
    // Also try to extract from streams
    const streamMatches = binaryContent.match(/stream\s*([\s\S]*?)\s*endstream/g) || [];
    let additionalText = "";
    for (const stream of streamMatches) {
      // Try to decode text commands (Tj, TJ operators)
      const tjMatches = stream.match(/\(([^)]*)\)\s*Tj/g) || [];
      additionalText += " " + tjMatches.map(m => {
        const match = m.match(/\(([^)]*)\)/);
        return match ? match[1] : "";
      }).join(" ");
    }
    
    const fullText = textContent + " " + additionalText;
    
    // Try to find transaction patterns
    // Common patterns: DATE DESCRIPTION AMOUNT
    // DD/MM/YYYY or DD/MM/YY
    const datePattern = /(\d{1,2}\/\d{1,2}\/\d{2,4})/g;
    const dateMatches = fullText.match(datePattern) || [];
    
    // Look for amount patterns near dates
    const amountPattern = /R?\$?\s*[\d.,]+[,.]?\d{0,2}/g;
    
    // This is a heuristic approach - PDF parsing is complex
    // All PDF transactions should be marked for review
    
    for (const dateStr of dateMatches) {
      try {
        const [day, month, year] = dateStr.split("/");
        const fullYear = year.length === 2 ? `20${year}` : year;
        const isoDate = `${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
        
        // Get surrounding text as description
        const idx = fullText.indexOf(dateStr);
        const surroundingText = fullText.substring(Math.max(0, idx - 50), Math.min(fullText.length, idx + 200));
        
        // Find amount in surrounding text
        const amounts = surroundingText.match(amountPattern) || [];
        for (const amountStr of amounts) {
          const cleanAmount = amountStr.replace(/[R$\s]/g, "").replace(".", "").replace(",", ".");
          const amount = parseFloat(cleanAmount);
          
          if (!isNaN(amount) && amount > 0) {
            // Extract description (text between date and amount)
            const desc = surroundingText
              .replace(dateStr, "")
              .replace(amountStr, "")
              .replace(/[^\w\s]/g, " ")
              .trim()
              .substring(0, 200);
            
            transactions.push({
              date: isoDate,
              description: desc || "Transação importada de PDF",
              amount,
              type: "expense", // Default for PDF - user should review
              raw_data: { source: "pdf", confidence: "low" },
            });
            break; // Only one amount per date match
          }
        }
      } catch (e) {
        // Skip malformed dates
      }
    }
    
    return { transactions };
  } catch (e) {
    console.error("Error parsing PDF:", e);
    return { transactions: [] };
  }
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

    // Parse request body
    let body: ProcessRequest;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { file_content, file_type, import_type, source_id, invoice_month, password, auto_password } = body;

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
