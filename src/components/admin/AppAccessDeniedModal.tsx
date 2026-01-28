/**
 * AppAccessDeniedModal - Shows when Dashboard user tries to access App without consumer profile
 * 
 * This modal blocks navigation to /app when the user:
 * - Is an admin/master user without a consumer profile (no family_member record)
 * - Has not completed the App onboarding
 */

import { AlertCircle, Smartphone, ArrowLeft, UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface AppAccessDeniedModalProps {
  open: boolean;
  onClose: () => void;
  reason: 'no_consumer_profile' | 'onboarding_incomplete' | null;
  onCreateConsumerProfile?: () => void;
  showCreateOption?: boolean;
}

export function AppAccessDeniedModal({
  open,
  onClose,
  reason,
  onCreateConsumerProfile,
  showCreateOption = false,
}: AppAccessDeniedModalProps) {
  const isNoProfile = reason === 'no_consumer_profile';
  const isOnboardingIncomplete = reason === 'onboarding_incomplete';

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
                Seu login é do <strong>Dashboard administrativo</strong>. Para acessar o{" "}
                <strong>App OIK</strong>, é necessário ter uma conta de usuário consumer.
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
          {isNoProfile && showCreateOption && onCreateConsumerProfile && (
            <Button 
              className="w-full gap-2" 
              onClick={onCreateConsumerProfile}
            >
              <UserPlus className="w-4 h-4" />
              Criar conta do App
            </Button>
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

          <Button 
            variant="outline" 
            className="w-full gap-2" 
            onClick={onClose}
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Dashboard
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Contas do Dashboard e do App são independentes.<br />
          Cada uma tem seu próprio contexto de acesso.
        </p>
      </DialogContent>
    </Dialog>
  );
}
