import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useAuth } from "@/contexts/AuthContext";

interface WelcomeModalProps {
  onClose?: () => void;
}

export function WelcomeModal({ onClose }: WelcomeModalProps) {
  const { user, family } = useAuth();
  const { state, isLoading, markWelcomeSeen, isNewUser } = useOnboarding();
  const [isOpen, setIsOpen] = useState(false);

  // Show modal only for new users
  useEffect(() => {
    if (!isLoading && isNewUser) {
      // Small delay for smooth entrance
      const timer = setTimeout(() => setIsOpen(true), 500);
      return () => clearTimeout(timer);
    }
  }, [isLoading, isNewUser]);

  const handleClose = async () => {
    setIsOpen(false);
    await markWelcomeSeen.mutateAsync();
    onClose?.();
  };

  // Get user's first name
  const firstName = user?.user_metadata?.display_name?.split(" ")[0] || "Usuário";
  const familyName = family?.name || "sua família";

  if (isLoading || !isNewUser) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 max-w-md mx-auto"
          >
            <div className="relative bg-card rounded-3xl shadow-2xl overflow-hidden">
              {/* Close button */}
              <button
                onClick={handleClose}
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-muted/50 transition-colors z-10"
                aria-label="Fechar"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>

              {/* Header gradient */}
              <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent px-6 pt-8 pb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
                    <Home className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-warning" />
                      <span className="text-xs font-medium text-muted-foreground">
                        Bem-vindo ao OIK
                      </span>
                    </div>
                  </div>
                </div>

                <h2 className="text-2xl font-bold text-foreground mb-2">
                  Olá, {firstName}! 👋
                </h2>
                <p className="text-muted-foreground">
                  É um prazer ter você e {familyName} por aqui.
                </p>
              </div>

              {/* Content */}
              <div className="px-6 py-6 space-y-4">
                <p className="text-foreground leading-relaxed">
                  <strong className="text-primary">
                    Aqui, a economia começa em casa — no seu tempo.
                  </strong>
                </p>
                
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Não se preocupe em fazer tudo de uma vez. O OIK foi feito para 
                  acompanhar o ritmo da sua família, sem pressa e sem pressão.
                </p>

                {/* Progress indicator */}
                <div className="flex items-center gap-3 bg-muted/30 rounded-xl p-3">
                  <div className="relative w-10 h-10">
                    <svg className="w-10 h-10 -rotate-90">
                      <circle
                        cx="20"
                        cy="20"
                        r="16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        className="text-muted"
                      />
                      <circle
                        cx="20"
                        cy="20"
                        r="16"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeDasharray={`${(state.progressPercent / 100) * 100.5} 100.5`}
                        className="text-primary"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                      {state.progressPercent}%
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Seu progresso inicial</p>
                    <p className="text-xs text-muted-foreground">
                      Vamos descobrir juntos como o OIK pode ajudar
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 pb-6">
                <Button
                  onClick={handleClose}
                  className="w-full rounded-xl h-12 text-base font-semibold"
                  size="lg"
                >
                  Começar a explorar
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
