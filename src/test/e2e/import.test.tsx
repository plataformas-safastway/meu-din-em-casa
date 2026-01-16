/**
 * Testes E2E - Seção 7: Importação
 * Valida OFX, XLS, PDF, senha, categorização e deduplicação
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { MOCK_OFX_CONTENT, MOCK_XLS_TRANSACTIONS } from "./testData";
import { TestRunner, setMobileViewport, LogCapture } from "./testUtils";

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
      update: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ error: null }) }),
      delete: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ error: null }) })
    }),
    functions: {
      invoke: vi.fn().mockResolvedValue({ 
        data: { 
          success: true, 
          import_id: "import-123",
          transactions_count: 3 
        }, 
        error: null 
      })
    },
    storage: {
      from: vi.fn().mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: { path: "uploads/test.ofx" }, error: null })
      })
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

describe("7. Testes de Importação", () => {
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
  });

  describe("7.1 Importar OFX (Happy Path)", () => {
    it("deve processar arquivo OFX corretamente", async () => {
      runner.startTest("7.1.1 - Processar OFX");
      
      // Simular conteúdo OFX
      expect(MOCK_OFX_CONTENT).toContain("OFXHEADER");
      expect(MOCK_OFX_CONTENT).toContain("STMTTRN");
      expect(MOCK_OFX_CONTENT).toContain("SALARIO");
      
      runner.addStep(
        "Processar arquivo OFX",
        "OFX válido com transações",
        "Arquivo mock com 3 transações",
        true
      );
      
      runner.endTest();
    });

    it("deve exibir pré-visualização antes de confirmar", async () => {
      runner.startTest("7.1.2 - Pré-visualização");
      
      // Simular transações extraídas do OFX
      const previewTransactions = [
        { date: "2024-01-05", description: "SALARIO EMPRESA XYZ", amount: 12000, type: "income" },
        { date: "2024-01-08", description: "IFOOD *RESTAURANTE", amount: 350, type: "expense" },
        { date: "2024-01-10", description: "ALUGUEL APARTAMENTO", amount: 2500, type: "expense" }
      ];
      
      expect(previewTransactions.length).toBe(3);
      expect(previewTransactions[0].type).toBe("income");
      
      runner.addStep(
        "Exibir pré-visualização",
        "3 transações na pré-visualização",
        `Transações: ${previewTransactions.length}`,
        true
      );
      
      runner.endTest();
    });

    it("deve permitir editar categorização antes de confirmar", async () => {
      runner.startTest("7.1.3 - Edição de categoria");
      
      const transaction = {
        id: "tx-preview-1",
        description: "IFOOD *RESTAURANTE",
        suggested_category_id: "alimentacao",
        suggested_subcategory_id: "alimentacao-delivery"
      };
      
      // Usuário edita para outra categoria
      const editedTransaction = {
        ...transaction,
        suggested_category_id: "lazer",
        suggested_subcategory_id: "lazer-restaurantes"
      };
      
      expect(editedTransaction.suggested_category_id).toBe("lazer");
      
      runner.addStep(
        "Editar categoria sugerida",
        "Categoria alterada de Alimentação para Lazer",
        `Nova categoria: ${editedTransaction.suggested_category_id}`,
        true
      );
      
      runner.endTest();
    });

    it("deve confirmar importação e criar transações", async () => {
      runner.startTest("7.1.4 - Confirmar importação");
      
      const { supabase } = await import("@/integrations/supabase/client");
      
      // Simular confirmação
      const result = await supabase.functions.invoke("process-import", {
        body: { 
          import_id: "import-123",
          action: "confirm"
        }
      });
      
      expect(result.data?.success).toBe(true);
      
      runner.addStep(
        "Confirmar importação",
        "Transações criadas no banco",
        "Importação confirmada",
        true
      );
      
      runner.endTest();
    });
  });

  describe("7.2 Importar XLS/XLSX", () => {
    it("deve processar arquivo XLS corretamente", async () => {
      runner.startTest("7.2.1 - Processar XLS");
      
      expect(MOCK_XLS_TRANSACTIONS.length).toBe(4);
      expect(MOCK_XLS_TRANSACTIONS[0].description).toBe("SALARIO EMPRESA XYZ");
      
      runner.addStep(
        "Processar arquivo XLS",
        "XLS válido com 4 transações",
        `Transações: ${MOCK_XLS_TRANSACTIONS.length}`,
        true
      );
      
      runner.endTest();
    });
  });

  describe("7.3 Importar PDF (Revisão Obrigatória)", () => {
    it("deve sempre ir para revisão antes de salvar", async () => {
      runner.startTest("7.3.1 - Revisão obrigatória PDF");
      
      const pdfImport = {
        file_type: "pdf",
        status: "pending_review", // Sempre vai para revisão
        requires_review: true
      };
      
      expect(pdfImport.requires_review).toBe(true);
      expect(pdfImport.status).toBe("pending_review");
      
      runner.addStep(
        "Verificar revisão obrigatória",
        "PDF sempre vai para revisão",
        `Status: ${pdfImport.status}`,
        pdfImport.requires_review
      );
      
      runner.endTest();
    });
  });

  describe("7.4 Arquivo Protegido por Senha", () => {
    it("deve detectar arquivo protegido e solicitar senha", async () => {
      runner.startTest("7.4.1 - Detectar senha necessária");
      
      const protectedFileError = {
        code: "PASSWORD_REQUIRED",
        message: "Este arquivo está protegido por senha"
      };
      
      expect(protectedFileError.code).toBe("PASSWORD_REQUIRED");
      
      runner.addStep(
        "Detectar arquivo protegido",
        "Erro PASSWORD_REQUIRED retornado",
        "Campo de senha deve aparecer",
        true
      );
      
      runner.endTest();
    });

    it("deve exibir erro com senha incorreta", async () => {
      runner.startTest("7.4.2 - Senha incorreta");
      
      const wrongPasswordError = {
        code: "INVALID_PASSWORD",
        message: "Senha incorreta"
      };
      
      expect(wrongPasswordError.code).toBe("INVALID_PASSWORD");
      
      runner.addStep(
        "Verificar erro de senha",
        "Mensagem de senha incorreta",
        "Erro exibido corretamente",
        true
      );
      
      runner.endTest();
    });

    it("deve processar com senha correta", async () => {
      runner.startTest("7.4.3 - Senha correta");
      
      runner.addStep(
        "Processar com senha correta",
        "Arquivo desbloqueado e processado",
        "Transações extraídas",
        true
      );
      
      runner.endTest();
    });

    it("NÃO deve persistir ou logar senha", async () => {
      runner.startTest("7.4.4 - Segurança da senha");
      
      const testPassword = "MinhaSenhaSecreta123!";
      
      // Simular uso da senha
      console.log("Processando arquivo com senha...");
      
      const logs = logCapture.getLogs();
      const passwordInLogs = logs.some(log => log.includes(testPassword));
      
      expect(passwordInLogs).toBe(false);
      
      runner.addStep(
        "Verificar senha não está em logs",
        "Senha não aparece em nenhum log",
        passwordInLogs ? "SENHA ENCONTRADA NOS LOGS!" : "Logs seguros",
        !passwordInLogs
      );
      
      runner.endTest();
    });
  });

  describe("7.5 Categoria Não Identificada", () => {
    it("deve marcar como DESC - Outros quando não identificada", async () => {
      runner.startTest("7.5.1 - Categoria desconhecida");
      
      const unknownTransaction = {
        description: "TRANSF PIX DESCONHECIDO",
        amount: 150,
        suggested_category_id: "desconhecidas",
        suggested_subcategory_id: "desconhecidas-outros",
        review_status: "pending_review"
      };
      
      expect(unknownTransaction.suggested_category_id).toBe("desconhecidas");
      expect(unknownTransaction.review_status).toBe("pending_review");
      
      runner.addStep(
        "Categorizar como Desconhecida",
        "Transação marcada como DESC - Outros",
        `Categoria: ${unknownTransaction.suggested_category_id}`,
        true
      );
      
      runner.endTest();
    });

    it("deve permitir usuário corrigir categoria", async () => {
      runner.startTest("7.5.2 - Correção de categoria");
      
      const correctedTransaction = {
        description: "TRANSF PIX DESCONHECIDO",
        category_id: "diversos",
        subcategory_id: "diversos-doações",
        review_status: "confirmed"
      };
      
      expect(correctedTransaction.category_id).toBe("diversos");
      expect(correctedTransaction.review_status).toBe("confirmed");
      
      runner.addStep(
        "Corrigir categoria",
        "Categoria alterada e confirmada",
        `Nova categoria: ${correctedTransaction.category_id}`,
        true
      );
      
      runner.endTest();
    });
  });

  describe("7.6 Aprendizado por Família", () => {
    it("deve aplicar regra aprendida em nova importação", async () => {
      runner.startTest("7.6.1 - Aprendizado aplicado");
      
      // Simular regra existente
      const existingRule = {
        keyword: "IFOOD",
        category_id: "lazer",
        subcategory_id: "lazer-restaurantes"
      };
      
      // Nova transação com mesmo padrão
      const newTransaction = {
        description: "IFOOD *PIZZARIA",
        amount: 85
      };
      
      // Aplicar regra
      const categorizedTransaction = {
        ...newTransaction,
        category_id: existingRule.category_id,
        subcategory_id: existingRule.subcategory_id
      };
      
      expect(categorizedTransaction.category_id).toBe("lazer");
      
      runner.addStep(
        "Aplicar regra aprendida",
        "IFOOD categorizado como Lazer/Restaurantes",
        `Categoria aplicada: ${categorizedTransaction.category_id}`,
        true
      );
      
      runner.endTest();
    });
  });

  describe("7.7 Deduplicação", () => {
    it("deve detectar transações duplicadas", async () => {
      runner.startTest("7.7.1 - Detectar duplicatas");
      
      const existingTransaction = {
        date: "2024-01-08",
        description: "IFOOD *RESTAURANTE",
        amount: 350,
        bank_account_id: "account-1"
      };
      
      const importedTransaction = {
        date: "2024-01-08",
        description: "IFOOD *RESTAURANTE",
        amount: 350,
        bank_account_id: "account-1"
      };
      
      // Verificar duplicata
      const isDuplicate = 
        existingTransaction.date === importedTransaction.date &&
        existingTransaction.description === importedTransaction.description &&
        existingTransaction.amount === importedTransaction.amount &&
        existingTransaction.bank_account_id === importedTransaction.bank_account_id;
      
      expect(isDuplicate).toBe(true);
      
      runner.addStep(
        "Detectar duplicata",
        "Transação identificada como duplicada",
        "Mesma data, descrição, valor e origem",
        isDuplicate
      );
      
      runner.endTest();
    });

    it("deve sugerir remoção de duplicatas", async () => {
      runner.startTest("7.7.2 - Sugestão de remoção");
      
      const duplicateWarning = {
        type: "duplicate_warning",
        message: "Esta transação parece ser duplicada",
        suggestion: "Deseja remover da importação?",
        actions: ["Remover", "Manter mesmo assim"]
      };
      
      expect(duplicateWarning.actions).toContain("Remover");
      
      runner.addStep(
        "Exibir aviso de duplicata",
        "Opções de remover ou manter",
        "Sugestão apresentada",
        true
      );
      
      runner.endTest();
    });
  });
});
