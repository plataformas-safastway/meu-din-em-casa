import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Activity, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useFamilyActivities, formatActivityMessage } from "@/hooks/useFamilyActivity";

export function FamilyActivityFeed() {
  const { data: activities, isLoading } = useFamilyActivities(10);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="p-6 rounded-2xl bg-muted/50 text-center">
        <Activity className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">
          Nenhuma atividade recente
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          As ações dos membros aparecerão aqui
        </p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-muted-foreground mb-3 px-1">
        ATIVIDADE RECENTE
      </h3>
      <div className="bg-card rounded-2xl border border-border/30 overflow-hidden">
        <div className="divide-y divide-border/30">
          {activities.map((activity) => (
            <div key={activity.id} className="flex gap-3 p-4">
              <Avatar className="w-8 h-8 shrink-0">
                <AvatarImage src={activity.actor?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {activity.actor?.display_name?.charAt(0)?.toUpperCase() || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm">{formatActivityMessage(activity)}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDistanceToNow(new Date(activity.created_at), {
                    addSuffix: true,
                    locale: ptBR,
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
