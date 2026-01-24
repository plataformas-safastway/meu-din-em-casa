import { useState } from "react";
import { Key, Plus, Shield, Clock, Ban, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useApiKeys, useRevokeApiKey, ApiKey } from "@/hooks/useTechModule";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function TechApiKeysPage() {
  const { toast } = useToast();
  const { data: keys, isLoading } = useApiKeys();
  const revokeKey = useRevokeApiKey();
  const [keyToRevoke, setKeyToRevoke] = useState<string | null>(null);
  const [showSuffix, setShowSuffix] = useState<Record<string, boolean>>({});

  const handleRevoke = async () => {
    if (!keyToRevoke) return;

    try {
      await revokeKey.mutateAsync(keyToRevoke);
      toast({ title: "Chave revogada com sucesso" });
    } catch (error) {
      toast({ title: "Erro ao revogar chave", variant: "destructive" });
    } finally {
      setKeyToRevoke(null);
    }
  };

  const toggleShowSuffix = (keyId: string) => {
    setShowSuffix((prev) => ({ ...prev, [keyId]: !prev[keyId] }));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Ativa</Badge>;
      case 'revoked':
        return <Badge className="bg-red-100 text-red-800">Revogada</Badge>;
      case 'expired':
        return <Badge className="bg-gray-100 text-gray-800">Expirada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Chaves de API</h2>
          <p className="text-muted-foreground">Gerencie credenciais de acesso a serviços externos</p>
        </div>
        <Button disabled>
          <Plus className="w-4 h-4 mr-2" />
          Nova Chave
        </Button>
      </div>

      {/* Security Notice */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-amber-600 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium">Segurança de Chaves</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Chaves são exibidas parcialmente (apenas primeiros e últimos 4 caracteres)</li>
                <li>Toda alteração é registrada no log de auditoria</li>
                <li>Chaves revogadas não podem ser reativadas</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Keys List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            Chaves Cadastradas ({keys?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : keys?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Key className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma chave cadastrada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {keys?.map((key) => (
                <div
                  key={key.id}
                  className={`p-4 rounded-lg border ${key.status !== 'active' ? 'opacity-60' : ''}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-medium">{key.name}</p>
                        {getStatusBadge(key.status)}
                        <Badge variant="outline">{key.service}</Badge>
                        <Badge variant="outline">{key.environment}</Badge>
                      </div>

                      {/* Key Display */}
                      <div className="flex items-center gap-2 mb-2">
                        <code className="text-sm bg-muted px-2 py-1 rounded font-mono">
                          {key.key_prefix}...{showSuffix[key.id] ? key.key_suffix : '****'}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleShowSuffix(key.id)}
                        >
                          {showSuffix[key.id] ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </Button>
                      </div>

                      {/* Metadata */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Criada: {format(new Date(key.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </span>
                        {key.last_used_at && (
                          <span>
                            Último uso: {format(new Date(key.last_used_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </span>
                        )}
                        {key.expires_at && (
                          <span>
                            Expira: {format(new Date(key.expires_at), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        )}
                      </div>

                      {key.revoked_at && (
                        <p className="text-xs text-red-600 mt-2">
                          Revogada em {format(new Date(key.revoked_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    {key.status === 'active' && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setKeyToRevoke(key.id)}
                      >
                        <Ban className="w-4 h-4 mr-1" />
                        Revogar
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revoke Confirmation */}
      <AlertDialog open={!!keyToRevoke} onOpenChange={(open) => !open && setKeyToRevoke(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revogar chave de API</AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="text-destructive">Esta ação é irreversível.</strong>
              <br /><br />
              Ao revogar esta chave, todos os serviços que a utilizam perderão acesso imediatamente.
              Certifique-se de que há uma chave substituta configurada antes de prosseguir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Revogar Chave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
