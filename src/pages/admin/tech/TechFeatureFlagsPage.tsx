import { useState } from "react";
import { Flag, Plus, ToggleLeft, ToggleRight, Users, Globe } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useFeatureFlags, useToggleFeatureFlag, useCreateFeatureFlag, FeatureFlag } from "@/hooks/useTechModule";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function TechFeatureFlagsPage() {
  const { toast } = useToast();
  const { data: flags, isLoading } = useFeatureFlags();
  const toggleFlag = useToggleFeatureFlag();
  const createFlag = useCreateFeatureFlag();
  
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newFlag, setNewFlag] = useState({
    name: '',
    display_name: '',
    description: '',
    environment: 'all',
    rollout_percentage: 100,
  });

  const handleToggle = async (flag: FeatureFlag) => {
    try {
      await toggleFlag.mutateAsync({ id: flag.id, isEnabled: !flag.is_enabled });
      toast({
        title: `Flag ${!flag.is_enabled ? 'ativada' : 'desativada'}`,
        description: flag.display_name,
      });
    } catch (error) {
      toast({ title: "Erro ao alterar flag", variant: "destructive" });
    }
  };

  const handleCreate = async () => {
    if (!newFlag.name || !newFlag.display_name) {
      toast({ title: "Preencha nome e título", variant: "destructive" });
      return;
    }

    try {
      await createFlag.mutateAsync(newFlag);
      toast({ title: "Feature flag criada com sucesso" });
      setShowCreateDialog(false);
      setNewFlag({
        name: '',
        display_name: '',
        description: '',
        environment: 'all',
        rollout_percentage: 100,
      });
    } catch (error) {
      toast({ title: "Erro ao criar flag", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Feature Flags</h2>
          <p className="text-muted-foreground">Controle a liberação de funcionalidades</p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Flag
        </Button>
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <p className="text-sm text-blue-800">
            <strong>Rollback Seguro:</strong> Feature flags permitem ativar/desativar funcionalidades 
            sem deploy. Todas as alterações são registradas no log de auditoria para rastreabilidade.
          </p>
        </CardContent>
      </Card>

      {/* Flags List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flag className="w-5 h-5" />
            Flags Configuradas ({flags?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : flags?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Flag className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma feature flag configurada</p>
            </div>
          ) : (
            <div className="space-y-4">
              {flags?.map((flag) => (
                <div
                  key={flag.id}
                  className={`p-4 rounded-lg border ${flag.is_enabled ? 'border-green-200 bg-green-50/30' : 'border-gray-200'}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {flag.is_enabled ? (
                          <ToggleRight className="w-5 h-5 text-green-600" />
                        ) : (
                          <ToggleLeft className="w-5 h-5 text-gray-400" />
                        )}
                        <p className="font-medium">{flag.display_name}</p>
                        <Badge variant="outline" className="font-mono text-xs">
                          {flag.name}
                        </Badge>
                      </div>

                      {flag.description && (
                        <p className="text-sm text-muted-foreground mb-3">{flag.description}</p>
                      )}

                      <div className="flex items-center gap-4 mb-3">
                        <div className="flex items-center gap-1 text-xs">
                          <Globe className="w-3 h-3" />
                          <span>
                            {flag.environment === 'all' ? 'Todos ambientes' : flag.environment}
                          </span>
                        </div>

                        {flag.target_roles && flag.target_roles.length > 0 && (
                          <div className="flex items-center gap-1 text-xs">
                            <Users className="w-3 h-3" />
                            <span>{flag.target_roles.join(', ')}</span>
                          </div>
                        )}
                      </div>

                      {/* Rollout Progress */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Rollout</span>
                          <span className="font-medium">{flag.rollout_percentage}%</span>
                        </div>
                        <Progress value={flag.rollout_percentage} className="h-2" />
                      </div>

                      <p className="text-xs text-muted-foreground mt-2">
                        Atualizada: {format(new Date(flag.updated_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </p>
                    </div>

                    {/* Toggle */}
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={flag.is_enabled}
                        onCheckedChange={() => handleToggle(flag)}
                        disabled={toggleFlag.isPending}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Feature Flag</DialogTitle>
            <DialogDescription>
              Crie uma nova flag para controlar a liberação de funcionalidades.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome (identificador)</Label>
              <Input
                id="name"
                placeholder="ex: new_dashboard_v2"
                value={newFlag.name}
                onChange={(e) => setNewFlag({ ...newFlag, name: e.target.value.toLowerCase().replace(/\s+/g, '_') })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="display_name">Título</Label>
              <Input
                id="display_name"
                placeholder="ex: Novo Dashboard V2"
                value={newFlag.display_name}
                onChange={(e) => setNewFlag({ ...newFlag, display_name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                placeholder="Descrição da funcionalidade..."
                value={newFlag.description}
                onChange={(e) => setNewFlag({ ...newFlag, description: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Ambiente</Label>
              <Select
                value={newFlag.environment}
                onValueChange={(v) => setNewFlag({ ...newFlag, environment: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="production">Produção</SelectItem>
                  <SelectItem value="staging">Staging</SelectItem>
                  <SelectItem value="development">Desenvolvimento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Rollout (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={newFlag.rollout_percentage}
                onChange={(e) => setNewFlag({ ...newFlag, rollout_percentage: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={createFlag.isPending}>
              Criar Flag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
