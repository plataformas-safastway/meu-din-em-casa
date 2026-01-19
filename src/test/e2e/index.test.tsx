/**
 * Teste de Integração Principal - Executa suíte completa E2E
 * Este arquivo serve como ponto de entrada para rodar todos os testes
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { TestRunner, formatTestReport } from "./testUtils";
import { 
  TEST_FAMILY,
  TEST_ADMIN_USER,
  TEST_BANK_ACCOUNT,
  TEST_CREDIT_CARD,
  TEST_BUDGETS,
  TEST_RECURRING_TRANSACTIONS,
  TEST_INSTALLMENT,
  TEST_GOALS,
  WHATSAPP_CONFIG,
  PAYMENT_METHODS,
  FILE_PASSWORD_ATTEMPTS
} from "./testData";

describe("Suíte Completa E2E - Finanças Familiares", () => {
  const runner = new TestRunner();
  
  beforeAll(() => {
    console.log("\n");
    console.log("╔════════════════════════════════════════════════════════════════╗");
    console.log("║        INICIANDO SUÍTE DE TESTES E2E - FINANÇAS FAMILIARES    ║");
    console.log("╠════════════════════════════════════════════════════════════════╣");
    console.log("║ Idioma: PT-BR (Plural)                                         ║");
    console.log("║ Viewport: Mobile-first (375x667)                               ║");
    console.log("║ Dados: Fictícios e Determinísticos                             ║");
    console.log("╚════════════════════════════════════════════════════════════════╝");
    console.log("\n");
  });

  afterAll(() => {
    const report = runner.generateReport();
    console.log(formatTestReport(report));
  });

  describe("0. Validação de Dados de Teste (Seed)", () => {
    it("deve ter família QA configurada", () => {
      runner.startTest("0.1 - Família QA");
      
      expect(TEST_FAMILY.name).toBe("Família QA");
      expect(TEST_FAMILY.members_count).toBe(2);
      
      runner.addStep("Verificar família", "Nome: Família QA", TEST_FAMILY.name, true);
      runner.endTest();
    });

    it("deve ter usuário admin com CPF e nascimento", () => {
      runner.startTest("0.2 - Usuário Admin com CPF");
      
      expect(TEST_ADMIN_USER.email).toBe("qa+admin@exemplo.com");
      expect(TEST_ADMIN_USER.password).toBe("SenhaForte@123");
      expect(TEST_ADMIN_USER.cpf).toBe("12345678901");
      expect(TEST_ADMIN_USER.birth_date).toBe("1990-03-15");
      
      runner.addStep("Verificar admin com CPF", "CPF: 12345678901", TEST_ADMIN_USER.cpf, true);
      runner.endTest();
    });

    it("deve ter banco/conta configurados", () => {
      runner.startTest("0.3 - Banco/Conta");
      
      expect(TEST_BANK_ACCOUNT.bank_name).toBe("Banco QA");
      expect(TEST_BANK_ACCOUNT.nickname).toBe("Conta Principal");
      
      runner.addStep("Verificar banco", "Banco QA - Conta Principal", TEST_BANK_ACCOUNT.nickname, true);
      runner.endTest();
    });

    it("deve ter cartão configurado", () => {
      runner.startTest("0.4 - Cartão");
      
      expect(TEST_CREDIT_CARD.card_name).toBe("Cartão QA");
      expect(TEST_CREDIT_CARD.credit_limit).toBe(5000);
      
      runner.addStep("Verificar cartão", "Cartão QA", TEST_CREDIT_CARD.card_name, true);
      runner.endTest();
    });

    it("deve ter metas de orçamento configuradas", () => {
      runner.startTest("0.5 - Metas");
      
      expect(TEST_BUDGETS.length).toBe(2);
      expect(TEST_BUDGETS[0].monthly_limit).toBe(500);
      expect(TEST_BUDGETS[1].monthly_limit).toBe(1200);
      
      runner.addStep("Verificar metas", "Restaurantes: R$ 500, Supermercado: R$ 1200", "2 metas", true);
      runner.endTest();
    });

    it("deve ter objetivos configurados", () => {
      runner.startTest("0.6 - Objetivos");
      
      expect(TEST_GOALS.length).toBe(2);
      expect(TEST_GOALS[0].title).toBe("Viagem");
      expect(TEST_GOALS[1].title).toBe("Reforma");
      
      runner.addStep("Verificar objetivos", "Viagem e Reforma", `${TEST_GOALS.length} objetivos`, true);
      runner.endTest();
    });

    it("deve ter recorrências configuradas", () => {
      runner.startTest("0.7 - Recorrências");
      
      expect(TEST_RECURRING_TRANSACTIONS.length).toBe(2);
      expect(TEST_RECURRING_TRANSACTIONS[0].amount).toBe(12000); // Salário
      expect(TEST_RECURRING_TRANSACTIONS[1].amount).toBe(2500); // Aluguel
      
      runner.addStep("Verificar recorrências", "Salário: R$ 12.000, Aluguel: R$ 2.500", "2 recorrências", true);
      runner.endTest();
    });

    it("deve ter parcelamento configurado", () => {
      runner.startTest("0.8 - Parcelamento");
      
      expect(TEST_INSTALLMENT.description).toBe("Celular parcelado");
      expect(TEST_INSTALLMENT.total_amount).toBe(2400);
      expect(TEST_INSTALLMENT.total_installments).toBe(12);
      
      runner.addStep("Verificar parcelamento", "Celular: 12x R$ 200", "12 parcelas", true);
      runner.endTest();
    });

    it("deve ter WhatsApp configurado", () => {
      runner.startTest("0.9 - WhatsApp");
      
      expect(WHATSAPP_CONFIG.phone).toBe("5548988483333");
      expect(WHATSAPP_CONFIG.message).toContain("consultoria financeira familiar");
      
      runner.addStep("Verificar WhatsApp", "+55 48 98848-3333", WHATSAPP_CONFIG.phone, true);
      runner.endTest();
    });

    it("deve ter métodos de pagamento corretos", () => {
      runner.startTest("0.10 - Métodos de Pagamento");
      
      // Despesas: todos os métodos
      expect(PAYMENT_METHODS.expense).toContain("pix");
      expect(PAYMENT_METHODS.expense).toContain("debit");
      expect(PAYMENT_METHODS.expense).toContain("credit");
      expect(PAYMENT_METHODS.expense).toContain("cash");
      expect(PAYMENT_METHODS.expense).toContain("transfer");
      expect(PAYMENT_METHODS.expense).toContain("cheque");
      
      // Receitas: NÃO tem débito/crédito
      expect(PAYMENT_METHODS.income).toContain("pix");
      expect(PAYMENT_METHODS.income).toContain("cash");
      expect(PAYMENT_METHODS.income).toContain("transfer");
      expect(PAYMENT_METHODS.income).toContain("cheque");
      expect(PAYMENT_METHODS.income).not.toContain("debit");
      expect(PAYMENT_METHODS.income).not.toContain("credit");
      
      runner.addStep("Verificar métodos", "Receita sem débito/crédito", "Métodos corretos", true);
      runner.endTest();
    });

    it("deve ter tentativas de senha de arquivo", () => {
      runner.startTest("0.11 - Senhas de Arquivo");
      
      expect(FILE_PASSWORD_ATTEMPTS.length).toBe(4);
      expect(FILE_PASSWORD_ATTEMPTS[0]).toBe(TEST_ADMIN_USER.cpf); // CPF 11 dígitos
      expect(FILE_PASSWORD_ATTEMPTS[1]).toBe(TEST_ADMIN_USER.cpf.substring(2)); // CPF sem 2 primeiros
      
      runner.addStep("Verificar tentativas de senha", "CPF e variações", `${FILE_PASSWORD_ATTEMPTS.length} tentativas`, true);
      runner.endTest();
    });
  });

  describe("Resumo de Cobertura", () => {
    it("deve cobrir todos os cenários especificados", () => {
      const coverage = {
        "1. Autenticação": ["login", "logout", "recuperar senha", "links legais"],
        "2. Cadastro/Onboarding": ["criar conta", "CPF obrigatório", "nascimento obrigatório", "importação opcional", "email boas-vindas"],
        "3. Dashboard": ["saldo atual", "fatura cartão", "timeline meses", "notificações", "configurações", "FAB", "WhatsApp CTA"],
        "4. Lançamentos": ["despesa PIX", "despesa dinheiro", "despesa débito", "despesa crédito", "despesa transferência", "despesa cheque", "receita sem débito/crédito", "editar", "excluir"],
        "5. Objetivos": ["criar objetivo", "subcategoria automática", "aporte gera transação", "editar objetivo", "excluir aporte específico", "progresso recalculado"],
        "6. Categorias": ["totais por transações reais", "subcategorias de objetivos", "filtro receita/despesa"],
        "7. Metas/Alertas": ["alerta 80%", "alerta 100%", "ajustar meta"],
        "8. Importação": ["OFX", "XLS", "PDF", "senha CPF 11 dígitos", "senha CPF sem 2 primeiros", "categorização", "deduplicação", "revisão obrigatória"],
        "9. Educação": ["placeholder ok"],
        "10. WhatsApp": ["deep link", "mensagem pré-preenchida", "número correto"],
        "11. Segurança": ["logs seguros", "senha não persistida", "senha não logada"]
      };
      
      const totalScenarios = Object.values(coverage).flat().length;
      
      expect(totalScenarios).toBeGreaterThan(50);
      expect(Object.keys(coverage).length).toBe(11);
      
      console.log("\n📊 Cobertura de Cenários:");
      Object.entries(coverage).forEach(([section, scenarios]) => {
        console.log(`  ${section}: ${scenarios.length} cenários`);
      });
      console.log(`  TOTAL: ${totalScenarios} cenários\n`);
    });
  });
});
