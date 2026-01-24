import { useState } from "react";
import { Bell, BookOpen, Lightbulb, MessageSquare } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useOnboarding } from "@/hooks/useOnboarding";
import { toast } from "sonner";

export function EducationPreferences() {
  const { state, updatePreferences, isLoading } = useOnboarding();
  const [isUpdating, setIsUpdating] = useState(false);

  const handleToggle = async (key: "educationTipsEnabled" | "contextualHintsEnabled", value: boolean) => {
    setIsUpdating(true);
    try {
      await updatePreferences.mutateAsync({ [key]: value });
      toast.success(value ? "Preferência ativada" : "Preferência desativada");
    } catch (error) {
      toast.error("Erro ao atualizar preferência");
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-1/3" />
            <div className="h-10 bg-muted rounded" />
            <div className="h-10 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-base">Educação e Dicas</CardTitle>
            <CardDescription>
              Controle como o OIK te ajuda a aprender
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Education Tips Toggle */}
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-info/20 flex items-center justify-center">
              <Lightbulb className="w-4 h-4 text-info" />
            </div>
            <div>
              <Label htmlFor="education-tips" className="text-sm font-medium">
                Dicas educativas
              </Label>
              <p className="text-xs text-muted-foreground">
                Explicações sobre funcionalidades e conceitos
              </p>
            </div>
          </div>
          <Switch
            id="education-tips"
            checked={state.educationTipsEnabled}
            onCheckedChange={(checked) => handleToggle("educationTipsEnabled", checked)}
            disabled={isUpdating}
          />
        </div>

        {/* Contextual Hints Toggle */}
        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-warning/20 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-warning" />
            </div>
            <div>
              <Label htmlFor="contextual-hints" className="text-sm font-medium">
                Dicas contextuais
              </Label>
              <p className="text-xs text-muted-foreground">
                Mensagens no momento certo durante o uso
              </p>
            </div>
          </div>
          <Switch
            id="contextual-hints"
            checked={state.contextualHintsEnabled}
            onCheckedChange={(checked) => handleToggle("contextualHintsEnabled", checked)}
            disabled={isUpdating}
          />
        </div>

        {/* Info */}
        <p className="text-xs text-muted-foreground text-center pt-2">
          Você pode reativar essas opções a qualquer momento.
        </p>
      </CardContent>
    </Card>
  );
}
