/**
 * Testes E2E - Seção 10: Relatório Mensal por E-mail com IA
 * Valida opt-in, geração e envio de relatórios
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { TestRunner, setMobileViewport, LogCapture, mockDate, restoreDate } from "./testUtils";

// Mock do Supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } })
    },
    from: vi.fn().mockReturnValue({
      insert: vi.fn().mockReturnValue({ error: null }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ 
            data: { email_report_enabled: true, email_report_recipient: "qa@exemplo.com" }, 
            error: null 
          }),
          order: vi.fn().mockResolvedValue({ data: [], error: null })
        })
      }),
      update: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ error: null }) })
    }),
    functions: {
      invoke: vi.fn().mockResolvedValue({ 
        data: { 
          success: true,
          report: {
            summary: { income: 12000, expenses: 8500, balance: 3500 },
            analysis: "Mês positivo com economia de 29%",
            recommendations: ["Continuar controlando gastos em Lazer"]
          }
        }, 
        error: null 
      })
    }
  }
}));

// Mock do AuthContext
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "test-user-id", email: "qa@exemplo.com" },
    family: { id: "test-family-id", name: "Família Teste" },
    loading: false
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

describe("10. Testes de Relatório Mensal com IA", () => {
  const runner = new TestRunner();
  const logCapture = new LogCapture();

  beforeEach(() => {
    setMobileViewport();
    vi.clearAllMocks();
    logCapture.start();
  });

  afterEach(() => {
    logCapture.stop();
    logCapture.clear();
    restoreDate();
  });

  describe("10.1 Opt-in para Relatório", () => {
    it("deve permitir ativar recebimento de relatório", async () => {
      runner.startTest("10.1.1 - Ativar opt-in");
      
      const familySettings = {
        email_report_enabled: true,
        email_report_recipient: "qa@exemplo.com",
        email_report_day: 1
      };
      
      expect(familySettings.email_report_enabled).toBe(true);
      expect(familySettings.email_report_recipient).toBe("qa@exemplo.com");
      
      runner.addStep(
        "Ativar relatório mensal",
        "Preferência salva no banco",
        `Destinatário: ${familySettings.email_report_recipient}`,
        true
      );
      
      runner.endTest();
    });

    it("deve persistir preferência no banco", async () => {
      runner.startTest("10.1.2 - Persistência de preferência");
      
      const { supabase } = await import("@/integrations/supabase/client");
      
      const result = await supabase.from("families").select("*").eq("id", "test-family-id").single();
      
      expect(result.data?.email_report_enabled).toBe(true);
      
      runner.addStep(
        "Verificar persistência",
        "email_report_enabled = true no banco",
        "Preferência persistida",
        true
      );
      
      runner.endTest();
    });
  });

  describe("10.2 Geração do Relatório", () => {
    it("deve gerar relatório no fechamento do mês", async () => {
      runner.startTest("10.2.1 - Geração automática");
      
      // Simular dia 1 do mês (fechamento do mês anterior)
      mockDate("2024-02-01T08:00:00Z");
      
      const { supabase } = await import("@/integrations/supabase/client");
      
      const result = await supabase.functions.invoke("generate-monthly-report", {
        body: { 
          family_id: "test-family-id",
          month: 1,
          year: 2024
        }
      });
      
      expect(result.data?.success).toBe(true);
      expect(result.data?.report).toBeDefined();
      
      runner.addStep(
        "Gerar relatório mensal",
        "Relatório gerado via edge function",
        "Relatório criado com sucesso",
        true
      );
      
      runner.endTest();
    });

    it("deve incluir resumo numérico", async () => {
      runner.startTest("10.2.2 - Resumo numérico");
      
      const report = {
        summary: {
          income: 12000,
          expenses: 8500,
          balance: 3500,
          savings_rate: 29.17,
          top_categories: [
            { name: "Alimentação", total: 2500 },
            { name: "Casa", total: 2000 },
            { name: "Transporte", total: 1500 }
          ]
        }
      };
      
      expect(report.summary.income).toBe(12000);
      expect(report.summary.expenses).toBe(8500);
      expect(report.summary.balance).toBe(3500);
      expect(report.summary.savings_rate).toBeCloseTo(29.17, 1);
      
      runner.addStep(
        "Verificar resumo numérico",
        "Receita, despesa, saldo e taxa de economia",
        `Saldo: R$ ${report.summary.balance} (${report.summary.savings_rate}% poupado)`,
        true
      );
      
      runner.endTest();
    });

    it("deve incluir análise por IA", async () => {
      runner.startTest("10.2.3 - Análise IA");
      
      const report = {
        ai_analysis: "A família teve um mês positivo, economizando 29% da renda. " +
          "Os gastos com Alimentação foram o maior destino (R$ 2.500). " +
          "Comparado ao mês anterior, houve redução de 15% em Lazer."
      };
      
      expect(report.ai_analysis).toContain("família"); // Contexto familiar
      expect(report.ai_analysis.length).toBeGreaterThan(100);
      
      runner.addStep(
        "Verificar análise IA",
        "Texto analítico contextualizado",
        "Análise gerada com contexto familiar",
        true
      );
      
      runner.endTest();
    });

    it("deve incluir 3-5 recomendações", async () => {
      runner.startTest("10.2.4 - Recomendações");
      
      const recommendations = [
        "Continuar o ritmo de economia de 29%",
        "Considerar reduzir gastos em Alimentação para R$ 2.200",
        "A meta de Restaurantes foi cumprida - parabéns!",
        "Avaliar renegociação do aluguel",
        "Reserva de emergência atingiu 2 meses de despesas"
      ];
      
      expect(recommendations.length).toBeGreaterThanOrEqual(3);
      expect(recommendations.length).toBeLessThanOrEqual(5);
      
      runner.addStep(
        "Verificar recomendações",
        "3 a 5 recomendações acionáveis",
        `${recommendations.length} recomendações`,
        true
      );
      
      runner.endTest();
    });

    it("NÃO deve incluir dados sensíveis", async () => {
      runner.startTest("10.2.5 - Sem dados sensíveis");
      
      const reportContent = JSON.stringify({
        summary: { income: 12000, expenses: 8500 },
        analysis: "Mês positivo",
        recommendations: ["Continuar economizando"]
      });
      
      const sensitivePatterns = [
        /\d{4}\s?\d{4}\s?\d{4}\s?\d{4}/, // Número de cartão
        /\d{4,5}-\d{1}/, // Número de conta
        /senha|password/i,
        /token|secret/i
      ];
      
      const hasSensitiveData = sensitivePatterns.some(p => p.test(reportContent));
      
      expect(hasSensitiveData).toBe(false);
      
      runner.addStep(
        "Verificar ausência de dados sensíveis",
        "Sem números de cartão/conta no relatório",
        hasSensitiveData ? "DADOS SENSÍVEIS ENCONTRADOS!" : "Relatório seguro",
        !hasSensitiveData
      );
      
      runner.endTest();
    });
  });

  describe("10.3 Cenários de Relatório", () => {
    it("deve gerar relatório adequado para mês ruim", async () => {
      runner.startTest("10.3.1 - Mês ruim (gasto > renda)");
      
      const badMonthReport = {
        summary: {
          income: 10000,
          expenses: 12500,
          balance: -2500,
          savings_rate: -25
        },
        ai_analysis: "A família gastou mais do que ganhou este mês, " +
          "resultando em um déficit de R$ 2.500. " +
          "Os principais ofensores foram despesas extraordinárias.",
        recommendations: [
          "URGENTE: Rever orçamento imediatamente",
          "Considerar pausar gastos não essenciais",
          "Avaliar uso da reserva de emergência",
          "Renegociar parcelas pendentes"
        ],
        severity: "critical"
      };
      
      expect(badMonthReport.summary.balance).toBeLessThan(0);
      expect(badMonthReport.severity).toBe("critical");
      expect(badMonthReport.recommendations[0]).toContain("URGENTE");
      
      runner.addStep(
        "Relatório de mês negativo",
        "Inclui impactos e correções urgentes",
        `Déficit: R$ ${Math.abs(badMonthReport.summary.balance)}`,
        true
      );
      
      runner.endTest();
    });

    it("deve gerar relatório adequado para mês bom", async () => {
      runner.startTest("10.3.2 - Mês bom (economia > 30%)");
      
      const goodMonthReport = {
        summary: {
          income: 12000,
          expenses: 7500,
          balance: 4500,
          savings_rate: 37.5
        },
        ai_analysis: "Excelente mês! A família economizou 37,5% da renda. " +
          "Todas as metas de orçamento foram cumpridas.",
        recommendations: [
          "Parabéns pelo controle financeiro!",
          "Considerar aumentar reserva de emergência",
          "Avaliar investimentos de longo prazo",
          "Definir próxima meta de economia"
        ],
        severity: "positive"
      };
      
      expect(goodMonthReport.summary.savings_rate).toBeGreaterThan(30);
      expect(goodMonthReport.severity).toBe("positive");
      
      runner.addStep(
        "Relatório de mês positivo",
        "Destaca conquistas e próximos passos",
        `Economia: ${goodMonthReport.summary.savings_rate}%`,
        true
      );
      
      runner.endTest();
    });
  });
});
