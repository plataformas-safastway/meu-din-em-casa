import { Shield, Bell, Brain, MessageSquare, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  useCSUserPreferences, 
  useUpdateCSPreferences,
} from "@/hooks/useCSAutomation";

interface CSUserPreferencesPanelProps {
  familyId: string;
  readOnly?: boolean;
}

export function CSUserPreferencesPanel({ familyId, readOnly = false }: CSUserPreferencesPanelProps) {
  const { data: preferences, isLoading } = useCSUserPreferences(familyId);
  const updateMutation = useUpdateCSPreferences();

  const handleToggle = (key: string, value: boolean) => {
    if (readOnly) return;
    
    updateMutation.mutate({
      familyId,
      preferences: { [key]: value },
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  // Default values if no preferences set
  const prefs = {
    allow_smart_tips: preferences?.allow_smart_tips ?? true,
    allow_notifications: preferences?.allow_notifications ?? true,
    allow_ai_analysis: preferences?.allow_ai_analysis ?? true,
    allow_proactive_contact: preferences?.allow_proactive_contact ?? true,
  };

  const preferenceItems = [
    {
      key: 'allow_smart_tips',
      label: 'Dicas Inteligentes',
      description: 'Receber dicas educativas personalizadas',
      icon: Brain,
      value: prefs.allow_smart_tips,
    },
    {
      key: 'allow_notifications',
      label: 'Notificações',
      description: 'Receber notificações automáticas do app',
      icon: Bell,
      value: prefs.allow_notifications,
    },
    {
      key: 'allow_ai_analysis',
      label: 'Análise por IA',
      description: 'Permitir análise de padrões de uso (anonimizada)',
      icon: Brain,
      value: prefs.allow_ai_analysis,
    },
    {
      key: 'allow_proactive_contact',
      label: 'Contato Proativo',
      description: 'Permitir contato do time de suporte',
      icon: MessageSquare,
      value: prefs.allow_proactive_contact,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" />
          Preferências de Privacidade
        </CardTitle>
        <CardDescription>
          Controles de consentimento do usuário (LGPD)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {preferenceItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.key}
              className="flex items-center justify-between p-3 border rounded-lg"
            >
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">{item.label}</p>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {updateMutation.isPending && (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                )}
                <Switch
                  checked={item.value}
                  onCheckedChange={(checked) => handleToggle(item.key, checked)}
                  disabled={readOnly || updateMutation.isPending}
                />
              </div>
            </div>
          );
        })}

        <div className="pt-4 text-xs text-muted-foreground">
          <p>
            <strong>Transparência:</strong> A IA do OIK apenas sugere ações, 
            nunca executa automaticamente. Seus dados financeiros nunca são 
            enviados para análise externa.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
