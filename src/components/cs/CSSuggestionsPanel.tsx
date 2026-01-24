import { useState } from "react";
import { 
  Lightbulb, 
  Check, 
  X, 
  Play, 
  ChevronDown, 
  ChevronUp,
  Brain,
  AlertTriangle,
  Info,
  MessageSquare,
  BookOpen,
  Bell,
  ClipboardList
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
  useCSAISuggestions, 
  useAcceptSuggestion, 
  useRejectSuggestion,
  useExecuteSuggestion,
  type CSAISuggestion 
} from "@/hooks/useCSAutomation";

const PRIORITY_CONFIG = {
  urgent: { label: 'Urgente', color: 'bg-red-500 text-white', icon: AlertTriangle },
  high: { label: 'Alta', color: 'bg-orange-500 text-white', icon: AlertTriangle },
  medium: { label: 'Média', color: 'bg-yellow-500 text-white', icon: Info },
  low: { label: 'Baixa', color: 'bg-gray-500 text-white', icon: Info },
};

const TYPE_CONFIG = {
  education: { label: 'Educação', icon: BookOpen, color: 'text-purple-500' },
  onboarding: { label: 'Onboarding', icon: ClipboardList, color: 'text-blue-500' },
  notification: { label: 'Notificação', icon: Bell, color: 'text-green-500' },
  task: { label: 'Tarefa CS', icon: ClipboardList, color: 'text-orange-500' },
  follow_up: { label: 'Follow-up', icon: MessageSquare, color: 'text-teal-500' },
};

interface CSSuggestionsPanelProps {
  familyId?: string;
  compact?: boolean;
}

export function CSSuggestionsPanel({ familyId, compact = false }: CSSuggestionsPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState<CSAISuggestion | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const { data, isLoading } = useCSAISuggestions(
    { familyId, status: 'pending' },
    0,
    compact ? 5 : 20
  );
  
  const acceptMutation = useAcceptSuggestion();
  const rejectMutation = useRejectSuggestion();
  const executeMutation = useExecuteSuggestion();

  const handleAccept = (suggestion: CSAISuggestion) => {
    acceptMutation.mutate({ suggestionId: suggestion.id });
  };

  const handleRejectClick = (suggestion: CSAISuggestion) => {
    setSelectedSuggestion(suggestion);
    setRejectReason('');
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = () => {
    if (selectedSuggestion && rejectReason.trim()) {
      rejectMutation.mutate({ 
        suggestionId: selectedSuggestion.id, 
        reason: rejectReason 
      });
      setRejectDialogOpen(false);
      setSelectedSuggestion(null);
    }
  };

  const handleExecute = (suggestion: CSAISuggestion) => {
    executeMutation.mutate({
      suggestionId: suggestion.id,
      familyId: suggestion.family_id,
      actionType: suggestion.suggestion_type,
      actionPayload: suggestion.suggested_action,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const suggestions = data?.suggestions || [];

  if (suggestions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            Sugestões IA
          </CardTitle>
          <CardDescription>Nenhuma sugestão pendente</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <Lightbulb className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Todas as sugestões foram processadas</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-primary" />
            Sugestões IA
            <Badge variant="secondary" className="ml-2">
              {suggestions.length} pendentes
            </Badge>
          </CardTitle>
          <CardDescription>
            Ações sugeridas pela IA com base em sinais de comportamento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {suggestions.map((suggestion) => {
            const priorityConfig = PRIORITY_CONFIG[suggestion.priority];
            const typeConfig = TYPE_CONFIG[suggestion.suggestion_type];
            const isExpanded = expandedId === suggestion.id;
            const TypeIcon = typeConfig?.icon || Lightbulb;

            return (
              <div
                key={suggestion.id}
                className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1">
                    <div className={`p-2 rounded-lg bg-muted ${typeConfig?.color}`}>
                      <TypeIcon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium text-sm">{suggestion.title}</h4>
                        <Badge className={priorityConfig.color} variant="secondary">
                          {priorityConfig.label}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {typeConfig?.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {suggestion.description}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedId(isExpanded ? null : suggestion.id)}
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t space-y-4">
                    {/* Reason (explainable AI) */}
                    <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-lg">
                      <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
                        Por que esta sugestão?
                      </p>
                      <p className="text-sm text-blue-900 dark:text-blue-100">
                        {suggestion.reason}
                      </p>
                    </div>

                    {/* Confidence */}
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Confiança:</span>
                      <div className="flex-1 max-w-32 bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${suggestion.confidence_score * 100}%` }}
                        />
                      </div>
                      <span className="font-medium">
                        {Math.round(suggestion.confidence_score * 100)}%
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        size="sm"
                        onClick={() => handleExecute(suggestion)}
                        disabled={executeMutation.isPending}
                      >
                        <Play className="w-4 h-4 mr-1" />
                        Executar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAccept(suggestion)}
                        disabled={acceptMutation.isPending}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Aceitar
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRejectClick(suggestion)}
                        disabled={rejectMutation.isPending}
                      >
                        <X className="w-4 h-4 mr-1" />
                        Ignorar
                      </Button>
                    </div>
                  </div>
                )}

                {/* Quick actions when collapsed */}
                {!isExpanded && !compact && (
                  <div className="flex items-center gap-2 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleAccept(suggestion)}
                      disabled={acceptMutation.isPending}
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleRejectClick(suggestion)}
                      disabled={rejectMutation.isPending}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ignorar sugestão</DialogTitle>
            <DialogDescription>
              Por favor, informe o motivo para ignorar esta sugestão.
              Isso ajuda a melhorar as sugestões futuras.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Motivo para ignorar..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleRejectConfirm}
              disabled={!rejectReason.trim() || rejectMutation.isPending}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
