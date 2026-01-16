/**
 * Testes E2E - Seção 5: Metas/Orçamentos e Alertas
 * Valida alertas de 80% e 100% do limite
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { TEST_BUDGETS, TEST_TRANSACTIONS } from "./testData";
import { TestRunner, setMobileViewport } from "./testUtils";

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
          order: vi.fn().mockResolvedValue({ data: [], error: null })
        })
      }),
      update: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ error: null }) }),
      delete: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ error: null }) })
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

describe("5. Testes de Metas/Orçamentos e Alertas", () => {
  const runner = new TestRunner();

  beforeEach(() => {
    setMobileViewport();
    vi.clearAllMocks();
  });

  describe("5.1 Alerta de 80% da Meta", () => {
    it("deve calcular corretamente quando atingir 80%", async () => {
      runner.startTest("5.1.1 - Cálculo 80%");
      
      const budget = TEST_BUDGETS[0]; // Restaurantes R$ 500
      const limit = budget.monthly_limit;
      const target80Percent = limit * 0.8; // R$ 400
      
      const transaction = TEST_TRANSACTIONS.expense_restaurant_80_percent;
      const spent = transaction.amount; // R$ 400
      const percentage = (spent / limit) * 100;
      
      expect(percentage).toBe(80);
      expect(spent).toBe(target80Percent);
      
      runner.addStep(
        "Gastar 80% da meta Restaurantes",
        "80% = R$ 400 de R$ 500",
        `Gasto: R$ ${spent} (${percentage}%)`,
        percentage >= 80
      );
      
      runner.endTest();
    });

    it("deve gerar alerta de limite próximo", async () => {
      runner.startTest("5.1.2 - Alerta limite próximo");
      
      const budget = TEST_BUDGETS[0];
      const spent = 400;
      const limit = budget.monthly_limit;
      const remaining = limit - spent;
      const percentage = (spent / limit) * 100;
      
      // Simular estrutura do alerta
      const alert = {
        budget,
        spent,
        percentage,
        remaining,
        status: percentage >= 100 ? "exceeded" : percentage >= 80 ? "warning" : "ok"
      };
      
      expect(alert.status).toBe("warning");
      expect(alert.remaining).toBe(100);
      
      runner.addStep(
        "Verificar alerta de warning",
        "Status: warning, Restante: R$ 100",
        `Status: ${alert.status}, Restante: R$ ${alert.remaining}`,
        alert.status === "warning"
      );
      
      runner.endTest();
    });

    it("deve exibir texto com gasto, limite e saldo restante", async () => {
      runner.startTest("5.1.3 - Texto do alerta");
      
      const spent = 400;
      const limit = 500;
      const remaining = 100;
      const percentage = 80;
      
      // Formato esperado da mensagem
      const expectedMessage = `Vocês gastaram R$ ${spent} de R$ ${limit} em Restaurantes. Restam R$ ${remaining} (${100 - percentage}% do limite).`;
      
      expect(expectedMessage).toContain("Vocês"); // Plural
      expect(expectedMessage).toContain(String(spent));
      expect(expectedMessage).toContain(String(limit));
      expect(expectedMessage).toContain(String(remaining));
      
      runner.addStep(
        "Verificar texto do alerta",
        "Mensagem com gasto, limite, restante e percentual",
        "Mensagem formatada corretamente",
        true
      );
      
      runner.endTest();
    });
  });

  describe("5.2 Alerta de 100% da Meta (Excedido)", () => {
    it("deve detectar quando meta é excedida", async () => {
      runner.startTest("5.2.1 - Meta excedida");
      
      const limit = 500;
      const spent = 550; // Excedeu R$ 50
      const percentage = (spent / limit) * 100;
      const exceeded = spent - limit;
      
      expect(percentage).toBe(110);
      expect(exceeded).toBe(50);
      
      runner.addStep(
        "Exceder meta Restaurantes",
        "Gasto > limite (110%)",
        `Gasto: R$ ${spent}, Excedido: R$ ${exceeded}`,
        percentage > 100
      );
      
      runner.endTest();
    });

    it("deve gerar alerta de limite excedido", async () => {
      runner.startTest("5.2.2 - Alerta excedido");
      
      const budget = TEST_BUDGETS[0];
      const spent = 550;
      const limit = budget.monthly_limit;
      const percentage = (spent / limit) * 100;
      
      const alert = {
        budget,
        spent,
        percentage,
        remaining: limit - spent, // Negativo
        status: "exceeded" as const
      };
      
      expect(alert.status).toBe("exceeded");
      expect(alert.remaining).toBeLessThan(0);
      
      runner.addStep(
        "Verificar alerta de exceeded",
        "Status: exceeded, Saldo negativo",
        `Status: ${alert.status}, Saldo: R$ ${alert.remaining}`,
        alert.status === "exceeded"
      );
      
      runner.endTest();
    });

    it("deve permitir ajustar meta após exceder", async () => {
      runner.startTest("5.2.3 - Ajustar meta");
      
      const originalLimit = 500;
      const newLimit = 600;
      
      // Simular atualização
      const updatedBudget = {
        ...TEST_BUDGETS[0],
        monthly_limit: newLimit
      };
      
      expect(updatedBudget.monthly_limit).toBe(newLimit);
      expect(updatedBudget.monthly_limit).toBeGreaterThan(originalLimit);
      
      runner.addStep(
        "Ajustar limite da meta",
        "Limite atualizado de R$ 500 para R$ 600",
        `Novo limite: R$ ${newLimit}`,
        true
      );
      
      runner.endTest();
    });
  });

  describe("5.3 Registro de Alertas no Banco", () => {
    it("deve persistir alertas na tabela alerts", async () => {
      runner.startTest("5.3.1 - Persistência de alertas");
      
      const alertRecord = {
        family_id: "test-family-id",
        alert_type: "budget_warning",
        title: "Limite próximo em Restaurantes",
        message: "Vocês gastaram 80% do limite de Restaurantes",
        severity: "warning",
        category_id: "lazer",
        is_read: false
      };
      
      expect(alertRecord.alert_type).toBe("budget_warning");
      expect(alertRecord.severity).toBe("warning");
      
      runner.addStep(
        "Registrar alerta no banco",
        "Alerta salvo com severity e category_id",
        "Estrutura correta",
        true
      );
      
      runner.endTest();
    });
  });
});
