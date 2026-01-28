/**
 * AppAccessDeniedModal - Shows when Dashboard user tries to access App without consumer profile
 * 
 * This modal blocks navigation to /app when the user:
 * - Is an admin/master user without a consumer profile (no family_member record)
 * - Has not completed the App onboarding
 * 
 * CONSISTENCY: Messaging aligned with /app-access-blocked page
 */

import { AlertCircle, Smartphone, ArrowLeft, LogOut, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

interface AppAccessDeniedModalProps {
  open: boolean;
  onClose: () => void;
  reason: 'no_consumer_profile' | 'onboarding_incomplete' | null;
}

export function AppAccessDeniedModal({
  open,
  onClose,
  reason,
}: AppAccessDeniedModalProps) {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  
  const isNoProfile = reason === 'no_consumer_profile';
  const isOnboardingIncomplete = reason === 'onboarding_incomplete';

  const handleSignOutAndCreateAccount = async () => {
    onClose();
    await signOut();
    // Navigate to signup as a public user
    navigate("/signup", { replace: true });
  };

  const handleViewDetails = () => {
    onClose();
    navigate("/app-access-blocked");
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <AlertCircle className="w-8 h-8 text-destructive" />
          </div>
          <DialogTitle className="text-xl">
            Acesso ao App indisponível
          </DialogTitle>
          <DialogDescription className="text-center mt-2">
            {isNoProfile && (
              <>
                Este login é do <strong>Dashboard administrativo</strong> e não possui um usuário no App OIK.
              </>
            )}
            {isOnboardingIncomplete && (
              <>
                Você possui uma conta no App, mas o <strong>cadastro inicial</strong> ainda não foi concluído.
                Complete o onboarding para ter acesso completo.
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-6">
          {/* Explanation box - consistent with blocked page */}
          {isNoProfile && (
            <div className="p-4 bg-muted/50 rounded-lg text-sm text-muted-foreground space-y-2">
              <p>
                O <strong>Dashboard</strong> e o <strong>App</strong> são ambientes separados com contextos de acesso independentes.
              </p>
            </div>
          )}
          
          {isOnboardingIncomplete && (
            <div className="p-4 bg-muted rounded-lg text-sm text-muted-foreground">
              <p className="flex items-start gap-2">
                <Smartphone className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>
                  Acesse o App pela rota <code className="bg-background px-1 rounded">/onboarding</code> para continuar seu cadastro.
                </span>
              </p>
            </div>
          )}

          {/* Primary CTA: Return to Dashboard */}
          <Button 
            className="w-full gap-2" 
            onClick={onClose}
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Dashboard
          </Button>

          {/* Secondary CTA: Sign out and create consumer account */}
          {isNoProfile && (
            <Button 
              variant="outline" 
              className="w-full gap-2" 
              onClick={handleSignOutAndCreateAccount}
            >
              <LogOut className="w-4 h-4" />
              Sair e criar conta do App
            </Button>
          )}

          {/* Link to full details page */}
          {isNoProfile && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground hover:text-foreground"
              onClick={handleViewDetails}
            >
              <ExternalLink className="w-3 h-3 mr-1" />
              Ver detalhes
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Contas do Dashboard e do App são independentes.
        </p>
      </DialogContent>
    </Dialog>
  );
}
