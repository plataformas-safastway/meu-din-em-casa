import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import oikSymbol from "@/assets/oik-symbol.svg";

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Main Content - Centered */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm text-center space-y-10">
          {/* Símbolo Oik */}
          <div className="flex justify-center animate-fade-in">
            <img 
              src={oikSymbol} 
              alt="Oik" 
              className="w-16 h-16 object-contain"
            />
          </div>

          {/* Slogan - Silent & Premium */}
          <div className="space-y-4 animate-fade-in">
            <p className="text-lg text-muted-foreground leading-relaxed">
              Tudo no lugar. Família em controle.
            </p>
          </div>

          {/* Primary CTA */}
          <div className="pt-4 animate-slide-up">
            <Button 
              size="lg" 
              className="w-full h-14 text-base font-medium rounded-xl transition-all duration-300"
              onClick={() => navigate("/signup")}
            >
              Começar
            </Button>
          </div>

          {/* Secondary Action */}
          <button
            onClick={() => navigate("/login")}
            className="text-base text-muted-foreground hover:text-foreground transition-colors duration-300"
          >
            Já tenho conta
          </button>
        </div>
      </main>

      {/* Footer - Minimal */}
      <footer className="px-6 pb-8 pt-4">
        <p className="text-center text-xs text-muted-foreground/50 leading-relaxed">
          <Link 
            to="/termos" 
            className="hover:text-muted-foreground underline underline-offset-2 transition-colors duration-300"
          >
            Termos
          </Link>
          {" · "}
          <Link 
            to="/privacidade" 
            className="hover:text-muted-foreground underline underline-offset-2 transition-colors duration-300"
          >
            Privacidade
          </Link>
        </p>
      </footer>
    </div>
  );
}
