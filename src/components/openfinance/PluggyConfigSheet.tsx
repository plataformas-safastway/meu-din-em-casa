import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { usePluggyConfig } from "@/hooks/useOpenFinance";
import { CheckCircle, XCircle, Loader2, AlertCircle, Shield } from "lucide-react";

interface PluggyConfigSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PluggyConfigSheet({ open, onOpenChange }: PluggyConfigSheetProps) {
  const { data: config, isLoading } = usePluggyConfig();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[60vh] rounded-t-3xl">
        <SheetHeader className="text-left pb-4">
          <SheetTitle>Status do Open Finance</SheetTitle>
          <SheetDescription>
            Verifique o status da integração Open Finance
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 pb-6">
          {/* Status atual */}
          <div className="p-4 rounded-xl bg-muted/50 border border-border/30">
            <h3 className="text-sm font-medium mb-3">Status da Configuração</h3>
            
            {isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Verificando...
              </div>
            ) : config?.configured ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-green-500/10 border border-green-500/30">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <div>
                    <span className="text-sm font-medium text-green-600">Open Finance Ativo</span>
                    <p className="text-xs text-muted-foreground">
                      Você pode conectar seus bancos e cartões
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                  <AlertCircle className="w-5 h-5 text-yellow-500" />
                  <div>
                    <span className="text-sm font-medium text-yellow-600">Aguardando Configuração</span>
                    <p className="text-xs text-muted-foreground">
                      O administrador precisa configurar a integração Open Finance
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sobre */}
          <div className="p-4 rounded-xl bg-muted/30 border border-border/30 space-y-3">
            <h3 className="font-medium text-sm flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Sobre Open Finance
            </h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                <span>Conexão somente leitura - não movimentamos seu dinheiro</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                <span>Você pode desconectar quando quiser</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="w-4 h-4 text-green-500 mt-0.5" />
                <span>Dados criptografados e protegidos pela LGPD</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-4 border-t border-border/30">
          <Button 
            variant="outline"
            className="w-full" 
            onClick={() => onOpenChange(false)}
          >
            Fechar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
