import { Shield, DollarSign, Target, BookOpen, Info } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useEmailPreferences } from '@/hooks/useEmailPreferences';

export function EmailPreferencesSettings() {
  const { preferences, isLoading, isSaving, updatePreferences } = useEmailPreferences();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent className="space-y-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-lg" />
                <div>
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48 mt-1" />
                </div>
              </div>
              <Skeleton className="h-6 w-12 rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  const categories = [
    {
      key: 'security_enabled' as const,
      icon: Shield,
      title: 'Segurança',
      description: 'Alertas de login, alteração de senha e atividades suspeitas',
      color: 'text-red-500 bg-red-50',
      locked: true,
    },
    {
      key: 'financial_enabled' as const,
      icon: DollarSign,
      title: 'Financeiro',
      description: 'Alertas de orçamento, mudanças relevantes de gastos e avisos de inatividade',
      color: 'text-emerald-500 bg-emerald-50',
      locked: false,
    },
    {
      key: 'goals_enabled' as const,
      icon: Target,
      title: 'Metas & Progresso',
      description: 'Progresso de metas, conclusões e alertas de risco',
      color: 'text-blue-500 bg-blue-50',
      locked: false,
    },
    {
      key: 'education_enabled' as const,
      icon: BookOpen,
      title: 'Educação & Conteúdo',
      description: 'Conteúdos recomendados e materiais educativos do seu momento financeiro',
      color: 'text-purple-500 bg-purple-50',
      locked: false,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>Notificações por E-mail</span>
        </CardTitle>
        <CardDescription>
          Escolha quais tipos de e-mail você deseja receber. Enviamos no máximo 3 e-mails por semana (exceto segurança).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {categories.map((category) => {
          const Icon = category.icon;
          const isEnabled = preferences[category.key];
          
          return (
            <div 
              key={category.key}
              className="flex items-center justify-between py-2"
            >
              <div className="flex items-center gap-4">
                <div className={`p-2.5 rounded-lg ${category.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-foreground">{category.title}</p>
                    {category.locked && (
                      <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                        Sempre ativo
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {category.description}
                  </p>
                </div>
              </div>
              <Switch
                checked={isEnabled}
                onCheckedChange={(checked) => updatePreferences({ [category.key]: checked })}
                disabled={category.locked || isSaving}
                aria-label={`${isEnabled ? 'Desativar' : 'Ativar'} notificações de ${category.title}`}
              />
            </div>
          );
        })}

        <Alert className="mt-4">
          <Info className="h-4 w-4" />
          <AlertDescription>
            Mesmo com notificações por e-mail desligadas, você continuará vendo alertas importantes dentro do aplicativo.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
