import { useState } from "react";
import { 
  AlertTriangle, 
  TrendingUp, 
  CheckCircle2, 
  Clock,
  XCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  useCSBehaviorSignals, 
  useResolveSignal,
  useTriggerAIAnalysis,
  type CSBehaviorSignal 
} from "@/hooks/useCSAutomation";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const SIGNAL_CONFIG: Record<string, { 
  label: string; 
  description: string;
  icon: typeof AlertTriangle;
  color: string;
}> = {
  days_without_login: {
    label: 'Dias sem login',
    description: 'Usuário não acessa o app há vários dias',
    icon: Clock,
    color: 'text-orange-500',
  },
  no_import_after_signup: {
    label: 'Sem importação',
    description: 'Usuário cadastrou mas não importou dados',
    icon: XCircle,
    color: 'text-red-500',
  },
  no_budget_with_transactions: {
    label: 'Sem orçamento',
    description: 'Transações sem orçamento configurado',
    icon: AlertTriangle,
    color: 'text-amber-500',
  },
  no_goals_defined: {
    label: 'Sem metas',
    description: 'Usuário sem metas financeiras definidas',
    icon: AlertTriangle,
    color: 'text-yellow-500',
  },
  first_import_completed: {
    label: 'Primeira importação',
    description: 'Usuário completou primeira importação',
    icon: CheckCircle2,
    color: 'text-green-500',
  },
  first_budget_created: {
    label: 'Primeiro orçamento',
    description: 'Usuário criou primeiro orçamento',
    icon: CheckCircle2,
    color: 'text-green-500',
  },
  first_goal_created: {
    label: 'Primeira meta',
    description: 'Usuário definiu primeira meta',
    icon: CheckCircle2,
    color: 'text-green-500',
  },
  active_user: {
    label: 'Usuário ativo',
    description: 'Usuário com uso recente e recorrente',
    icon: TrendingUp,
    color: 'text-emerald-500',
  },
};

interface CSSignalsPanelProps {
  familyId: string;
  showAnalyzeButton?: boolean;
}

export function CSSignalsPanel({ familyId, showAnalyzeButton = true }: CSSignalsPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [selectedSignal, setSelectedSignal] = useState<CSBehaviorSignal | null>(null);
  const [resolveNotes, setResolveNotes] = useState('');

  const { data: signals, isLoading } = useCSBehaviorSignals(familyId);
  const resolveMutation = useResolveSignal();
  const analyzeMutation = useTriggerAIAnalysis();

  const handleResolveClick = (signal: CSBehaviorSignal) => {
    setSelectedSignal(signal);
    setResolveNotes('');
    setResolveDialogOpen(true);
  };

  const handleResolveConfirm = () => {
    if (selectedSignal) {
      resolveMutation.mutate({ 
        signalId: selectedSignal.id, 
        notes: resolveNotes || undefined 
      });
      setResolveDialogOpen(false);
      setSelectedSignal(null);
    }
  };

  const handleAnalyze = () => {
    analyzeMutation.mutate(familyId);
  };

  const riskSignals = signals?.filter(s => s.signal_type === 'risk') || [];
  const activationSignals = signals?.filter(s => s.signal_type === 'activation') || [];

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Sinais de Comportamento
            </CardTitle>
            <CardDescription>
              Indicadores determinísticos de uso do app
            </CardDescription>
          </div>
          {showAnalyzeButton && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleAnalyze}
              disabled={analyzeMutation.isPending}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${analyzeMutation.isPending ? 'animate-spin' : ''}`} />
              Analisar
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Risk Signals */}
          {riskSignals.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-destructive mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Sinais de Risco ({riskSignals.length})
              </h4>
              <div className="space-y-2">
                {riskSignals.map((signal) => (
                  <SignalItem
                    key={signal.id}
                    signal={signal}
                    isExpanded={expandedId === signal.id}
                    onToggle={() => setExpandedId(expandedId === signal.id ? null : signal.id)}
                    onResolve={() => handleResolveClick(signal)}
                    isResolving={resolveMutation.isPending}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Activation Signals */}
          {activationSignals.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-green-600 mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Sinais de Ativação ({activationSignals.length})
              </h4>
              <div className="space-y-2">
                {activationSignals.map((signal) => (
                  <SignalItem
                    key={signal.id}
                    signal={signal}
                    isExpanded={expandedId === signal.id}
                    onToggle={() => setExpandedId(expandedId === signal.id ? null : signal.id)}
                    onResolve={() => handleResolveClick(signal)}
                    isResolving={resolveMutation.isPending}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!signals?.length && (
            <div className="text-center text-muted-foreground py-8">
              <TrendingUp className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum sinal detectado</p>
              <p className="text-sm">Clique em "Analisar" para verificar</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resolve Dialog */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolver sinal</DialogTitle>
            <DialogDescription>
              Marcar este sinal como resolvido. Adicione uma nota opcional.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Notas sobre a resolução (opcional)..."
              value={resolveNotes}
              onChange={(e) => setResolveNotes(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleResolveConfirm}
              disabled={resolveMutation.isPending}
            >
              Resolver
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface SignalItemProps {
  signal: CSBehaviorSignal;
  isExpanded: boolean;
  onToggle: () => void;
  onResolve: () => void;
  isResolving: boolean;
}

function SignalItem({ signal, isExpanded, onToggle, onResolve, isResolving }: SignalItemProps) {
  const config = SIGNAL_CONFIG[signal.signal_code] || {
    label: signal.signal_code,
    description: 'Sinal de comportamento',
    icon: AlertTriangle,
    color: 'text-muted-foreground',
  };
  const Icon = config.icon;

  return (
    <div className="border rounded-lg p-3 hover:bg-muted/50 transition-colors">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Icon className={`w-5 h-5 ${config.color}`} />
          <div>
            <p className="font-medium text-sm">{config.label}</p>
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(signal.detected_at), { 
                addSuffix: true, 
                locale: ptBR 
              })}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={signal.signal_type === 'risk' ? 'destructive' : 'default'}>
            {signal.signal_type === 'risk' ? 'Risco' : 'Ativação'}
          </Badge>
          <Button variant="ghost" size="sm" onClick={onToggle}>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-3 pt-3 border-t space-y-3">
          <p className="text-sm text-muted-foreground">{config.description}</p>
          
          {Object.keys(signal.signal_value).length > 0 && (
            <div className="bg-muted/50 p-2 rounded text-xs font-mono">
              {JSON.stringify(signal.signal_value, null, 2)}
            </div>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={onResolve}
            disabled={isResolving}
          >
            <CheckCircle2 className="w-4 h-4 mr-1" />
            Marcar como resolvido
          </Button>
        </div>
      )}
    </div>
  );
}
