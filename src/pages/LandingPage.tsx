import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import oikLogo from "@/assets/oik-logo.png";

export function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Main Content - Centered */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm text-center space-y-8">
          {/* Logo */}
          <div className="flex justify-center">
            <img 
              src={oikLogo} 
              alt="Oik" 
              className="w-20 h-20 object-contain"
            />
          </div>

          {/* 1. App Name */}
          <h1 className="text-4xl font-semibold text-foreground tracking-tight">
            Oik
          </h1>

          {/* 2. Slogan / Purpose */}
          <p className="text-lg text-muted-foreground leading-relaxed">
            Inteligência financeira familiar.
            <br />
            Ordem, clareza e tranquilidade.
          </p>

          {/* 3. Complementary Text */}
          <p className="text-base text-muted-foreground/80 leading-relaxed">
            O sistema silencioso que organiza
            <br />
            a vida financeira da sua casa.
          </p>

          {/* 4. Primary CTA */}
          <div className="pt-6">
            <Button 
              size="lg" 
              className="w-full h-14 text-base font-medium rounded-xl transition-all duration-300"
              onClick={() => navigate("/signup")}
            >
              Criar conta
            </Button>
          </div>

          {/* 5. Secondary Action */}
          <button
            onClick={() => navigate("/login")}
            className="text-base text-muted-foreground hover:text-foreground transition-colors duration-300"
          >
            Já tenho conta
          </button>
        </div>
      </main>

      {/* 6. Footer with Policies */}
      <footer className="px-6 pb-8 pt-4">
        <p className="text-center text-sm text-muted-foreground/70 leading-relaxed">
          Ao continuar, vocês concordam com nossos
          <br />
          <Link 
            to="/termos" 
            className="text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors duration-300"
          >
            Termos de Uso
          </Link>
          {" e "}
          <Link 
            to="/privacidade" 
            className="text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors duration-300"
          >
            Política de Privacidade
          </Link>
          .
        </p>
      </footer>
    </div>
  );
}
