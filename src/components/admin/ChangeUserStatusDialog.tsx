import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useChangeUserAccountStatus, UserAccountStatus } from "@/hooks/useUserAccountStatus";
import { Ban, UserX, Shield } from "lucide-react";

interface ChangeUserStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  currentStatus: UserAccountStatus;
}

export function ChangeUserStatusDialog({
  open,
  onOpenChange,
  userId,
  userName,
  currentStatus,
}: ChangeUserStatusDialogProps) {
  const [newStatus, setNewStatus] = useState<UserAccountStatus>(currentStatus);
  const [reason, setReason] = useState("");
  const changeStatus = useChangeUserAccountStatus();

  const handleConfirm = async () => {
    if (newStatus === currentStatus) {
      onOpenChange(false);
      return;
    }

    await changeStatus.mutateAsync({
      userId,
      newStatus,
      reason: reason.trim() || undefined,
    });

    setReason("");
    onOpenChange(false);
  };

  const statusOptions = [
    { value: "ACTIVE" as const, label: "Ativo", icon: <Shield className="w-4 h-4" />, description: "Acesso normal à plataforma" },
    { value: "DISABLED" as const, label: "Desativado", icon: <UserX className="w-4 h-4" />, description: "Acesso temporariamente suspenso" },
    { value: "BLOCKED" as const, label: "Bloqueado", icon: <Ban className="w-4 h-4" />, description: "Acesso permanentemente bloqueado" },
  ];

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Alterar Status do Usuário</AlertDialogTitle>
          <AlertDialogDescription>
            Alterando status de <strong>{userName}</strong>. Esta ação será registrada no histórico de auditoria.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Novo Status</Label>
            <Select value={newStatus} onValueChange={(v) => setNewStatus(v as UserAccountStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="flex items-center gap-2">
                      {opt.icon}
                      <div>
                        <span>{opt.label}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          — {opt.description}
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Motivo (opcional)</Label>
            <Textarea
              placeholder="Descreva o motivo da alteração..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={changeStatus.isPending}
            className={newStatus === "BLOCKED" ? "bg-destructive hover:bg-destructive/90" : ""}
          >
            {changeStatus.isPending ? "Salvando..." : "Confirmar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
