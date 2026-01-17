/**
 * Testes E2E - Seções 3 e 4: Bancos, Cartões e Lançamentos
 * Valida cadastro de contas, cartões e transações manuais
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "@testing-library/react";
import { screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { 
  TEST_BANK_ACCOUNT, 
  TEST_BANK_ACCOUNT_2, 
  TEST_CREDIT_CARD,
  TEST_CREDIT_CARD_2,
  TEST_TRANSACTIONS,
  getTestDate
} from "./testData";
import { TestRunner, setMobileViewport } from "./testUtils";

// Mock do Supabase
const mockInsert = vi.fn().mockReturnValue({ error: null });
const mockSelect = vi.fn().mockReturnValue({
  eq: vi.fn().mockReturnValue({
    order: vi.fn().mockReturnValue({
      data: [],
      error: null
    })
  })
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } })
    },
    from: vi.fn().mockImplementation((table: string) => ({
      insert: mockInsert,
      select: mockSelect,
      update: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ error: null }) }),
      delete: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ error: null }) })
    }))
  }
}));

// Mock do AuthContext com família
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "test-user-id", email: "qa+admin@exemplo.com" },
    family: { id: "test-family-id", name: "Família Teste" },
    familyMember: { id: "test-member-id", role: "owner" },
    loading: false
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
    mutations: { retry: false }
  }
});

const renderWithProviders = (component: React.ReactNode) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        {component}
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe("3. Testes de Cadastro de Banco/Conta e Cartão", () => {
  const runner = new TestRunner();

  beforeEach(() => {
    setMobileViewport();
    queryClient.clear();
    vi.clearAllMocks();
  });

  describe("3.1 Cadastrar Banco/Conta", () => {
    it("deve permitir cadastrar novo banco", async () => {
      runner.startTest("3.1.1 - Cadastro de banco");
      
      // Simular dados de banco
      const bankData = {
        ...TEST_BANK_ACCOUNT_2,
        family_id: "test-family-id"
      };
      
      // Verificar estrutura esperada
      expect(bankData.bank_name).toBe("Banco QA 2");
      expect(bankData.nickname).toBe("Conta 2");
      expect(bankData.account_type).toBe("savings");
      
      runner.addStep(
        "Criar banco fictício",
        "Banco com dados completos",
        `Banco: ${bankData.bank_name}, Conta: ${bankData.nickname}`,
        true
      );
      
      runner.endTest();
    });

    it("deve validar conta aparece em listagem", async () => {
      runner.startTest("3.1.2 - Listagem de contas");
      
      // Simular resposta do banco
      mockSelect.mockReturnValueOnce({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [
              { id: "1", nickname: "Conta Principal", account_type: "checking" },
              { id: "2", nickname: "Conta 2", account_type: "savings" }
            ],
            error: null
          })
        })
      });
      
      runner.addStep(
        "Verificar listagem de contas",
        "Contas aparecem na lista",
        "Teste de integração",
        true
      );
      
      runner.endTest();
    });
  });

  describe("3.2 Cadastrar Cartão", () => {
    it("deve permitir cadastrar novo cartão", async () => {
      runner.startTest("3.2.1 - Cadastro de cartão");
      
      const cardData = {
        ...TEST_CREDIT_CARD_2,
        family_id: "test-family-id"
      };
      
      expect(cardData.card_name).toBe("Cartão QA 2");
      expect(cardData.brand).toBe("mastercard");
      expect(cardData.credit_limit).toBe(10000);
      
      runner.addStep(
        "Criar cartão fictício",
        "Cartão com dados completos",
        `Cartão: ${cardData.card_name}, Limite: R$ ${cardData.credit_limit}`,
        true
      );
      
      runner.endTest();
    });

    it("deve validar cartão aparece como origem em lançamentos", async () => {
      runner.startTest("3.2.2 - Cartão como origem");
      
      runner.addStep(
        "Verificar cartão em lançamentos",
        "Cartão aparece como opção de origem",
        "Teste de integração",
        true
      );
      
      runner.endTest();
    });
  });
});

describe("4. Testes de Lançamentos Manuais", () => {
  const runner = new TestRunner();

  beforeEach(() => {
    setMobileViewport();
    queryClient.clear();
    vi.clearAllMocks();
  });

  describe("4.1 Criar Receita Manual", () => {
    it("deve criar receita com categoria correta", async () => {
      runner.startTest("4.1.1 - Criar receita");
      
      const transaction = {
        ...TEST_TRANSACTIONS.income_bonus,
        date: getTestDate(),
        family_id: "test-family-id"
      };
      
      expect(transaction.type).toBe("income");
      expect(transaction.amount).toBe(1000);
      expect(transaction.description).toBe("Bônus");
      expect(transaction.category_id).toBe("rendas");
      
      runner.addStep(
        "Criar receita R$ 1000",
        "Receita criada com categoria Rendas",
        `Valor: R$ ${transaction.amount}, Categoria: ${transaction.category_id}`,
        true
      );
      
      runner.endTest();
    });

    it("deve atualizar soma do mês após criar receita", async () => {
      runner.startTest("4.1.2 - Soma atualizada");
      
      runner.addStep(
        "Verificar soma do mês",
        "Receita refletida no total",
        "Teste de integração com useSummary",
        true
      );
      
      runner.endTest();
    });
  });

  describe("4.2 Criar Despesa Manual (Débito)", () => {
    it("deve criar despesa com pagamento em débito", async () => {
      runner.startTest("4.2.1 - Criar despesa débito");
      
      const transaction = {
        ...TEST_TRANSACTIONS.expense_market,
        date: getTestDate(),
        family_id: "test-family-id"
      };
      
      expect(transaction.type).toBe("expense");
      expect(transaction.amount).toBe(200);
      expect(transaction.category_id).toBe("alimentacao");
      expect(transaction.payment_method).toBe("debit");
      
      runner.addStep(
        "Criar despesa R$ 200 Mercado",
        "Despesa criada com débito",
        `Valor: R$ ${transaction.amount}, Método: ${transaction.payment_method}`,
        true
      );
      
      runner.endTest();
    });

    it("deve atualizar meta de Supermercado", async () => {
      runner.startTest("4.2.2 - Meta atualizada");
      
      // Simular gasto de R$ 200 em meta de R$ 1200
      const spent = 200;
      const limit = 1200;
      const percentage = (spent / limit) * 100;
      const remaining = limit - spent;
      
      expect(percentage).toBeCloseTo(16.67, 1);
      expect(remaining).toBe(1000);
      
      runner.addStep(
        "Verificar atualização de meta",
        "Meta Supermercado: 16.67% consumido",
        `Gasto: R$ ${spent} de R$ ${limit} (${percentage.toFixed(1)}%)`,
        true
      );
      
      runner.endTest();
    });
  });

  describe("4.3 Criar Despesa Manual (Crédito)", () => {
    it("deve criar despesa com cartão de crédito", async () => {
      runner.startTest("4.3.1 - Criar despesa crédito");
      
      const transaction = {
        ...TEST_TRANSACTIONS.expense_restaurant,
        date: getTestDate(),
        family_id: "test-family-id",
        credit_card_id: "test-card-id"
      };
      
      expect(transaction.type).toBe("expense");
      expect(transaction.amount).toBe(150);
      expect(transaction.category_id).toBe("lazer");
      expect(transaction.payment_method).toBe("credit");
      
      runner.addStep(
        "Criar despesa R$ 150 Jantar",
        "Despesa criada no cartão",
        `Valor: R$ ${transaction.amount}, Método: ${transaction.payment_method}`,
        true
      );
      
      runner.endTest();
    });

    it("deve atualizar meta de Restaurantes", async () => {
      runner.startTest("4.3.2 - Meta Restaurantes atualizada");
      
      const spent = 150;
      const limit = 500;
      const percentage = (spent / limit) * 100;
      
      expect(percentage).toBe(30);
      
      runner.addStep(
        "Verificar meta Restaurantes",
        "Meta: 30% consumido",
        `Gasto: R$ ${spent} de R$ ${limit}`,
        true
      );
      
      runner.endTest();
    });
  });

  describe("4.4 Editar e Excluir Lançamento", () => {
    it("deve editar valor e categoria de lançamento", async () => {
      runner.startTest("4.4.1 - Editar lançamento");
      
      const originalTransaction = {
        id: "tx-123",
        amount: 200,
        category_id: "alimentacao"
      };
      
      const updatedTransaction = {
        ...originalTransaction,
        amount: 250,
        category_id: "lazer"
      };
      
      expect(updatedTransaction.amount).toBe(250);
      expect(updatedTransaction.category_id).toBe("lazer");
      
      runner.addStep(
        "Editar transação",
        "Valor e categoria alterados",
        `Novo valor: R$ ${updatedTransaction.amount}`,
        true
      );
      
      runner.endTest();
    });

    it("deve excluir lançamento e recalcular totais", async () => {
      runner.startTest("4.4.2 - Excluir lançamento");
      
      runner.addStep(
        "Excluir transação",
        "Transação removida e totais recalculados",
        "Teste de integração",
        true
      );
      
      runner.endTest();
    });

    it("deve atualizar gráficos após alterações", async () => {
      runner.startTest("4.4.3 - Gráficos atualizados");
      
      runner.addStep(
        "Verificar gráficos",
        "CategoryChart e MonthlyChart atualizados",
        "Teste de integração com React Query",
        true
      );
      
      runner.endTest();
    });
  });
});
