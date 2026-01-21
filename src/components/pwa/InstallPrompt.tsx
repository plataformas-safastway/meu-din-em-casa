import { useState, useEffect } from 'react';
import { X, Download, Share, Plus, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { usePWA } from '@/hooks/usePWA';
import { motion, AnimatePresence } from 'framer-motion';

export function InstallPrompt() {
  const {
    isInstalled,
    isInstallable,
    isIOS,
    showIOSInstructions,
    promptInstall,
    dismissIOSInstructions,
    shouldShowPrompt,
    dismissPrompt,
  } = usePWA();
  
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Show prompt after a delay (2 seconds after load)
    const timer = setTimeout(() => {
      if (shouldShowPrompt() && !isDismissed) {
        setIsVisible(true);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [shouldShowPrompt, isDismissed]);

  const handleInstall = async () => {
    const result = await promptInstall();
    if (result.success) {
      setIsVisible(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    setIsVisible(false);
    dismissPrompt();
  };

  if (isInstalled || !isVisible) {
    return null;
  }

  // iOS Instructions Modal
  if (showIOSInstructions) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/60 flex items-end justify-center p-4"
          onClick={dismissIOSInstructions}
        >
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <Card className="bg-background border-primary/20">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-primary/10">
                      <Smartphone className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">Instalar no iPhone</h3>
                      <p className="text-sm text-muted-foreground">Acesse direto da tela inicial</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={dismissIOSInstructions}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                      1
                    </div>
                    <div className="flex items-center gap-2">
                      <span>Toque em</span>
                      <Share className="h-5 w-5 text-primary" />
                      <span className="font-medium">Compartilhar</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                      2
                    </div>
                    <div className="flex items-center gap-2">
                      <span>Role e toque</span>
                      <Plus className="h-5 w-5 text-primary" />
                      <span className="font-medium">Adicionar à Tela de Início</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                      3
                    </div>
                    <div>
                      <span className="font-medium">Confirme tocando "Adicionar"</span>
                    </div>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={dismissIOSInstructions}
                >
                  Entendi
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  // Android/Desktop Install Prompt
  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-20 left-4 right-4 z-40"
      >
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/30 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="p-2 rounded-xl bg-primary/20">
                <Download className="h-6 w-6 text-primary" />
              </div>
              
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm">Instalar o app</h4>
                <p className="text-xs text-muted-foreground truncate">
                  {isIOS ? 'Adicione à tela inicial' : 'Acesse sem digitar o endereço'}
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleDismiss}
                >
                  <X className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  onClick={handleInstall}
                  className="bg-primary hover:bg-primary/90"
                >
                  {isIOS ? 'Ver como' : 'Instalar'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
