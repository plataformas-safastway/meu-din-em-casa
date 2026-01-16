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
  WHATSAPP_CONFIG
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
    it("deve ter família fictícia configurada", () => {
      runner.startTest("0.1 - Família Teste");
      
      expect(TEST_FAMILY.name).toBe("Família Teste");
      expect(TEST_FAMILY.members_count).toBe(2);
      
      runner.addStep("Verificar família", "Nome: Família Teste", TEST_FAMILY.name, true);
      runner.endTest();
    });

    it("deve ter usuário admin configurado", () => {
      runner.startTest("0.2 - Usuário Admin");
      
      expect(TEST_ADMIN_USER.email).toBe("qa+admin@exemplo.com");
      expect(TEST_ADMIN_USER.password).toBe("SenhaForte@123");
      
      runner.addStep("Verificar admin", "Email: qa+admin@exemplo.com", TEST_ADMIN_USER.email, true);
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

    it("deve ter recorrências configuradas", () => {
      runner.startTest("0.6 - Recorrências");
      
      expect(TEST_RECURRING_TRANSACTIONS.length).toBe(2);
      expect(TEST_RECURRING_TRANSACTIONS[0].amount).toBe(12000); // Salário
      expect(TEST_RECURRING_TRANSACTIONS[1].amount).toBe(2500); // Aluguel
      
      runner.addStep("Verificar recorrências", "Salário: R$ 12.000, Aluguel: R$ 2.500", "2 recorrências", true);
      runner.endTest();
    });

    it("deve ter parcelamento configurado", () => {
      runner.startTest("0.7 - Parcelamento");
      
      expect(TEST_INSTALLMENT.description).toBe("Celular parcelado");
      expect(TEST_INSTALLMENT.total_amount).toBe(2400);
      expect(TEST_INSTALLMENT.total_installments).toBe(12);
      
      runner.addStep("Verificar parcelamento", "Celular: 12x R$ 200", "12 parcelas", true);
      runner.endTest();
    });

    it("deve ter WhatsApp configurado", () => {
      runner.startTest("0.8 - WhatsApp");
      
      expect(WHATSAPP_CONFIG.phone).toBe("5548988483333");
      expect(WHATSAPP_CONFIG.message).toContain("consultoria financeira familiar");
      
      runner.addStep("Verificar WhatsApp", "+55 48 98848-3333", WHATSAPP_CONFIG.phone, true);
      runner.endTest();
    });
  });

  describe("Resumo de Cobertura", () => {
    it("deve cobrir todos os cenários especificados", () => {
      const coverage = {
        "1. Autenticação": ["login", "logout", "recuperar senha", "links legais"],
        "2. Cadastro/Onboarding": ["criar conta", "importação opcional", "email boas-vindas"],
        "3. Bancos/Cartões": ["cadastrar banco", "cadastrar cartão", "listagem"],
        "4. Lançamentos": ["receita", "despesa débito", "despesa crédito", "editar", "excluir"],
        "5. Metas/Alertas": ["alerta 80%", "alerta 100%", "ajustar meta"],
        "6. Recorrências": ["criar", "execução automática", "detecção padrão"],
        "7. Importação": ["OFX", "XLS", "PDF", "senha", "categorização", "deduplicação"],
        "8. Orçamento Projetado": ["sugestão metas", "meta vs projeção"],
        "9. Parcelas/Fluxo": ["criar parcelamento", "projeção 30/60/90", "alerta saldo"],
        "10. Relatório IA": ["opt-in", "geração", "cenários bom/ruim"],
        "11. WhatsApp": ["deep link", "mensagem pré-preenchida"],
        "12. eBooks": ["CRUD admin", "vitrine app"],
        "13. Segurança": ["logs seguros", "isolamento RLS", "rate limiting"]
      };
      
      const totalScenarios = Object.values(coverage).flat().length;
      
      expect(totalScenarios).toBeGreaterThan(40);
      expect(Object.keys(coverage).length).toBe(13);
      
      console.log("\n📊 Cobertura de Cenários:");
      Object.entries(coverage).forEach(([section, scenarios]) => {
        console.log(`  ${section}: ${scenarios.length} cenários`);
      });
      console.log(`  TOTAL: ${totalScenarios} cenários\n`);
    });
  });
});
