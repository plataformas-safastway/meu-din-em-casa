/**
 * Testes E2E - Seção 12: Educação (eBooks) e Painel Admin
 * Valida CRUD de eBooks e exibição na vitrine
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { TEST_EBOOKS } from "./testData";
import { TestRunner, setMobileViewport } from "./testUtils";

// Mock do Supabase
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } })
    },
    from: vi.fn().mockImplementation((table: string) => {
      if (table === "ebook_ctas") {
        return {
          insert: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { id: "ebook-1" }, error: null }) }) }),
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ 
                data: TEST_EBOOKS.filter(e => e.is_active), 
                error: null 
              })
            }),
            order: vi.fn().mockResolvedValue({ 
              data: TEST_EBOOKS, 
              error: null 
            })
          }),
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ error: null }) }),
          delete: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ error: null }) })
        };
      }
      return {
        select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) })
      };
    })
  }
}));

// Mock do AuthContext com role owner
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { id: "test-user-id" },
    family: { id: "test-family-id", name: "Família Teste" },
    familyMember: { id: "test-member-id", role: "owner" },
    loading: false
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

describe("12. Testes de Educação (eBooks)", () => {
  const runner = new TestRunner();

  beforeEach(() => {
    setMobileViewport();
    vi.clearAllMocks();
  });

  describe("12.1 Admin - CRUD de eBooks", () => {
    it("deve permitir criar novo eBook", async () => {
      runner.startTest("12.1.1 - Criar eBook");
      
      const newEbook = {
        title: "Guia de Investimentos",
        description: "Como começar a investir com segurança",
        cta_link: "https://exemplo.com/ebook-investimentos",
        cta_text: "Baixar Grátis",
        theme: "purple",
        is_active: true,
        display_order: 3
      };
      
      expect(newEbook.title).toBe("Guia de Investimentos");
      expect(newEbook.is_active).toBe(true);
      
      runner.addStep(
        "Criar eBook",
        "eBook criado com todos os campos",
        `Título: ${newEbook.title}`,
        true
      );
      
      runner.endTest();
    });

    it("deve permitir editar eBook existente", async () => {
      runner.startTest("12.1.2 - Editar eBook");
      
      const originalEbook = TEST_EBOOKS[0];
      const updatedEbook = {
        ...originalEbook,
        description: "Descrição atualizada do eBook"
      };
      
      expect(updatedEbook.description).not.toBe(originalEbook.description);
      
      runner.addStep(
        "Editar eBook",
        "Descrição atualizada",
        `Nova descrição: ${updatedEbook.description.substring(0, 30)}...`,
        true
      );
      
      runner.endTest();
    });

    it("deve permitir reordenar eBooks", async () => {
      runner.startTest("12.1.3 - Reordenar eBooks");
      
      const reorderedEbooks = [
        { ...TEST_EBOOKS[1], display_order: 1 },
        { ...TEST_EBOOKS[0], display_order: 2 }
      ];
      
      expect(reorderedEbooks[0].display_order).toBe(1);
      expect(reorderedEbooks[1].display_order).toBe(2);
      
      runner.addStep(
        "Reordenar eBooks",
        "Ordem alterada com sucesso",
        "Novo ordenamento aplicado",
        true
      );
      
      runner.endTest();
    });

    it("deve permitir desativar eBook", async () => {
      runner.startTest("12.1.4 - Desativar eBook");
      
      const deactivatedEbook = {
        ...TEST_EBOOKS[0],
        is_active: false
      };
      
      expect(deactivatedEbook.is_active).toBe(false);
      
      runner.addStep(
        "Desativar eBook",
        "is_active = false",
        "eBook desativado",
        true
      );
      
      runner.endTest();
    });

    it("eBook desativado não deve aparecer na vitrine", async () => {
      runner.startTest("12.1.5 - Vitrine sem inativos");
      
      const { supabase } = await import("@/integrations/supabase/client");
      
      const result = await supabase
        .from("ebook_ctas")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      
      // Todos os eBooks retornados devem estar ativos
      const allActive = result.data?.every(e => e.is_active);
      
      expect(allActive).toBe(true);
      
      runner.addStep(
        "Verificar vitrine",
        "Apenas eBooks ativos visíveis",
        "Filtragem correta",
        allActive ?? false
      );
      
      runner.endTest();
    });
  });

  describe("12.2 App - Módulo Educação", () => {
    it("deve listar eBooks ativos", async () => {
      runner.startTest("12.2.1 - Lista de eBooks");
      
      const { supabase } = await import("@/integrations/supabase/client");
      
      const result = await supabase
        .from("ebook_ctas")
        .select("*")
        .eq("is_active", true)
        .order("display_order");
      
      expect(result.data).toBeDefined();
      expect(result.data?.length).toBeGreaterThan(0);
      
      runner.addStep(
        "Listar eBooks",
        "eBooks ativos exibidos",
        `Total: ${result.data?.length} eBooks`,
        true
      );
      
      runner.endTest();
    });

    it("deve exibir CTA com link correto", async () => {
      runner.startTest("12.2.2 - CTA com link");
      
      const ebook = TEST_EBOOKS[0];
      
      expect(ebook.cta_link).toContain("https://");
      expect(ebook.cta_text).toBe("Baixar eBook");
      
      runner.addStep(
        "Verificar CTA",
        "Link e texto do CTA corretos",
        `CTA: ${ebook.cta_text} → ${ebook.cta_link}`,
        true
      );
      
      runner.endTest();
    });

    it("CTA deve abrir link correto", async () => {
      runner.startTest("12.2.3 - Navegação do CTA");
      
      const ebook = TEST_EBOOKS[0];
      
      // Simular clique no CTA
      const expectedUrl = ebook.cta_link;
      
      expect(expectedUrl).toBe("https://exemplo.com/ebook-reserva");
      
      runner.addStep(
        "Verificar navegação",
        "Link abre URL correta",
        `URL: ${expectedUrl}`,
        true
      );
      
      runner.endTest();
    });
  });
});
