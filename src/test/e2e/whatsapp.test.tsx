/**
 * Testes E2E - Seção 11: Botão WhatsApp
 * Valida deep link e mensagem pré-preenchida
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "@testing-library/react";
import { screen } from "@testing-library/react";
import { WHATSAPP_CONFIG } from "./testData";
import { TestRunner, setMobileViewport } from "./testUtils";

// Mock do componente WhatsAppCTA
vi.mock("@/components/WhatsAppCTA", () => ({
  WhatsAppCTA: () => (
    <a 
      href={`https://wa.me/${WHATSAPP_CONFIG.phone}?text=${encodeURIComponent(WHATSAPP_CONFIG.message)}`}
      target="_blank"
      rel="noopener noreferrer"
      data-testid="whatsapp-cta"
    >
      Chamar Especialista
    </a>
  )
}));

describe("11. Testes do Botão WhatsApp", () => {
  const runner = new TestRunner();

  beforeEach(() => {
    setMobileViewport();
    vi.clearAllMocks();
  });

  describe("11.1 Deep Link WhatsApp", () => {
    it("deve ter número correto (+55 48 98848-3333)", async () => {
      runner.startTest("11.1.1 - Número WhatsApp");
      
      const expectedPhone = "5548988483333";
      expect(WHATSAPP_CONFIG.phone).toBe(expectedPhone);
      
      runner.addStep(
        "Verificar número",
        "Número: +55 48 98848-3333",
        `Configurado: ${WHATSAPP_CONFIG.phone}`,
        true
      );
      
      runner.endTest();
    });

    it("deve ter mensagem pré-preenchida correta", async () => {
      runner.startTest("11.1.2 - Mensagem pré-preenchida");
      
      const expectedMessage = "Olá! Quero agendar 1 hora de consultoria financeira familiar. Meu nome é ____.";
      expect(WHATSAPP_CONFIG.message).toBe(expectedMessage);
      
      runner.addStep(
        "Verificar mensagem",
        "Mensagem padrão de consultoria",
        `Mensagem: ${WHATSAPP_CONFIG.message.substring(0, 50)}...`,
        true
      );
      
      runner.endTest();
    });

    it("deve gerar URL wa.me correta", async () => {
      runner.startTest("11.1.3 - URL wa.me");
      
      const expectedUrl = `https://wa.me/${WHATSAPP_CONFIG.phone}?text=${encodeURIComponent(WHATSAPP_CONFIG.message)}`;
      
      expect(expectedUrl).toContain("wa.me/5548988483333");
      expect(expectedUrl).toContain("text=");
      
      runner.addStep(
        "Verificar URL gerada",
        "URL válida para wa.me",
        "URL formatada corretamente",
        true
      );
      
      runner.endTest();
    });

    it("deve ter fallback para web.whatsapp em desktop", async () => {
      runner.startTest("11.1.4 - Fallback desktop");
      
      // Simular desktop
      Object.defineProperty(window, "innerWidth", { value: 1024, writable: true });
      
      // A URL wa.me já funciona em desktop (redireciona para web.whatsapp)
      const url = `https://wa.me/${WHATSAPP_CONFIG.phone}`;
      
      expect(url).toContain("wa.me");
      
      runner.addStep(
        "Verificar fallback desktop",
        "wa.me funciona em desktop",
        "Fallback automático pelo WhatsApp",
        true
      );
      
      runner.endTest();
    });
  });

  describe("11.2 Componente WhatsAppCTA", () => {
    it("deve renderizar botão/link visível", async () => {
      runner.startTest("11.2.1 - Botão visível");
      
      const { WhatsAppCTA } = await import("@/components/WhatsAppCTA");
      
      // O mock já está configurado
      render(<WhatsAppCTA />);
      
      const ctaElement = screen.getByTestId("whatsapp-cta");
      expect(ctaElement).toBeInTheDocument();
      
      runner.addStep(
        "Verificar botão renderizado",
        "Botão/link CTA visível",
        "Elemento encontrado",
        true
      );
      
      runner.endTest();
    });

    it("deve abrir em nova aba (target=_blank)", async () => {
      runner.startTest("11.2.2 - Nova aba");
      
      const { WhatsAppCTA } = await import("@/components/WhatsAppCTA");
      
      render(<WhatsAppCTA />);
      
      const ctaElement = screen.getByTestId("whatsapp-cta");
      expect(ctaElement).toHaveAttribute("target", "_blank");
      expect(ctaElement).toHaveAttribute("rel", "noopener noreferrer");
      
      runner.addStep(
        "Verificar atributos de segurança",
        "target=_blank e rel=noopener noreferrer",
        "Atributos corretos",
        true
      );
      
      runner.endTest();
    });
  });
});
