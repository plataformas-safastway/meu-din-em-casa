import { Lock, Eye, EyeOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PrivateTransactionBadgeProps {
  isPrivate: boolean;
  isOwner: boolean;
  className?: string;
}

export function PrivateTransactionBadge({ isPrivate, isOwner, className }: PrivateTransactionBadgeProps) {
  if (!isPrivate) return null;

  return (
    <Badge 
      variant="outline" 
      className={cn(
        "text-xs gap-1",
        isOwner 
          ? "border-primary/30 text-primary" 
          : "border-muted-foreground/30 text-muted-foreground",
        className
      )}
    >
      <Lock className="w-3 h-3" />
      {isOwner ? "Sua despesa privada" : "Privada"}
    </Badge>
  );
}

interface PrivateTransactionPlaceholderProps {
  className?: string;
}

export function PrivateTransactionPlaceholder({ className }: PrivateTransactionPlaceholderProps) {
  return (
    <div className={cn(
      "flex items-center gap-2 p-3 rounded-lg bg-muted/50 border border-dashed",
      className
    )}>
      <div className="p-2 rounded-full bg-muted">
        <EyeOff className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-muted-foreground">
          Despesa privada
        </p>
        <p className="text-xs text-muted-foreground/70">
          Valor impacta o saldo • Detalhes ocultos temporariamente
        </p>
      </div>
    </div>
  );
}
