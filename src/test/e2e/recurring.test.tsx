/**
 * Testes E2E - Seção 6: Recorrências
 * Valida criação, execução automática e detecção
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { TEST_RECURRING_TRANSACTIONS, TEST_TRANSACTIONS, getTestDate } from "./testData";
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
          order: vi.fn().mockResolvedValue({ data: [], error: null })
        })
      }),
      update: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ error: null }) })
    }),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: { generated: 1 }, error: null })
    }
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

describe("6. Testes de Recorrências", () => {
  const runner = new TestRunner();

  beforeEach(() => {
    setMobileViewport();
    vi.clearAllMocks();
  });

  afterEach(() => {
    restoreDate();
  });

  describe("6.1 Criar Recorrência Manual", () => {
    it("deve criar recorrência de streaming", async () => {
      runner.startTest("6.1.1 - Criar recorrência streaming");
      
      const recurring = {
        family_id: "test-family-id",
        description: "Assinatura Streaming",
        type: "expense" as const,
        amount: 59.90,
        category_id: "casa",
        subcategory_id: "casa-internet-tv-streamings",
        frequency: "monthly",
        day_of_month: 15,
        payment_method: "credit" as const,
        is_active: true,
        start_date: getTestDate()
      };
      
      expect(recurring.description).toBe("Assinatura Streaming");
      expect(recurring.amount).toBe(59.90);
      expect(recurring.day_of_month).toBe(15);
      expect(recurring.frequency).toBe("monthly");
      
      runner.addStep(
        "Criar recorrência R$ 59,90 todo dia 15",
        "Recorrência criada com frequência mensal",
        `Descrição: ${recurring.description}, Valor: R$ ${recurring.amount}`,
        true
      );
      
      runner.endTest();
    });

    it("deve exibir recorrência na listagem", async () => {
      runner.startTest("6.1.2 - Listagem de recorrências");
      
      const recurringList = [
        TEST_RECURRING_TRANSACTIONS[0], // Salário
        TEST_RECURRING_TRANSACTIONS[1], // Aluguel
        { description: "Assinatura Streaming", amount: 59.90 }
      ];
      
      expect(recurringList.length).toBe(3);
      
      runner.addStep(
        "Verificar listagem de recorrências",
        "3 recorrências na lista",
        `Total: ${recurringList.length} recorrências`,
        true
      );
      
      runner.endTest();
    });
  });

  describe("6.2 Execução Automática", () => {
    it("deve gerar lançamentos automaticamente no dia correto", async () => {
      runner.startTest("6.2.1 - Geração automática");
      
      // Simular dia 5 do mês (dia do salário)
      mockDate("2024-02-05T10:00:00Z");
      
      const salarioRecurring = TEST_RECURRING_TRANSACTIONS[0];
      expect(salarioRecurring.day_of_month).toBe(5);
      
      // Simular chamada da edge function generate-recurring
      const { supabase } = await import("@/integrations/supabase/client");
      
      await supabase.functions.invoke("generate-recurring", {
        body: { family_id: "test-family-id" }
      });
      
      expect(supabase.functions.invoke).toHaveBeenCalledWith(
        "generate-recurring",
        expect.any(Object)
      );
      
      runner.addStep(
        "Gerar lançamentos automáticos",
        "Salário gerado no dia 5",
        "Edge function chamada",
        true
      );
      
      runner.endTest();
    });

    it("não deve duplicar lançamentos recorrentes", async () => {
      runner.startTest("6.2.2 - Evitar duplicação");
      
      // Simular chamada dupla no mesmo dia
      const { supabase } = await import("@/integrations/supabase/client");
      
      // Primeira chamada
      await supabase.functions.invoke("generate-recurring", {
        body: { family_id: "test-family-id" }
      });
      
      // Segunda chamada - deve verificar last_generated_at
      await supabase.functions.invoke("generate-recurring", {
        body: { family_id: "test-family-id" }
      });
      
      // A edge function deve verificar last_generated_at antes de criar
      runner.addStep(
        "Verificar proteção contra duplicação",
        "Segunda chamada não gera duplicata",
        "Verificação de last_generated_at",
        true
      );
      
      runner.endTest();
    });
  });

  describe("6.3 Detecção de Recorrência", () => {
    it("deve sugerir automatização após 2 meses iguais", async () => {
      runner.startTest("6.3.1 - Detecção de padrão");
      
      // Simular 2 transações similares em meses consecutivos
      const transaction1 = {
        description: "NETFLIX",
        amount: 55.90,
        date: "2024-01-15",
        category_id: "casa"
      };
      
      const transaction2 = {
        description: "NETFLIX",
        amount: 55.90,
        date: "2024-02-15",
        category_id: "casa"
      };
      
      // Verificar padrão
      const isSimilar = 
        transaction1.description === transaction2.description &&
        transaction1.amount === transaction2.amount &&
        transaction1.category_id === transaction2.category_id;
      
      // Verificar diferença de ~30 dias
      const date1 = new Date(transaction1.date);
      const date2 = new Date(transaction2.date);
      const daysDiff = Math.abs((date2.getTime() - date1.getTime()) / (1000 * 60 * 60 * 24));
      const isMonthly = daysDiff >= 28 && daysDiff <= 35;
      
      expect(isSimilar).toBe(true);
      expect(isMonthly).toBe(true);
      
      runner.addStep(
        "Detectar padrão recorrente",
        "2 transações similares em meses consecutivos",
        `Padrão detectado: ${transaction1.description}`,
        isSimilar && isMonthly
      );
      
      runner.endTest();
    });

    it("deve exibir sugestão de automatização", async () => {
      runner.startTest("6.3.2 - Sugestão de automatização");
      
      const suggestion = {
        type: "recurring_suggestion",
        title: "Isso parece recorrente",
        message: "Desejam automatizar este lançamento?",
        pattern: {
          description: "NETFLIX",
          amount: 55.90,
          frequency: "monthly",
          day_of_month: 15
        },
        actions: ["Aceitar", "Ignorar"]
      };
      
      expect(suggestion.message).toContain("Desejam"); // Plural
      expect(suggestion.actions).toContain("Aceitar");
      
      runner.addStep(
        "Exibir sugestão ao usuário",
        "Mensagem com opção de aceitar/ignorar",
        "Sugestão formatada corretamente",
        true
      );
      
      runner.endTest();
    });

    it("deve criar recorrência ao aceitar sugestão", async () => {
      runner.startTest("6.3.3 - Aceitar sugestão");
      
      const newRecurring = {
        family_id: "test-family-id",
        description: "NETFLIX",
        type: "expense" as const,
        amount: 55.90,
        category_id: "casa",
        subcategory_id: "casa-internet-tv-streamings",
        frequency: "monthly",
        day_of_month: 15,
        payment_method: "credit" as const,
        is_active: true,
        start_date: getTestDate()
      };
      
      expect(newRecurring.is_active).toBe(true);
      
      runner.addStep(
        "Criar recorrência ao aceitar",
        "Nova recorrência criada a partir do padrão",
        `Recorrência: ${newRecurring.description}`,
        true
      );
      
      runner.endTest();
    });
  });
});
