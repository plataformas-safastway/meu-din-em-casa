import { useState } from "react";
import { Settings, ToggleLeft, ToggleRight, ChevronDown, ChevronUp, Clock, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { 
  useCSAutomationRules, 
  useUpdateAutomationRule,
  type CSAutomationRule 
} from "@/hooks/useCSAutomation";

interface CSAutomationRulesPanelProps {
  compact?: boolean;
}

export function CSAutomationRulesPanel({ compact = false }: CSAutomationRulesPanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const { data: rules, isLoading } = useCSAutomationRules(false);
  const updateMutation = useUpdateAutomationRule();

  const handleToggleActive = (rule: CSAutomationRule) => {
    updateMutation.mutate({
      ruleId: rule.id,
      updates: { is_active: !rule.is_active },
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
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const activeRules = rules?.filter(r => r.is_active) || [];
  const inactiveRules = rules?.filter(r => !r.is_active) || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          Regras de Automação
          <Badge variant="secondary" className="ml-2">
            {activeRules.length} ativas
          </Badge>
        </CardTitle>
        <CardDescription>
          Automações configuráveis que respeitam consentimento do usuário
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Active Rules */}
        {activeRules.map((rule) => (
          <RuleItem
            key={rule.id}
            rule={rule}
            isExpanded={expandedId === rule.id}
            onToggle={() => setExpandedId(expandedId === rule.id ? null : rule.id)}
            onToggleActive={() => handleToggleActive(rule)}
            isUpdating={updateMutation.isPending}
          />
        ))}

        {/* Inactive Rules (only show if not compact) */}
        {!compact && inactiveRules.length > 0 && (
          <div className="pt-4 border-t">
            <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <ToggleLeft className="w-4 h-4" />
              Regras Desativadas ({inactiveRules.length})
            </h4>
            {inactiveRules.map((rule) => (
              <RuleItem
                key={rule.id}
                rule={rule}
                isExpanded={expandedId === rule.id}
                onToggle={() => setExpandedId(expandedId === rule.id ? null : rule.id)}
                onToggleActive={() => handleToggleActive(rule)}
                isUpdating={updateMutation.isPending}
              />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!rules?.length && (
          <div className="text-center text-muted-foreground py-8">
            <Settings className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Nenhuma regra configurada</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface RuleItemProps {
  rule: CSAutomationRule;
  isExpanded: boolean;
  onToggle: () => void;
  onToggleActive: () => void;
  isUpdating: boolean;
}

function RuleItem({ rule, isExpanded, onToggle, onToggleActive, isUpdating }: RuleItemProps) {
  return (
    <div className={`border rounded-lg p-4 ${!rule.is_active ? 'opacity-60' : ''}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1">
          <Switch
            checked={rule.is_active}
            onCheckedChange={onToggleActive}
            disabled={isUpdating}
          />
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm">{rule.name}</h4>
            {rule.description && (
              <p className="text-xs text-muted-foreground truncate">
                {rule.description}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {rule.requires_consent && (
            <Badge variant="outline" className="text-xs">
              Requer consentimento
            </Badge>
          )}
          <Button variant="ghost" size="sm" onClick={onToggle}>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-muted-foreground text-xs">Gatilho</p>
              <p className="font-mono text-xs bg-muted px-2 py-1 rounded">
                {rule.trigger_signal}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Tipo de Ação</p>
              <p className="font-mono text-xs bg-muted px-2 py-1 rounded">
                {rule.action_type}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Cooldown: {rule.cooldown_hours}h
            </div>
            <div className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              Prioridade: {rule.priority}
            </div>
          </div>

          {Object.keys(rule.action_config).length > 0 && (
            <div>
              <p className="text-muted-foreground text-xs mb-1">Configuração</p>
              <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
                {JSON.stringify(rule.action_config, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
