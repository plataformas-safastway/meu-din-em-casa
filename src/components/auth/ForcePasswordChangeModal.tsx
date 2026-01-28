import { useState } from "react";
import { Lock, Eye, EyeOff, Loader2, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PasswordStrengthIndicator } from "@/components/PasswordStrengthIndicator";
import { validatePassword } from "@/lib/passwordValidation";
import { supabase } from "@/integrations/supabase/client";
import { useMarkPasswordChanged } from "@/hooks/useMasterUserSetup";
import { toast } from "sonner";

interface ForcePasswordChangeModalProps {
  open: boolean;
  onSuccess: () => void;
}

export function ForcePasswordChangeModal({ open, onSuccess }: ForcePasswordChangeModalProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const markPasswordChanged = useMarkPasswordChanged();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate password strength
    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    // Check passwords match
    if (newPassword !== confirmPassword) {
      setError("As senhas não coincidem");
      return;
    }

    setIsLoading(true);

    try {
      // Update password via Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      // Mark password as changed in database
      await markPasswordChanged.mutateAsync();

      toast.success("Senha alterada com sucesso!");
      onSuccess();
    } catch (err: any) {
      console.error("Error changing password:", err);
      const errorMessage = err.message?.toLowerCase() || "";
      
      // Handle leaked/breached passwords
      if (
        errorMessage.includes("password") && (
          errorMessage.includes("breach") ||
          errorMessage.includes("leaked") ||
          errorMessage.includes("compromised") ||
          errorMessage.includes("pwned") ||
          errorMessage.includes("exposed")
        )
      ) {
        setError("Esta senha foi encontrada em vazamentos de dados conhecidos. Por favor, escolha uma senha diferente e mais segura.");
      } else if (
        errorMessage.includes("password") && (
          errorMessage.includes("weak") ||
          errorMessage.includes("short") ||
          errorMessage.includes("simple")
        )
      ) {
        setError("Senha muito fraca. Use uma senha mais forte.");
      } else {
        setError(err.message || "Erro ao alterar senha");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-primary" />
            Alteração de Senha Obrigatória
          </DialogTitle>
          <DialogDescription>
            Por segurança, você precisa definir uma nova senha antes de continuar.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <Alert className="bg-yellow-50 dark:bg-yellow-950 border-yellow-200">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-700 dark:text-yellow-300 text-sm">
              Sua senha temporária será invalidada após esta alteração.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="new-password">Nova Senha</Label>
            <div className="relative">
              <Input
                id="new-password"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Digite sua nova senha"
                className="pr-10"
                autoComplete="new-password"
                required
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <PasswordStrengthIndicator password={newPassword} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
            <Input
              id="confirm-password"
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirme sua nova senha"
              autoComplete="new-password"
              required
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            disabled={isLoading || !newPassword || !confirmPassword}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Alterando...
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 mr-2" />
                Alterar Senha e Continuar
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
