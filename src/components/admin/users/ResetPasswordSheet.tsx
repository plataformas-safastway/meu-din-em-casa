import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { 
  AlertTriangle, 
  Copy, 
  Check, 
  Key, 
  Loader2, 
  Eye, 
  EyeOff,
  ShieldAlert 
} from "lucide-react";
import { AdminUser, generateStrongPassword } from "@/hooks/useAdminUsers";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ResetPasswordSheetProps {
  user: AdminUser | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ResetPasswordSheet({ 
  user, 
  open, 
  onOpenChange, 
  onSuccess 
}: ResetPasswordSheetProps) {
  const [step, setStep] = useState<"confirm" | "display">("confirm");
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleReset = async () => {
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      // Generate new temp password
      const newPassword = generateStrongPassword(20);
      
      // Call edge function to reset password
      const { data, error } = await supabase.functions.invoke('create-master-user', {
        body: {
          action: 'reset_password',
          userId: user.user_id,
          password: newPassword,
        },
      });
      
      if (error || data?.error) {
        throw new Error(data?.error || error?.message || 'Erro ao resetar senha');
      }
      
      // Update must_change_password in admin_users
      const { error: updateError } = await supabase
        .from('admin_users')
        .update({ must_change_password: true })
        .eq('id', user.id);
      
      if (updateError) {
        console.error('Failed to update must_change_password:', updateError);
      }
      
      // Log the reset request
      await supabase.rpc('admin_reset_user_password', { 
        _target_user_id: user.user_id 
      });
      
      setTempPassword(newPassword);
      setStep("display");
      toast.success("Senha resetada com sucesso!");
    } catch (error: any) {
      console.error('Reset password error:', error);
      toast.error(error.message || "Erro ao resetar senha");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!tempPassword) return;
    
    await navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    toast.success("Senha copiada!");
    
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    setStep("confirm");
    setTempPassword(null);
    setShowPassword(false);
    setCopied(false);
    onOpenChange(false);
    
    if (tempPassword) {
      onSuccess();
    }
  };

  if (!user) return null;

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Key className="w-5 h-5 text-amber-600" />
            Resetar Senha
          </SheetTitle>
          <SheetDescription>
            {user.display_name || user.email}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {step === "confirm" && (
            <>
              <Alert className="border-amber-500 bg-amber-50 dark:bg-amber-950">
                <ShieldAlert className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800 dark:text-amber-200">
                  Atenção
                </AlertTitle>
                <AlertDescription className="text-amber-700 dark:text-amber-300">
                  Esta ação irá:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Gerar uma nova senha temporária</li>
                    <li>Invalidar a senha atual do usuário</li>
                    <li>Exigir troca de senha no próximo login</li>
                    <li>Registrar a ação no log de auditoria</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  <strong>Usuário:</strong> {user.display_name || user.email}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>Papel:</strong> {user.admin_role}
                </p>
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={handleClose}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleReset}
                  disabled={isLoading}
                  className="flex-1 bg-amber-600 hover:bg-amber-700"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Resetando...
                    </>
                  ) : (
                    <>
                      <Key className="w-4 h-4 mr-2" />
                      Resetar Senha
                    </>
                  )}
                </Button>
              </div>
            </>
          )}

          {step === "display" && tempPassword && (
            <>
              <Alert className="border-red-500 bg-red-50 dark:bg-red-950">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertTitle className="text-red-800 dark:text-red-200">
                  Senha Temporária Gerada
                </AlertTitle>
                <AlertDescription className="text-red-700 dark:text-red-300">
                  Copie esta senha agora. Ela <strong>não será exibida novamente</strong>.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <label className="text-sm font-medium">Nova senha temporária:</label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 p-3 bg-muted rounded-lg font-mono text-sm break-all relative">
                    {showPassword ? tempPassword : "•".repeat(20)}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopy}
                    className="shrink-0"
                  >
                    {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Alert>
                <AlertDescription>
                  O usuário precisará trocar a senha no próximo login.
                </AlertDescription>
              </Alert>

              <Button onClick={handleClose} className="w-full">
                Fechar
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
