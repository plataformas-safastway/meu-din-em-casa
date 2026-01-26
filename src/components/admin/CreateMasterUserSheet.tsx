import { useState } from "react";
import { Shield, Copy, AlertTriangle, Check, Loader2, Eye, EyeOff } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useMasterUserSetup } from "@/hooks/useMasterUserSetup";
import { toast } from "sonner";

interface CreateMasterUserSheetProps {
  trigger?: React.ReactNode;
}

export function CreateMasterUserSheet({ trigger }: CreateMasterUserSheetProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("plataformas@safastway.com.br");
  const [copied, setCopied] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const { createMasterUser, temporaryPassword, clearTemporaryPassword } = useMasterUserSetup();

  const handleCreate = async () => {
    if (!email.trim()) {
      toast.error("Email é obrigatório");
      return;
    }

    try {
      await createMasterUser.mutateAsync(email);
      toast.success("Usuário MASTER criado com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar usuário");
    }
  };

  const handleCopyPassword = async () => {
    if (temporaryPassword) {
      await navigator.clipboard.writeText(temporaryPassword);
      setCopied(true);
      toast.success("Senha copiada para a área de transferência");
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleClose = () => {
    if (temporaryPassword && !confirmed) {
      const confirmClose = window.confirm(
        "ATENÇÃO: A senha temporária será perdida se você fechar agora. Tem certeza que já copiou a senha?"
      );
      if (!confirmClose) return;
    }
    
    setOpen(false);
    setEmail("plataformas@safastway.com.br");
    setCopied(false);
    setShowPassword(false);
    setConfirmed(false);
    clearTemporaryPassword();
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        handleClose();
      } else {
        setOpen(true);
      }
    }}>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant="outline" className="gap-2">
            <Shield className="w-4 h-4" />
            Criar Usuário MASTER
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Criar Usuário MASTER
          </SheetTitle>
          <SheetDescription>
            Crie um usuário administrativo com acesso total ao sistema.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {!temporaryPassword ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="master-email">Email do Usuário</Label>
                <Input
                  id="master-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@empresa.com.br"
                />
              </div>

              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Importante</AlertTitle>
                <AlertDescription className="text-sm space-y-2">
                  <p>Ao criar o usuário MASTER:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Uma senha temporária forte será gerada</li>
                    <li>A senha será exibida <strong>uma única vez</strong></li>
                    <li>O usuário será obrigado a trocar a senha no primeiro login</li>
                    <li>Todas as ações serão registradas em auditoria</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <Button
                onClick={handleCreate}
                disabled={createMasterUser.isPending || !email.trim()}
                className="w-full"
              >
                {createMasterUser.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Criar Usuário MASTER
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Alert variant="destructive" className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
                <AlertTitle className="text-yellow-700 dark:text-yellow-400">
                  ⚠️ ATENÇÃO - Senha Temporária
                </AlertTitle>
                <AlertDescription className="text-yellow-700 dark:text-yellow-300 text-sm">
                  <strong>Copie esta senha AGORA.</strong> Ela não poderá ser visualizada novamente após fechar esta janela.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label>Usuário Criado</Label>
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium">{email}</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Senha Temporária</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    value={temporaryPassword}
                    readOnly
                    className="pr-20 font-mono text-sm"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={handleCopyPassword}
                    >
                      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              <Alert className="bg-muted">
                <AlertDescription className="text-sm space-y-2">
                  <p><strong>Próximos passos:</strong></p>
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li>Copie a senha acima</li>
                    <li>Envie de forma segura para o usuário</li>
                    <li>O usuário deve acessar o sistema e trocar a senha</li>
                    <li>Após a troca, o acesso total será liberado</li>
                  </ol>
                </AlertDescription>
              </Alert>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="confirm-copied"
                  checked={confirmed}
                  onChange={(e) => setConfirmed(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="confirm-copied" className="text-sm cursor-pointer">
                  Confirmo que copiei a senha e posso fechar esta janela
                </Label>
              </div>

              <Button
                onClick={handleClose}
                variant={confirmed ? "default" : "outline"}
                className="w-full"
              >
                {confirmed ? "Concluir" : "Fechar (com aviso)"}
              </Button>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
