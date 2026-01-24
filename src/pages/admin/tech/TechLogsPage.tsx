import { useState } from "react";
import { Search, Filter, ChevronLeft, ChevronRight, FileText, AlertTriangle, AlertCircle, Info, Bug } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useTechLogs, TechLog, LogLevel, LogOrigin, getLevelColor } from "@/hooks/useTechModule";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const LEVEL_ICONS = {
  error: AlertTriangle,
  warning: AlertCircle,
  info: Info,
  debug: Bug,
};

export function TechLogsPage() {
  const [filters, setFilters] = useState<{
    level?: LogLevel;
    origin?: LogOrigin;
    service?: string;
  }>({});
  const [page, setPage] = useState(0);
  const [selectedLog, setSelectedLog] = useState<TechLog | null>(null);
  const pageSize = 50;

  const { data, isLoading } = useTechLogs(filters, page, pageSize);
  const totalPages = Math.ceil((data?.total || 0) / pageSize);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Logs do Sistema</h2>
        <p className="text-muted-foreground">Visualização unificada de logs (backend + frontend)</p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <Select 
              value={filters.level || 'all'} 
              onValueChange={(v) => {
                setFilters({ ...filters, level: v === 'all' ? undefined : v as LogLevel });
                setPage(0);
              }}
            >
              <SelectTrigger className="w-[150px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Nível" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="debug">Debug</SelectItem>
              </SelectContent>
            </Select>

            <Select 
              value={filters.origin || 'all'} 
              onValueChange={(v) => {
                setFilters({ ...filters, origin: v === 'all' ? undefined : v as LogOrigin });
                setPage(0);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Origem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="frontend">Frontend</SelectItem>
                <SelectItem value="backend">Backend</SelectItem>
                <SelectItem value="edge_function">Edge Function</SelectItem>
                <SelectItem value="database">Database</SelectItem>
              </SelectContent>
            </Select>

            <Input
              placeholder="Filtrar por serviço..."
              value={filters.service || ''}
              onChange={(e) => {
                setFilters({ ...filters, service: e.target.value || undefined });
                setPage(0);
              }}
              className="max-w-xs"
            />

            <Button
              variant="outline"
              onClick={() => {
                setFilters({});
                setPage(0);
              }}
            >
              Limpar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Logs ({data?.total || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(10)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : data?.logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum log encontrado</p>
            </div>
          ) : (
            <div className="space-y-2">
              {data?.logs.map((log) => {
                const Icon = LEVEL_ICONS[log.level];
                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => setSelectedLog(log)}
                  >
                    <div className={`p-2 rounded ${getLevelColor(log.level)}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {log.origin}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {log.service}
                        </Badge>
                        {log.module && (
                          <Badge variant="outline" className="text-xs">
                            {log.module}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium truncate">{log.message}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                        {log.correlation_id && ` • ${log.correlation_id.substring(0, 8)}...`}
                      </p>
                    </div>
                    <Badge className={getLevelColor(log.level)}>
                      {log.level.toUpperCase()}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                Página {page + 1} de {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log Detail Sheet */}
      <Sheet open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Detalhes do Log</SheetTitle>
          </SheetHeader>

          {selectedLog && (
            <div className="space-y-4 mt-6">
              <div className="flex items-center gap-2">
                <Badge className={getLevelColor(selectedLog.level)}>
                  {selectedLog.level.toUpperCase()}
                </Badge>
                <Badge variant="outline">{selectedLog.origin}</Badge>
                <Badge variant="outline">{selectedLog.service}</Badge>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Mensagem</p>
                  <p className="text-sm">{selectedLog.message}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground">Data/Hora</p>
                  <p className="text-sm">
                    {format(new Date(selectedLog.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ptBR })}
                  </p>
                </div>

                {selectedLog.route && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Rota</p>
                    <p className="text-sm font-mono">{selectedLog.route}</p>
                  </div>
                )}

                {selectedLog.correlation_id && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Correlation ID</p>
                    <p className="text-sm font-mono">{selectedLog.correlation_id}</p>
                  </div>
                )}

                {selectedLog.request_id && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Request ID</p>
                    <p className="text-sm font-mono">{selectedLog.request_id}</p>
                  </div>
                )}

                {selectedLog.stack_trace && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Stack Trace</p>
                    <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto max-h-48">
                      {selectedLog.stack_trace}
                    </pre>
                  </div>
                )}

                {selectedLog.context && Object.keys(selectedLog.context).length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Contexto</p>
                    <pre className="text-xs bg-muted p-3 rounded-lg overflow-x-auto">
                      {JSON.stringify(selectedLog.context, null, 2)}
                    </pre>
                  </div>
                )}

                {/* Security note */}
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <p className="text-xs text-amber-800">
                    ⚠️ Dados sensíveis (CPF, tokens, senhas) são automaticamente mascarados ou omitidos.
                  </p>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
