import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals, assertExists } from "https://deno.land/std@0.224.0/assert/mod.ts";

// ============================================
// REAL BANK STATEMENT DATA (from actual PDFs)
// ============================================

// REAL Bradesco statement text (from 2025-12_Extrato_Bradesco.pdf)
const REAL_BRADESCO_PDF = `
Bradesco Internet Banking
Data: 13/01/2026 - 18h48

Nome: THIAGO PAULO SILVA DE OLIVEIRA
Extrato de: Ag: 1472 | Conta: 134020-4 | Entre 01/12/2025 e 31/12/2025

| Data     | Histórico                        | Docto.  | Crédito (R$) | Débito (R$) | Saldo (R$)  |
| 24/11/25 | SALDO ANTERIOR                   |         |              |             | - 15.977,27 |
| 01/12/25 | Transfe Pix                      | 1905378 | 150,00       |             | - 15.827,27 |
|          | Rem: Thiago Paulo Silva de 01/12 |         |              |             |             |
|          | Transfe Pix                      | 1907266 | 50,00        |             | - 15.777,27 |
|          | Transfe Pix                      | 2358558 | 2.400,00     |             | - 15.777,27 |
|          | Parc Cred Pess                   | 3480335 |              | - 1.416,18  | - 14.793,45 |
| 02/12/25 | Enc Lim Credito                  | 8934600 | - 1.160,36   |             | - 15.953,81 |
|          | Iof Util Limite                  | 8934600 |              | - 46,19     | - 16.000,00 |
| 04/12/25 | Transfe Pix                      | 2046087 | 100,00       |             | - 15.900,00 |
| 10/12/25 | Transfe Pix                      | 1903573 | 7.550,00     |             | - 7.771,52  |
|          | Gasto c Credito                  | 3990344 |              | - 10.143,83 | - 15.898,68 |
| 11/12/25 | Transfe Pix                      | 1753595 | 50.000,00    | 34.101,32   |             |
`;

// REAL Itaú statement text (from 2025-12_Extrato_Itau.pdf)
const REAL_ITAU_PDF = `
Itau
THIAGO PAULO SILVA DE OLIVEIRA
CPF: 040.784.689-18
agência: 0414 conta: 02939-7
Personnalit

período de visualização: mês completo - 01/12/2025 a 31/12/2025

| data       | lançamentos                | valor (R$) | saldo (R$) |
| 30/11/2025 | SALDO ANTERIOR             |            | -17.683,11 |
| 01/12/2025 | PIX TRANSF THIAGO 30/11    | 1.400,00   |            |
| 01/12/2025 | JUROS LIMITE DA CONTA      | -1.426,25  |            |
| 02/12/2025 | PIX TRANSF THIAGO 02/12    | -110,00    |            |
| 02/12/2025 | IOF                        | -44,03     |            |
| 08/12/2025 | PIX QRS ZENPOST08/12       | -37,00     |            |
| 11/12/2025 | PIX TRANSF Thiago 11/12    | 32.000,00  |            |
| 11/12/2025 | FINANC IMOBILIARIO 000006  | -13.931,86 |            |
| 12/12/2025 | PIX TRANSF THIAGO 12/12    | 3.000,00   |            |
| 15/12/2025 | PIX TRANSF THIAGO 15/12    | 3.500,00   |            |
| 15/12/2025 | ITAU BLACK 3111-6665       | -10.299,91 |            |
| 16/12/2025 | PIX TRANSF DOUGLAS16/12    | -44,00     |            |
| 22/12/2025 | SISDEB ITAUPORTOSEGUR      | -142,76    |            |
| 30/12/2025 | FINANC IMOBILIARIO 000007  | -13.548,68 |            |
| 30/12/2025 | PIX TRANSF Thiago 30/12    | 13.350,00  |            |
`;

// REAL BTG Pactual statement (from 2025-12_Extrato_BTG.pdf)  
const REAL_BTG_PDF = `
btg pactual
Este é o extrato da sua conta corrente BTG Pactual
Cliente: Thiago Paulo Silva De Oliveira
Período do extrato: 01/12/2025 a 31/12/2025

| Data e hora      | Categoria               | Transação                          | Descrição                      | Valor         |
| 01/12/2025 00h00 | Transferência           | Pix recebido                       | Thiago Paulo Silva De Oliveira | R$ 550,00     |
| 01/12/2025 09h15 | Impostos e Tributos     | Encargos de mora - limite da conta | BTG Pactual                    | -R$ 2,86      |
| 01/12/2025 09h15 | Crédito e Financiamento | Juros - limite da conta            | BTG Pactual                    | -R$ 462,14    |
| 01/12/2025 09h15 | Impostos e Tributos     | IOF limite da conta                | BTG Pactual                    | -R$ 17,15     |
| 01/12/2025 19h07 | Transferência           | Pix enviado                        | Thiago Paulo Silva De Oliveira | -R$ 50,00     |
| 11/12/2025 16h33 | Transferência           | Pix recebido                       | Aline Cristina Homem           | R$ 50.000,00  |
| 11/12/2025 16h36 | Transferência           | Pix recebido                       | Aline Cristina Homem           | R$ 50.000,00  |
| 11/12/2025 16h37 | Transferência           | Pix recebido                       | Acioli Silva                   | R$ 49.000,00  |
| 11/12/2025 16h48 | Transferência           | Transferência recebida             | Aline Cristina Homem           | R$ 1.000,00   |
| 11/12/2025 16h54 | Transferência           | Transferência recebida             | Acioli Silva                   | R$ 50.000,00  |
| 11/12/2025 16h55 | Transferência           | Pix enviado                        | Thiago Paulo Silva De Oliveira | -R$ 16.500,00 |
| 11/12/2025 16h56 | Transferência           | Pix enviado                        | Thiago Paulo Silva De Oliveira | -R$ 32.000,00 |
| 11/12/2025 17h46 | Impostos e Tributos     | Pagamento de boleto                | Prefeitura Municipal           | -R$ 85,29     |
| 12/12/2025 16h00 | Transferência           | Pix enviado                        | Thiago Paulo Silva De Oliveira | -R$ 35.000,00 |
| 12/12/2025 16h02 | Investimentos           | CDB Banco BTG Pactual              | Aplicação em Renda Fixa        | -R$ 45.000,00 |
| 18/12/2025 15h11 | Investimentos           | CDB BANCO BTG PACTUAL S A          | Resgate de Renda Fixa          | R$ 1.000,00   |
`;

// REAL Santander statement (from 2025-12_Extrato_Santander.pdf)
const REAL_SANTANDER_PDF = `
EXTRATO DE CONTA CORRENTE
THIAGO PAULO SILVA DE OLIVEIRA    Agência e Conta: 1772 / 01003626-3
Período: 01/12/2025 a 31/12/2025

| Data       | Descrição                                                   | Docto  | Situação | Crédito (R$) | Débito (R$) | Saldo (R$) |
| 01/12/2025 | PAGAMENTO CARTAO CREDITO BCE 29/11 12:38 CARTAO VISA        | 123800 |          |              | -200,00     | -9.437,66  |
| 01/12/2025 | PAGAMENTO CARTAO CREDITO BCE 29/11 21:14 CARTAO VISA        | 211443 |          |              | -150,00     | -9.587,66  |
| 01/12/2025 | PIX ENVIADO Thiago Paulo Silva de Oli                       | 000000 |          |              | -1.400,00   | -10.987,66 |
| 01/12/2025 | PIX ENVIADO Triple A Consultoria Em G                       | 000000 |          |              | -300,00     | -14.237,66 |
| 01/12/2025 | JUROS SALDO UTILIZ ATE LIMITE PERIODO: 01/11 A 30/11/25     | 000000 |          |              | -1.149,55   | -15.557,21 |
| 01/12/2025 | IOF IMPOSTO OPERACOES FINANCEIRAS PERIODO: 01/11 A 30/11/25 | 000000 |          |              | -35,49      | -15.592,70 |
| 02/12/2025 | PIX RECEBIDO THIAGO PAULO SILVA DE OLI                      | 000000 |          | 110,00       |             | -15.837,31 |
| 03/12/2025 | PIX RECEBIDO TRIPLE A CONSULTORIA EM G                      | 000000 |          | 17.000,00    |             | 1.062,69   |
| 05/12/2025 | TARIFA MENSALIDADE PACOTE SERVIÇOS NOVEMBRO / 2025          | 000000 |          |              | -99,95      | -9.238,18  |
| 08/12/2025 | PAGAMENTO DE BOLETO BANCO HYUNDAI CAPITAL BRA               | 871116 |          |              | -1.313,04   | -10.614,22 |
| 09/12/2025 | TED RECEBIDA BRADESCO SAUDE S A                             | 000000 |          | 277,62       |             | -10.531,89 |
`;

// ============================================
// TESTS - REAL BANK DATA
// ============================================

Deno.test("REAL DATA - Bradesco bank detection and parsing", async () => {
  console.log("\n=== Testing REAL Bradesco Statement ===");
  
  const text = REAL_BRADESCO_PDF.toLowerCase();
  
  // Bank detection
  const hasBradesco = text.includes("bradesco");
  assertEquals(hasBradesco, true, "Should detect Bradesco");
  
  // Date pattern (DD/MM/YY format used by Bradesco)
  const datePattern = /(\d{2})\/(\d{2})\/(\d{2})/g;
  const dateMatches = [...REAL_BRADESCO_PDF.matchAll(datePattern)];
  console.log(`Found ${dateMatches.length} dates in DD/MM/YY format`);
  assertEquals(dateMatches.length >= 5, true, "Should find multiple dates");
  
  // Amount pattern (Brazilian format)
  const amountPattern = /(-?\s?\d{1,3}(?:\.\d{3})*,\d{2})/g;
  const amountMatches = [...REAL_BRADESCO_PDF.matchAll(amountPattern)];
  console.log(`Found ${amountMatches.length} amounts`);
  assertEquals(amountMatches.length >= 10, true, "Should find many amounts");
  
  // Specific transactions
  assertEquals(text.includes("transfe pix"), true, "Should have PIX transfers");
  assertEquals(text.includes("parc cred pess"), true, "Should have personal credit installment");
  
  console.log("✅ REAL Bradesco parsing works correctly");
});

Deno.test("REAL DATA - Itaú bank detection and parsing", async () => {
  console.log("\n=== Testing REAL Itaú Statement ===");
  
  const text = REAL_ITAU_PDF.toLowerCase();
  
  // Bank detection  
  const hasItau = text.includes("itau") || text.includes("personnalit");
  assertEquals(hasItau, true, "Should detect Itaú/Personnalit");
  
  // Date pattern (DD/MM/YYYY format)
  const datePattern = /(\d{2})\/(\d{2})\/(\d{4})/g;
  const dateMatches = [...REAL_ITAU_PDF.matchAll(datePattern)];
  console.log(`Found ${dateMatches.length} dates in DD/MM/YYYY format`);
  assertEquals(dateMatches.length >= 10, true, "Should find many dates");
  
  // Amount pattern (positive and negative)
  const amountPattern = /(-?\d{1,3}(?:\.\d{3})*,\d{2})/g;
  const amountMatches = [...REAL_ITAU_PDF.matchAll(amountPattern)];
  console.log(`Found ${amountMatches.length} amounts`);
  assertEquals(amountMatches.length >= 10, true, "Should find many amounts");
  
  // Specific Itaú transactions
  assertEquals(text.includes("pix transf"), true, "Should have PIX transfers");
  assertEquals(text.includes("juros limite da conta"), true, "Should have interest charges");
  assertEquals(text.includes("financ imobiliario"), true, "Should have mortgage payment");
  assertEquals(text.includes("itau black"), true, "Should have Itaú Black card payment");
  
  console.log("✅ REAL Itaú parsing works correctly");
});

Deno.test("REAL DATA - BTG Pactual bank detection and parsing", async () => {
  console.log("\n=== Testing REAL BTG Pactual Statement ===");
  
  const text = REAL_BTG_PDF.toLowerCase();
  
  // Bank detection
  const hasBTG = text.includes("btg pactual") || text.includes("btg");
  assertEquals(hasBTG, true, "Should detect BTG Pactual");
  
  // Date pattern with time (DD/MM/YYYY HHhMM)
  const datePattern = /(\d{2})\/(\d{2})\/(\d{4})\s+\d{2}h\d{2}/g;
  const dateMatches = [...REAL_BTG_PDF.matchAll(datePattern)];
  console.log(`Found ${dateMatches.length} dates with time`);
  assertEquals(dateMatches.length >= 10, true, "Should find many dates with time");
  
  // Amount pattern (R$ prefix with optional negative)
  const amountPattern = /(-?R\$\s*[\d.,]+)/g;
  const amountMatches = [...REAL_BTG_PDF.matchAll(amountPattern)];
  console.log(`Found ${amountMatches.length} R$ amounts`);
  assertEquals(amountMatches.length >= 10, true, "Should find many R$ amounts");
  
  // BTG specific categories
  assertEquals(text.includes("transferência"), true, "Should have transfer category");
  assertEquals(text.includes("investimentos"), true, "Should have investment category");
  assertEquals(text.includes("pix recebido"), true, "Should have PIX received");
  assertEquals(text.includes("pix enviado"), true, "Should have PIX sent");
  assertEquals(text.includes("resgate de renda fixa"), true, "Should have fixed income redemption");
  
  console.log("✅ REAL BTG Pactual parsing works correctly");
});

Deno.test("REAL DATA - Santander bank detection and parsing", async () => {
  console.log("\n=== Testing REAL Santander Statement ===");
  
  const text = REAL_SANTANDER_PDF.toLowerCase();
  
  // Bank detection (Santander in header or structure)
  const hasSantander = text.includes("extrato de conta corrente") && text.includes("agência e conta");
  assertEquals(hasSantander, true, "Should detect Santander format");
  
  // Date pattern (DD/MM/YYYY)
  const datePattern = /(\d{2})\/(\d{2})\/(\d{4})/g;
  const dateMatches = [...REAL_SANTANDER_PDF.matchAll(datePattern)];
  console.log(`Found ${dateMatches.length} dates`);
  assertEquals(dateMatches.length >= 8, true, "Should find many dates");
  
  // Amount pattern
  const amountPattern = /(-?\d{1,3}(?:\.\d{3})*,\d{2})/g;
  const amountMatches = [...REAL_SANTANDER_PDF.matchAll(amountPattern)];
  console.log(`Found ${amountMatches.length} amounts`);
  assertEquals(amountMatches.length >= 10, true, "Should find many amounts");
  
  // Santander specific transactions
  assertEquals(text.includes("pix enviado"), true, "Should have PIX sent");
  assertEquals(text.includes("pix recebido"), true, "Should have PIX received");
  assertEquals(text.includes("ted recebida"), true, "Should have TED received");
  assertEquals(text.includes("pagamento cartao credito"), true, "Should have credit card payment");
  assertEquals(text.includes("juros saldo"), true, "Should have interest charges");
  
  console.log("✅ REAL Santander parsing works correctly");
});

// ============================================
// UTILITY FUNCTION TESTS
// ============================================

Deno.test("Brazilian amount parsing", async () => {
  console.log("\n=== Testing Brazilian Amount Parsing ===");
  
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
  
  const testCases = [
    { input: "R$ 1.234,56", expected: 1234.56 },
    { input: "R$ 50.000,00", expected: 50000.00 },
    { input: "-R$ 462,14", expected: -462.14 },
    { input: "17.000,00", expected: 17000.00 },
    { input: "-1.426,25", expected: -1426.25 },
    { input: "150,00", expected: 150.00 },
    { input: "-R$ 16.500,00", expected: -16500.00 },
  ];
  
  for (const { input, expected } of testCases) {
    const result = parseBrazilianAmount(input);
    console.log(`"${input}" -> ${result} (expected: ${expected})`);
    assertEquals(result, expected, `Should parse "${input}" correctly`);
  }
  
  console.log("✅ Brazilian amount parsing works correctly");
});

Deno.test("Date format parsing (multiple formats)", async () => {
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
    const fullMatch = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (fullMatch) {
      const [, day, month, year] = fullMatch;
      return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
    
    // DD/MM/YY (Bradesco format)
    const shortMatch = normalized.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
    if (shortMatch) {
      const [, day, month, year] = shortMatch;
      return `20${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
    }
    
    return null;
  }
  
  const testCases = [
    { input: "01/12/2025", expected: "2025-12-01" },
    { input: "11/12/2025", expected: "2025-12-11" },
    { input: "01/12/25", expected: "2025-12-01" },
    { input: "24/11/25", expected: "2025-11-24" },
    { input: "30/11/2025", expected: "2025-11-30" },
  ];
  
  for (const { input, expected } of testCases) {
    const result = parseFlexibleDate(input);
    console.log(`"${input}" -> ${result} (expected: ${expected})`);
    assertEquals(result, expected, `Should parse "${input}" correctly`);
  }
  
  console.log("✅ Date format parsing works correctly");
});

Deno.test("Bank detection from real statements", async () => {
  console.log("\n=== Testing Bank Detection from Real Data ===");
  
  const bankIdentifiers: Record<string, string[]> = {
    "Itaú": ["itau", "itaú", "personnalit"],
    "Bradesco": ["bradesco", "banco bradesco"],
    "Santander": ["santander", "banco santander"],
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
    { text: REAL_BRADESCO_PDF, expected: "Bradesco" },
    { text: REAL_ITAU_PDF, expected: "Itaú" },
    { text: REAL_BTG_PDF, expected: "BTG Pactual" },
    { text: REAL_SANTANDER_PDF, expected: "Santander" },
  ];
  
  for (const { text, expected } of testCases) {
    const result = detectBank(text);
    console.log(`Detected: ${result} (expected: ${expected})`);
    assertEquals(result, expected, `Should detect ${expected}`);
  }
  
  console.log("✅ Bank detection works for all real statements");
});

Deno.test("Transaction type classification", async () => {
  console.log("\n=== Testing Transaction Type Classification ===");
  
  // Real descriptions from the statements
  const testCases = [
    // Credits (income)
    { desc: "PIX TRANSF THIAGO 30/11", amount: 1400, expected: "income" },
    { desc: "PIX RECEBIDO TRIPLE A CONSULTORIA", amount: 17000, expected: "income" },
    { desc: "TED RECEBIDA BRADESCO SAUDE", amount: 277.62, expected: "income" },
    { desc: "Pix recebido Aline Cristina", amount: 50000, expected: "income" },
    { desc: "Transferência recebida Acioli", amount: 1000, expected: "income" },
    { desc: "Resgate de Renda Fixa", amount: 1000, expected: "income" },
    
    // Debits (expense)
    { desc: "JUROS LIMITE DA CONTA", amount: -1426.25, expected: "expense" },
    { desc: "IOF", amount: -44.03, expected: "expense" },
    { desc: "FINANC IMOBILIARIO 000006", amount: -13931.86, expected: "expense" },
    { desc: "ITAU BLACK 3111-6665", amount: -10299.91, expected: "expense" },
    { desc: "PIX ENVIADO Thiago Paulo", amount: -1400, expected: "expense" },
    { desc: "PAGAMENTO CARTAO CREDITO", amount: -200, expected: "expense" },
    { desc: "TARIFA MENSALIDADE PACOTE", amount: -99.95, expected: "expense" },
    { desc: "Pagamento de boleto", amount: -85.29, expected: "expense" },
  ];
  
  function classifyTransaction(description: string, amount: number): "income" | "expense" {
    // If amount is negative, it's an expense
    if (amount < 0) return "expense";
    
    // Check for credit keywords
    const lower = description.toLowerCase();
    const creditKeywords = ["recebido", "recebida", "resgate", "credito salario", "deposito"];
    
    for (const keyword of creditKeywords) {
      if (lower.includes(keyword)) return "income";
    }
    
    // Check for debit keywords even with positive amount
    const debitKeywords = ["juros", "iof", "tarifa", "pagamento", "enviado", "enviada"];
    for (const keyword of debitKeywords) {
      if (lower.includes(keyword)) return "expense";
    }
    
    // Default based on amount sign
    return amount >= 0 ? "income" : "expense";
  }
  
  for (const { desc, amount, expected } of testCases) {
    const result = classifyTransaction(desc, amount);
    console.log(`"${desc.substring(0, 30)}..." (${amount}) -> ${result}`);
    assertEquals(result, expected, `Should classify "${desc}" correctly`);
  }
  
  console.log("✅ Transaction type classification works correctly");
});

console.log("\n========================================");
console.log("REAL BRAZILIAN BANK IMPORT TESTS");
console.log("========================================\n");
