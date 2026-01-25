import { useState, useCallback } from "react";
import * as XLSX from "xlsx";
import { defaultCategories } from "@/data/categories";

export interface SpreadsheetRow {
  [key: string]: string | number | null;
}

export interface ColumnMapping {
  date: string | null;
  description: string | null;
  value: string | null;
  type: string | null;
  category: string | null;
  subcategory: string | null;
  account: string | null;
}

export interface ParsedTransaction {
  id: string;
  date: string | null;
  description: string;
  amount: number;
  type: "income" | "expense";
  category_id: string;
  subcategory_id: string | null;
  account_id: string | null;
  raw_row: SpreadsheetRow;
  has_error: boolean;
  error_message: string | null;
}

export interface SpreadsheetImportState {
  status: "idle" | "reading" | "analyzing" | "ready" | "error";
  fileName: string | null;
  fileSize: number | null;
  headers: string[];
  previewRows: SpreadsheetRow[];
  allRows: SpreadsheetRow[];
  suggestedMapping: ColumnMapping;
  transactions: ParsedTransaction[];
  error: string | null;
}

// Heuristics for column detection
const DATE_PATTERNS = [
  /^data$/i,
  /^date$/i,
  /^dt$/i,
  /^dia$/i,
  /^vencimento$/i,
  /^data\s*(de\s*)?(lan[çc]amento|transa[çc][ãa]o|movimento)?$/i,
];

const DESCRIPTION_PATTERNS = [
  /^descri[çc][ãa]o$/i,
  /^description$/i,
  /^desc$/i,
  /^hist[óo]rico$/i,
  /^detalhe$/i,
  /^memo$/i,
  /^observa[çc][ãa]o$/i,
  /^nome$/i,
  /^estabelecimento$/i,
  /^fornecedor$/i,
];

const VALUE_PATTERNS = [
  /^valor$/i,
  /^value$/i,
  /^amount$/i,
  /^quantia$/i,
  /^total$/i,
  /^montante$/i,
  /^pre[çc]o$/i,
];

const TYPE_PATTERNS = [
  /^tipo$/i,
  /^type$/i,
  /^natureza$/i,
  /^classifica[çc][ãa]o$/i,
  /^entrada.?sa[íi]da$/i,
  /^receita.?despesa$/i,
  /^cr[ée]dito.?d[ée]bito$/i,
];

const CATEGORY_PATTERNS = [
  /^categoria$/i,
  /^category$/i,
  /^cat$/i,
  /^grupo$/i,
  /^classifica[çc][ãa]o$/i,
];

const ACCOUNT_PATTERNS = [
  /^conta$/i,
  /^account$/i,
  /^banco$/i,
  /^cart[ãa]o$/i,
  /^origem$/i,
];

// Income indicators
const INCOME_KEYWORDS = [
  "receita", "entrada", "cr[ée]dito", "income", "credit", "sal[áa]rio",
  "pagamento recebido", "dep[óo]sito", "transfer[êe]ncia recebida", "\\+"
];

// Expense indicators
const EXPENSE_KEYWORDS = [
  "despesa", "sa[íi]da", "d[ée]bito", "expense", "debit", "pagamento",
  "compra", "saque", "transfer[êe]ncia enviada", "\\-"
];

function matchesPattern(value: string, patterns: RegExp[]): boolean {
  return patterns.some(p => p.test(value.trim()));
}

function detectColumnMapping(headers: string[]): ColumnMapping {
  const mapping: ColumnMapping = {
    date: null,
    description: null,
    value: null,
    type: null,
    category: null,
    subcategory: null,
    account: null,
  };

  for (const header of headers) {
    const normalized = header.trim();
    if (!mapping.date && matchesPattern(normalized, DATE_PATTERNS)) {
      mapping.date = header;
    } else if (!mapping.description && matchesPattern(normalized, DESCRIPTION_PATTERNS)) {
      mapping.description = header;
    } else if (!mapping.value && matchesPattern(normalized, VALUE_PATTERNS)) {
      mapping.value = header;
    } else if (!mapping.type && matchesPattern(normalized, TYPE_PATTERNS)) {
      mapping.type = header;
    } else if (!mapping.category && matchesPattern(normalized, CATEGORY_PATTERNS)) {
      mapping.category = header;
    } else if (!mapping.account && matchesPattern(normalized, ACCOUNT_PATTERNS)) {
      mapping.account = header;
    }
  }

  // Fallback: try to detect by content patterns if headers don't match
  return mapping;
}

function parseDate(value: string | number | null): string | null {
  if (value === null || value === undefined || value === "") return null;

  // Handle Excel serial date
  if (typeof value === "number") {
    const excelEpoch = new Date(1899, 11, 30);
    const date = new Date(excelEpoch.getTime() + value * 86400000);
    return date.toISOString().split("T")[0];
  }

  const str = String(value).trim();

  // Try common date formats
  const patterns = [
    // DD/MM/YYYY or DD-MM-YYYY
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/,
    // YYYY-MM-DD
    /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/,
    // DD/MM/YY
    /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2})$/,
  ];

  for (const pattern of patterns) {
    const match = str.match(pattern);
    if (match) {
      let day: number, month: number, year: number;

      if (pattern === patterns[1]) {
        // YYYY-MM-DD
        year = parseInt(match[1]);
        month = parseInt(match[2]);
        day = parseInt(match[3]);
      } else {
        day = parseInt(match[1]);
        month = parseInt(match[2]);
        year = parseInt(match[3]);
        if (year < 100) year += 2000;
      }

      if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
        return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      }
    }
  }

  // Try native Date parsing as last resort
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split("T")[0];
  }

  return null;
}

function parseAmount(value: string | number | null): number | null {
  if (value === null || value === undefined || value === "") return null;

  if (typeof value === "number") return value;

  let str = String(value).trim();

  // Remove currency symbols
  str = str.replace(/[R$€£¥]/gi, "").trim();

  // Handle Brazilian format (1.234,56 -> 1234.56)
  if (/^\-?\d{1,3}(\.\d{3})*(,\d+)?$/.test(str)) {
    str = str.replace(/\./g, "").replace(",", ".");
  }
  // Handle standard format with comma as thousands (1,234.56)
  else if (/^\-?\d{1,3}(,\d{3})*(\.\d+)?$/.test(str)) {
    str = str.replace(/,/g, "");
  }
  // Simple comma as decimal
  else {
    str = str.replace(",", ".");
  }

  const num = parseFloat(str);
  return isNaN(num) ? null : num;
}

function inferType(
  value: string | number | null,
  amount: number | null,
  typeValue: string | null
): "income" | "expense" {
  // If we have explicit type column
  if (typeValue) {
    const normalized = String(typeValue).toLowerCase();
    const incomePattern = new RegExp(INCOME_KEYWORDS.join("|"), "i");
    const expensePattern = new RegExp(EXPENSE_KEYWORDS.join("|"), "i");

    if (incomePattern.test(normalized)) return "income";
    if (expensePattern.test(normalized)) return "expense";
  }

  // Infer from amount sign
  if (amount !== null) {
    return amount >= 0 ? "income" : "expense";
  }

  return "expense"; // Default to expense
}

function matchCategory(
  categoryValue: string | null
): { category_id: string; subcategory_id: string | null } {
  if (!categoryValue) {
    return { category_id: "desconhecidas", subcategory_id: null };
  }

  const normalized = categoryValue
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  // Try to match category
  for (const cat of defaultCategories) {
    const catNormalized = cat.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    if (normalized.includes(catNormalized) || catNormalized.includes(normalized)) {
      return { category_id: cat.id, subcategory_id: null };
    }

    // Check subcategories
    for (const sub of cat.subcategories) {
      const subNormalized = sub.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

      if (normalized.includes(subNormalized) || subNormalized.includes(normalized)) {
        return { category_id: cat.id, subcategory_id: sub.id };
      }
    }
  }

  return { category_id: "desconhecidas", subcategory_id: null };
}

export function useSpreadsheetImport() {
  const [state, setState] = useState<SpreadsheetImportState>({
    status: "idle",
    fileName: null,
    fileSize: null,
    headers: [],
    previewRows: [],
    allRows: [],
    suggestedMapping: {
      date: null,
      description: null,
      value: null,
      type: null,
      category: null,
      subcategory: null,
      account: null,
    },
    transactions: [],
    error: null,
  });

  const reset = useCallback(() => {
    setState({
      status: "idle",
      fileName: null,
      fileSize: null,
      headers: [],
      previewRows: [],
      allRows: [],
      suggestedMapping: {
        date: null,
        description: null,
        value: null,
        type: null,
        category: null,
        subcategory: null,
        account: null,
      },
      transactions: [],
      error: null,
    });
  }, []);

  const parseFile = useCallback(async (file: File) => {
    setState((prev) => ({
      ...prev,
      status: "reading",
      fileName: file.name,
      fileSize: file.size,
      error: null,
    }));

    try {
      const extension = file.name.split(".").pop()?.toLowerCase();

      if (!["xlsx", "xls", "csv"].includes(extension || "")) {
        throw new Error("Formato não suportado. Use XLSX ou CSV.");
      }

      const arrayBuffer = await file.arrayBuffer();
      
      setState((prev) => ({ ...prev, status: "analyzing" }));

      const workbook = XLSX.read(arrayBuffer, { type: "array", cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];

      const jsonData = XLSX.utils.sheet_to_json<SpreadsheetRow>(sheet, {
        header: 1,
        defval: null,
      }) as unknown as (string | number | null)[][];

      if (jsonData.length < 2) {
        throw new Error("A planilha precisa ter pelo menos 1 linha de cabeçalho e 1 linha de dados.");
      }

      // Find header row (first row with at least 2 non-empty cells)
      let headerRowIndex = 0;
      for (let i = 0; i < Math.min(jsonData.length, 5); i++) {
        const row = jsonData[i];
        const nonEmptyCells = row.filter((c) => c !== null && c !== "").length;
        if (nonEmptyCells >= 2) {
          headerRowIndex = i;
          break;
        }
      }

      const headerRow = jsonData[headerRowIndex] as string[];
      const headers = headerRow.map((h, i) => (h ? String(h).trim() : `Coluna ${i + 1}`));

      const dataRows = jsonData.slice(headerRowIndex + 1).filter((row) => {
        const nonEmpty = row.filter((c) => c !== null && c !== "").length;
        return nonEmpty >= 2;
      });

      if (dataRows.length === 0) {
        throw new Error("Nenhuma linha de dados encontrada na planilha.");
      }

      // Convert to objects
      const allRows: SpreadsheetRow[] = dataRows.map((row) => {
        const obj: SpreadsheetRow = {};
        headers.forEach((header, i) => {
          obj[header] = row[i] ?? null;
        });
        return obj;
      });

      const previewRows = allRows.slice(0, 5);
      const suggestedMapping = detectColumnMapping(headers);

      setState({
        status: "ready",
        fileName: file.name,
        fileSize: file.size,
        headers,
        previewRows,
        allRows,
        suggestedMapping,
        transactions: [],
        error: null,
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        status: "error",
        error: error instanceof Error ? error.message : "Erro ao ler arquivo",
      }));
    }
  }, []);

  const applyMapping = useCallback(
    (mapping: ColumnMapping, accountId: string | null = null) => {
      const { allRows } = state;

      if (!mapping.date || !mapping.description || !mapping.value) {
        setState((prev) => ({
          ...prev,
          error: "Campos obrigatórios: Data, Descrição e Valor",
        }));
        return [];
      }

      const transactions: ParsedTransaction[] = allRows.map((row, index) => {
        const rawDate = row[mapping.date!];
        const rawDescription = row[mapping.description!];
        const rawValue = row[mapping.value!];
        const rawType = mapping.type ? row[mapping.type] : null;
        const rawCategory = mapping.category ? row[mapping.category] : null;

        const parsedDate = parseDate(rawDate);
        const parsedAmount = parseAmount(rawValue);
        const description = rawDescription ? String(rawDescription).trim() : "";
        const type = inferType(rawType, parsedAmount, rawType ? String(rawType) : null);
        const { category_id, subcategory_id } = matchCategory(
          rawCategory ? String(rawCategory) : null
        );

        // Determine errors
        let hasError = false;
        let errorMessage: string | null = null;

        if (!parsedDate) {
          hasError = true;
          errorMessage = "Data inválida";
        } else if (parsedAmount === null) {
          hasError = true;
          errorMessage = "Valor inválido";
        } else if (!description) {
          hasError = true;
          errorMessage = "Descrição vazia";
        }

        return {
          id: `row-${index}`,
          date: parsedDate,
          description,
          amount: Math.abs(parsedAmount || 0),
          type,
          category_id,
          subcategory_id,
          account_id: accountId,
          raw_row: row,
          has_error: hasError,
          error_message: errorMessage,
        };
      });

      setState((prev) => ({ ...prev, transactions, error: null }));
      return transactions;
    },
    [state]
  );

  const updateTransaction = useCallback(
    (id: string, updates: Partial<ParsedTransaction>) => {
      setState((prev) => ({
        ...prev,
        transactions: prev.transactions.map((tx) =>
          tx.id === id ? { ...tx, ...updates, has_error: false, error_message: null } : tx
        ),
      }));
    },
    []
  );

  const removeTransaction = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      transactions: prev.transactions.filter((tx) => tx.id !== id),
    }));
  }, []);

  const getSummary = useCallback(() => {
    const { transactions } = state;
    const validTransactions = transactions.filter((t) => !t.has_error);
    const income = validTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    const expense = validTransactions
      .filter((t) => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    return {
      total: transactions.length,
      valid: validTransactions.length,
      errors: transactions.length - validTransactions.length,
      income,
      expense,
      balance: income - expense,
    };
  }, [state]);

  return {
    state,
    parseFile,
    applyMapping,
    updateTransaction,
    removeTransaction,
    getSummary,
    reset,
  };
}
