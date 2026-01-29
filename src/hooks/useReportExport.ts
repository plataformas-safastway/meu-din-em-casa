import { useCallback } from 'react';
import { exportToExcel } from '@/lib/excelParser';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useLogReportAccess } from './useExecutiveReports';
import { toast } from 'sonner';

interface ExportOptions {
  reportType: string;
  title: string;
  data: Record<string, unknown>[] | Record<string, unknown>;
  periodStart?: Date;
  periodEnd?: Date;
}

export function useReportExport() {
  const logAccess = useLogReportAccess();

  const formatPeriod = (start?: Date, end?: Date) => {
    if (!start || !end) return '';
    return `${format(start, 'dd/MM/yyyy')} a ${format(end, 'dd/MM/yyyy')}`;
  };

  const exportToCSV = useCallback(async (options: ExportOptions) => {
    try {
      const { reportType, title, data, periodStart, periodEnd } = options;

      // Flatten data if it's an object
      const rows = Array.isArray(data) ? data : [data];
      
      // Create CSV content
      if (rows.length === 0) {
        toast.error('Não há dados para exportar');
        return;
      }

      const headers = Object.keys(rows[0]);
      const csvContent = [
        headers.join(','),
        ...rows.map(row => 
          headers.map(h => {
            const value = row[h];
            if (typeof value === 'object') return JSON.stringify(value);
            return String(value ?? '');
          }).join(',')
        )
      ].join('\n');

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const fileName = `${title.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd_HHmm')}.csv`;
      
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(link.href);

      // Log access
      await logAccess.mutateAsync({
        reportType,
        action: 'export_csv',
        periodStart,
        periodEnd,
        exportFormat: 'csv',
      });

      toast.success('Relatório exportado com sucesso');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      toast.error('Erro ao exportar relatório');
    }
  }, [logAccess]);

  const exportToXLSX = useCallback(async (options: ExportOptions) => {
    try {
      const { reportType, title, data, periodStart, periodEnd } = options;

      const rows = Array.isArray(data) ? data : [data];
      
      if (rows.length === 0) {
        toast.error('Não há dados para exportar');
        return;
      }

      // Create sheet data with metadata header
      const metaRows = [
        { Informação: 'Relatório', Valor: title },
        { Informação: 'Período', Valor: formatPeriod(periodStart, periodEnd) },
        { Informação: 'Gerado em', Valor: format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR }) },
        { Informação: '', Valor: '' },
        { Informação: '⚠️ LGPD', Valor: 'Este relatório contém dados agregados. Dados pessoais foram omitidos.' },
      ];

      const fileName = `${title.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`;
      
      // Use secure excelParser to export
      await exportToExcel(
        [
          { sheetName: 'Info', data: metaRows },
          { sheetName: 'Dados', data: rows as Record<string, unknown>[] },
        ],
        fileName
      );

      // Log access
      await logAccess.mutateAsync({
        reportType,
        action: 'export_xls',
        periodStart,
        periodEnd,
        exportFormat: 'xlsx',
      });

      toast.success('Relatório exportado com sucesso');
    } catch (error) {
      console.error('Error exporting XLSX:', error);
      toast.error('Erro ao exportar relatório');
    }
  }, [logAccess]);

  const exportToPDF = useCallback(async (options: ExportOptions) => {
    try {
      const { reportType, title, periodStart, periodEnd } = options;
      
      // For PDF, we'll generate a printable HTML and trigger print
      toast.info('Abrindo janela de impressão...', {
        description: 'Selecione "Salvar como PDF" na impressora',
      });
      
      window.print();

      // Log access
      await logAccess.mutateAsync({
        reportType,
        action: 'export_pdf',
        periodStart,
        periodEnd,
        exportFormat: 'pdf',
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Erro ao exportar relatório');
    }
  }, [logAccess]);

  return {
    exportToCSV,
    exportToXLSX,
    exportToPDF,
  };
}
