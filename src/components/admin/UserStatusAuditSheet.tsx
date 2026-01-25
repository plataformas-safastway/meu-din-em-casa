import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { History, ArrowRight } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { useUserStatusAudit } from "@/hooks/useUserAccountStatus";
import { UserStatusBadge } from "./UserStatusBadge";

interface UserStatusAuditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
}

export function UserStatusAuditSheet({
  open,
  onOpenChange,
  userId,
  userName,
}: UserStatusAuditSheetProps) {
  const { data: auditHistory, isLoading } = useUserStatusAudit(userId);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Histórico de Status
          </SheetTitle>
          <SheetDescription>
            Alterações de status para {userName}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Carregando histórico...
            </div>
          ) : auditHistory?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <History className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma alteração de status registrada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {auditHistory?.map((entry) => (
                <div
                  key={entry.id}
                  className="border rounded-lg p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {entry.old_status && (
                        <>
                          <UserStatusBadge status={entry.old_status} />
                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        </>
                      )}
                      <UserStatusBadge status={entry.new_status} />
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(entry.changed_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </span>
                  </div>

                  {entry.reason && (
                    <p className="text-sm text-muted-foreground">
                      <strong>Motivo:</strong> {entry.reason}
                    </p>
                  )}

                  <p className="text-xs text-muted-foreground">
                    Alterado por: {entry.changed_by.slice(0, 8)}...
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
