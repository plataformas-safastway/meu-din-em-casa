import { useCallback } from "react";
import { Upload, FileSpreadsheet, Loader2, AlertCircle, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SpreadsheetImportState } from "@/hooks/useSpreadsheetImport";

interface SpreadsheetUploadStepProps {
  state: SpreadsheetImportState;
  onFileSelected: (file: File) => void;
  onContinue: () => void;
}

export function SpreadsheetUploadStep({
  state,
  onFileSelected,
  onContinue,
}: SpreadsheetUploadStepProps) {
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        onFileSelected(file);
      }
    },
    [onFileSelected]
  );

  const isLoading = state.status === "reading" || state.status === "analyzing";
  const isReady = state.status === "ready";
  const hasError = state.status === "error";

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Info Card */}
      <div className="p-4 rounded-xl bg-info/10 border border-info/20">
        <div className="flex gap-3">
          <FileSpreadsheet className="w-5 h-5 text-info shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-foreground">Já usa planilha?</p>
            <p className="text-sm text-muted-foreground mt-1">
              Traga seus dados para o OIK. Nós identificamos as colunas automaticamente e você só confirma.
            </p>
          </div>
        </div>
      </div>

      {/* Upload Area */}
      <label
        className={cn(
          "flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed cursor-pointer transition-all",
          isLoading && "pointer-events-none opacity-70",
          isReady
            ? "border-success bg-success/5"
            : hasError
            ? "border-destructive bg-destructive/5"
            : "border-border hover:border-primary/50"
        )}
      >
        <input
          type="file"
          accept=".xlsx,.xls,.csv"
          onChange={handleFileChange}
          className="hidden"
          disabled={isLoading}
        />

        {isLoading ? (
          <>
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-3" />
            <p className="font-medium text-foreground">
              {state.status === "reading" ? "Lendo arquivo..." : "Analisando colunas..."}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Isso pode levar alguns segundos</p>
          </>
        ) : isReady ? (
          <>
            <div className="w-12 h-12 rounded-lg bg-success/20 flex items-center justify-center mb-3">
              <Check className="w-6 h-6 text-success" />
            </div>
            <p className="font-medium text-foreground">{state.fileName}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {(state.fileSize! / 1024).toFixed(1)} KB • {state.allRows.length} linhas encontradas
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Clique para escolher outro arquivo
            </p>
          </>
        ) : hasError ? (
          <>
            <div className="w-12 h-12 rounded-lg bg-destructive/20 flex items-center justify-center mb-3">
              <AlertCircle className="w-6 h-6 text-destructive" />
            </div>
            <p className="font-medium text-destructive">{state.error}</p>
            <p className="text-xs text-muted-foreground mt-2">
              Clique para tentar outro arquivo
            </p>
          </>
        ) : (
          <>
            <Upload className="w-12 h-12 text-muted-foreground mb-3" />
            <p className="font-medium text-foreground">Clique para enviar</p>
            <p className="text-xs text-muted-foreground mt-1">XLSX, XLS ou CSV</p>
          </>
        )}
      </label>

      {/* Preview Table */}
      {isReady && state.previewRows.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Prévia das primeiras linhas:</p>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-xs">
              <thead className="bg-muted/50">
                <tr>
                  {state.headers.slice(0, 5).map((header, i) => (
                    <th
                      key={i}
                      className="px-3 py-2 text-left font-medium text-muted-foreground truncate max-w-[120px]"
                    >
                      {header}
                    </th>
                  ))}
                  {state.headers.length > 5 && (
                    <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                      +{state.headers.length - 5}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {state.previewRows.slice(0, 3).map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-t border-border">
                    {state.headers.slice(0, 5).map((header, colIndex) => (
                      <td
                        key={colIndex}
                        className="px-3 py-2 truncate max-w-[120px] text-foreground"
                      >
                        {row[header] !== null && row[header] !== undefined
                          ? String(row[header])
                          : "-"}
                      </td>
                    ))}
                    {state.headers.length > 5 && (
                      <td className="px-3 py-2 text-muted-foreground">...</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Continue Button */}
      <Button
        className="w-full h-12"
        disabled={!isReady}
        onClick={onContinue}
      >
        Continuar
      </Button>

      {/* Format Info */}
      <div className="text-center text-xs text-muted-foreground space-y-1">
        <p>📊 Formatos aceitos: XLSX, XLS, CSV</p>
        <p>🔒 Seus dados são processados de forma segura e privada</p>
      </div>
    </div>
  );
}
