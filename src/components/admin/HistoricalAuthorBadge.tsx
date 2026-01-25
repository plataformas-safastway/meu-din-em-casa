import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { UserX, Ban } from "lucide-react";
import type { MemberStatus } from "@/hooks/useFamilyMembersSoftDelete";
import type { UserAccountStatus } from "@/hooks/useUserAccountStatus";

interface HistoricalAuthorBadgeProps {
  authorName: string;
  authorStatus?: MemberStatus | UserAccountStatus;
  prefix?: string;
}

/**
 * Displays the author of an action with status indication
 * Shows "(removido)", "(bloqueado)", etc. when author is inactive
 */
export function HistoricalAuthorBadge({
  authorName,
  authorStatus,
  prefix = "por",
}: HistoricalAuthorBadgeProps) {
  const isInactive = authorStatus && !["ACTIVE", "INVITED"].includes(authorStatus);

  const getStatusLabel = (status: MemberStatus | UserAccountStatus): string => {
    switch (status) {
      case "REMOVED":
        return "removido";
      case "DISABLED":
        return "desativado";
      case "BLOCKED":
        return "bloqueado";
      default:
        return "";
    }
  };

  const statusLabel = authorStatus ? getStatusLabel(authorStatus) : "";

  if (isInactive) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            {prefix} <span className="font-medium">{authorName}</span>
            <Badge variant="outline" className="text-xs gap-1 px-1.5 py-0">
              {authorStatus === "BLOCKED" ? (
                <Ban className="w-3 h-3" />
              ) : (
                <UserX className="w-3 h-3" />
              )}
              {statusLabel}
            </Badge>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>Este usuário foi {statusLabel} da plataforma</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <span className="text-muted-foreground">
      {prefix} <span className="font-medium">{authorName}</span>
    </span>
  );
}
