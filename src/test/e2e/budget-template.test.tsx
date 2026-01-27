/**
 * Testes E2E - Orçamento Inteligente por Faixa de Renda
 * Valida geração automática de orçamento baseado em faixas
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { 
  INCOME_BANDS, 
  BASE_PERCENTAGES, 
  SUBBAND_ADJUSTMENTS,
  getBandById,
  getSubBandById,
  getBudgetablePrefixes,
  calculateAdjustedPercentages,
  calculateBudgetAmounts,
  getCategoryIdFromPrefix,
} from "@/data/budgetTemplates";
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
      delete: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ error: null }) }),
      upsert: vi.fn().mockReturnValue({ error: null })
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

describe("Orçamento Inteligente por Faixa de Renda", () => {
  const runner = new TestRunner();

  beforeEach(() => {
    setMobileViewport();
    vi.clearAllMocks();
  });

  describe("1. Configuração de Faixas de Renda", () => {
    it("deve ter 8 faixas de renda configuradas", async () => {
      runner.startTest("1.1 - Faixas de renda");
      
      expect(INCOME_BANDS).toHaveLength(8);
      expect(INCOME_BANDS[0].label).toBe("Até R$ 5.000");
      expect(INCOME_BANDS[7].label).toBe("Acima de R$ 120.000");
      
      runner.addStep(
        "Verificar faixas de renda",
        "8 faixas configuradas de até R$ 5k a 120k+",
        `${INCOME_BANDS.length} faixas encontradas`,
        true
      );
      
      runner.endTest();
    });

    it("cada faixa deve ter 3 subfaixas (baixa/média/alta)", async () => {
      runner.startTest("1.2 - Subfaixas");
      
      INCOME_BANDS.forEach(band => {
        expect(band.subBands).toHaveLength(3);
        expect(band.subBands.map(sb => sb.position)).toEqual(['low', 'mid', 'high']);
      });
      
      runner.addStep(
        "Verificar subfaixas",
        "Cada faixa tem 3 subfaixas (low/mid/high)",
        "Todas as faixas têm 3 subfaixas",
        true
      );
      
      runner.endTest();
    });

    it("subfaixas devem ter midpoint calculado", async () => {
      runner.startTest("1.3 - Midpoints");
      
      const band = getBandById("band_15k_30k");
      expect(band).toBeDefined();
      
      const subBand = getSubBandById("band_15k_30k", "band_15k_30k_mid");
      expect(subBand).toBeDefined();
      expect(subBand?.midpoint).toBe(22500);
      
      runner.addStep(
        "Verificar cálculo de midpoint",
        "Subfaixa média de 15k-30k deve ter midpoint = 22500",
        `Midpoint: ${subBand?.midpoint}`,
        true
      );
      
      runner.endTest();
    });
  });

  describe("2. Percentuais Base por Prefixo", () => {
    it("deve ter percentuais para todas as faixas", async () => {
      runner.startTest("2.1 - Percentuais por faixa");
      
      INCOME_BANDS.forEach(band => {
        expect(BASE_PERCENTAGES[band.id]).toBeDefined();
      });
      
      runner.addStep(
        "Verificar percentuais por faixa",
        "Todas as faixas têm percentuais configurados",
        "Percentuais encontrados para todas as faixas",
        true
      );
      
      runner.endTest();
    });

    it("soma dos percentuais base deve ser próxima de 100%", async () => {
      runner.startTest("2.2 - Soma percentuais");
      
      Object.entries(BASE_PERCENTAGES).forEach(([bandId, percentages]) => {
        const sum = Object.values(percentages).reduce((a, b) => a + b, 0);
        expect(sum).toBeCloseTo(1.0, 1); // Soma deve ser ~1.0 (100%)
      });
      
      runner.addStep(
        "Verificar soma de percentuais",
        "Soma de cada faixa deve ser ~100%",
        "Somas verificadas",
        true
      );
      
      runner.endTest();
    });

    it("faixas menores devem ter mais % em moradia (C)", async () => {
      runner.startTest("2.3 - Proporção moradia");
      
      const lowIncome = BASE_PERCENTAGES["band_0_5k"]["C"];
      const highIncome = BASE_PERCENTAGES["band_120k_plus"]["C"];
      
      expect(lowIncome).toBeGreaterThan(highIncome);
      
      runner.addStep(
        "Comparar % de moradia entre faixas",
        "Faixa baixa > faixa alta para categoria Casa",
        `Baixa: ${(lowIncome * 100).toFixed(0)}%, Alta: ${(highIncome * 100).toFixed(0)}%`,
        lowIncome > highIncome
      );
      
      runner.endTest();
    });
  });

  describe("3. Ajustes por Subfaixa", () => {
    it("subfaixa baixa deve aumentar moradia e reduzir lazer", async () => {
      runner.startTest("3.1 - Ajustes subfaixa baixa");
      
      const adjustments = SUBBAND_ADJUSTMENTS.low;
      
      expect(adjustments["C"]).toBeGreaterThan(0); // +2pp para moradia
      expect(adjustments["L"]).toBeLessThan(0);    // -1pp para lazer
      
      runner.addStep(
        "Verificar ajustes subfaixa baixa",
        "C aumenta, L diminui",
        `C: ${adjustments["C"] > 0 ? '+' : ''}${(adjustments["C"]! * 100).toFixed(0)}pp, L: ${(adjustments["L"]! * 100).toFixed(0)}pp`,
        true
      );
      
      runner.endTest();
    });

    it("subfaixa alta deve aumentar lazer e eventuais", async () => {
      runner.startTest("3.2 - Ajustes subfaixa alta");
      
      const adjustments = SUBBAND_ADJUSTMENTS.high;
      
      expect(adjustments["L"]).toBeGreaterThan(0); // +1pp para lazer
      expect(adjustments["E"]).toBeGreaterThan(0); // +1pp para eventuais
      
      runner.addStep(
        "Verificar ajustes subfaixa alta",
        "L e E aumentam",
        `L: +${(adjustments["L"]! * 100).toFixed(0)}pp, E: +${(adjustments["E"]! * 100).toFixed(0)}pp`,
        true
      );
      
      runner.endTest();
    });

    it("percentuais ajustados devem somar 100%", async () => {
      runner.startTest("3.3 - Normalização após ajustes");
      
      const adjusted = calculateAdjustedPercentages("band_15k_30k", "low", false, true);
      const sum = Object.values(adjusted).reduce((a, b) => a + b, 0);
      
      expect(sum).toBeCloseTo(1.0, 5);
      
      runner.addStep(
        "Verificar normalização",
        "Soma após ajustes = 100%",
        `Soma: ${(sum * 100).toFixed(2)}%`,
        true
      );
      
      runner.endTest();
    });
  });

  describe("4. Prefixos Condicionais (Pets/Filhos)", () => {
    it("sem pets: PET não deve estar no orçamento", async () => {
      runner.startTest("4.1 - Sem pets");
      
      const prefixes = getBudgetablePrefixes(false, false);
      const hasPet = prefixes.some(p => p.code === "PET");
      
      expect(hasPet).toBe(false);
      
      runner.addStep(
        "Verificar exclusão de PET",
        "PET não aparece sem pets",
        `PET presente: ${hasPet}`,
        !hasPet
      );
      
      runner.endTest();
    });

    it("com pets: PET deve estar no orçamento", async () => {
      runner.startTest("4.2 - Com pets");
      
      const prefixes = getBudgetablePrefixes(true, false);
      const hasPet = prefixes.some(p => p.code === "PET");
      
      expect(hasPet).toBe(true);
      
      runner.addStep(
        "Verificar inclusão de PET",
        "PET aparece com pets",
        `PET presente: ${hasPet}`,
        hasPet
      );
      
      runner.endTest();
    });

    it("sem dependentes: F não deve estar no orçamento", async () => {
      runner.startTest("4.3 - Sem dependentes");
      
      const prefixes = getBudgetablePrefixes(false, false);
      const hasFilhos = prefixes.some(p => p.code === "F");
      
      expect(hasFilhos).toBe(false);
      
      runner.addStep(
        "Verificar exclusão de Filhos",
        "F não aparece sem dependentes",
        `F presente: ${hasFilhos}`,
        !hasFilhos
      );
      
      runner.endTest();
    });

    it("com dependentes: F deve estar no orçamento", async () => {
      runner.startTest("4.4 - Com dependentes");
      
      const prefixes = getBudgetablePrefixes(false, true);
      const hasFilhos = prefixes.some(p => p.code === "F");
      
      expect(hasFilhos).toBe(true);
      
      runner.addStep(
        "Verificar inclusão de Filhos",
        "F aparece com dependentes",
        `F presente: ${hasFilhos}`,
        hasFilhos
      );
      
      runner.endTest();
    });
  });

  describe("5. Cálculo de Valores de Orçamento", () => {
    it("deve calcular valores corretos baseado na renda", async () => {
      runner.startTest("5.1 - Cálculo de valores");
      
      const percentages = { "C": 0.25, "A": 0.12, "T": 0.10 };
      const income = 20000;
      
      const amounts = calculateBudgetAmounts(income, percentages);
      
      expect(amounts["C"]).toBe(5000);  // 25% de 20000
      expect(amounts["A"]).toBe(2400);  // 12% de 20000
      expect(amounts["T"]).toBe(2000);  // 10% de 20000
      
      runner.addStep(
        "Calcular valores de orçamento",
        "C=5000, A=2400, T=2000 para renda 20k",
        `C=${amounts["C"]}, A=${amounts["A"]}, T=${amounts["T"]}`,
        true
      );
      
      runner.endTest();
    });

    it("deve mapear prefixos para category IDs corretos", async () => {
      runner.startTest("5.2 - Mapeamento prefixo -> categoria");
      
      expect(getCategoryIdFromPrefix("C")).toBe("casa");
      expect(getCategoryIdFromPrefix("A")).toBe("alimentacao");
      expect(getCategoryIdFromPrefix("L")).toBe("lazer");
      expect(getCategoryIdFromPrefix("F")).toBe("filhos");
      expect(getCategoryIdFromPrefix("PET")).toBe("pet");
      
      runner.addStep(
        "Verificar mapeamento",
        "Prefixos mapeiam para categorias corretas",
        "Mapeamentos verificados",
        true
      );
      
      runner.endTest();
    });
  });

  describe("6. Prefixos Excluídos", () => {
    it("Receitas (R) não deve ser budgetable", async () => {
      runner.startTest("6.1 - Receitas não é orçamento");
      
      const prefixes = getBudgetablePrefixes(true, true);
      const hasReceitas = prefixes.some(p => p.code === "R");
      
      expect(hasReceitas).toBe(false);
      
      runner.addStep(
        "Verificar exclusão de Receitas",
        "R não aparece nos prefixos orçamentáveis",
        `R presente: ${hasReceitas}`,
        !hasReceitas
      );
      
      runner.endTest();
    });

    it("Desconhecidas (DESC) não deve ser budgetable", async () => {
      runner.startTest("6.2 - DESC não é orçamento");
      
      const prefixes = getBudgetablePrefixes(true, true);
      const hasDESC = prefixes.some(p => p.code === "DESC");
      
      expect(hasDESC).toBe(false);
      
      runner.addStep(
        "Verificar exclusão de DESC",
        "DESC não aparece nos prefixos orçamentáveis",
        `DESC presente: ${hasDESC}`,
        !hasDESC
      );
      
      runner.endTest();
    });
  });
});
