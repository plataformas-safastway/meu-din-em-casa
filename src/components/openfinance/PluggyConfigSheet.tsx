import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePluggyConfig } from "@/hooks/useOpenFinance";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff, CheckCircle, XCircle, ExternalLink, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface PluggyConfigSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PluggyConfigSheet({ open, onOpenChange }: PluggyConfigSheetProps) {
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  
  const queryClient = useQueryClient();
  const { data: config, isLoading } = usePluggyConfig();

  const handleSave = async () => {
    if (!clientId.trim() || !clientSecret.trim()) {
      toast.error("Preencha todos os campos");
      return;
    }

    setIsSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("pluggy-save-config", {
        body: { clientId, clientSecret },
      });

      if (error) throw error;

      toast.success("Credenciais salvas com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["pluggy-config"] });
      setClientId("");
      setClientSecret("");
      onOpenChange(false);
    } catch (error: any) {
      toast.error("Erro ao salvar: " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    try {
      const { data, error } = await supabase.functions.invoke("pluggy-test-connection");
      
      if (error) throw error;
      
      if (data?.success) {
        toast.success("Conexão com Pluggy funcionando!");
      } else {
        toast.error("Falha no teste: " + (data?.error || "Erro desconhecido"));
      }
    } catch (error: any) {
      toast.error("Erro no teste: " + error.message);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="text-left pb-4">
          <SheetTitle>Configurar Pluggy</SheetTitle>
          <SheetDescription>
            Configure suas credenciais do Pluggy para habilitar a conexão com bancos.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 overflow-y-auto max-h-[calc(85vh-180px)] pb-6">
          {/* Status atual */}
          <div className="p-4 rounded-xl bg-muted/50 border border-border/30">
            <h3 className="text-sm font-medium mb-3">Status da Configuração</h3>
            
            {isLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                Verificando...
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {config?.hasClientId ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                  <span className="text-sm">Client ID {config?.hasClientId ? "configurado" : "não configurado"}</span>
                </div>
                <div className="flex items-center gap-2">
                  {config?.hasClientSecret ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                  <span className="text-sm">Client Secret {config?.hasClientSecret ? "configurado" : "não configurado"}</span>
                </div>
              </div>
            )}

            {config?.configured && (
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-3 w-full"
                onClick={handleTest}
                disabled={isTesting}
              >
                {isTesting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Testando...
                  </>
                ) : (
                  "Testar Conexão"
                )}
              </Button>
            )}
          </div>

          {/* Como obter credenciais */}
          <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
            <h3 className="text-sm font-medium mb-2">Como obter suas credenciais</h3>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Acesse o dashboard do Pluggy</li>
              <li>Crie uma conta ou faça login</li>
              <li>Acesse "API Keys" no menu</li>
              <li>Copie o Client ID e Client Secret</li>
            </ol>
            <a 
              href="https://dashboard.pluggy.ai" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-3"
            >
              Acessar Dashboard Pluggy
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Formulário */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clientId">Client ID</Label>
              <Input
                id="clientId"
                placeholder="Seu Pluggy Client ID"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientSecret">Client Secret</Label>
              <div className="relative">
                <Input
                  id="clientSecret"
                  type={showSecret ? "text" : "password"}
                  placeholder="Seu Pluggy Client Secret"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowSecret(!showSecret)}
                >
                  {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>

          {/* Aviso de segurança */}
          <div className="text-xs text-muted-foreground p-3 rounded-lg bg-muted/30">
            🔐 Suas credenciais são armazenadas de forma segura e criptografada. 
            Nunca compartilhamos seus dados com terceiros.
          </div>
        </div>

        <div className="pt-4 border-t border-border/30">
          <Button 
            className="w-full" 
            onClick={handleSave}
            disabled={isSaving || !clientId.trim() || !clientSecret.trim()}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar Credenciais"
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
