import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Eye, Download, FileSpreadsheet, FileText, History } from 'lucide-react';
import { useReportAuditHistory } from '@/hooks/useExecutiveReports';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const ACTION_ICONS: Record<string, React.ReactNode> = {
  view: <Eye className="h-4 w-4" />,
  export_csv: <Download className="h-4 w-4" />,
  export_xls: <FileSpreadsheet className="h-4 w-4" />,
  export_pdf: <FileText className="h-4 w-4" />,
};

const ACTION_LABELS: Record<string, string> = {
  view: 'Visualização',
  export_csv: 'Exportação CSV',
  export_xls: 'Exportação Excel',
  export_pdf: 'Exportação PDF',
};

const REPORT_LABELS: Record<string, string> = {
  overview: 'Visão Geral',
  growth: 'Crescimento',
  revenue: 'Receita',
  engagement: 'Engajamento',
  product: 'Produto',
  investor: 'Investidor',
  audit: 'Auditoria',
};

export function ReportAuditLog() {
  const { data: auditLogs, isLoading } = useReportAuditHistory(100);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <History className="h-5 w-5 text-primary" />
          Log de Auditoria de Relatórios
        </h2>
        <p className="text-sm text-muted-foreground">
          Registro de todos os acessos e exportações de relatórios executivos
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Acessos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{auditLogs?.length ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Visualizações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {auditLogs?.filter(l => l.action === 'view').length ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Exportações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {auditLogs?.filter(l => l.action.startsWith('export')).length ?? 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Relatório Mais Acessado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {(() => {
                if (!auditLogs?.length) return '-';
                const counts = auditLogs.reduce((acc, l) => {
                  acc[l.report_type] = (acc[l.report_type] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>);
                const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
                return REPORT_LABELS[top?.[0]] ?? top?.[0] ?? '-';
              })()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Audit Table */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Acessos</CardTitle>
          <CardDescription>Últimos 100 registros</CardDescription>
        </CardHeader>
        <CardContent>
          {auditLogs && auditLogs.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Relatório</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Período Consultado</TableHead>
                    <TableHead>Formato</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(log.accessed_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {REPORT_LABELS[log.report_type] ?? log.report_type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {ACTION_ICONS[log.action]}
                          <span>{ACTION_LABELS[log.action] ?? log.action}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {log.period_start && log.period_end
                          ? `${format(new Date(log.period_start), 'dd/MM/yy')} - ${format(new Date(log.period_end), 'dd/MM/yy')}`
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        {log.export_format ? (
                          <Badge variant="secondary" className="uppercase">
                            {log.export_format}
                          </Badge>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum registro de auditoria encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
