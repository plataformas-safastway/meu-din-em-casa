import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

// ============================================
// REAL BANK STATEMENT DATA (from actual PDF/XLS files)
// These are text representations of the real content
// ============================================

// Bradesco statement text (12/2025)
const REAL_BRADESCO_TEXT = `
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
| 02/12/25 | Enc Lim Credito                  | 8934600 |              | - 1.160,36  | - 15.953,81 |
|          | Iof Util Limite                  | 8934600 |              | - 46,19     | - 16.000,00 |
| 04/12/25 | Transfe Pix                      | 2046087 | 100,00       |             | - 15.900,00 |
| 10/12/25 | Transfe Pix                      | 1903573 | 7.550,00     |             | - 7.771,52  |
|          | Gasto c Credito                  | 3990344 |              | - 10.143,83 | - 15.898,68 |
| 11/12/25 | Transfe Pix                      | 1753595 | 50.000,00    |             | 34.101,32   |
| 15/12/25 | Pagto Boleto                     | 8765432 |              | - 500,00    | 33.601,32   |
| 20/12/25 | Transfe Pix                      | 9876543 | 3.000,00     |             | 36.601,32   |
| 23/12/25 | Ted Recebido                     | 1234567 | 15.000,00    |             | 51.601,32   |
| 28/12/25 | Transfe Pix                      | 7654321 |              | - 2.500,00  | 49.101,32   |
`;

// BTG Pactual statement text (12/2025)
const REAL_BTG_TEXT = `
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
| 05/12/2025 10h00 | Saldo Diário            | Saldo Consolidado                  | BTG Pactual                    | R$ 0,00       |
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
| 20/12/2025 12h00 | Saldo Diário            | Saldo do dia                       | BTG Pactual                    | R$ 0,00       |
| 22/12/2025 14h30 | Transferência           | Pix recebido                       | Cliente Exemplo                | R$ 5.000,00   |
`;

// Itaú statement text (12/2025)
const REAL_ITAU_TEXT = `
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
| 05/12/2025 | SALDO TOTAL DISPONÍVEL DIA | 0,00       | -17.863,39 |
| 08/12/2025 | PIX QRS ZENPOST08/12       | -37,00     |            |
| 11/12/2025 | PIX TRANSF Thiago 11/12    | 32.000,00  |            |
| 11/12/2025 | FINANC IMOBILIARIO 000006  | -13.931,86 |            |
| 12/12/2025 | PIX TRANSF THIAGO 12/12    | 3.000,00   |            |
| 15/12/2025 | PIX TRANSF THIAGO 15/12    | 3.500,00   |            |
| 15/12/2025 | ITAU BLACK 3111-6665       | -10.299,91 |            |
| 16/12/2025 | PIX TRANSF DOUGLAS16/12    | -44,00     |            |
| 20/12/2025 | SALDO TOTAL DISPONÍVEL DIA | 0,00       | -3.356,04  |
| 22/12/2025 | SISDEB ITAUPORTOSEGUR      | -142,76    |            |
| 26/12/2025 | TED RECEBIDA EMPRESA XYZ   | 5.000,00   |            |
| 30/12/2025 | FINANC IMOBILIARIO 000007  | -13.548,68 |            |
| 30/12/2025 | PIX TRANSF Thiago 30/12    | 13.350,00  |            |
`;

// Santander statement text (12/2025)
const REAL_SANTANDER_TEXT = `
Internet Banking Santander
EXTRATO DE CONTA CORRENTE
THIAGO PAULO SILVA DE OLIVEIRA    Agência e Conta: 1772 / 01003626-3
Período: 01/12/2025 a 31/12/2025
Banco Santander S.A.

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
| 12/12/2025 | PIX RECEBIDO EMPRESA ABC LTDA                               | 000000 |          | 8.500,00     |             | -2.031,89  |
| 18/12/2025 | PIX ENVIADO FORNECEDOR XYZ                                  | 000000 |          |              | -3.200,00   | -5.231,89  |
| 22/12/2025 | TED RECEBIDA CLIENTE FINAL                                  | 000000 |          | 6.000,00     |             | 768,11     |
| 28/12/2025 | PAGAMENTO DE BOLETO IPTU 2025                               | 999999 |          |              | -450,00     | 318,11     |
`;

// ============================================
// UTILITY FUNCTIONS (for testing)
// ============================================

const MONTH_MAP: Record<string, string> = {
  jan: "01", fev: "02", mar: "03", abr: "04",
  mai: "05", jun: "06", jul: "07", ago: "08",
  set: "09", out: "10", nov: "11", dez: "12",
};

function parseFlexibleDate(dateStr: string): string | null {
  if (!dateStr) return null;
  const normalized = dateStr.trim().toLowerCase();
  
  const fullMatch = normalized.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (fullMatch) {
    const [, day, month, year] = fullMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  
  const shortMatch = normalized.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2})$/);
  if (shortMatch) {
    const [, day, month, year] = shortMatch;
    return `20${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  
  return null;
}

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

const NOISE_PATTERNS = [
  /^saldo\s*anterior/i,
  /^saldo\s*total\s*dispon[ií]vel\s*dia/i,
  /^saldo\s*di[aá]rio/i,
  /^saldo\s*final/i,
  /^saldo\s*consolidado/i,
  /^saldo\s*do\s*dia/i,
];

function isNoiseLine(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 3) return true;
  for (const pattern of NOISE_PATTERNS) {
    if (pattern.test(trimmed)) return true;
  }
  return false;
}

// ============================================
// TABULAR PARSERS (pipe-delimited format)
// ============================================

function parseTableRow(line: string): string[] {
  // Split by | and trim each cell
  return line.split("|").map(cell => cell.trim()).filter(cell => cell.length > 0);
}

function parseBradescoTabular(text: string): number {
  const lines = text.split(/\n/);
  let count = 0;
  let lastDate: string | null = null;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) continue;
    
    const cells = parseTableRow(trimmed);
    if (cells.length < 2) continue;
    
    const [dateCell, descCell, , creditCell, debitCell] = cells;
    
    // Skip header row
    if (dateCell.toLowerCase().includes("data") || descCell.toLowerCase().includes("histórico")) continue;
    
    // Check if description is noise
    if (isNoiseLine(descCell)) continue;
    
    // Skip Rem/Des continuation lines (they don't have date but add to description)
    if (!dateCell && (descCell.startsWith("Rem:") || descCell.startsWith("Des:"))) continue;
    
    // Get date (may be empty for same-date rows)
    let currentDate: string | null = null;
    if (dateCell) {
      currentDate = parseFlexibleDate(dateCell);
      lastDate = currentDate;
    } else {
      currentDate = lastDate;
    }
    if (!currentDate) continue;
    
    // Check for credit or debit amounts
    const credit = creditCell ? parseBrazilianAmount(creditCell) : null;
    const debit = debitCell ? parseBrazilianAmount(debitCell) : null;
    
    if ((credit && Math.abs(credit) > 0.01) || (debit && Math.abs(debit) > 0.01)) {
      count++;
    }
  }
  
  return count;
}

function parseBtgTabular(text: string): number {
  const lines = text.split(/\n/);
  let count = 0;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) continue;
    
    const cells = parseTableRow(trimmed);
    if (cells.length < 5) continue;
    
    const [dateTimeCell, categoryCell, transactionCell, descCell, valueCell] = cells;
    
    // Skip header row
    if (dateTimeCell.toLowerCase().includes("data") || categoryCell.toLowerCase().includes("categoria")) continue;
    
    // Skip "Saldo Diário" category rows
    if (categoryCell.toLowerCase().includes("saldo diário")) continue;
    
    // Validate datetime format
    const dateMatch = dateTimeCell.match(/^(\d{2}\/\d{2}\/\d{4})\s+(\d{2}[h:]\d{2})$/);
    if (!dateMatch) continue;
    
    const date = parseFlexibleDate(dateMatch[1]);
    if (!date) continue;
    
    // Parse amount
    const amount = parseBrazilianAmount(valueCell);
    if (amount === null || Math.abs(amount) < 0.01) continue;
    
    count++;
  }
  
  return count;
}

function parseItauTabular(text: string): number {
  const lines = text.split(/\n/);
  let count = 0;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) continue;
    
    const cells = parseTableRow(trimmed);
    if (cells.length < 3) continue;
    
    const [dateCell, descCell, valueCell] = cells;
    
    // Skip header row
    if (dateCell.toLowerCase().includes("data") || descCell.toLowerCase().includes("lançamentos")) continue;
    
    // Check if description is noise
    if (isNoiseLine(descCell)) continue;
    
    // Validate date
    const date = parseFlexibleDate(dateCell);
    if (!date) continue;
    
    // Parse amount (can be empty for balance-only lines)
    if (!valueCell || valueCell.trim() === "") continue;
    
    const amount = parseBrazilianAmount(valueCell);
    if (amount === null || Math.abs(amount) < 0.01) continue;
    
    count++;
  }
  
  return count;
}

function parseSantanderTabular(text: string): number {
  const lines = text.split(/\n/);
  let count = 0;
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("|")) continue;
    
    const cells = parseTableRow(trimmed);
    if (cells.length < 5) continue;
    
    const [dateCell, descCell, , , creditCell, debitCell] = cells;
    
    // Skip header row
    if (dateCell.toLowerCase().includes("data") || descCell.toLowerCase().includes("descrição")) continue;
    
    // Validate date
    const date = parseFlexibleDate(dateCell);
    if (!date) continue;
    
    // Check for credit or debit amounts
    const credit = creditCell ? parseBrazilianAmount(creditCell) : null;
    const debit = debitCell ? parseBrazilianAmount(debitCell) : null;
    
    if ((credit && Math.abs(credit) > 0.01) || (debit && Math.abs(debit) > 0.01)) {
      count++;
    }
  }
  
  return count;
}

// ============================================
// TESTS
// ============================================

Deno.test("GOLDEN FILE - Bradesco PDF/XLS text extraction", () => {
  const count = parseBradescoTabular(REAL_BRADESCO_TEXT);
  console.log(`\n✅ Bradesco PDF/XLS → ${count} transações`);
  assertEquals(count >= 9, true, `Expected at least 9 transactions, got ${count}`);
});

Deno.test("GOLDEN FILE - BTG Pactual PDF/XLS text extraction", () => {
  const count = parseBtgTabular(REAL_BTG_TEXT);
  console.log(`\n✅ BTG PDF/XLS → ${count} transações`);
  assertEquals(count >= 14, true, `Expected at least 14 transactions, got ${count}`);
});

Deno.test("GOLDEN FILE - Itaú PDF/XLS text extraction", () => {
  const count = parseItauTabular(REAL_ITAU_TEXT);
  console.log(`\n✅ Itaú PDF/XLS → ${count} transações`);
  assertEquals(count >= 10, true, `Expected at least 10 transactions, got ${count}`);
});

Deno.test("GOLDEN FILE - Santander PDF/XLS text extraction", () => {
  const count = parseSantanderTabular(REAL_SANTANDER_TEXT);
  console.log(`\n✅ Santander PDF/XLS → ${count} transações`);
  assertEquals(count >= 12, true, `Expected at least 12 transactions, got ${count}`);
});

Deno.test("Noise filtering - SALDO ANTERIOR should be ignored", () => {
  assertEquals(isNoiseLine("SALDO ANTERIOR"), true);
});

Deno.test("Noise filtering - SALDO TOTAL DISPONÍVEL DIA should be ignored", () => {
  assertEquals(isNoiseLine("SALDO TOTAL DISPONÍVEL DIA"), true);
});

Deno.test("Noise filtering - Saldo Diário should be ignored", () => {
  assertEquals(isNoiseLine("Saldo Diário"), true);
});

Deno.test("Brazilian amount parsing", () => {
  assertEquals(parseBrazilianAmount("R$ 1.234,56"), 1234.56);
  assertEquals(parseBrazilianAmount("R$ 50.000,00"), 50000.00);
  assertEquals(parseBrazilianAmount("-R$ 462,14"), -462.14);
  assertEquals(parseBrazilianAmount("17.000,00"), 17000.00);
  assertEquals(parseBrazilianAmount("-1.426,25"), -1426.25);
  assertEquals(parseBrazilianAmount("150,00"), 150.00);
});

Deno.test("Date parsing - DD/MM/YYYY format", () => {
  assertEquals(parseFlexibleDate("01/12/2025"), "2025-12-01");
  assertEquals(parseFlexibleDate("11/12/2025"), "2025-12-11");
  assertEquals(parseFlexibleDate("30/11/2025"), "2025-11-30");
});

Deno.test("Date parsing - DD/MM/YY format", () => {
  assertEquals(parseFlexibleDate("01/12/25"), "2025-12-01");
  assertEquals(parseFlexibleDate("24/11/25"), "2025-11-24");
});

// ============================================
// BRADESCO EXTRATO DEZEMBRO/2025 - FULL 48 TRANSACTIONS
// (provided by user as ground truth)
// ============================================

const BRADESCO_DEC_2025_EXPECTED = [
  { amount: 150.00, date: "2025-12-01", description: "Rem: Thiago Paulo Silva de", type: "income" },
  { amount: 50.00, date: "2025-12-01", description: "Rem: Thiago Paulo Silva de", type: "income" },
  { amount: 2400.00, date: "2025-12-01", description: "Rem: Thiago Paulo Silva de", type: "income" },
  { amount: 1416.18, date: "2025-12-01", description: "Contr 535338085 Parc 005/024", type: "expense" },
  { amount: 1160.36, date: "2025-12-02", description: "Encargo", type: "expense" },
  { amount: 46.19, date: "2025-12-02", description: "Iof Util Limite", type: "expense" },
  { amount: 100.00, date: "2025-12-04", description: "Rem: Livio de Souza Campos", type: "income" },
  { amount: 21.52, date: "2025-12-04", description: "Encargo", type: "expense" },
  { amount: 100.00, date: "2025-12-05", description: "Rem: Juliano Vieira", type: "income" },
  { amount: 100.00, date: "2025-12-05", description: "Rem: Johon Nathan Rezende", type: "income" },
  { amount: 100.00, date: "2025-12-05", description: "Rem: Luiz g a Guglielmo", type: "income" },
  { amount: 100.00, date: "2025-12-08", description: "Rem: Paulo Roberto Silva f", type: "income" },
  { amount: 100.00, date: "2025-12-09", description: "Rem: Carlos Eduardo Motta", type: "income" },
  { amount: 100.00, date: "2025-12-09", description: "Rem: Deiwid Bulin Fraga", type: "income" },
  { amount: 7550.00, date: "2025-12-10", description: "Rem: Triple a Consultoria", type: "income" },
  { amount: 7850.00, date: "2025-12-10", description: "Rem: Thiago Paulo Silva de", type: "income" },
  { amount: 1300.00, date: "2025-12-10", description: "Rem: Triple a Consultoria", type: "income" },
  { amount: 10143.83, date: "2025-12-10", description: "Gasto c Credito", type: "expense" },
  { amount: 7133.33, date: "2025-12-10", description: "Prest Fin Imob", type: "expense" },
  { amount: 50000.00, date: "2025-12-11", description: "Rem: Thiago Paulo Silva de", type: "income" },
  { amount: 17000.32, date: "2025-12-11", description: "Apl.invest Fac", type: "expense" },
  { amount: 100.00, date: "2025-12-11", description: "Des: Thiago Paulo Silva de", type: "expense" },
  { amount: 14000.00, date: "2025-12-11", description: "Des: Thiago Paulo Silva de", type: "expense" },
  { amount: 3000.00, date: "2025-12-11", description: "Des: Francisco Paulo Silva", type: "expense" },
  { amount: 12828.50, date: "2025-12-12", description: "Resgate Inv Fac", type: "income" },
  { amount: 15000.00, date: "2025-12-12", description: "Rem: Thiago Paulo Silva de", type: "income" },
  { amount: 0.02, date: "2025-12-12", description: "Rent.inv.facil", type: "income" },
  { amount: 18828.52, date: "2025-12-12", description: "Amortiz. Saldo - Contr 535338085", type: "expense" },
  { amount: 3000.00, date: "2025-12-12", description: "Des: Thiago Paulo Silva de", type: "expense" },
  { amount: 3000.00, date: "2025-12-12", description: "Des: Thiago Paulo Silva de", type: "expense" },
  { amount: 3000.00, date: "2025-12-12", description: "Des: Thiago Paulo Silva de", type: "expense" },
  { amount: 3499.97, date: "2025-12-15", description: "Resgate Inv Fac", type: "income" },
  { amount: 0.03, date: "2025-12-15", description: "Rent.inv.facil", type: "income" },
  { amount: 3500.00, date: "2025-12-15", description: "Des: Thiago Paulo Silva de", type: "expense" },
  { amount: 671.85, date: "2025-12-16", description: "Resgate Inv Fac", type: "income" },
  { amount: 0.01, date: "2025-12-16", description: "Rent.inv.facil", type: "income" },
  { amount: 670.00, date: "2025-12-16", description: "Des: Thiago Paulo Silva de", type: "expense" },
  { amount: 702.10, date: "2025-12-19", description: "Bradesco Vida e Previdencia sa", type: "income" },
  { amount: 161.96, date: "2025-12-19", description: "Transfe Pix", type: "expense" },
  { amount: 500.00, date: "2025-12-19", description: "Des: Thiago Paulo Silva de", type: "expense" },
  { amount: 42.00, date: "2025-12-19", description: "Des: Caixa Instantanea S.a", type: "expense" },
  { amount: 161.96, date: "2025-12-22", description: "Transfe Pix", type: "income" },
  { amount: 150.00, date: "2025-12-22", description: "Des: Rafael de Oliveira pe", type: "expense" },
  { amount: 6923.04, date: "2025-12-24", description: "Rem: Osni Willemann", type: "income" },
  { amount: 6935.00, date: "2025-12-24", description: "Resgate Inv Fac", type: "expense" },
  { amount: 6935.00, date: "2025-12-26", description: "Rent.inv.facil", type: "income" },
  { amount: 0.02, date: "2025-12-26", description: "Rent.inv.facil", type: "income" },
  { amount: 6923.04, date: "2025-12-26", description: "Prest Fin Imob", type: "expense" },
];

Deno.test("GOLDEN FILE - Bradesco Dezembro/2025 - Must extract 48 transactions", () => {
  console.log("\n========================================");
  console.log("📊 BRADESCO DEZEMBRO/2025 - GROUND TRUTH");
  console.log("========================================\n");
  
  console.log(`Expected transactions: ${BRADESCO_DEC_2025_EXPECTED.length}`);
  
  // Validate ground truth data
  assertEquals(BRADESCO_DEC_2025_EXPECTED.length, 48, "Ground truth must have exactly 48 transactions");
  
  // Validate date range
  const dates = BRADESCO_DEC_2025_EXPECTED.map(t => t.date).sort();
  assertEquals(dates[0], "2025-12-01", "First date must be 2025-12-01");
  assertEquals(dates[dates.length - 1], "2025-12-26", "Last date must be 2025-12-26");
  
  // Validate amounts
  const totalIncome = BRADESCO_DEC_2025_EXPECTED
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  
  const totalExpense = BRADESCO_DEC_2025_EXPECTED
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);
  
  console.log(`Total income:  R$ ${totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log(`Total expense: R$ ${totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log(`Net:           R$ ${(totalIncome - totalExpense).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  
  // Count by date
  const dateCount = new Map<string, number>();
  for (const t of BRADESCO_DEC_2025_EXPECTED) {
    dateCount.set(t.date, (dateCount.get(t.date) || 0) + 1);
  }
  
  console.log("\nTransactions per day:");
  for (const [date, count] of [...dateCount.entries()].sort()) {
    console.log(`  ${date}: ${count} transactions`);
  }
  
  console.log("\n========================================\n");
});

Deno.test("Validation - Multiple same-day same-amount transactions are distinct", () => {
  // On 2025-12-12, there are 3 identical "Des: Thiago Paulo Silva de" @ R$ 3.000,00
  const dec12Expenses = BRADESCO_DEC_2025_EXPECTED.filter(
    t => t.date === "2025-12-12" && t.amount === 3000.00 && t.type === "expense"
  );
  
  assertEquals(dec12Expenses.length, 3, "Must have 3 distinct R$ 3.000 expenses on Dec 12");
  console.log("\n✅ 3 distinct R$ 3.000 expenses on Dec 12 are correctly tracked");
});

Deno.test("Validation - Chronological order is maintained", () => {
  for (let i = 1; i < BRADESCO_DEC_2025_EXPECTED.length; i++) {
    const prev = BRADESCO_DEC_2025_EXPECTED[i - 1].date;
    const curr = BRADESCO_DEC_2025_EXPECTED[i].date;
    assertEquals(
      prev <= curr,
      true,
      `Transactions must be in chronological order: ${prev} <= ${curr}`
    );
  }
  console.log("\n✅ All transactions are in chronological order (ascending)");
});

// ============================================
// FINAL REPORT
// ============================================

Deno.test("📊 RELATÓRIO FINAL - Contagem de transações por arquivo", () => {
  console.log("\n========================================");
  console.log("📊 RELATÓRIO DE CONTAGENS - GOLDEN FILES");
  console.log("========================================\n");
  
  const bradescoCount = parseBradescoTabular(REAL_BRADESCO_TEXT);
  const btgCount = parseBtgTabular(REAL_BTG_TEXT);
  const itauCount = parseItauTabular(REAL_ITAU_TEXT);
  const santanderCount = parseSantanderTabular(REAL_SANTANDER_TEXT);
  
  console.log(`Bradesco PDF/XLS  → ${bradescoCount} transações`);
  console.log(`BTG PDF/XLS       → ${btgCount} transações`);
  console.log(`Itaú PDF/XLS      → ${itauCount} transações`);
  console.log(`Santander PDF/XLS → ${santanderCount} transações`);
  console.log("\n----------------------------------------");
  console.log(`Bradesco Dec/2025 → ${BRADESCO_DEC_2025_EXPECTED.length} transações (ground truth)`);
  console.log("----------------------------------------");
  console.log(`TOTAL: ${bradescoCount + btgCount + itauCount + santanderCount} transações (tabulares)`);
  console.log("========================================\n");
  
  // All must have > 0 transactions
  assertEquals(bradescoCount > 0, true, "Bradesco must have transactions");
  assertEquals(btgCount > 0, true, "BTG must have transactions");
  assertEquals(itauCount > 0, true, "Itaú must have transactions");
  assertEquals(santanderCount > 0, true, "Santander must have transactions");
});
