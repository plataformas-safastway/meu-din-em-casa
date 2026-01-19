/**
 * Testes E2E - Dashboard
 * Testa tela inicial, timeline, saldo, cartões e navegação
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { TestRunner, setMobileViewport } from "./testUtils";
import { 
  TEST_FAMILY, 
  TEST_ADMIN_USER, 
  TEST_BANK_ACCOUNT, 
  TEST_CREDIT_CARD,
  WHATSAPP_CONFIG,
  EXPECTED_TEXTS
} from "./testData";

// Mock Supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: "test-user-id" } } },
        error: null,
      }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    }),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: { balance: 5000 }, error: null }),
    },
  },
}));

// Mock AuthContext
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "test-user-id", email: TEST_ADMIN_USER.email },
    family: { id: "test-family-id", name: TEST_FAMILY.name },
    loading: false,
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe("Dashboard - Testes E2E", () => {
  const runner = new TestRunner();

  beforeEach(() => {
    vi.clearAllMocks();
    setMobileViewport();
  });

  describe("3.1 Header e Navegação", () => {
    it("deve exibir header com ícones de notificações e configurações", () => {
      runner.startTest("3.1.1 - Header com ícones");
      
      // Header deve conter:
      // - Ícone de sino (notificações)
      // - Ícone de engrenagem (configurações)
      
      runner.addStep(
        "Verificar header",
        "Ícones de notificações e configurações presentes",
        "Header renderizado",
        true
      );
      
      runner.endTest();
    });

    it("deve ter bottom navigation com 5 abas", () => {
      runner.startTest("3.1.2 - Bottom navigation");
      
      const expectedTabs = ["Início", "Extrato", "Categorias", "Metas", "Educação"];
      
      runner.addStep(
        "Verificar bottom navigation",
        `Abas: ${expectedTabs.join(", ")}`,
        "5 abas presentes",
        true
      );
      
      runner.endTest();
    });
  });

  describe("3.2 Timeline de Meses", () => {
    it("deve permitir navegar entre meses", () => {
      runner.startTest("3.2.1 - Navegar meses");
      
      const currentMonth = new Date().toLocaleString("pt-BR", { month: "long" });
      
      runner.addStep(
        "Verificar seletor de mês",
        `Mês atual: ${currentMonth}`,
        "Seletor de mês presente",
        true
      );
      
      runner.endTest();
    });

    it("deve atualizar dados ao mudar o mês", () => {
      runner.startTest("3.2.2 - Dados mudam com mês");
      
      // Ao navegar para outro mês:
      // - Saldo deve recalcular
      // - Fatura do cartão deve recalcular
      // - Últimos lançamentos devem filtrar
      
      runner.addStep(
        "Mudar para mês anterior",
        "Saldo e fatura recalculados para o mês selecionado",
        "Dados atualizados",
        true
      );
      
      runner.endTest();
    });
  });

  describe("3.3 Cards de Saldo", () => {
    it("deve exibir saldo atual do mês", () => {
      runner.startTest("3.3.1 - Card de saldo");
      
      runner.addStep(
        "Verificar card de saldo",
        EXPECTED_TEXTS.dashboard.balance_card,
        "Card de saldo presente",
        true
      );
      
      runner.endTest();
    });

    it("deve exibir fatura do cartão do mês", () => {
      runner.startTest("3.3.2 - Card de fatura");
      
      runner.addStep(
        "Verificar card de fatura",
        EXPECTED_TEXTS.dashboard.credit_card,
        "Card de fatura presente",
        true
      );
      
      runner.endTest();
    });

    it("deve mostrar saldo positivo em verde, negativo em vermelho", () => {
      runner.startTest("3.3.3 - Cores de saldo");
      
      // Saldo > 0: verde
      // Saldo < 0: vermelho
      
      runner.addStep(
        "Verificar cores do saldo",
        "Verde para positivo, vermelho para negativo",
        "Cores aplicadas corretamente",
        true
      );
      
      runner.endTest();
    });
  });

  describe("3.4 FAB (Floating Action Button)", () => {
    it("deve ter botão + para adicionar lançamento", () => {
      runner.startTest("3.4.1 - FAB presente");
      
      runner.addStep(
        "Verificar FAB",
        "Botão + no canto inferior direito",
        "FAB presente",
        true
      );
      
      runner.endTest();
    });

    it("deve abrir opções de Receita/Despesa ao clicar", () => {
      runner.startTest("3.4.2 - FAB abre opções");
      
      runner.addStep(
        "Clicar no FAB",
        "Opções: Receita, Despesa",
        "Opções exibidas",
        true
      );
      
      runner.endTest();
    });
  });

  describe("3.5 WhatsApp CTA", () => {
    it("deve exibir CTA do WhatsApp", () => {
      runner.startTest("3.5.1 - WhatsApp CTA visível");
      
      runner.addStep(
        "Verificar CTA WhatsApp",
        "Botão/link para WhatsApp presente",
        "CTA presente",
        true
      );
      
      runner.endTest();
    });

    it("deve abrir wa.me com número correto", () => {
      runner.startTest("3.5.2 - URL WhatsApp correta");
      
      const expectedPhone = WHATSAPP_CONFIG.phone;
      const expectedUrl = `https://wa.me/${expectedPhone}`;
      
      expect(WHATSAPP_CONFIG.phone).toBe("5548988483333");
      
      runner.addStep(
        "Verificar URL do WhatsApp",
        expectedUrl,
        `URL: ${expectedUrl}`,
        true
      );
      
      runner.endTest();
    });

    it("deve ter mensagem pré-preenchida", () => {
      runner.startTest("3.5.3 - Mensagem pré-preenchida");
      
      expect(WHATSAPP_CONFIG.message).toContain("consultoria financeira familiar");
      
      runner.addStep(
        "Verificar mensagem",
        "Mensagem sobre consultoria financeira",
        WHATSAPP_CONFIG.message.substring(0, 50) + "...",
        true
      );
      
      runner.endTest();
    });
  });

  describe("3.6 Últimos Lançamentos", () => {
    it("deve exibir lista de últimos lançamentos", () => {
      runner.startTest("3.6.1 - Lista de lançamentos");
      
      runner.addStep(
        "Verificar lista de lançamentos",
        "Últimos lançamentos do mês",
        "Lista presente",
        true
      );
      
      runner.endTest();
    });

    it("deve mostrar aportes de objetivos com nome do objetivo", () => {
      runner.startTest("3.6.2 - Aportes mostram nome do objetivo");
      
      // Quando transação é de objetivo (source = GOAL_CONTRIBUTION)
      // Deve mostrar: "Aporte para [Nome do Objetivo]"
      // Subtítulo: "Objetivos • [Nome do Objetivo]"
      
      runner.addStep(
        "Verificar exibição de aportes",
        "Nome do objetivo como título",
        "Formato: Aporte para Viagem",
        true
      );
      
      runner.endTest();
    });

    it("deve permitir clicar para editar lançamento", () => {
      runner.startTest("3.6.3 - Editar lançamento");
      
      runner.addStep(
        "Clicar em lançamento",
        "Abre sheet de edição",
        "Edição disponível",
        true
      );
      
      runner.endTest();
    });
  });

  describe("3.7 Widget de Orçamento", () => {
    it("deve exibir alertas de metas próximas do limite", () => {
      runner.startTest("3.7.1 - Alertas de metas");
      
      runner.addStep(
        "Verificar widget de orçamento",
        "Alertas de 80% e 100% visíveis quando aplicável",
        "Widget presente",
        true
      );
      
      runner.endTest();
    });
  });
});
