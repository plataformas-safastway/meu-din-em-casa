import { useState } from "react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Search, Shield, AlertTriangle, CheckCircle, Key, UserPlus, UserMinus, Edit } from "lucide-react";
import { useAdminAuditLogs } from "@/hooks/useAdminUsers";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

const eventTypeLabels: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  ADMIN_USER_CREATED: { 
    label: "Usuário Criado", 
    icon: <UserPlus className="w-3 h-3" />,
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
  },
  ADMIN_USER_UPDATED: { 
    label: "Usuário Atualizado", 
    icon: <Edit className="w-3 h-3" />,
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
  },
  ADMIN_USER_DISABLED: { 
    label: "Usuário Desativado", 
    icon: <UserMinus className="w-3 h-3" />,
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
  },
  ADMIN_USER_ENABLED: { 
    label: "Usuário Ativado", 
    icon: <CheckCircle className="w-3 h-3" />,
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
  },
  ADMIN_ROLE_CHANGED: { 
    label: "Papel Alterado", 
    icon: <Shield className="w-3 h-3" />,
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
  },
  PASSWORD_RESET_REQUIRED: { 
    label: "Troca de Senha Exigida", 
    icon: <Key className="w-3 h-3" />,
    color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
  },
  MFA_REQUIRED_CHANGED: { 
    label: "MFA Alterado", 
    icon: <Shield className="w-3 h-3" />,
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
  },
  ADMIN_USER_DELETED: { 
    label: "Usuário Excluído", 
    icon: <AlertTriangle className="w-3 h-3" />,
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
  },
  MASTER_USER_CREATED: {
    label: "Master Criado",
    icon: <UserPlus className="w-3 h-3" />,
    color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
  },
  MASTER_PASSWORD_CHANGED: {
    label: "Senha Master Alterada",
    icon: <Key className="w-3 h-3" />,
    color: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
  },
};

export function AdminAuditLogsTable() {
  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState<string>("all");
  
  const { data: logs, isLoading } = useAdminAuditLogs({ limit: 200 });

  const filteredLogs = (logs || []).filter(log => {
    const matchesSearch = 
      log.event_type?.toLowerCase().includes(search.toLowerCase()) ||
      log.actor_role?.toLowerCase().includes(search.toLowerCase());
    
    const matchesEvent = eventFilter === "all" || log.event_type === eventFilter;
    
    return matchesSearch && matchesEvent;
  });

  const getEventInfo = (eventType: string) => {
    return eventTypeLabels[eventType] || {
      label: eventType,
      icon: <Shield className="w-3 h-3" />,
      color: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    };
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <Select value={eventFilter} onValueChange={setEventFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Tipo de evento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os eventos</SelectItem>
            <SelectItem value="ADMIN_USER_CREATED">Usuário Criado</SelectItem>
            <SelectItem value="ADMIN_USER_UPDATED">Usuário Atualizado</SelectItem>
            <SelectItem value="ADMIN_USER_DISABLED">Usuário Desativado</SelectItem>
            <SelectItem value="ADMIN_USER_ENABLED">Usuário Ativado</SelectItem>
            <SelectItem value="ADMIN_ROLE_CHANGED">Papel Alterado</SelectItem>
            <SelectItem value="PASSWORD_RESET_REQUIRED">Troca de Senha</SelectItem>
            <SelectItem value="MFA_REQUIRED_CHANGED">MFA Alterado</SelectItem>
            <SelectItem value="ADMIN_USER_DELETED">Usuário Excluído</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Evento</TableHead>
              <TableHead>Ator</TableHead>
              <TableHead className="hidden md:table-cell">Detalhes</TableHead>
              <TableHead>Data/Hora</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                  Nenhum log encontrado
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log) => {
                const eventInfo = getEventInfo(log.event_type);
                const metadata = log.metadata_safe as Record<string, unknown> | null;
                
                return (
                  <TableRow key={log.id}>
                    <TableCell>
                      <Badge className={`${eventInfo.color} gap-1`}>
                        {eventInfo.icon}
                        {eventInfo.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.actor_role}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {metadata && (
                        <div className="text-sm text-muted-foreground">
                          {metadata.old_role && metadata.new_role && (
                            <span>
                              {String(metadata.old_role)} → {String(metadata.new_role)}
                            </span>
                          )}
                          {metadata.admin_role && !metadata.old_role && (
                            <span>Papel: {String(metadata.admin_role)}</span>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
