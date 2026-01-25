import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  Lock,
  Eye,
  Clock,
  Calendar,
  Shield,
  ChevronRight,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { usePrivateTransactions, useRevealTransaction } from "@/hooks/useTransactionPrivacy";
import { useAuth } from "@/contexts/AuthContext";
import { format, formatDistanceToNow, isPast } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface PrivateTransactionItemProps {
  privacy: {
    id: string;
    transactionId: string;
    isPrivate: boolean;
    revealAt: string | null;
    revealedAt: string | null;
    reason: string | null;
    createdByUserId: string;
    createdAt: string;
    maxPrivacyDays: number;
  };
  onReveal: (id: string) => void;
  isRevealing: boolean;
  isOwner: boolean;
}

function PrivateTransactionItem({ privacy, onReveal, isRevealing, isOwner }: PrivateTransactionItemProps) {
  const getStatus = () => {
    if (!privacy.isPrivate) {
      return { label: "Revelada", icon: CheckCircle2, className: "bg-secondary text-secondary-foreground" };
    }
    if (privacy.revealAt) {
      const revealDate = new Date(privacy.revealAt);
      if (isPast(revealDate)) {
        return { label: "Pendente", icon: Clock, className: "bg-accent text-accent-foreground" };
      }
      return { label: "Agendada", icon: Calendar, className: "bg-primary/10 text-primary" };
    }
    return { label: "Privada", icon: Lock, className: "bg-muted text-muted-foreground" };
  };

  const status = getStatus();
  const StatusIcon = status.icon;

  return (
    <div className={cn(
      "p-4 rounded-lg border transition-colors",
      privacy.isPrivate ? "bg-muted/30" : "bg-background"
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className={cn("p-2 rounded-full", status.className)}>
            <StatusIcon className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="font-medium text-sm">Despesa sensível</p>
              <Badge className={cn("text-xs", status.className)}>
                {status.label}
              </Badge>
            </div>
            
            {privacy.reason && isOwner && (
              <p className="text-sm text-muted-foreground mt-1 truncate">
                "{privacy.reason}"
              </p>
            )}

            <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
              {privacy.isPrivate && privacy.revealAt && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Revela {formatDistanceToNow(new Date(privacy.revealAt), { locale: ptBR, addSuffix: true })}
                </span>
              )}
              {privacy.revealedAt && (
                <span className="flex items-center gap-1">
                  <Eye className="w-3 h-3" />
                  Revelada em {format(new Date(privacy.revealedAt), "dd/MM/yyyy")}
                </span>
              )}
              <span>
                Criada {formatDistanceToNow(new Date(privacy.createdAt), { locale: ptBR, addSuffix: true })}
              </span>
            </div>
          </div>
        </div>

        {isOwner && privacy.isPrivate && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Eye className="w-4 h-4 mr-1" />
                Revelar
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Revelar despesa?</AlertDialogTitle>
                <AlertDialogDescription>
                  Ao revelar, todos os membros da família poderão ver os detalhes desta transação. Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onReveal(privacy.id)}
                  disabled={isRevealing}
                >
                  {isRevealing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Eye className="w-4 h-4 mr-2" />
                  )}
                  Revelar agora
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}

export function PrivacyModuleCard() {
  const { user } = useAuth();
  const { data: privateTransactions, isLoading } = usePrivateTransactions();
  const revealMutation = useRevealTransaction();

  const activePrivate = privateTransactions?.filter(p => p.isPrivate) || [];
  const revealed = privateTransactions?.filter(p => !p.isPrivate) || [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Privacidade Financeira
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!privateTransactions?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Privacidade Financeira
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Lock className="w-10 h-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm font-medium">Nenhuma despesa privada</p>
            <p className="text-xs mt-1">
              Despesas do Open Finance podem ser marcadas como sensíveis temporariamente.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Privacidade Financeira
          </CardTitle>
          <Badge variant="secondary">
            {activePrivate.length} privada{activePrivate.length !== 1 ? 's' : ''}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Info banner */}
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm">
          <p className="text-muted-foreground">
            💡 <strong>Algumas decisões pedem tempo.</strong> Transparência também.
          </p>
        </div>

        {/* Active private transactions */}
        {activePrivate.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Privadas ({activePrivate.length})
            </h4>
            {activePrivate.map((privacy) => (
              <PrivateTransactionItem
                key={privacy.id}
                privacy={privacy}
                onReveal={(id) => revealMutation.mutate(id)}
                isRevealing={revealMutation.isPending}
                isOwner={privacy.createdByUserId === user?.id}
              />
            ))}
          </div>
        )}

        {/* Recently revealed */}
        {revealed.length > 0 && (
          <div className="space-y-2 pt-4 border-t">
            <h4 className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
              <Eye className="w-4 h-4" />
              Reveladas recentemente ({revealed.length})
            </h4>
            {revealed.slice(0, 3).map((privacy) => (
              <PrivateTransactionItem
                key={privacy.id}
                privacy={privacy}
                onReveal={() => {}}
                isRevealing={false}
                isOwner={privacy.createdByUserId === user?.id}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
