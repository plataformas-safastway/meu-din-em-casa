import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  CalendarClock, 
  CreditCard, 
  Home, 
  Building2,
  ChevronRight,
  Bell
} from "lucide-react";
import { useUpcomingDues, UpcomingDue } from "@/hooks/useUpcomingDues";
import { formatCurrency } from "@/lib/formatters";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const typeIcons: Record<UpcomingDue['type'], React.ReactNode> = {
  fixed: <Home className="w-4 h-4" />,
  credit_card: <CreditCard className="w-4 h-4" />,
  financing: <Building2 className="w-4 h-4" />,
};

const statusConfig: Record<UpcomingDue['status'], { label: string; className: string }> = {
  ok: { label: "OK", className: "bg-secondary text-secondary-foreground" },
  attention: { label: "Atenção", className: "bg-accent text-accent-foreground" },
  urgent: { label: "Hoje", className: "bg-destructive/10 text-destructive" },
  overdue: { label: "Atrasado", className: "bg-destructive text-destructive-foreground" },
};

interface UpcomingDuesCardProps {
  maxItems?: number;
  onViewAll?: () => void;
  className?: string;
}

export function UpcomingDuesCard({ maxItems = 5, onViewAll, className }: UpcomingDuesCardProps) {
  const { data: upcomingDues, isLoading } = useUpcomingDues(30);
  
  const visibleDues = upcomingDues?.slice(0, maxItems) || [];
  const hasMore = (upcomingDues?.length || 0) > maxItems;

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-primary" />
            Próximos Vencimentos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!upcomingDues?.length) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-primary" />
            Próximos Vencimentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhum vencimento nos próximos 30 dias</p>
            <p className="text-xs mt-1">Cadastre despesas recorrentes para receber avisos</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-primary" />
            Próximos Vencimentos
          </CardTitle>
          {hasMore && onViewAll && (
            <Button variant="ghost" size="sm" onClick={onViewAll} className="text-xs">
              Ver todos
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {visibleDues.map((due) => (
          <DueItem key={due.id} due={due} />
        ))}
      </CardContent>
    </Card>
  );
}

function DueItem({ due }: { due: UpcomingDue }) {
  const config = statusConfig[due.status];
  
  const formatDueText = () => {
    if (due.daysUntilDue < 0) {
      return `Atrasado há ${Math.abs(due.daysUntilDue)} dias`;
    }
    if (due.daysUntilDue === 0) {
      return "Vence hoje";
    }
    if (due.daysUntilDue === 1) {
      return "Vence amanhã";
    }
    return `Vence em ${due.daysUntilDue} dias`;
  };

  return (
    <div className={cn(
      "flex items-center justify-between p-3 rounded-lg border",
      "hover:bg-muted/50 transition-colors",
      due.status === 'overdue' && "border-destructive/30",
      due.status === 'urgent' && "border-destructive/20",
    )}>
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn(
          "p-2 rounded-full",
          due.type === 'credit_card' && "bg-primary/10 text-primary",
          due.type === 'fixed' && "bg-secondary text-secondary-foreground",
          due.type === 'financing' && "bg-accent text-accent-foreground",
        )}>
          {typeIcons[due.type]}
        </div>
        <div className="min-w-0">
          <p className="font-medium text-sm truncate">{due.name}</p>
          <p className="text-xs text-muted-foreground">
            {format(due.dueDate, "dd 'de' MMMM", { locale: ptBR })} • {formatDueText()}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        {due.amount > 0 && (
          <span className="text-sm font-medium tabular-nums">
            {formatCurrency(due.amount)}
          </span>
        )}
        <Badge className={cn("text-xs", config.className)}>
          {config.label}
        </Badge>
      </div>
    </div>
  );
}
