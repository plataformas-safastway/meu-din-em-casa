/**
 * Utilitários para testes E2E
 * Helpers para simulação de usuário, validações e evidências
 */

// ===== TIPOS =====
export interface TestResult {
  testName: string;
  status: "PASS" | "FAIL" | "NOT_IMPLEMENTED" | "SKIPPED";
  steps: TestStep[];
  duration: number;
  error?: string;
  screenshots?: string[];
}

export interface TestStep {
  description: string;
  expected: string;
  actual: string;
  status: "PASS" | "FAIL";
  timestamp: Date;
}

export interface TestReport {
  runId: string;
  timestamp: Date;
  totalTests: number;
  passed: number;
  failed: number;
  notImplemented: number;
  skipped: number;
  results: TestResult[];
  gaps: string[];
  recommendations: string[];
}

// ===== CLASSE TEST RUNNER =====
export class TestRunner {
  private results: TestResult[] = [];
  private currentTest: TestResult | null = null;
  private startTime: number = 0;

  startTest(testName: string) {
    this.startTime = Date.now();
    this.currentTest = {
      testName,
      status: "PASS",
      steps: [],
      duration: 0,
      screenshots: []
    };
  }

  addStep(description: string, expected: string, actual: string, passed: boolean) {
    if (!this.currentTest) return;
    
    this.currentTest.steps.push({
      description,
      expected,
      actual,
      status: passed ? "PASS" : "FAIL",
      timestamp: new Date()
    });

    if (!passed) {
      this.currentTest.status = "FAIL";
    }
  }

  markNotImplemented(reason: string) {
    if (!this.currentTest) return;
    this.currentTest.status = "NOT_IMPLEMENTED";
    this.currentTest.error = reason;
  }

  endTest(error?: string) {
    if (!this.currentTest) return;
    
    this.currentTest.duration = Date.now() - this.startTime;
    if (error) {
      this.currentTest.status = "FAIL";
      this.currentTest.error = error;
    }
    
    this.results.push(this.currentTest);
    this.currentTest = null;
  }

  generateReport(): TestReport {
    const passed = this.results.filter(r => r.status === "PASS").length;
    const failed = this.results.filter(r => r.status === "FAIL").length;
    const notImplemented = this.results.filter(r => r.status === "NOT_IMPLEMENTED").length;
    const skipped = this.results.filter(r => r.status === "SKIPPED").length;

    const gaps = this.results
      .filter(r => r.status === "NOT_IMPLEMENTED")
      .map(r => `${r.testName}: ${r.error}`);

    const recommendations = this.generateRecommendations();

    return {
      runId: `QA-${Date.now()}`,
      timestamp: new Date(),
      totalTests: this.results.length,
      passed,
      failed,
      notImplemented,
      skipped,
      results: this.results,
      gaps,
      recommendations
    };
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const failedTests = this.results.filter(r => r.status === "FAIL");

    // Agrupar por severidade
    const criticalFailures = failedTests.filter(t => 
      t.testName.includes("auth") || 
      t.testName.includes("security") ||
      t.testName.includes("login")
    );

    if (criticalFailures.length > 0) {
      recommendations.push(`CRÍTICO: ${criticalFailures.length} falhas em testes de autenticação/segurança`);
    }

    const highFailures = failedTests.filter(t =>
      t.testName.includes("transaction") ||
      t.testName.includes("import") ||
      t.testName.includes("budget")
    );

    if (highFailures.length > 0) {
      recommendations.push(`ALTO: ${highFailures.length} falhas em funcionalidades core`);
    }

    return recommendations;
  }

  getResults(): TestResult[] {
    return this.results;
  }
}

// ===== HELPERS DE INTERAÇÃO =====
export async function fillInput(label: string, value: string) {
  const input = screen.getByLabelText(label);
  fireEvent.change(input, { target: { value } });
  await waitFor(() => expect(input).toHaveValue(value));
}

export async function clickButton(text: string) {
  const button = screen.getByRole("button", { name: new RegExp(text, "i") });
  fireEvent.click(button);
}

export async function clickLink(text: string) {
  const link = screen.getByRole("link", { name: new RegExp(text, "i") });
  fireEvent.click(link);
}

export async function waitForText(text: string, timeout = 5000) {
  await waitFor(() => {
    expect(screen.getByText(new RegExp(text, "i"))).toBeInTheDocument();
  }, { timeout });
}

export async function waitForElementToDisappear(text: string, timeout = 5000) {
  await waitFor(() => {
    expect(screen.queryByText(new RegExp(text, "i"))).not.toBeInTheDocument();
  }, { timeout });
}

export function elementExists(text: string): boolean {
  return screen.queryByText(new RegExp(text, "i")) !== null;
}

export function buttonExists(text: string): boolean {
  return screen.queryByRole("button", { name: new RegExp(text, "i") }) !== null;
}

export function linkExists(text: string): boolean {
  return screen.queryByRole("link", { name: new RegExp(text, "i") }) !== null;
}

// ===== HELPERS DE VALIDAÇÃO =====
export function validatePlural(text: string): boolean {
  const pluralPatterns = [
    /vocês/i,
    /família/i,
    /nossos?/i,
    /concordam/i
  ];
  return pluralPatterns.some(pattern => pattern.test(text));
}

export function validateNoSensitiveData(logs: string[]): boolean {
  const sensitivePatterns = [
    /password/i,
    /senha/i,
    /token/i,
    /secret/i,
    /api_key/i,
    /credit_card/i,
    /\d{16}/  // Card numbers
  ];
  
  return !logs.some(log => 
    sensitivePatterns.some(pattern => pattern.test(log))
  );
}

export function validateBrazilianCurrency(value: string): boolean {
  // Aceita formatos: R$ 1.234,56 ou 1234.56
  const currencyPattern = /^R\$\s?\d{1,3}(\.\d{3})*,\d{2}$|^\d+(\.\d{2})?$/;
  return currencyPattern.test(value);
}

// ===== MOCK VIEWPORT MOBILE =====
export function setMobileViewport() {
  Object.defineProperty(window, "innerWidth", { value: 375, writable: true });
  Object.defineProperty(window, "innerHeight", { value: 667, writable: true });
  window.dispatchEvent(new Event("resize"));
}

// ===== MOCK DATE =====
export function mockDate(dateString: string) {
  const mockedDate = new Date(dateString);
  vi.setSystemTime(mockedDate);
}

export function restoreDate() {
  vi.useRealTimers();
}

// ===== CONSOLE LOG CAPTURE =====
export class LogCapture {
  private logs: string[] = [];
  private originalConsole: typeof console;

  constructor() {
    this.originalConsole = { ...console };
  }

  start() {
    const capture = (level: string) => (...args: unknown[]) => {
      this.logs.push(`[${level}] ${args.map(a => String(a)).join(" ")}`);
      (this.originalConsole as unknown as Record<string, (...args: unknown[]) => void>)[level](...args);
    };

    console.log = capture("LOG");
    console.warn = capture("WARN");
    console.error = capture("ERROR");
  }

  stop() {
    console.log = this.originalConsole.log;
    console.warn = this.originalConsole.warn;
    console.error = this.originalConsole.error;
  }

  getLogs(): string[] {
    return [...this.logs];
  }

  clear() {
    this.logs = [];
  }

  containsSensitiveData(): boolean {
    return !validateNoSensitiveData(this.logs);
  }
}

// ===== FORMATTER DO RELATÓRIO =====
export function formatTestReport(report: TestReport): string {
  let output = `
╔════════════════════════════════════════════════════════════════╗
║                    RELATÓRIO DE QA - E2E                       ║
╠════════════════════════════════════════════════════════════════╣
║ Run ID: ${report.runId.padEnd(54)}║
║ Data: ${report.timestamp.toLocaleString("pt-BR").padEnd(56)}║
╠════════════════════════════════════════════════════════════════╣
║ RESUMO                                                         ║
╠════════════════════════════════════════════════════════════════╣
║ Total: ${String(report.totalTests).padEnd(55)}║
║ ✅ Passou: ${String(report.passed).padEnd(51)}║
║ ❌ Falhou: ${String(report.failed).padEnd(51)}║
║ ⚠️  Não Implementado: ${String(report.notImplemented).padEnd(40)}║
║ ⏭️  Pulado: ${String(report.skipped).padEnd(50)}║
╚════════════════════════════════════════════════════════════════╝

`;

  // Resultados detalhados
  output += "\n📋 RESULTADOS DETALHADOS\n";
  output += "─".repeat(65) + "\n";

  for (const result of report.results) {
    const icon = result.status === "PASS" ? "✅" : 
                 result.status === "FAIL" ? "❌" : 
                 result.status === "NOT_IMPLEMENTED" ? "⚠️" : "⏭️";
    
    output += `\n${icon} ${result.testName}\n`;
    output += `   Status: ${result.status} | Duração: ${result.duration}ms\n`;
    
    if (result.error) {
      output += `   Erro: ${result.error}\n`;
    }

    if (result.steps.length > 0) {
      output += "   Passos:\n";
      for (const step of result.steps) {
        const stepIcon = step.status === "PASS" ? "✓" : "✗";
        output += `     ${stepIcon} ${step.description}\n`;
        if (step.status === "FAIL") {
          output += `       Esperado: ${step.expected}\n`;
          output += `       Obtido: ${step.actual}\n`;
        }
      }
    }
  }

  // Gaps (não implementados)
  if (report.gaps.length > 0) {
    output += "\n\n📌 GAPS IDENTIFICADOS (Funcionalidades Não Implementadas)\n";
    output += "─".repeat(65) + "\n";
    for (const gap of report.gaps) {
      output += `  • ${gap}\n`;
    }
  }

  // Recomendações
  if (report.recommendations.length > 0) {
    output += "\n\n💡 RECOMENDAÇÕES\n";
    output += "─".repeat(65) + "\n";
    for (const rec of report.recommendations) {
      output += `  • ${rec}\n`;
    }
  }

  return output;
}
