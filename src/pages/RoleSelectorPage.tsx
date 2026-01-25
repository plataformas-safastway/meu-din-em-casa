import { useNavigate } from "react-router-dom";
import { LayoutDashboard, Wallet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";

export function RoleSelectorPage() {
  const navigate = useNavigate();
  const { familyMember } = useAuth();

  const firstName = familyMember?.display_name?.split(" ")[0] || "usuário";

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold text-foreground">
            Olá, {firstName}!
          </h1>
          <p className="text-muted-foreground">
            Onde você quer ir?
          </p>
        </div>

        {/* Options */}
        <div className="space-y-4">
          {/* Admin Dashboard Option */}
          <Card 
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => navigate("/admin")}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <LayoutDashboard className="w-7 h-7 text-primary" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-foreground">
                    Painel Administrativo
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Gestão, relatórios e métricas
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* User App Option */}
          <Card 
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => navigate("/app")}
          >
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-secondary flex items-center justify-center shrink-0">
                  <Wallet className="w-7 h-7 text-secondary-foreground" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-foreground">
                    Minhas Finanças
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Controle pessoal e familiar
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
