import { Badge } from "@/components/ui/badge";
import { Shield, Ban, UserX } from "lucide-react";
import type { UserAccountStatus } from "@/hooks/useUserAccountStatus";
import type { MemberStatus } from "@/hooks/useFamilyMembersSoftDelete";

interface UserStatusBadgeProps {
  status: UserAccountStatus | MemberStatus;
  size?: "sm" | "md";
}

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
  ACTIVE: {
    label: "Ativo",
    variant: "default",
    icon: <Shield className="w-3 h-3" />,
  },
  INVITED: {
    label: "Convidado",
    variant: "secondary",
    icon: null,
  },
  DISABLED: {
    label: "Desativado",
    variant: "outline",
    icon: <UserX className="w-3 h-3" />,
  },
  BLOCKED: {
    label: "Bloqueado",
    variant: "destructive",
    icon: <Ban className="w-3 h-3" />,
  },
  REMOVED: {
    label: "Removido",
    variant: "outline",
    icon: <UserX className="w-3 h-3" />,
  },
};

export function UserStatusBadge({ status, size = "sm" }: UserStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.ACTIVE;

  return (
    <Badge 
      variant={config.variant} 
      className={`gap-1 ${size === "sm" ? "text-xs" : ""}`}
    >
      {config.icon}
      {config.label}
    </Badge>
  );
}
