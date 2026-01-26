import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Lock, 
  AlertTriangle, 
  Eye, 
  Calendar,
  Shield,
  FileText,
  XCircle
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useLegalVault, useBreakglassGrants } from "@/hooks/useLegalVault";
import { useAdminMasterAccess } from "@/hooks/useLegalAccess";
import { BreakglassRequestSheet } from "./components/BreakglassRequestSheet";

const dataTypeLabels: Record<string, { label: string; icon: typeof AlertTriangle }> = {
  AUDIT_EVIDENCE: { label: "Evidência de Auditoria", icon: FileText },
  FRAUD: { label: "Fraude", icon: AlertTriangle },
  DISPUTE: { label: "Disputa", icon: XCircle },
  COURT_ORDER: { label: "Ordem Judicial", icon: Shield },
  INCIDENT: { label: "Incidente", icon: AlertTriangle },
};

export function LegalVaultPage() {
  const [showBreakglassSheet, setShowBreakglassSheet] = useState(false);
  const { data: vaultItems, isLoading } = useLegalVault();
  const { data: grants } = useBreakglassGrants();
  const { data: isAdminMaster } = useAdminMasterAccess();

  // Check if user has active breakglass
  const activeBreakglass = grants?.find(
    g => g.scope === 'LEGAL_VAULT' && 
         g.status === 'APPROVED' && 
         g.mfa_verified &&
         new Date(g.expires_at) > new Date()
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Lock className="w-6 h-6 text-primary" />
            Cofre Legal
          </h2>
          <p className="text-muted-foreground">
            Armazenamento isolado para evidências legais
          </p>
        </div>
        
        {!isAdminMaster && !activeBreakglass && (
          <Button onClick={() => setShowBreakglassSheet(true)}>
            <Shield className="w-4 h-4 mr-2" />
            Solicitar Acesso
          </Button>
        )}
      </div>

      {/* Access Warning */}
      {!isAdminMaster && !activeBreakglass && (
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800">Acesso Restrito</p>
                <p className="text-sm text-amber-700">
                  Você precisa de um acesso excepcional (Break-glass) aprovado para visualizar o conteúdo do cofre.
                  Solicite acesso informando o motivo e aguarde aprovação.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Breakglass Info */}
      {activeBreakglass && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium text-green-800">Acesso Excepcional Ativo</p>
                <p className="text-sm text-green-700">
                  Expira em: {format(new Date(activeBreakglass.expires_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vault Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Itens no Cofre ({vaultItems?.length ?? 0})
          </CardTitle>
          <CardDescription>
            Evidências e documentos com retenção legal obrigatória
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                  <Skeleton className="w-10 h-10 rounded" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          ) : !isAdminMaster && !activeBreakglass ? (
            <div className="text-center py-12 text-muted-foreground">
              <Lock className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Conteúdo bloqueado</p>
              <p className="text-sm">Solicite acesso excepcional para visualizar</p>
            </div>
          ) : vaultItems?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Lock className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Cofre vazio</p>
              <p className="text-sm">Nenhuma evidência armazenada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {vaultItems?.map((item) => {
                const typeConfig = dataTypeLabels[item.data_type] || { label: item.data_type, icon: FileText };
                const TypeIcon = typeConfig.icon;

                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <TypeIcon className="w-5 h-5 text-primary" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">{typeConfig.label}</Badge>
                        {item.sealed && (
                          <Badge className="bg-green-100 text-green-800 border-green-200">
                            <Lock className="w-3 h-3 mr-1" />
                            Selado
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        ID: {item.id.substring(0, 8)}...
                      </p>
                    </div>

                    <div className="text-right text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {format(new Date(item.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Retém até: {format(new Date(item.retention_until), "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                    </div>

                    <Button variant="ghost" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <BreakglassRequestSheet
        open={showBreakglassSheet}
        onOpenChange={setShowBreakglassSheet}
        scope="LEGAL_VAULT"
      />
    </div>
  );
}
