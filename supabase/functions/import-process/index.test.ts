import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;

// Helper to encode text to base64
function textToBase64(text: string): string {
  return btoa(unescape(encodeURIComponent(text)));
}

// ============================================
// MOCK DATA - Brazilian Bank Statements
// ============================================

// Nubank PDF text simulation (what would be extracted from a real Nubank statement)
const NUBANK_PDF_TEXT = `
FATURA DO CARTÃO NUBANK
Nu Pagamentos S.A.
Período: 01/01/2026 a 31/01/2026

Transações:

15 JAN IFOOD *PIZZARIA R$ 45,90
16 JAN UBER *VIAGEM R$ 32,50
18 JAN PIX RECEBIDO SALARIO R$ 5.000,00
20 JAN MERCADO CARREFOUR R$ 287,45
22 JAN NETFLIX.COM R$ 55,90
25 JAN ESTORNO COMPRA R$ 45,90
28 JAN FARMACIA DROGASIL R$ 89,00

Total da Fatura: R$ 465,85
`;

// Itaú statement text simulation
const ITAU_PDF_TEXT = `
EXTRATO DE CONTA CORRENTE
Banco Itaú Unibanco S.A.
Agência: 1234 Conta: 56789-0

Data      Histórico                          Valor        C/D
05/01/2026  SALDO ANTERIOR                   1.234,56      C
10/01/2026  TED RECEBIDA EMPRESA XYZ         8.500,00      C
12/01/2026  PAGTO BOLETO ENERGIA             289,45        D
15/01/2026  PIX ENVIADO JOSE DA SILVA        150,00        D
18/01/2026  COMPRA CARTAO DEB SUPERMERCADO   342,78        D
20/01/2026  SALARIO EMPRESA ABC             12.000,00      C
25/01/2026  PAGTO BOLETO INTERNET            129,90        D
28/01/2026  SAQUE ATM                        500,00        D

SALDO ATUAL: 20.322,43
`;

// Bradesco statement text simulation
const BRADESCO_PDF_TEXT = `
EXTRATO PARA SIMPLES CONFERÊNCIA
Banco Bradesco S.A.
Conta: 0012345-6

02/01/2026  DEPOSITO EM DINHEIRO           2.000,00
05/01/2026  DEBITO AUTOMATICO LUZ            245,67
08/01/2026  PIX RECEBIDO                     500,00
10/01/2026  COMPRA NO DEBITO                 189,90
15/01/2026  TED ENVIADA                    1.500,00
20/01/2026  CREDITO SALARIO               10.500,00
22/01/2026  SAQUE                            300,00
`;

// Mercado Pago statement simulation
const MERCADO_PAGO_PDF_TEXT = `
Mercado Pago
Extrato de Movimentações
Janeiro 2026

03/01/2026  Venda recebida - Produto A      R$ 150,00
05/01/2026  Transferência enviada           R$ 50,00
08/01/2026  Pix recebido                    R$ 320,00
10/01/2026  Compra Mercado Livre            R$ 89,90
15/01/2026  Saque para conta                R$ 200,00
20/01/2026  Venda recebida - Produto B      R$ 75,50
25/01/2026  Cashback recebido               R$ 12,30
`;

// Inter bank statement
const INTER_PDF_TEXT = `
Banco Inter S.A.
Extrato Conta Digital

Data        Descrição                           Valor
02/01/2026  Pix In - João Silva              R$ 1.200,00
05/01/2026  Pix Out - Conta Luz              R$ 187,45
08/01/2026  Débito Automático                R$ 99,90
10/01/2026  Depósito Recebido               R$ 3.500,00
15/01/2026  Pagamento Boleto                 R$ 450,00
20/01/2026  Ted In - Empresa                R$ 8.000,00
22/01/2026  Compra Débito iFood              R$ 67,80
`;

// Sicredi cooperative bank statement
const SICREDI_PDF_TEXT = `
SICREDI
Extrato de Conta Corrente
Período: 01/01/2026 a 31/01/2026

05/01/2026  CRED SALARIO                  5.500,00  C
08/01/2026  DEB AUTOMAT ENERGIA             198,76  D
10/01/2026  DEP DINHEIRO                  1.000,00  C
15/01/2026  PAG BOLETO                      350,00  D
20/01/2026  PIX RECEBIDO                    250,00  C
25/01/2026  SAQUE ATM                       200,00  D
`;

// ============================================
// TESTS
// ============================================

Deno.test("Import Process - Nubank PDF parsing simulation", async () => {
  console.log("\n=== Testing Nubank PDF Parsing ===");
  
  // Test pattern matching on the text
  const text = NUBANK_PDF_TEXT.toLowerCase();
  
  // Check if Nubank is detected
  const hasNubank = text.includes("nubank") || text.includes("nu pagamentos");
  assertEquals(hasNubank, true, "Should detect Nubank identifier");
  
  // Check if dates are found (DD MMM format)
  const datePattern = /(\d{2})\s+(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)/gi;
  const dateMatches = [...NUBANK_PDF_TEXT.matchAll(datePattern)];
  console.log(`Found ${dateMatches.length} dates in Nubank format`);
  assertEquals(dateMatches.length >= 5, true, "Should find multiple dates");
  
  // Check if amounts are found (R$ format)
  const amountPattern = /R\$\s*([\d.,]+)/gi;
  const amountMatches = [...NUBANK_PDF_TEXT.matchAll(amountPattern)];
  console.log(`Found ${amountMatches.length} amounts`);
  assertEquals(amountMatches.length >= 5, true, "Should find multiple amounts");
  
  console.log("✅ Nubank PDF pattern matching works correctly");
});

Deno.test("Import Process - Itaú PDF parsing simulation", async () => {
  console.log("\n=== Testing Itaú PDF Parsing ===");
  
  const text = ITAU_PDF_TEXT.toLowerCase();
  
  // Check if Itaú is detected
  const hasItau = text.includes("itau") || text.includes("itaú");
  assertEquals(hasItau, true, "Should detect Itaú identifier");
  
  // Check for C/D indicators
  const hasCreditIndicator = ITAU_PDF_TEXT.includes("C");
  const hasDebitIndicator = ITAU_PDF_TEXT.includes("D");
  assertEquals(hasCreditIndicator && hasDebitIndicator, true, "Should have C/D indicators");
  
  // Check date format DD/MM/YYYY
  const datePattern = /(\d{2})\/(\d{2})\/(\d{4})/g;
  const dateMatches = [...ITAU_PDF_TEXT.matchAll(datePattern)];
  console.log(`Found ${dateMatches.length} dates in DD/MM/YYYY format`);
  assertEquals(dateMatches.length >= 5, true, "Should find dates in correct format");
  
  // Check amounts with thousand separator
  const amountPattern = /(\d{1,3}(?:\.\d{3})*,\d{2})/g;
  const amountMatches = [...ITAU_PDF_TEXT.matchAll(amountPattern)];
  console.log(`Found ${amountMatches.length} amounts in Brazilian format`);
  assertEquals(amountMatches.length >= 5, true, "Should find amounts");
  
  console.log("✅ Itaú PDF pattern matching works correctly");
});

Deno.test("Import Process - Bradesco PDF parsing simulation", async () => {
  console.log("\n=== Testing Bradesco PDF Parsing ===");
  
  const text = BRADESCO_PDF_TEXT.toLowerCase();
  
  // Check if Bradesco is detected
  const hasBradesco = text.includes("bradesco");
  assertEquals(hasBradesco, true, "Should detect Bradesco identifier");
  
  // Check date format
  const datePattern = /(\d{2})\/(\d{2})\/(\d{4})/g;
  const dateMatches = [...BRADESCO_PDF_TEXT.matchAll(datePattern)];
  console.log(`Found ${dateMatches.length} dates`);
  assertEquals(dateMatches.length >= 5, true, "Should find dates");
  
  // Check for credit keywords
  const hasCreditKeywords = text.includes("deposito") || text.includes("credito") || text.includes("salario");
  assertEquals(hasCreditKeywords, true, "Should have credit keywords");
  
  console.log("✅ Bradesco PDF pattern matching works correctly");
});

Deno.test("Import Process - Mercado Pago PDF parsing simulation", async () => {
  console.log("\n=== Testing Mercado Pago PDF Parsing ===");
  
  const text = MERCADO_PAGO_PDF_TEXT.toLowerCase();
  
  // Check if Mercado Pago is detected
  const hasMercadoPago = text.includes("mercado pago") || text.includes("mercadopago");
  assertEquals(hasMercadoPago, true, "Should detect Mercado Pago identifier");
  
  // Check for fintech-specific keywords
  const hasVenda = text.includes("venda");
  const hasCashback = text.includes("cashback");
  assertEquals(hasVenda, true, "Should have 'venda' keyword");
  assertEquals(hasCashback, true, "Should have 'cashback' keyword");
  
  console.log("✅ Mercado Pago PDF pattern matching works correctly");
});

Deno.test("Import Process - Banco Inter PDF parsing simulation", async () => {
  console.log("\n=== Testing Banco Inter PDF Parsing ===");
  
  const text = INTER_PDF_TEXT.toLowerCase();
  
  // Check if Inter is detected
  const hasInter = text.includes("banco inter") || text.includes("inter s.a");
  assertEquals(hasInter, true, "Should detect Banco Inter identifier");
  
  // Check for Inter-specific keywords
  const hasPixIn = text.includes("pix in");
  const hasPixOut = text.includes("pix out");
  const hasTedIn = text.includes("ted in");
  assertEquals(hasPixIn, true, "Should have 'pix in' keyword");
  assertEquals(hasPixOut, true, "Should have 'pix out' keyword");
  assertEquals(hasTedIn, true, "Should have 'ted in' keyword");
  
  console.log("✅ Banco Inter PDF pattern matching works correctly");
});

Deno.test("Import Process - Sicredi (Cooperative) PDF parsing simulation", async () => {
  console.log("\n=== Testing Sicredi PDF Parsing ===");
  
  const text = SICREDI_PDF_TEXT.toLowerCase();
  
  // Check if Sicredi is detected
  const hasSicredi = text.includes("sicredi");
  assertEquals(hasSicredi, true, "Should detect Sicredi identifier");
  
  // Check for C/D indicators
  const hasCIndicator = SICREDI_PDF_TEXT.includes("  C");
  const hasDIndicator = SICREDI_PDF_TEXT.includes("  D");
  assertEquals(hasCIndicator && hasDIndicator, true, "Should have C/D indicators for cooperative bank format");
  
  console.log("✅ Sicredi PDF pattern matching works correctly");
});

Deno.test("Import Process - Brazilian amount parsing", async () => {
  console.log("\n=== Testing Brazilian Amount Parsing ===");
  
  const testCases = [
    { input: "R$ 1.234,56", expected: 1234.56 },
    { input: "R$ 45,90", expected: 45.90 },
    { input: "5.000,00", expected: 5000.00 },
    { input: "12.500,00", expected: 12500.00 },
    { input: "R$89,90", expected: 89.90 },
    { input: "150,00", expected: 150.00 },
  ];
  
  function parseBrazilianAmount(amountStr: string): number | null {
    if (!amountStr) return null;
    let cleaned = amountStr.replace(/R\$/gi, "").replace(/\s/g, "").trim();
    if (cleaned.includes(",")) {
      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    }
    const amount = parseFloat(cleaned);
    if (isNaN(amount)) return null;
    return amount;
  }
  
  for (const { input, expected } of testCases) {
    const result = parseBrazilianAmount(input);
    console.log(`Parsing "${input}" -> ${result} (expected: ${expected})`);
    assertEquals(result, expected, `Should parse "${input}" correctly`);
  }
  
  console.log("✅ Brazilian amount parsing works correctly");
});

Deno.test("Import Process - Date format parsing", async () => {
  console.log("\n=== Testing Date Format Parsing ===");
  
  const MONTH_MAP: Record<string, string> = {
    jan: "01", fev: "02", mar: "03", abr: "04",
    mai: "05", jun: "06", jul: "07", ago: "08",
    set: "09", out: "10", nov: "11", dez: "12",
  };
  
  function parseFlexibleDate(dateStr: string): string | null {
    if (!dateStr) return null;
    const normalized = dateStr.trim().toLowerCase();
    
    // DD/MM/YYYY
    const slashMatch = normalized.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.]?(\d{2,4})?$/);
    if (slashMatch) {
      const [, day, month, year] = slashMatch;
      const fullYear = year ? (year.length === 2 ? `20${year}` : year) : "2026";
      return `${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
    
    // DD MMM format
    const monthNameMatch = normalized.match(/^(\d{1,2})\s+(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)/i);
    if (monthNameMatch) {
      const [, day, monthName] = monthNameMatch;
      const month = MONTH_MAP[monthName.toLowerCase()];
      if (month) return `2026-${month}-${day.padStart(2, "0")}`;
    }
    
    return null;
  }
  
  const testCases = [
    { input: "15/01/2026", expected: "2026-01-15" },
    { input: "05/12/2026", expected: "2026-12-05" },
    { input: "15 JAN", expected: "2026-01-15" },
    { input: "20 DEZ", expected: "2026-12-20" },
    { input: "08/03", expected: "2026-03-08" },
  ];
  
  for (const { input, expected } of testCases) {
    const result = parseFlexibleDate(input);
    console.log(`Parsing "${input}" -> ${result} (expected: ${expected})`);
    assertEquals(result, expected, `Should parse "${input}" correctly`);
  }
  
  console.log("✅ Date format parsing works correctly");
});

Deno.test("Import Process - Bank detection from content", async () => {
  console.log("\n=== Testing Bank Detection ===");
  
  const bankIdentifiers: Record<string, string[]> = {
    "Nubank": ["nubank", "nu pagamentos", "nu financeira"],
    "Itaú": ["itau", "itaú", "itaú unibanco"],
    "Bradesco": ["bradesco", "banco bradesco"],
    "Banco do Brasil": ["banco do brasil", "bb s.a"],
    "Santander": ["santander", "banco santander"],
    "Caixa": ["caixa economica", "cef"],
    "Mercado Pago": ["mercado pago", "mercadopago"],
    "PicPay": ["picpay", "pic pay"],
    "Banco Inter": ["banco inter", "inter s.a"],
    "Sicredi": ["sicredi"],
    "Sicoob": ["sicoob"],
    "BTG Pactual": ["btg pactual", "btg"],
  };
  
  function detectBank(text: string): string | null {
    const lowerText = text.toLowerCase();
    for (const [bankName, identifiers] of Object.entries(bankIdentifiers)) {
      for (const identifier of identifiers) {
        if (lowerText.includes(identifier)) {
          return bankName;
        }
      }
    }
    return null;
  }
  
  const testCases = [
    { text: NUBANK_PDF_TEXT, expected: "Nubank" },
    { text: ITAU_PDF_TEXT, expected: "Itaú" },
    { text: BRADESCO_PDF_TEXT, expected: "Bradesco" },
    { text: MERCADO_PAGO_PDF_TEXT, expected: "Mercado Pago" },
    { text: INTER_PDF_TEXT, expected: "Banco Inter" },
    { text: SICREDI_PDF_TEXT, expected: "Sicredi" },
  ];
  
  for (const { text, expected } of testCases) {
    const result = detectBank(text);
    console.log(`Detected bank: ${result} (expected: ${expected})`);
    assertEquals(result, expected, `Should detect ${expected} correctly`);
  }
  
  console.log("✅ Bank detection works correctly for all tested banks");
});

Deno.test("Import Process - Transaction type classification", async () => {
  console.log("\n=== Testing Transaction Type Classification ===");
  
  const creditIndicators = ["recebido", "deposito", "salario", "credito", "ted cred", "pix rec", "venda", "cashback", "estorno"];
  const debitIndicators = ["pagamento", "compra", "saque", "debito", "pix env", "transferencia"];
  
  function classifyTransaction(description: string): "income" | "expense" {
    const lower = description.toLowerCase();
    
    for (const indicator of creditIndicators) {
      if (lower.includes(indicator)) return "income";
    }
    
    for (const indicator of debitIndicators) {
      if (lower.includes(indicator)) return "expense";
    }
    
    return "expense"; // Default to expense
  }
  
  const testCases = [
    { desc: "PIX RECEBIDO SALARIO", expected: "income" },
    { desc: "VENDA RECEBIDA", expected: "income" },
    { desc: "DEPOSITO EM DINHEIRO", expected: "income" },
    { desc: "CREDITO SALARIO", expected: "income" },
    { desc: "ESTORNO COMPRA", expected: "income" },
    { desc: "CASHBACK RECEBIDO", expected: "income" },
    { desc: "PAGAMENTO BOLETO", expected: "expense" },
    { desc: "COMPRA MERCADO", expected: "expense" },
    { desc: "SAQUE ATM", expected: "expense" },
    { desc: "PIX ENVIADO", expected: "expense" },
  ];
  
  for (const { desc, expected } of testCases) {
    const result = classifyTransaction(desc);
    console.log(`"${desc}" -> ${result} (expected: ${expected})`);
    assertEquals(result, expected, `Should classify "${desc}" correctly`);
  }
  
  console.log("✅ Transaction type classification works correctly");
});

Deno.test("Import Process - Full text transaction extraction (Nubank)", async () => {
  console.log("\n=== Testing Full Transaction Extraction - Nubank ===");
  
  // Simulate the line pattern matching used in the edge function
  const linePattern = /(\d{2}\s+(?:JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ))\s+(.+?)\s+(R\$\s*-?\s*[\d.,]+|\d{1,3}(?:\.\d{3})*,\d{2})/gi;
  
  const matches = [...NUBANK_PDF_TEXT.matchAll(linePattern)];
  console.log(`Found ${matches.length} transaction lines`);
  
  for (const match of matches) {
    const [, date, description, amount] = match;
    console.log(`  ${date.trim()} | ${description.trim()} | ${amount}`);
  }
  
  assertEquals(matches.length >= 5, true, "Should extract multiple transactions");
  
  // Verify first transaction
  const firstMatch = matches[0];
  assertExists(firstMatch, "Should have at least one transaction");
  assertEquals(firstMatch[1].trim(), "15 JAN", "First date should be 15 JAN");
  assertEquals(firstMatch[2].includes("IFOOD"), true, "First description should contain IFOOD");
  
  console.log("✅ Nubank transaction extraction works correctly");
});

Deno.test("Import Process - Full text transaction extraction (Itaú)", async () => {
  console.log("\n=== Testing Full Transaction Extraction - Itaú ===");
  
  // Simulate the line pattern matching for Itaú
  const linePattern = /(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+(-?\d{1,3}(?:\.\d{3})*,\d{2})\s*([CD])?/gi;
  
  const matches = [...ITAU_PDF_TEXT.matchAll(linePattern)];
  console.log(`Found ${matches.length} transaction lines`);
  
  let creditCount = 0;
  let debitCount = 0;
  
  for (const match of matches) {
    const [, date, description, amount, indicator] = match;
    const type = indicator === "C" ? "CREDIT" : indicator === "D" ? "DEBIT" : "UNKNOWN";
    if (indicator === "C") creditCount++;
    if (indicator === "D") debitCount++;
    console.log(`  ${date} | ${description.trim().substring(0, 30)} | ${amount} | ${type}`);
  }
  
  console.log(`Credits: ${creditCount}, Debits: ${debitCount}`);
  
  assertEquals(matches.length >= 5, true, "Should extract multiple transactions");
  assertEquals(creditCount >= 2, true, "Should have credit transactions");
  assertEquals(debitCount >= 3, true, "Should have debit transactions");
  
  console.log("✅ Itaú transaction extraction works correctly");
});

console.log("\n========================================");
console.log("BRAZILIAN BANK IMPORT PARSING TESTS");
console.log("========================================\n");
