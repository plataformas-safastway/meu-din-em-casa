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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useSoftDeleteMember } from "@/hooks/useFamilyMembersSoftDelete";

interface RemoveMemberDialogProps {
  member: { id: string; display_name: string } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RemoveMemberDialog({ member, open, onOpenChange }: RemoveMemberDialogProps) {
  const [reason, setReason] = useState("");
  const softDelete = useSoftDeleteMember();

  const handleRemove = async () => {
    if (!member) return;
    
    await softDelete.mutateAsync({
      memberId: member.id,
      reason: reason.trim() || undefined,
    });
    
    setReason("");
    onOpenChange(false);
  };

  const handleClose = () => {
    setReason("");
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={handleClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remover membro?</AlertDialogTitle>
          <AlertDialogDescription>
            {member?.display_name} perderá acesso às finanças da família imediatamente.
            O histórico de lançamentos e atividades será mantido para auditoria.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-2">
          <Label htmlFor="reason" className="text-sm font-medium">
            Motivo (opcional)
          </Label>
          <Textarea
            id="reason"
            placeholder="Ex: Saiu do grupo familiar, erro de convite..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-2"
            rows={2}
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={softDelete.isPending}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleRemove}
            disabled={softDelete.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {softDelete.isPending ? "Removendo..." : "Remover"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
