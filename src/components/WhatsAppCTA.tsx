import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface WhatsAppCTAProps {
  className?: string;
  variant?: "fixed" | "inline";
}

export function WhatsAppCTA({ className = "", variant = "fixed" }: WhatsAppCTAProps) {
  const phoneNumber = "5548988483333";
  const message = encodeURIComponent(
    "Olá! Quero agendar 1 hora de consultoria financeira familiar. Meu nome é ____."
  );
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;

  if (variant === "inline") {
    return (
      <Button
        className={`gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white ${className}`}
        onClick={() => window.open(whatsappUrl, "_blank")}
      >
        <MessageCircle className="w-4 h-4" />
        Falar com Especialista
      </Button>
    );
  }

  return (
    <button
      onClick={() => window.open(whatsappUrl, "_blank")}
      className={`fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full bg-[#25D366] hover:bg-[#128C7E] text-white shadow-lg flex items-center justify-center transition-transform hover:scale-110 ${className}`}
      aria-label="Falar com especialista no WhatsApp"
    >
      <MessageCircle className="w-6 h-6" />
    </button>
  );
}
