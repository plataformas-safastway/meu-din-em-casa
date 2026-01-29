/**
 * Secure Excel Parser using ExcelJS
 * 
 * This module replaces the vulnerable xlsx library with ExcelJS
 * to address Prototype Pollution and ReDoS vulnerabilities.
 * 
 * Security features:
 * - File size limits (5MB default)
 * - Row count limits (50000 rows default)
 * - Input sanitization
 * - No prototype pollution vectors
 */

import ExcelJS from 'exceljs';

export interface ParsedRow {
  [key: string]: string | number | null;
}

export interface ParseOptions {
  /** Maximum file size in bytes (default: 5MB) */
  maxFileSize?: number;
  /** Maximum number of rows to parse (default: 50000) */
  maxRows?: number;
  /** Sheet index or name to parse (default: 0 = first sheet) */
  sheetIndex?: number | string;
  /** Whether to use first row as headers (default: true) */
  headerRow?: boolean;
}

export interface ParseResult {
  headers: string[];
  rows: ParsedRow[];
  sheetName: string;
  totalRows: number;
  truncated: boolean;
}

const DEFAULT_OPTIONS: Required<ParseOptions> = {
  maxFileSize: 5 * 1024 * 1024, // 5MB
  maxRows: 50000,
  sheetIndex: 0,
  headerRow: true,
};

/**
 * Sanitize a cell value to prevent prototype pollution
 */
function sanitizeValue(value: ExcelJS.CellValue): string | number | null {
  if (value === null || value === undefined) {
    return null;
  }

  // Handle rich text
  if (typeof value === 'object' && 'richText' in value) {
    return (value.richText as ExcelJS.RichText[])
      .map(rt => rt.text)
      .join('');
  }

  // Handle dates
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }

  // Handle formula results
  if (typeof value === 'object' && 'result' in value) {
    return sanitizeValue((value as ExcelJS.CellFormulaValue).result);
  }

  // Handle error values
  if (typeof value === 'object' && 'error' in value) {
    return null;
  }

  // Handle hyperlinks
  if (typeof value === 'object' && 'hyperlink' in value) {
    return (value as ExcelJS.CellHyperlinkValue).text || null;
  }

  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'boolean') {
    return value ? 1 : 0;
  }

  // Return string value
  return String(value);
}

/**
 * Sanitize header name to prevent prototype pollution attacks
 */
function sanitizeHeaderName(header: string | null | undefined, index: number): string {
  if (!header || typeof header !== 'string') {
    return `Coluna ${index + 1}`;
  }

  // Remove potentially dangerous property names
  const dangerous = ['__proto__', 'constructor', 'prototype'];
  const sanitized = header.trim();
  
  if (dangerous.includes(sanitized.toLowerCase())) {
    return `Coluna ${index + 1}`;
  }

  return sanitized || `Coluna ${index + 1}`;
}

/**
 * Parse an Excel file (XLSX, XLS) or CSV securely
 */
export async function parseExcelFile(
  file: File,
  options: ParseOptions = {}
): Promise<ParseResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Security: Check file size
  if (file.size > opts.maxFileSize) {
    throw new Error(
      `Arquivo muito grande. Máximo permitido: ${(opts.maxFileSize / 1024 / 1024).toFixed(1)}MB`
    );
  }

  const extension = file.name.split('.').pop()?.toLowerCase();
  
  if (!['xlsx', 'xls', 'csv'].includes(extension || '')) {
    throw new Error('Formato não suportado. Use XLSX ou CSV.');
  }

  const arrayBuffer = await file.arrayBuffer();
  const workbook = new ExcelJS.Workbook();

  if (extension === 'csv') {
    // For CSV, we need to read as text and parse
    const text = await file.text();
    const rows = text.split('\n').map(line => 
      line.split(',').map(cell => cell.trim().replace(/^"|"$/g, ''))
    );
    const worksheet = workbook.addWorksheet('Sheet1');
    rows.forEach(row => worksheet.addRow(row));
  } else {
    await workbook.xlsx.load(arrayBuffer);
  }

  // Get the target worksheet
  let worksheet: ExcelJS.Worksheet | undefined;
  
  if (typeof opts.sheetIndex === 'string') {
    // Find by name
    worksheet = workbook.worksheets.find(
      ws => ws.name.toLowerCase().includes(opts.sheetIndex.toString().toLowerCase())
    );
  }
  
  if (!worksheet) {
    const index = typeof opts.sheetIndex === 'number' ? opts.sheetIndex : 0;
    worksheet = workbook.worksheets[index];
  }

  if (!worksheet) {
    throw new Error('Planilha não encontrada no arquivo');
  }

  // Parse rows
  const allRows: (string | number | null)[][] = [];
  let rowCount = 0;

  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowCount >= opts.maxRows) return;
    
    const values: (string | number | null)[] = [];
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      values[colNumber - 1] = sanitizeValue(cell.value);
    });
    
    allRows.push(values);
    rowCount++;
  });

  if (allRows.length === 0) {
    throw new Error('Planilha vazia ou sem dados válidos');
  }

  // Extract headers
  let headers: string[];
  let dataRows: (string | number | null)[][];

  if (opts.headerRow) {
    headers = allRows[0].map((h, i) => sanitizeHeaderName(String(h || ''), i));
    dataRows = allRows.slice(1);
  } else {
    headers = allRows[0].map((_, i) => `Coluna ${i + 1}`);
    dataRows = allRows;
  }

  // Convert to objects
  const rows: ParsedRow[] = dataRows
    .filter(row => row.some(cell => cell !== null && cell !== ''))
    .map(row => {
      const obj: ParsedRow = {};
      headers.forEach((header, i) => {
        obj[header] = row[i] ?? null;
      });
      return obj;
    });

  return {
    headers,
    rows,
    sheetName: worksheet.name,
    totalRows: rows.length,
    truncated: rowCount >= opts.maxRows,
  };
}

/**
 * Parse Excel file and return raw array data (for compatibility)
 */
export async function parseExcelToArray(
  file: File,
  options: ParseOptions = {}
): Promise<{
  headers: string[];
  data: (string | number | null)[][];
  sheetName: string;
}> {
  const result = await parseExcelFile(file, { ...options, headerRow: true });
  
  const data = result.rows.map(row => 
    result.headers.map(h => row[h])
  );

  return {
    headers: result.headers,
    data,
    sheetName: result.sheetName,
  };
}

/**
 * Export data to Excel file
 */
export async function exportToExcel(
  data: Record<string, unknown>[],
  filename: string,
  sheetName: string = 'Dados'
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  if (data.length === 0) {
    throw new Error('Nenhum dado para exportar');
  }

  // Get headers from first row
  const headers = Object.keys(data[0]);
  
  // Add header row
  worksheet.addRow(headers);
  
  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  };

  // Add data rows
  data.forEach(row => {
    worksheet.addRow(headers.map(h => row[h]));
  });

  // Auto-fit columns
  worksheet.columns.forEach(column => {
    let maxLength = 0;
    column.eachCell?.({ includeEmpty: true }, cell => {
      const cellLength = cell.value ? String(cell.value).length : 0;
      maxLength = Math.max(maxLength, cellLength);
    });
    column.width = Math.min(Math.max(maxLength + 2, 10), 50);
  });

  // Generate buffer and download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
