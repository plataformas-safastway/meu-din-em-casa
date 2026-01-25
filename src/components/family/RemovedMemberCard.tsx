import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { UserMinus, RotateCcw, Crown, Clock, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { FamilyMemberWithAudit, useRestoreMember } from "@/hooks/useFamilyMembersSoftDelete";

interface RemovedMemberCardProps {
  member: FamilyMemberWithAudit;
  canRestore: boolean;
}

export function RemovedMemberCard({ member, canRestore }: RemovedMemberCardProps) {
  const restoreMember = useRestoreMember();

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  };

  const handleRestore = async () => {
    await restoreMember.mutateAsync(member.id);
  };

  const wasOwner = member.role === "owner";

  return (
    <div className="p-4 bg-card border border-border/30 rounded-xl space-y-3">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Avatar className="w-12 h-12 opacity-60">
          <AvatarImage src={member.avatar_url || undefined} />
          <AvatarFallback className="bg-muted text-muted-foreground">
            {member.display_name?.charAt(0)?.toUpperCase() || "?"}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground/80 truncate">
              {member.display_name}
            </span>
            <Badge variant="destructive" className="text-xs gap-1">
              <UserMinus className="w-3 h-3" />
              Removido
            </Badge>
          </div>
          <div className="flex items-center gap-2 mt-1">
            {wasOwner ? (
              <Badge variant="outline" className="text-xs gap-1 opacity-60">
                <Crown className="w-3 h-3" />
                Era Proprietário
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs opacity-60">
                Era Membro
              </Badge>
            )}
          </div>
        </div>

        {canRestore && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={restoreMember.isPending}
              >
                <RotateCcw className="w-4 h-4" />
                Restaurar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Restaurar membro?</AlertDialogTitle>
                <AlertDialogDescription>
                  {member.display_name} voltará a ter acesso às finanças da família
                  com as mesmas permissões que tinha antes.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={handleRestore}>
                  Restaurar
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Audit Info */}
      <div className="space-y-2 text-sm text-muted-foreground border-t border-border/30 pt-3">
        {/* Added info */}
        <div className="flex items-center gap-2">
          <User className="w-4 h-4 text-primary/60" />
          <span>
            Adicionado por{" "}
            <span className="text-foreground/80">{member.added_by_name || "Sistema"}</span>
            {member.added_at && (
              <> em <span className="text-foreground/80">{formatDate(member.added_at)}</span></>
            )}
          </span>
        </div>

        {/* Removed info */}
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-destructive/60" />
          <span>
            Removido por{" "}
            <span className="text-foreground/80">{member.removed_by_name || "Sistema"}</span>
            {member.removed_at && (
              <> em <span className="text-foreground/80">{formatDate(member.removed_at)}</span></>
            )}
          </span>
        </div>

        {/* Reason if exists */}
        {member.removed_reason && (
          <div className="bg-muted/50 rounded-lg p-2 mt-2">
            <span className="text-xs font-medium">Motivo:</span>
            <p className="text-foreground/80 mt-1">{member.removed_reason}</p>
          </div>
        )}
      </div>
    </div>
  );
}
