import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Smartphone, LayoutDashboard, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useCanAccessAppFromDashboard } from "@/hooks/useAppAuthorization";
import { AppAccessDeniedModal } from "@/components/admin/AppAccessDeniedModal";
import oikMarca from "@/assets/oik-marca.png";

export function SelectContextPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { canAccess, reason, isLoading: appAccessLoading } = useCanAccessAppFromDashboard();
  const [showAppAccessDenied, setShowAppAccessDenied] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    navigate("/login", { replace: true });
    return null;
  }

  const handleSelectApp = () => {
    // Check if user can access the App
    if (appAccessLoading) return;
    
    if (!canAccess) {
      setShowAppAccessDenied(true);
      return;
    }
    
    navigate("/app", { replace: true });
  };

  const handleSelectDashboard = () => {
    navigate("/admin", { replace: true });
  };

  return (
    <>
      <AppAccessDeniedModal
        open={showAppAccessDenied}
        onClose={() => setShowAppAccessDenied(false)}
        reason={reason}
      />
      
      <div className="min-h-screen relative flex flex-col overflow-hidden">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-primary/5" />
        
        {/* Organic shape accents */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/3 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        {/* Main Content */}
        <main className="relative flex-1 flex flex-col items-center justify-center px-6 z-10">
          <div className="w-full max-w-md space-y-10">
            {/* Brand Block */}
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <img 
                  src={oikMarca} 
                  alt="Oik" 
                  className="h-16 sm:h-20 object-contain drop-shadow-sm"
                />
              </div>
              
              <div className="space-y-2">
                <h1 className="text-xl sm:text-2xl font-semibold text-foreground">
                  Onde você quer ir?
                </h1>
                <p className="text-sm text-muted-foreground">
                  Escolha o ambiente que deseja acessar
                </p>
              </div>
            </div>

            {/* Context Selection Cards */}
            <div className="space-y-4">
              {/* App Card */}
              <Card 
                className="cursor-pointer border-2 border-transparent hover:border-primary/30 hover:shadow-lg transition-all duration-300 group"
                onClick={handleSelectApp}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors duration-300">
                      <Smartphone className="w-7 h-7 text-primary" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <h2 className="text-lg font-semibold text-foreground">
                        Aplicativo OIK
                      </h2>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Organizar e decidir as finanças da sua família.
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="mt-2 rounded-lg group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all duration-300"
                        disabled={appAccessLoading}
                      >
                        {appAccessLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Entrar no App"
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Dashboard Card */}
              <Card 
                className="cursor-pointer border-2 border-transparent hover:border-accent/30 hover:shadow-lg transition-all duration-300 group"
                onClick={handleSelectDashboard}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center flex-shrink-0 group-hover:bg-accent/20 transition-colors duration-300">
                      <LayoutDashboard className="w-7 h-7 text-accent-foreground" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <h2 className="text-lg font-semibold text-foreground">
                        Dashboard OIK
                      </h2>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Gestão, suporte, indicadores e operação.
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="mt-2 rounded-lg group-hover:bg-accent group-hover:text-accent-foreground group-hover:border-accent transition-all duration-300"
                      >
                        Entrar no Dashboard
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Microcopy */}
            <p className="text-center text-xs text-muted-foreground/60">
              Você pode alternar entre os ambientes a qualquer momento.
            </p>
          </div>
        </main>
      </div>
    </>
  );
}