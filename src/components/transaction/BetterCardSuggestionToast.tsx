import { useState } from "react";
import { CreditCard, ArrowRight, X, Check, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface BetterCardSuggestionToastProps {
  usedCardName: string;
  betterCardName: string;
  extraDays: number;
  extraDaysType: "closing" | "due";
  onSwitch: () => Promise<boolean>;
  onDismiss: () => void;
  onDisablePermanently: () => void;
}

export function BetterCardSuggestionToast({
  usedCardName,
  betterCardName,
  extraDays,
  extraDaysType,
  onSwitch,
  onDismiss,
  onDisablePermanently,
}: BetterCardSuggestionToastProps) {
  const [isSwitching, setIsSwitching] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);

  const handleSwitch = async () => {
    setIsSwitching(true);
    const success = await onSwitch();
    setIsSwitching(false);
    // Toast will auto-dismiss on success via parent
  };

  const benefitText = extraDaysType === "closing" 
    ? `+${extraDays} dias até fechar a fatura`
    : `+${extraDays} dias para pagar`;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed bottom-20 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:w-96"
      >
        <div className="bg-card border-2 border-primary/20 rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-primary/5 px-4 py-3 flex items-center justify-between border-b border-primary/10">
            <div className="flex items-center gap-2 text-primary">
              <CreditCard className="w-5 h-5" />
              <span className="font-semibold text-sm">💡 Dica Rápida</span>
            </div>
            <button
              onClick={onDismiss}
              className="p-1 rounded-full hover:bg-primary/10 transition-colors"
              aria-label="Fechar"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4">
            {showDisableConfirm ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Deseja desativar essas dicas de cartão?
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDisableConfirm(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={onDisablePermanently}
                    className="flex-1"
                  >
                    Desativar
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Você usou <span className="font-medium text-foreground">{usedCardName}</span>, mas se usar:
                  </p>
                  
                  <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-xl border border-primary/20">
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">{betterCardName}</p>
                      <p className="text-sm text-primary font-medium">{benefitText}</p>
                    </div>
                    <ArrowRight className="w-5 h-5 text-primary" />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleSwitch}
                    disabled={isSwitching}
                    className="flex-1 h-10"
                  >
                    {isSwitching ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                        Trocando...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Check className="w-4 h-4" />
                        Trocar Agora
                      </span>
                    )}
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onDismiss}
                    className="h-10"
                  >
                    Manter
                  </Button>
                </div>

                {/* Disable link */}
                <button
                  onClick={() => setShowDisableConfirm(true)}
                  className="w-full text-xs text-muted-foreground/70 hover:text-muted-foreground transition-colors flex items-center justify-center gap-1"
                >
                  <Ban className="w-3 h-3" />
                  Não avisar mais
                </button>
              </>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
