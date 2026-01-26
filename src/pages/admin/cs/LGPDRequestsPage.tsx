import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Shield, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  ChevronLeft,
  ChevronRight,
  User,
  Calendar,
  AlertTriangle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

interface LGPDRequest {
  id: string;
  user_id: string;
  family_id: string | null;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "CANCELLED";
  requested_at: string;
  deadline_at: string;
  completed_at: string | null;
  completion_notes: string | null;
}

export function LGPDRequestsPage() {
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-lgpd-requests", page],
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from("lgpd_deletion_requests")
        .select("*", { count: "exact" })
        .order("requested_at", { ascending: false })
        .range(page * pageSize, (page + 1) * pageSize - 1);

      if (error) throw error;
      return { requests: data as LGPDRequest[], total: count ?? 0 };
    },
  });

  const totalPages = Math.ceil((data?.total || 0) / pageSize);

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "PENDING":
        return { 
          label: "Aguardando", 
          icon: Clock, 
          className: "bg-amber-100 text-amber-800 border-amber-200" 
        };
      case "PROCESSING":
        return { 
          label: "Processando", 
          icon: Loader2, 
          className: "bg-blue-100 text-blue-800 border-blue-200" 
        };
      case "COMPLETED":
        return { 
          label: "Concluída", 
          icon: CheckCircle2, 
          className: "bg-green-100 text-green-800 border-green-200" 
        };
      case "CANCELLED":
        return { 
          label: "Cancelada", 
          icon: XCircle, 
          className: "bg-muted text-muted-foreground border-border" 
        };
      default:
        return { 
          label: status, 
          icon: AlertTriangle, 
          className: "bg-muted text-muted-foreground border-border" 
        };
    }
  };

  // Stats
  const stats = {
    pending: data?.requests.filter(r => r.status === "PENDING").length ?? 0,
    processing: data?.requests.filter(r => r.status === "PROCESSING").length ?? 0,
    completed: data?.requests.filter(r => r.status === "COMPLETED").length ?? 0,
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Solicitações LGPD</h2>
        <p className="text-muted-foreground">
          Acompanhamento de solicitações de exclusão de dados
        </p>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <p className="text-sm text-blue-800">
            <strong>Conformidade LGPD:</strong> As solicitações devem ser processadas em até 30 dias. 
            O CS não tem acesso aos dados pessoais dos usuários, apenas ao status das solicitações.
          </p>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-amber-600">{stats.pending}</div>
            <div className="text-xs text-muted-foreground">Aguardando</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.processing}</div>
            <div className="text-xs text-muted-foreground">Processando</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-xs text-muted-foreground">Concluídas</div>
          </CardContent>
        </Card>
      </div>

      {/* Requests List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Solicitações ({data?.total || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          ) : data?.requests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma solicitação LGPD encontrada</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data?.requests.map((request) => {
                const statusConfig = getStatusConfig(request.status);
                const StatusIcon = statusConfig.icon;
                const isOverdue = request.status === "PENDING" && 
                  new Date(request.deadline_at) < new Date();

                return (
                  <div
                    key={request.id}
                    className={`flex items-center gap-4 p-4 border rounded-lg ${
                      isOverdue ? "border-destructive/50 bg-destructive/5" : ""
                    }`}
                  >
                    {/* User Icon */}
                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                      <User className="w-5 h-5 text-muted-foreground" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={statusConfig.className}>
                          <StatusIcon className={`w-3 h-3 mr-1 ${
                            request.status === "PROCESSING" ? "animate-spin" : ""
                          }`} />
                          {statusConfig.label}
                        </Badge>
                        {isOverdue && (
                          <Badge variant="destructive" className="text-xs">
                            Prazo excedido
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-xs text-muted-foreground">
                        ID: {request.id.substring(0, 8)}...
                      </p>
                    </div>

                    {/* Dates */}
                    <div className="text-right text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(request.requested_at), "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Prazo: {formatDistanceToNow(new Date(request.deadline_at), { 
                          locale: ptBR, 
                          addSuffix: true 
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Página {page + 1} de {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
