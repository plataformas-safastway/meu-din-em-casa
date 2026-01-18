import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MoneyLoader } from "@/components/ui/money-loader";
import { useAuth } from "@/contexts/AuthContext";
import { useSetupFirstAdmin, useHasAnyAdmin } from "@/hooks/useUserRole";
import { toast } from "sonner";

export function AdminSetupPage() {
  const navigate = useNavigate();
  const { user, familyMember } = useAuth();
  const { data: hasAdmin, isLoading: checkingAdmin } = useHasAnyAdmin();
  const setupAdmin = useSetupFirstAdmin();
  const [success, setSuccess] = useState(false);

  const handleSetupAdmin = async () => {
    try {
      await setupAdmin.mutateAsync();
      setSuccess(true);
      toast.success("Você agora é o administrador do sistema!");
      setTimeout(() => {
        navigate("/admin");
      }, 2000);
    } catch (error: any) {
      toast.error(error.message || "Erro ao configurar administrador");
    }
  };

  if (checkingAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <MoneyLoader label="Verificando..." size="lg" />
      </div>
    );
  }

  if (hasAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Shield className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <CardTitle>Administrador já configurado</CardTitle>
            <CardDescription>
              O sistema já possui um administrador. Entre em contato com ele para obter acesso.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              variant="outline"
              onClick={() => navigate("/app")}
            >
              Voltar ao App
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
            <CardTitle>Configuração concluída!</CardTitle>
            <CardDescription>
              Você agora é o administrador do sistema. Redirecionando para o painel...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Shield className="w-16 h-16 mx-auto text-primary mb-4" />
          <CardTitle>Configuração Inicial</CardTitle>
          <CardDescription>
            Nenhum administrador foi configurado ainda. Como você é o primeiro usuário, pode se tornar o administrador do sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <p className="text-sm font-medium">Usuário atual:</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
            {familyMember && (
              <p className="text-sm text-muted-foreground">{familyMember.display_name}</p>
            )}
          </div>

          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Como administrador, você poderá:
            </p>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>Gerenciar todos os usuários</li>
              <li>Visualizar dados financeiros dos usuários</li>
              <li>Gerenciar eBooks e conteúdo educacional</li>
              <li>Atribuir papéis (Admin, CS, Usuário)</li>
              <li>Acessar métricas e relatórios</li>
            </ul>
          </div>

          <Button 
            className="w-full" 
            onClick={handleSetupAdmin}
            disabled={setupAdmin.isPending}
          >
            {setupAdmin.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Configurando...
              </>
            ) : (
              <>
                <Shield className="w-4 h-4 mr-2" />
                Tornar-me Administrador
              </>
            )}
          </Button>

          <Button 
            className="w-full" 
            variant="ghost"
            onClick={() => navigate("/app")}
          >
            Continuar como usuário comum
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
