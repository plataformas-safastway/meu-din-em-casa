import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle, Bug, Clock, User } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SupportError {
  id: string;
  error_type: string;
  error_message: string;
  error_stack: string | null;
  screen: string | null;
  user_action: string | null;
  status: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
  user_id: string | null;
}

export function ErrorDashboard() {
  const { data: errors, isLoading, refetch, isFetching } = useQuery({
    queryKey: ['admin', 'support-errors'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('support_errors')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data as SupportError[];
    },
    refetchInterval: 30000, // Auto-refresh every 30s
  });

  const getSeverityColor = (errorType: string) => {
    switch (errorType) {
      case 'auth':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'chunk':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'network':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'render':
        return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const errorCounts = {
    total: errors?.length ?? 0,
    auth: errors?.filter(e => e.error_type === 'auth').length ?? 0,
    chunk: errors?.filter(e => e.error_type === 'chunk').length ?? 0,
    render: errors?.filter(e => e.error_type === 'render').length ?? 0,
    last24h: errors?.filter(e => {
      const date = new Date(e.created_at);
      const now = new Date();
      return now.getTime() - date.getTime() < 24 * 60 * 60 * 1000;
    }).length ?? 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Observabilidade</h2>
          <p className="text-muted-foreground">
            Erros e eventos capturados em produção
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isFetching ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{errorCounts.total}</div>
            <p className="text-xs text-muted-foreground">Total de erros</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-500">{errorCounts.auth}</div>
            <p className="text-xs text-muted-foreground">Auth</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-500">{errorCounts.chunk}</div>
            <p className="text-xs text-muted-foreground">Chunk</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-purple-500">{errorCounts.render}</div>
            <p className="text-xs text-muted-foreground">Render</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{errorCounts.last24h}</div>
            <p className="text-xs text-muted-foreground">Últimas 24h</p>
          </CardContent>
        </Card>
      </div>

      {/* Error List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bug className="w-5 h-5" />
            Erros Recentes
          </CardTitle>
          <CardDescription>
            Últimos 100 erros capturados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : errors?.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertTriangle className="w-12 h-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">Nenhum erro capturado</p>
              <p className="text-sm text-muted-foreground/70">
                Os erros aparecerão aqui quando ocorrerem
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-3">
                {errors?.map((error) => (
                  <div
                    key={error.id}
                    className="border rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge 
                            variant="outline" 
                            className={getSeverityColor(error.error_type)}
                          >
                            {error.error_type}
                          </Badge>
                          {error.user_action && (
                            <Badge variant="secondary" className="text-xs">
                              {error.user_action}
                            </Badge>
                          )}
                        </div>
                        <p className="font-medium text-sm break-words">
                          {error.error_message}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {formatDistanceToNow(new Date(error.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(error.created_at), 'HH:mm:ss')}
                        </p>
                      </div>
                    </div>

                    {/* Meta info */}
                    <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                      {error.screen && (
                        <span className="bg-muted px-2 py-0.5 rounded">
                          📍 {error.screen}
                        </span>
                      )}
                      {error.user_id && (
                        <span className="bg-muted px-2 py-0.5 rounded flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {error.user_id.substring(0, 8)}...
                        </span>
                      )}
                    </div>

                    {/* Stack trace (collapsible) */}
                    {error.error_stack && (
                      <details className="text-xs">
                        <summary className="text-muted-foreground cursor-pointer hover:text-foreground">
                          Ver stack trace
                        </summary>
                        <pre className="mt-2 p-2 bg-muted rounded overflow-auto max-h-40 text-[10px]">
                          {error.error_stack}
                        </pre>
                      </details>
                    )}

                    {/* Metadata (collapsible) */}
                    {error.metadata && Object.keys(error.metadata).length > 0 && (
                      <details className="text-xs">
                        <summary className="text-muted-foreground cursor-pointer hover:text-foreground">
                          Ver metadata
                        </summary>
                        <pre className="mt-2 p-2 bg-muted rounded overflow-auto max-h-40 text-[10px]">
                          {JSON.stringify(error.metadata, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
