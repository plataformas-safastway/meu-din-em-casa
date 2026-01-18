import { useState } from "react";
import { Lock, Loader2, Key, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface ImportPasswordStepProps {
  file: File;
  importType: 'bank_statement' | 'credit_card';
  sourceId: string;
  invoiceMonth?: string;
  onSuccess: (importId: string) => void;
  onCancel: () => void;
}

export function ImportPasswordStep({
  file,
  importType,
  sourceId,
  invoiceMonth,
  onSuccess,
  onCancel,
}: ImportPasswordStepProps) {
  const [mode, setMode] = useState<'auto' | 'manual'>('auto');
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [autoAttempted, setAutoAttempted] = useState(false);
  const [autoFailed, setAutoFailed] = useState(false);
  const queryClient = useQueryClient();

  const handleAutoPassword = async () => {
    setLoading(true);
    setAutoAttempted(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('importType', importType);
      formData.append('sourceId', sourceId);
      formData.append('useAutoPassword', 'true');
      if (invoiceMonth) {
        formData.append('invoiceMonth', invoiceMonth);
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        toast.error("Sessão expirada. Faça login novamente.");
        setLoading(false);
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-process`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const result = await response.json();

      if (!response.ok) {
        if (result.needsPassword) {
          setAutoFailed(true);
          setMode('manual');
          toast.error("Senha automática não funcionou", {
            description: "Digite a senha manualmente."
          });
          return;
        }
        throw new Error(result.error || 'Erro ao processar arquivo');
      }

      queryClient.invalidateQueries({ queryKey: ['imports'] });
      toast.success("Arquivo desbloqueado!");
      onSuccess(result.importId);

    } catch (error) {
      console.error('Auto password error:', error);
      setAutoFailed(true);
      setMode('manual');
      toast.error("Não foi possível desbloquear automaticamente", {
        description: "Tente digitar a senha manualmente."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleManualPassword = async () => {
    if (!password.trim()) {
      toast.error("Digite a senha do arquivo");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('importType', importType);
      formData.append('sourceId', sourceId);
      formData.append('password', password);
      if (invoiceMonth) {
        formData.append('invoiceMonth', invoiceMonth);
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) {
        toast.error("Sessão expirada. Faça login novamente.");
        setLoading(false);
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/import-process`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: formData,
        }
      );

      const result = await response.json();

      if (!response.ok) {
        if (result.needsPassword) {
          toast.error("Senha incorreta", {
            description: "Verifique a senha e tente novamente."
          });
          setPassword("");
          return;
        }
        throw new Error(result.error || 'Erro ao processar arquivo');
      }

      queryClient.invalidateQueries({ queryKey: ['imports'] });
      toast.success("Arquivo desbloqueado!");
      onSuccess(result.importId);

    } catch (error) {
      console.error('Manual password error:', error);
      toast.error("Erro ao processar arquivo", {
        description: error instanceof Error ? error.message : 'Tente novamente.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-md mx-auto">
      {/* Icon and Title */}
      <div className="text-center">
        <div className="w-16 h-16 rounded-2xl bg-warning/10 flex items-center justify-center mx-auto mb-4">
          <Lock className="w-8 h-8 text-warning" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Arquivo Protegido
        </h2>
        <p className="text-sm text-muted-foreground">
          Este arquivo está protegido por senha.
        </p>
      </div>

      {/* Info Box */}
      <div className="p-4 rounded-xl bg-muted/50 border border-border">
        <div className="flex items-start gap-3">
          <Key className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-foreground font-medium mb-1">
              Dica sobre a senha
            </p>
            <p className="text-xs text-muted-foreground">
              Muitos bancos brasileiros usam o CPF como senha do arquivo. 
              Podemos tentar desbloquear automaticamente usando os dados do seu cadastro.
            </p>
          </div>
        </div>
      </div>

      {/* Mode Selection */}
      {!autoAttempted && (
        <div className="space-y-3">
          <Button
            onClick={handleAutoPassword}
            disabled={loading}
            className="w-full h-12"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Tentando...
              </>
            ) : (
              <>
                <Key className="w-4 h-4 mr-2" />
                Tentar senha automática
              </>
            )}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-background px-2 text-muted-foreground">ou</span>
            </div>
          </div>

          <Button
            variant="outline"
            onClick={() => setMode('manual')}
            disabled={loading}
            className="w-full h-12"
          >
            Digitar senha manualmente
          </Button>
        </div>
      )}

      {/* Manual Password Input */}
      {(mode === 'manual' || autoFailed) && (
        <div className="space-y-4">
          {autoFailed && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/20">
              <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground">
                A senha automática não funcionou. Digite a senha correta do arquivo.
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="password">Senha do arquivo</Label>
            <Input
              id="password"
              type="password"
              placeholder="Digite a senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12"
              autoFocus
            />
          </div>

          <Button
            onClick={handleManualPassword}
            disabled={loading || !password.trim()}
            className="w-full h-12"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Desbloqueando...
              </>
            ) : (
              'Desbloquear'
            )}
          </Button>
        </div>
      )}

      {/* Cancel Button */}
      <Button
        variant="ghost"
        onClick={onCancel}
        disabled={loading}
        className="w-full"
      >
        Cancelar e escolher outro arquivo
      </Button>
    </div>
  );
}
