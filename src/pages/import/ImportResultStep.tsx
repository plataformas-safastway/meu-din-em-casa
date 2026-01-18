import { CheckCircle2, Upload, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImportResultStepProps {
  importedCount: number;
  skippedCount: number;
  onContinue: () => void;
  onNewImport: () => void;
}

export function ImportResultStep({
  importedCount,
  skippedCount,
  onContinue,
  onNewImport,
}: ImportResultStepProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      {/* Success Icon */}
      <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center mb-6">
        <CheckCircle2 className="w-10 h-10 text-success" />
      </div>

      {/* Title */}
      <h2 className="text-2xl font-bold text-foreground mb-2">
        Importação concluída!
      </h2>

      {/* Summary */}
      <p className="text-muted-foreground mb-8">
        {importedCount} {importedCount === 1 ? 'transação foi adicionada' : 'transações foram adicionadas'}
        {skippedCount > 0 && (
          <span className="block text-sm mt-1 opacity-80">
            {skippedCount} {skippedCount === 1 ? 'foi ignorada' : 'foram ignoradas'}
          </span>
        )}
      </p>

      {/* Stats Cards */}
      <div className="flex gap-4 mb-8">
        <div className="px-6 py-4 rounded-2xl bg-success/10 border border-success/20">
          <p className="text-3xl font-bold text-success">{importedCount}</p>
          <p className="text-xs text-muted-foreground">Importadas</p>
        </div>
        {skippedCount > 0 && (
          <div className="px-6 py-4 rounded-2xl bg-muted border border-border">
            <p className="text-3xl font-bold text-muted-foreground">{skippedCount}</p>
            <p className="text-xs text-muted-foreground">Ignoradas</p>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-3 w-full max-w-sm">
        <Button onClick={onContinue} className="w-full h-12">
          Ver transações
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>

        <Button variant="outline" onClick={onNewImport} className="w-full h-12">
          <Upload className="w-4 h-4 mr-2" />
          Importar outro arquivo
        </Button>
      </div>
    </div>
  );
}
