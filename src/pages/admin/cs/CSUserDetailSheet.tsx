import { useState } from "react";
import { X, User, Activity, FileUp, PiggyBank, Target, MessageSquare, Phone, Mail, BookOpen, Bell, AlertTriangle, CheckCircle } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  useCSUserDetails, 
  useUpdateCSStatus, 
  useRegisterCSAction,
  calculateEngagementScore, 
  getScoreLabel,
  CSStatus,
  CSActionType,
} from "@/hooks/useCSModule";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CSUserDetailSheetProps {
  familyId: string | null;
  onClose: () => void;
}

const STATUS_OPTIONS: { value: CSStatus; label: string }[] = [
  { value: 'active', label: 'Ativo' },
  { value: 'onboarding', label: 'Em Ativação' },
  { value: 'at_risk', label: 'Risco de Churn' },
  { value: 'inactive', label: 'Inativo' },
  { value: 'churned', label: 'Churned' },
];

const ACTION_OPTIONS: { value: CSActionType; label: string; icon: typeof Phone }[] = [
  { value: 'contact_made', label: 'Contato Realizado', icon: Phone },
  { value: 'guidance_sent', label: 'Orientação Enviada', icon: MessageSquare },
  { value: 'material_shared', label: 'Material Indicado', icon: BookOpen },
  { value: 'campaign_added', label: 'Adicionado a Campanha', icon: Bell },
  { value: 'nudge_sent', label: 'Nudge Enviado', icon: Bell },
  { value: 'followup_scheduled', label: 'Follow-up Agendado', icon: Target },
  { value: 'note_added', label: 'Observação Interna', icon: MessageSquare },
];

export function CSUserDetailSheet({ familyId, onClose }: CSUserDetailSheetProps) {
  const { toast } = useToast();
  const { data, isLoading } = useCSUserDetails(familyId);
  const updateStatus = useUpdateCSStatus();
  const registerAction = useRegisterCSAction();

  const [newStatus, setNewStatus] = useState<CSStatus | ''>('');
  const [actionType, setActionType] = useState<CSActionType | ''>('');
  const [actionNotes, setActionNotes] = useState('');

  const scoreData = calculateEngagementScore(data?.metrics || null);
  const scoreLabel = getScoreLabel(scoreData.score);

  const handleStatusUpdate = async () => {
    if (!familyId || !newStatus) return;

    try {
      await updateStatus.mutateAsync({
        familyId,
        status: newStatus,
      });
      toast({ title: "Status atualizado com sucesso" });
      setNewStatus('');
    } catch (error) {
      toast({ title: "Erro ao atualizar status", variant: "destructive" });
    }
  };

  const handleRegisterAction = async () => {
    if (!familyId || !actionType) return;

    try {
      await registerAction.mutateAsync({
        familyId,
        actionType,
        notes: actionNotes || undefined,
      });
      toast({ title: "Ação registrada com sucesso" });
      setActionType('');
      setActionNotes('');
    } catch (error) {
      toast({ title: "Erro ao registrar ação", variant: "destructive" });
    }
  };

  return (
    <Sheet open={!!familyId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <SheetTitle>Perfil do Usuário</SheetTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </SheetHeader>

        {isLoading ? (
          <div className="space-y-4 mt-6">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : !data ? (
          <div className="text-center py-8 text-muted-foreground">
            <User className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>Usuário não encontrado</p>
          </div>
        ) : (
          <div className="space-y-6 mt-6">
            {/* User Info Header */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-2xl font-bold text-primary">
                  {data.family?.name?.charAt(0).toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold">{data.family?.name}</h3>
                <p className="text-muted-foreground">
                  {data.family?.members_count} membro(s) • 
                  Desde {format(new Date(data.family?.created_at || ''), "dd/MM/yyyy", { locale: ptBR })}
                </p>
                {data.status && (
                  <Badge className="mt-2" variant="outline">
                    Status: {STATUS_OPTIONS.find(s => s.value === data.status?.status)?.label || data.status.status}
                  </Badge>
                )}
              </div>
            </div>

            {/* Engagement Score */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Activity className="w-4 h-4" />
                  Score de Engajamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 mb-4">
                  <div className="text-center">
                    <p className={`text-4xl font-bold ${scoreLabel.color}`}>
                      {scoreData.score}
                    </p>
                    <p className="text-sm text-muted-foreground">{scoreLabel.label}</p>
                  </div>
                  <Separator orientation="vertical" className="h-16" />
                  <div className="flex-1 text-sm space-y-1">
                    {scoreData.explanation.slice(0, 4).map((exp, i) => (
                      <p key={i} className="text-muted-foreground">{exp}</p>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Usage Stats - No financial values */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Uso da Plataforma</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <FileUp className={`w-5 h-5 ${data.metrics?.has_import ? 'text-green-500' : 'text-gray-400'}`} />
                    <div>
                      <p className="text-sm font-medium">Importações</p>
                      <p className="text-xs text-muted-foreground">{data.usage?.imports_count || 0} realizadas</p>
                    </div>
                    {data.metrics?.has_import ? (
                      <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-500 ml-auto" />
                    )}
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <PiggyBank className={`w-5 h-5 ${data.metrics?.has_budget ? 'text-green-500' : 'text-gray-400'}`} />
                    <div>
                      <p className="text-sm font-medium">Orçamentos</p>
                      <p className="text-xs text-muted-foreground">{data.usage?.budgets_count || 0} ativos</p>
                    </div>
                    {data.metrics?.has_budget ? (
                      <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-500 ml-auto" />
                    )}
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Target className={`w-5 h-5 ${data.metrics?.has_goals ? 'text-green-500' : 'text-gray-400'}`} />
                    <div>
                      <p className="text-sm font-medium">Metas</p>
                      <p className="text-xs text-muted-foreground">{data.usage?.goals_count || 0} criadas</p>
                    </div>
                    {data.metrics?.has_goals ? (
                      <CheckCircle className="w-4 h-4 text-green-500 ml-auto" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-500 ml-auto" />
                    )}
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <Activity className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="text-sm font-medium">Transações</p>
                      <p className="text-xs text-muted-foreground">{data.usage?.transactions_count || 0} registradas</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Update Status */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Alterar Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Select value={newStatus} onValueChange={(v) => setNewStatus(v as CSStatus)}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecionar novo status" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    onClick={handleStatusUpdate}
                    disabled={!newStatus || updateStatus.isPending}
                  >
                    Atualizar
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Register Action */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Registrar Ação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Select value={actionType} onValueChange={(v) => setActionType(v as CSActionType)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tipo de ação" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Textarea
                  placeholder="Observações (opcional)"
                  value={actionNotes}
                  onChange={(e) => setActionNotes(e.target.value)}
                  rows={3}
                />

                <Button 
                  className="w-full"
                  onClick={handleRegisterAction}
                  disabled={!actionType || registerAction.isPending}
                >
                  Registrar Ação
                </Button>
              </CardContent>
            </Card>

            {/* Action History */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Histórico de Ações CS</CardTitle>
              </CardHeader>
              <CardContent>
                {data.actions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma ação registrada ainda
                  </p>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {data.actions.map((action) => (
                      <div key={action.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <MessageSquare className="w-4 h-4 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {ACTION_OPTIONS.find(a => a.value === action.action_type)?.label || action.action_type}
                          </p>
                          {action.notes && (
                            <p className="text-xs text-muted-foreground mt-1">{action.notes}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(action.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
