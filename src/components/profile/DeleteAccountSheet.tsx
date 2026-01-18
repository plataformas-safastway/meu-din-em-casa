import { useState } from "react";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDeleteAccount } from "@/hooks/useProfile";

interface DeleteAccountSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteAccountSheet({ open, onOpenChange }: DeleteAccountSheetProps) {
  const [confirmText, setConfirmText] = useState("");
  const deleteAccount = useDeleteAccount();

  const handleDelete = async () => {
    if (confirmText !== "EXCLUIR") return;
    await deleteAccount.mutateAsync();
  };

  const isConfirmed = confirmText === "EXCLUIR";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[90vh] rounded-t-3xl">
        <SheetHeader className="text-left pb-4">
          <SheetTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="w-5 h-5" />
            Excluir Minha Conta
          </SheetTitle>
          <SheetDescription>
            Conforme a LGPD, você pode solicitar a exclusão de todos os seus dados.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4">
          <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
              <div>
                <p className="font-medium text-sm text-destructive">Ação irreversível</p>
                <p className="text-xs text-muted-foreground">
                  Ao excluir sua conta, todos os seus dados serão permanentemente removidos,
                  incluindo transações, metas, orçamentos e histórico financeiro.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">O que será excluído:</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Sua conta e dados de perfil</li>
              <li>Todas as transações</li>
              <li>Metas e orçamentos</li>
              <li>Conexões bancárias</li>
              <li>Histórico de importações</li>
            </ul>
          </div>

          <div className="space-y-2">
            <p className="text-sm">
              Para confirmar, digite <strong className="text-destructive">EXCLUIR</strong> abaixo:
            </p>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
              placeholder="Digite EXCLUIR para confirmar"
              className="text-center"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                setConfirmText("");
                onOpenChange(false);
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={handleDelete}
              disabled={!isConfirmed || deleteAccount.isPending}
            >
              {deleteAccount.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Excluir Conta
                </>
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
