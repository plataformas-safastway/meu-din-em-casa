/**
 * AppAccessBlockedPage - Tela de bloqueio para admins sem perfil consumer
 * 
 * Esta página é exibida quando:
 * - Usuário está autenticado (admin/master)
 * - MAS não possui registro em family_members (não é consumer)
 * 
 * REGRAS:
 * - NÃO permite criar família/signup automaticamente
 * - NÃO redireciona para /signup
 * - Apenas oferece voltar ao Dashboard
 */

import { useNavigate } from "react-router-dom";
import { ShieldAlert, ArrowLeft, LayoutDashboard, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import oikMarca from "@/assets/oik-marca.png";

export function AppAccessBlockedPage() {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { data: role } = useUserRole();

  const handleGoToDashboard = () => {
    navigate("/admin", { replace: true });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  // Determine if user has admin access
  const isAdminUser = role === 'admin' || role === 'cs' || role === 'admin_master';

  return (
    <div className="min-h-screen relative flex flex-col overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-destructive/5" />
      
      {/* Organic shape accents */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-destructive/3 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-muted/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

      {/* Main Content */}
      <main className="relative flex-1 flex flex-col items-center justify-center px-6 z-10">
        <div className="w-full max-w-md space-y-8">
          {/* Brand Block */}
          <div className="text-center">
            <div className="flex justify-center mb-6">
              <img 
                src={oikMarca} 
                alt="Oik" 
                className="h-12 sm:h-14 object-contain opacity-50"
              />
            </div>
          </div>

          {/* Blocked Card */}
          <Card className="border-destructive/20 shadow-lg">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <ShieldAlert className="w-8 h-8 text-destructive" />
              </div>
              <CardTitle className="text-xl">
                Acesso ao App indisponível
              </CardTitle>
              <CardDescription className="text-base mt-2">
                Este login é do <strong>Dashboard administrativo</strong> e não possui um usuário no App OIK.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Explanation */}
              <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground space-y-2">
                <p>
                  O <strong>Dashboard</strong> e o <strong>App</strong> são ambientes separados com contextos de acesso independentes.
                </p>
                <p>
                  Para usar o App OIK como consumidor, é necessário criar uma conta de usuário separada.
                </p>
              </div>

              {/* User info */}
              {user?.email && (
                <div className="text-center text-sm text-muted-foreground">
                  Logado como: <span className="font-medium">{user.email}</span>
                  {role && (
                    <span className="ml-2 px-2 py-0.5 bg-primary/10 text-primary rounded text-xs uppercase">
                      {role}
                    </span>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="space-y-3 pt-2">
                {isAdminUser && (
                  <Button 
                    className="w-full gap-2" 
                    onClick={handleGoToDashboard}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Voltar ao Dashboard
                  </Button>
                )}

                <Button 
                  variant="outline" 
                  className="w-full gap-2" 
                  onClick={handleSignOut}
                >
                  <LogOut className="w-4 h-4" />
                  Sair e usar outra conta
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Footer note */}
          <p className="text-center text-xs text-muted-foreground/60">
            Para suporte, entre em contato com o administrador do sistema.
          </p>
        </div>
      </main>
    </div>
  );
}

export default AppAccessBlockedPage;
