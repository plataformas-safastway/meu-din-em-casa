import { Download, FileJson, Loader2, Shield } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useExportData } from "@/hooks/useProfile";

interface ExportDataSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportDataSheet({ open, onOpenChange }: ExportDataSheetProps) {
  const exportData = useExportData();

  const handleExport = async () => {
    await exportData.mutateAsync();
    if (!exportData.isError) {
      onOpenChange(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[90vh] rounded-t-3xl">
        <SheetHeader className="text-left pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" />
            Exportar Meus Dados
          </SheetTitle>
          <SheetDescription>
            Conforme a LGPD, você pode solicitar uma cópia de todos os seus dados.
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4">
          <div className="bg-muted/50 rounded-xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-primary mt-0.5" />
              <div>
                <p className="font-medium text-sm">Seus dados estão protegidos</p>
                <p className="text-xs text-muted-foreground">
                  Exportaremos todos os dados associados à sua conta em um arquivo JSON seguro.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">O que será exportado:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li className="flex items-center gap-2">
                <FileJson className="w-4 h-4" />
                Dados do perfil e família
              </li>
              <li className="flex items-center gap-2">
                <FileJson className="w-4 h-4" />
                Transações financeiras
              </li>
              <li className="flex items-center gap-2">
                <FileJson className="w-4 h-4" />
                Metas e orçamentos
              </li>
              <li className="flex items-center gap-2">
                <FileJson className="w-4 h-4" />
                Contas bancárias e cartões
              </li>
            </ul>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1"
              onClick={handleExport}
              disabled={exportData.isPending}
            >
              {exportData.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Exportando...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Exportar Dados
                </>
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
