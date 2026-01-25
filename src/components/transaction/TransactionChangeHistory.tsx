import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronDown, ChevronUp, History, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  useTransactionChangeLogs,
  FIELD_DISPLAY_NAMES,
  type TransactionChangeLog,
} from "@/hooks/useTransactionChangeLogs";
import { getCategoryById } from "@/data/categories";
import { formatCurrency } from "@/lib/formatters";

interface TransactionChangeHistoryProps {
  transactionId: string;
}

// Format value for display based on field type
function formatValue(fieldName: string, value: string | null): string {
  if (value === null || value === "") return "—";

  switch (fieldName) {
    case "category_id":
    case "subcategory_id":
      const category = getCategoryById(value);
      return category?.name || value;
    case "amount":
      return formatCurrency(parseFloat(value));
    case "date":
      try {
        return format(new Date(value), "dd/MM/yyyy", { locale: ptBR });
      } catch {
        return value;
      }
    default:
      return value;
  }
}

// Format change description
function formatChangeDescription(log: TransactionChangeLog): string {
  const fieldName = FIELD_DISPLAY_NAMES[log.field_name] || log.field_name;
  const oldValue = formatValue(log.field_name, log.old_value);
  const newValue = formatValue(log.field_name, log.new_value);

  if (log.old_value === null) {
    return `${fieldName} definido como "${newValue}"`;
  }

  if (log.new_value === null) {
    return `${fieldName} removido (era "${oldValue}")`;
  }

  return `${fieldName} alterado de "${oldValue}" para "${newValue}"`;
}

export function TransactionChangeHistory({ transactionId }: TransactionChangeHistoryProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { data: changeLogs, isLoading } = useTransactionChangeLogs(transactionId);

  // Don't show if no changes or still loading
  if (isLoading) {
    return (
      <div className="py-2">
        <Skeleton className="h-8 w-40" />
      </div>
    );
  }

  if (!changeLogs || changeLogs.length === 0) {
    return null;
  }

  // Group by batch_id for cleaner display
  const groupedByBatch = changeLogs.reduce((acc, log) => {
    const key = log.batch_id || log.id;
    if (!acc[key]) {
      acc[key] = {
        logs: [],
        changed_at: log.changed_at,
        changed_by_user_name: log.changed_by_user_name,
      };
    }
    acc[key].logs.push(log);
    return acc;
  }, {} as Record<string, { logs: TransactionChangeLog[]; changed_at: string; changed_by_user_name: string }>);

  const batches = Object.values(groupedByBatch).sort(
    (a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime()
  );

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-between text-muted-foreground hover:text-foreground"
        >
          <span className="flex items-center gap-2">
            <History className="w-4 h-4" />
            Histórico de alterações ({changeLogs.length})
          </span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-2">
        <div className="rounded-lg border bg-muted/30 p-3 space-y-3 max-h-64 overflow-y-auto">
          {batches.map((batch, index) => (
            <div key={index} className="space-y-1">
              {index > 0 && <Separator className="my-2" />}
              
              {/* Timestamp and user */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <User className="w-3 h-3" />
                <span className="font-medium">{batch.changed_by_user_name}</span>
                <span>•</span>
                <span>
                  {format(new Date(batch.changed_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                </span>
              </div>

              {/* Changes */}
              <ul className="space-y-1 pl-5">
                {batch.logs.map((log) => (
                  <li key={log.id} className="text-sm">
                    {formatChangeDescription(log)}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
