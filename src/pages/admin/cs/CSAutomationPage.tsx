import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Settings, Activity, Shield } from "lucide-react";
import { CSSuggestionsPanel, CSAutomationRulesPanel } from "@/components/cs";
import { useCSPendingSuggestionsCount } from "@/hooks/useCSAutomation";
import { Badge } from "@/components/ui/badge";

export function CSAutomationPage() {
  const { data: pendingCount } = useCSPendingSuggestionsCount();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Brain className="w-6 h-6 text-primary" />
          Automação CS + IA
        </h2>
        <p className="text-muted-foreground">
          Sugestões inteligentes e automações configuráveis
        </p>
      </div>

      <Tabs defaultValue="suggestions" className="space-y-6">
        <TabsList>
          <TabsTrigger value="suggestions" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Sugestões IA
            {pendingCount && pendingCount > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                {pendingCount}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="rules" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Regras
          </TabsTrigger>
        </TabsList>

        <TabsContent value="suggestions">
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 dark:text-blue-100 flex items-center gap-2">
                <Brain className="w-4 h-4" />
                Como funciona a IA do OIK
              </h3>
              <ul className="mt-2 text-sm text-blue-800 dark:text-blue-200 space-y-1">
                <li>• A IA analisa <strong>padrões de uso</strong>, nunca dados financeiros</li>
                <li>• Toda sugestão inclui uma <strong>explicação clara</strong> do motivo</li>
                <li>• A IA <strong>apenas sugere</strong>, nunca executa ações automaticamente</li>
                <li>• Respeitamos as <strong>preferências de consentimento</strong> do usuário</li>
              </ul>
            </div>

            <CSSuggestionsPanel />
          </div>
        </TabsContent>

        <TabsContent value="rules">
          <div className="space-y-4">
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg p-4">
              <h3 className="font-medium text-amber-900 dark:text-amber-100 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Sobre as Automações
              </h3>
              <ul className="mt-2 text-sm text-amber-800 dark:text-amber-200 space-y-1">
                <li>• Regras com "Requer consentimento" só são executadas se o usuário permitir</li>
                <li>• Cooldown impede que a mesma ação seja repetida muito frequentemente</li>
                <li>• Todas as execuções são registradas para auditoria</li>
              </ul>
            </div>

            <CSAutomationRulesPanel />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
