import { useState } from "react";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Shield, 
  Check, 
  X, 
  Clock, 
  AlertTriangle,
  User,
  Calendar,
  FileText
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useBreakglassGrants, useApproveBreakglass } from "@/hooks/useLegalVault";
import { useAdminMasterAccess } from "@/hooks/useLegalAccess";

const scopeLabels: Record<string, string> = {
  LEGAL_VAULT: "Cofre Legal",
  FULL_EXPORT: "Exportação Completa",
  INCIDENT_DETAILS: "Detalhes de Incidente",
  AUDIT_FULL: "Auditoria Completa",
};

const reasonLabels: Record<string, string> = {
  DSAR: "Solicitação DSAR",
  FRAUD: "Investigação de Fraude",
  COURT: "Ordem Judicial",
  SECURITY: "Incidente de Segurança",
  OTHER: "Outro",
};

const statusConfig: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Aguardando", className: "bg-amber-100 text-amber-800 border-amber-200" },
  APPROVED: { label: "Aprovado", className: "bg-green-100 text-green-800 border-green-200" },
  DENIED: { label: "Negado", className: "bg-red-100 text-red-800 border-red-200" },
  EXPIRED: { label: "Expirado", className: "bg-muted text-muted-foreground" },
  USED: { label: "Utilizado", className: "bg-blue-100 text-blue-800 border-blue-200" },
};

export function BreakglassApprovalsPage() {
  const { toast } = useToast();
  const { data: grants, isLoading } = useBreakglassGrants();
  const { data: isAdminMaster } = useAdminMasterAccess();
  const approveBreakglass = useApproveBreakglass();

  const pendingGrants = grants?.filter(g => g.status === "PENDING") ?? [];
  const processedGrants = grants?.filter(g => g.status !== "PENDING") ?? [];

  const handleApprove = async (grantId: string, approved: boolean) => {
    try {
      await approveBreakglass.mutateAsync({ grantId, approved });
      toast({
        title: approved ? "Acesso aprovado" : "Acesso negado",
        description: `O pedido foi ${approved ? "aprovado" : "negado"} com sucesso.`,
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível processar a solicitação.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          Acesso Excepcional (Break-glass)
        </h2>
        <p className="text-muted-foreground">
          Gerenciamento de solicitações de acesso temporário
        </p>
      </div>

      {/* Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-blue-800">Governança de Acesso</p>
              <p className="text-sm text-blue-700">
                Acessos excepcionais são temporários, exigem MFA e são registrados em auditoria.
                Apenas ADMIN_MASTER pode aprovar solicitações.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Requests */}
      {pendingGrants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-600">
              <Clock className="w-5 h-5" />
              Aguardando Aprovação ({pendingGrants.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingGrants.map((grant) => (
                <div
                  key={grant.id}
                  className="p-4 border rounded-lg border-amber-200 bg-amber-50/50"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={statusConfig[grant.status].className}>
                          {statusConfig[grant.status].label}
                        </Badge>
                        <Badge variant="outline">{scopeLabels[grant.scope] || grant.scope}</Badge>
                        <Badge variant="secondary">{reasonLabels[grant.reason_code] || grant.reason_code}</Badge>
                      </div>
                      
                      <p className="text-sm mb-2">{grant.reason_text}</p>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(grant.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </span>
                        <span>
                          Expira em: {formatDistanceToNow(new Date(grant.expires_at), { locale: ptBR, addSuffix: true })}
                        </span>
                      </div>
                    </div>

                    {isAdminMaster && (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 border-red-300 hover:bg-red-50"
                          onClick={() => handleApprove(grant.id, false)}
                          disabled={approveBreakglass.isPending}
                        >
                          <X className="w-4 h-4 mr-1" />
                          Negar
                        </Button>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleApprove(grant.id, true)}
                          disabled={approveBreakglass.isPending}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Aprovar
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Histórico de Solicitações ({grants?.length ?? 0})
          </CardTitle>
          <CardDescription>
            Todas as solicitações de acesso excepcional
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          ) : grants?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma solicitação encontrada</p>
            </div>
          ) : (
            <div className="space-y-2">
              {grants?.map((grant) => (
                <div
                  key={grant.id}
                  className="flex items-center gap-4 p-4 border rounded-lg"
                >
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <User className="w-5 h-5 text-muted-foreground" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className={statusConfig[grant.status].className}>
                        {statusConfig[grant.status].label}
                      </Badge>
                      <Badge variant="outline">{scopeLabels[grant.scope] || grant.scope}</Badge>
                      {grant.mfa_verified && (
                        <Badge variant="secondary" className="text-xs">
                          MFA ✓
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {grant.reason_text}
                    </p>
                  </div>

                  <div className="text-right text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(grant.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {reasonLabels[grant.reason_code] || grant.reason_code}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
