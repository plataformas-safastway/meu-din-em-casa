import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, FileSpreadsheet, Loader2, ChevronRight, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { SpreadsheetUploadStep } from "./SpreadsheetUploadStep";
import { SpreadsheetMappingStep } from "./SpreadsheetMappingStep";
import { SpreadsheetReviewStep } from "./SpreadsheetReviewStep";
import { useSpreadsheetImport, ColumnMapping, ParsedTransaction } from "@/hooks/useSpreadsheetImport";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

type Step = "upload" | "mapping" | "review";

const STEPS: { key: Step; label: string }[] = [
  { key: "upload", label: "Arquivo" },
  { key: "mapping", label: "Colunas" },
  { key: "review", label: "Revisar" },
];

export function SpreadsheetImportPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>("upload");
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const {
    state,
    parseFile,
    applyMapping,
    updateTransaction,
    removeTransaction,
    getSummary,
    reset,
  } = useSpreadsheetImport();

  const handleFileSelected = useCallback(async (file: File) => {
    await parseFile(file);
  }, [parseFile]);

  const handleMappingConfirmed = useCallback((confirmedMapping: ColumnMapping, selectedAccountId: string | null) => {
    setMapping(confirmedMapping);
    setAccountId(selectedAccountId);
    applyMapping(confirmedMapping, selectedAccountId);
    setStep("review");
  }, [applyMapping]);

  const handleImport = useCallback(async () => {
    const summary = getSummary();
    if (summary.valid === 0) {
      toast.error("Nenhuma transação válida para importar");
      return;
    }

    setImporting(true);

    try {
      const validTransactions = state.transactions.filter(t => !t.has_error);
      
      const { data, error } = await supabase.functions.invoke("spreadsheet-import", {
        body: {
          transactions: validTransactions.map(tx => ({
            date: tx.date,
            description: tx.description,
            amount: tx.amount,
            type: tx.type,
            category_id: tx.category_id,
            subcategory_id: tx.subcategory_id,
            account_id: tx.account_id,
          })),
        },
      });

      if (error) throw error;

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["home-summary"] });
      queryClient.invalidateQueries({ queryKey: ["budgets"] });

      toast.success(`${data?.imported_count || summary.valid} lançamentos importados!`);
      navigate("/app");
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Erro ao importar", {
        description: error instanceof Error ? error.message : "Tente novamente",
      });
    } finally {
      setImporting(false);
    }
  }, [state.transactions, getSummary, queryClient, navigate]);

  const handleBack = useCallback(() => {
    if (step === "mapping") {
      setStep("upload");
    } else if (step === "review") {
      setStep("mapping");
    } else {
      navigate("/app/import");
    }
  }, [step, navigate]);

  const handleContinue = useCallback(() => {
    if (step === "upload" && state.status === "ready") {
      setStep("mapping");
    }
  }, [step, state.status]);

  const currentStepIndex = STEPS.findIndex(s => s.key === step);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="container px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-lg font-semibold">Importar Planilha</h1>
              <p className="text-xs text-muted-foreground">
                Traga seus dados para o OIK
              </p>
            </div>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center justify-center gap-2 mt-4">
            {STEPS.map((s, index) => (
              <div key={s.key} className="flex items-center">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-colors",
                    index < currentStepIndex
                      ? "bg-success text-success-foreground"
                      : index === currentStepIndex
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {index < currentStepIndex ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                {index < STEPS.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-muted-foreground mx-1" />
                )}
              </div>
            ))}
          </div>
        </div>
      </header>

      <main className="container px-4 py-6">
        {/* Upload Step */}
        {step === "upload" && (
          <SpreadsheetUploadStep
            state={state}
            onFileSelected={handleFileSelected}
            onContinue={handleContinue}
          />
        )}

        {/* Mapping Step */}
        {step === "mapping" && (
          <SpreadsheetMappingStep
            headers={state.headers}
            previewRows={state.previewRows}
            suggestedMapping={state.suggestedMapping}
            onConfirm={handleMappingConfirmed}
          />
        )}

        {/* Review Step */}
        {step === "review" && (
          <SpreadsheetReviewStep
            transactions={state.transactions}
            summary={getSummary()}
            onUpdateTransaction={updateTransaction}
            onRemoveTransaction={removeTransaction}
            onImport={handleImport}
            importing={importing}
          />
        )}
      </main>
    </div>
  );
}
