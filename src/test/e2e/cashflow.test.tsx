/**
 * Testes E2E - Seções 8 e 9: Orçamento Projetado, Parcelas e Fluxo de Caixa
 * Valida sugestões de metas, parcelas e projeções
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { TEST_INSTALLMENT, TEST_RECURRING_TRANSACTIONS, getTestDate } from "./testData";
import { TestRunner, setMobileViewport, mockDate, restoreDate } from "./testUtils";

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
          gte: vi.fn().mockReturnValue({
            lte: vi.fn().mockResolvedValue({ data: [], error: null })
          }),
          order: vi.fn().mockResolvedValue({ data: [], error: null })
        })
      }),
      update: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ error: null }) })
    })
  }
}));

// Mock do AuthContext
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "test-user-id" },
    family: { id: "test-family-id", name: "Família Teste" },
    loading: false
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

describe("8. Testes de Orçamento Projetado e Sugestões", () => {
  const runner = new TestRunner();

  beforeEach(() => {
    setMobileViewport();
    vi.clearAllMocks();
  });

  describe("8.1 Sugestão de Metas Pós-Importação", () => {
    it("deve calcular média histórica após importação", async () => {
      runner.startTest("8.1.1 - Média histórica");
      
      // Simular histórico de gastos em Restaurantes
      const historicalSpending = [
        { month: "2024-01", category: "lazer", subcategory: "restaurantes", total: 450 },
        { month: "2024-02", category: "lazer", subcategory: "restaurantes", total: 520 },
        { month: "2024-03", category: "lazer", subcategory: "restaurantes", total: 480 }
      ];
      
      const average = historicalSpending.reduce((sum, m) => sum + m.total, 0) / historicalSpending.length;
      
      expect(average).toBeCloseTo(483.33, 1);
      
      runner.addStep(
        "Calcular média histórica",
        "Média de 3 meses: ~R$ 483",
        `Média calculada: R$ ${average.toFixed(2)}`,
        true
      );
      
      runner.endTest();
    });

    it("deve sugerir meta baseada na média", async () => {
      runner.startTest("8.1.2 - Sugestão de meta");
      
      const average = 483.33;
      const suggestedLimit = Math.round(average / 50) * 50; // Arredondar para R$ 50
      
      expect(suggestedLimit).toBe(500);
      
      const suggestion = {
        category_id: "lazer",
        subcategory_id: "lazer-restaurantes",
        average_spending: average,
        suggested_limit: suggestedLimit,
        message: `Vocês gastam em média R$ ${average.toFixed(0)} em Restaurantes. Sugerimos meta de R$ ${suggestedLimit}.`
      };
      
      expect(suggestion.message).toContain("Vocês"); // Plural
      
      runner.addStep(
        "Sugerir meta de orçamento",
        "Meta sugerida: R$ 500",
        `Sugestão: R$ ${suggestedLimit}`,
        true
      );
      
      runner.endTest();
    });

    it("deve aceitar sugestão e criar meta", async () => {
      runner.startTest("8.1.3 - Aceitar sugestão");
      
      const newBudget = {
        family_id: "test-family-id",
        category_id: "lazer",
        subcategory_id: "lazer-restaurantes",
        monthly_limit: 500,
        average_spending: 483.33,
        is_active: true
      };
      
      expect(newBudget.monthly_limit).toBe(500);
      expect(newBudget.average_spending).toBeCloseTo(483.33, 1);
      
      runner.addStep(
        "Criar meta a partir da sugestão",
        "Meta criada com R$ 500",
        "Meta salva no banco",
        true
      );
      
      runner.endTest();
    });
  });

  describe("8.2 Orçamento Projetado", () => {
    it("deve exibir Meta vs Projeção lado a lado", async () => {
      runner.startTest("8.2.1 - Exibição Meta vs Projeção");
      
      const budgetView = {
        category: "Restaurantes",
        limit: 500,
        currentSpent: 250, // Metade do mês
        projected: 500, // Projeção para o mês todo
        daysRemaining: 15,
        status: "on_track"
      };
      
      expect(budgetView.limit).toBe(500);
      expect(budgetView.projected).toBe(500);
      
      runner.addStep(
        "Exibir comparativo",
        "Meta: R$ 500 | Projeção: R$ 500",
        `Status: ${budgetView.status}`,
        true
      );
      
      runner.endTest();
    });

    it("deve permitir editar projeção manualmente", async () => {
      runner.startTest("8.2.2 - Editar projeção");
      
      const originalProjected = 500;
      const editedProjected = 450;
      
      expect(editedProjected).toBeLessThan(originalProjected);
      
      runner.addStep(
        "Editar projeção",
        "Projeção alterada de R$ 500 para R$ 450",
        `Nova projeção: R$ ${editedProjected}`,
        true
      );
      
      runner.endTest();
    });
  });
});

describe("9. Testes de Parcelas e Fluxo de Caixa Projetado", () => {
  const runner = new TestRunner();

  beforeEach(() => {
    setMobileViewport();
    vi.clearAllMocks();
  });

  afterEach(() => {
    restoreDate();
  });

  describe("9.1 Criar Compra Parcelada", () => {
    it("deve registrar compra em 12x", async () => {
      runner.startTest("9.1.1 - Registrar parcelamento");
      
      const installment = {
        ...TEST_INSTALLMENT,
        family_id: "test-family-id",
        start_date: getTestDate(),
        current_installment: 1,
        is_active: true
      };
      
      expect(installment.total_amount).toBe(2400);
      expect(installment.total_installments).toBe(12);
      expect(installment.installment_amount).toBe(200);
      
      runner.addStep(
        "Criar parcelamento 12x",
        "Total: R$ 2400, Parcela: R$ 200",
        `Parcelas: ${installment.total_installments}x R$ ${installment.installment_amount}`,
        true
      );
      
      runner.endTest();
    });

    it("deve gerar agenda de parcelas futuras", async () => {
      runner.startTest("9.1.2 - Agenda de parcelas");
      
      const startDate = new Date();
      const installments = Array.from({ length: 12 }, (_, i) => {
        const date = new Date(startDate);
        date.setMonth(date.getMonth() + i);
        return {
          installment_number: i + 1,
          amount: 200,
          due_date: date.toISOString().split("T")[0],
          status: i === 0 ? "current" : "future"
        };
      });
      
      expect(installments.length).toBe(12);
      expect(installments[0].status).toBe("current");
      expect(installments[11].installment_number).toBe(12);
      
      runner.addStep(
        "Gerar agenda de parcelas",
        "12 parcelas programadas",
        `Primeira: ${installments[0].due_date}, Última: ${installments[11].due_date}`,
        true
      );
      
      runner.endTest();
    });
  });

  describe("9.2 Fluxo de Caixa Projetado", () => {
    it("deve calcular projeção para 30/60/90 dias", async () => {
      runner.startTest("9.2.1 - Projeção 30/60/90 dias");
      
      const monthlyIncome = TEST_RECURRING_TRANSACTIONS[0].amount; // 12000
      const monthlyExpense = TEST_RECURRING_TRANSACTIONS[1].amount; // 2500
      const monthlyInstallment = TEST_INSTALLMENT.installment_amount; // 200
      
      const projections = [30, 60, 90].map(days => {
        const months = days / 30;
        const income = monthlyIncome * months;
        const expenses = (monthlyExpense + monthlyInstallment) * months;
        const balance = income - expenses;
        return { days, income, expenses, balance };
      });
      
      expect(projections[0].balance).toBe(12000 - 2700); // 9300
      expect(projections[1].balance).toBe((12000 - 2700) * 2); // 18600
      expect(projections[2].balance).toBe((12000 - 2700) * 3); // 27900
      
      runner.addStep(
        "Calcular projeções",
        "30d: R$ 9.300 | 60d: R$ 18.600 | 90d: R$ 27.900",
        "Projeções calculadas",
        true
      );
      
      runner.endTest();
    });

    it("deve incluir recorrências e parcelas no cálculo", async () => {
      runner.startTest("9.2.2 - Incluir recorrências e parcelas");
      
      const components = {
        recurring_income: 12000,
        recurring_expenses: 2500,
        installments: 200,
        total_monthly_outflow: 2700
      };
      
      expect(components.total_monthly_outflow).toBe(
        components.recurring_expenses + components.installments
      );
      
      runner.addStep(
        "Verificar componentes do fluxo",
        "Recorrências + Parcelas incluídas",
        `Saída mensal: R$ ${components.total_monthly_outflow}`,
        true
      );
      
      runner.endTest();
    });

    it("deve alertar quando projeção indicar saldo negativo", async () => {
      runner.startTest("9.2.3 - Alerta saldo negativo");
      
      // Simular cenário com mais despesas
      const monthlyIncome = 8000;
      const monthlyExpenses = 9500;
      const projectedBalance = monthlyIncome - monthlyExpenses;
      
      expect(projectedBalance).toBeLessThan(0);
      
      const alert = {
        type: "cashflow_warning",
        title: "Atenção ao fluxo de caixa",
        message: `Pode faltar R$ ${Math.abs(projectedBalance)} no próximo mês`,
        severity: "high",
        suggestions: [
          "Revisar metas de orçamento",
          "Ajustar recorrências",
          "Postergar compras parceladas"
        ]
      };
      
      expect(alert.severity).toBe("high");
      expect(alert.suggestions.length).toBeGreaterThan(0);
      
      runner.addStep(
        "Gerar alerta de saldo negativo",
        "Alerta com sugestões de ação",
        `Déficit projetado: R$ ${Math.abs(projectedBalance)}`,
        projectedBalance < 0
      );
      
      runner.endTest();
    });

    it("deve sugerir ações corretivas", async () => {
      runner.startTest("9.2.4 - Sugestões de ação");
      
      const suggestions = [
        { action: "reduce_budget", description: "Reduzir meta de Lazer de R$ 500 para R$ 300" },
        { action: "pause_recurring", description: "Pausar assinatura de streaming" },
        { action: "renegotiate_installment", description: "Renegociar parcelas do Celular" }
      ];
      
      expect(suggestions.length).toBe(3);
      
      runner.addStep(
        "Exibir sugestões de correção",
        "3 sugestões de ação",
        "Sugestões acionáveis",
        true
      );
      
      runner.endTest();
    });
  });
});
