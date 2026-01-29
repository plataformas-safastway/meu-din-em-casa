import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { SpreadsheetUploadStep } from "./SpreadsheetUploadStep";
import { SpreadsheetMappingStep } from "./SpreadsheetMappingStep";
import { SpreadsheetReviewStep } from "./SpreadsheetReviewStep";
import { useSpreadsheetImport, ColumnMapping, ParsedTransaction } from "@/hooks/useSpreadsheetImport";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { 
  CategoryDecisionModal, 
  CategoryMergeSheet, 
  CategoryReclassificationSheet 
} from "@/components/import";
import { CategoryHistoryDecisionModal } from "@/components/categories";
import type { CategoryDecision } from "@/components/import/CategoryDecisionModal";
import { 
  useCreateImportSession, 
  useSaveImportedCategories,
  useUpdateSessionDecision,
  useDeactivateImportedCategories,
} from "@/hooks/useImportedCategories";
import { useAuth } from "@/contexts/AuthContext";

type Step = "upload" | "mapping" | "category_decision" | "history_decision" | "review";

const STEPS: { key: Step; label: string }[] = [
  { key: "upload", label: "Arquivo" },
  { key: "mapping", label: "Colunas" },
  { key: "category_decision", label: "Categorias" },
  { key: "review", label: "Revisar" },
];

export function SpreadsheetImportPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { family } = useAuth();
  const [step, setStep] = useState<Step>("upload");
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  // Category decision state
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [showMergeSheet, setShowMergeSheet] = useState(false);
  const [showReclassificationSheet, setShowReclassificationSheet] = useState(false);
  const [categoryDecision, setCategoryDecision] = useState<CategoryDecision | null>(null);
  
  // History decision state (reclassify vs forward-only)
  const [showHistoryDecisionModal, setShowHistoryDecisionModal] = useState(false);
  const [historyMode, setHistoryMode] = useState<"reclassify" | "forward_only" | null>(null);
  const [hasExistingTransactions, setHasExistingTransactions] = useState(false);
  
  // Check if family has existing transactions
  useEffect(() => {
    const checkExistingTransactions = async () => {
      if (!family) return;
      
      const { count, error } = await supabase
        .from("transactions")
        .select("id", { count: "exact", head: true })
        .eq("family_id", family.id);
      
      if (!error && count && count > 0) {
        setHasExistingTransactions(true);
      }
    };
    
    checkExistingTransactions();
  }, [family]);

  const {
    state,
    parseFile,
    applyMapping,
    updateTransaction,
    removeTransaction,
    getSummary,
    reset,
  } = useSpreadsheetImport();

  const createSession = useCreateImportSession();
  const saveCategories = useSaveImportedCategories();
  const updateSessionDecision = useUpdateSessionDecision();
  const deactivateCategories = useDeactivateImportedCategories();

  const handleFileSelected = useCallback(async (file: File) => {
    await parseFile(file);
  }, [parseFile]);

  const handleMappingConfirmed = useCallback(async (confirmedMapping: ColumnMapping, selectedAccountId: string | null) => {
    setMapping(confirmedMapping);
    setAccountId(selectedAccountId);
    
    // Apply mapping with imported categories preserved
    applyMapping(confirmedMapping, selectedAccountId, true);
    
    // If there are categories in the spreadsheet, show decision modal
    if (confirmedMapping.category) {
      // Create import session
      try {
        const session = await createSession.mutateAsync({
          import_type: "spreadsheet",
          categories_count: state.extractedCategories.length,
          subcategories_count: state.extractedCategories.reduce((acc, cat) => acc + cat.subcategories.length, 0),
          transactions_count: state.transactions.length,
        });
        setSessionId(session.id);
      } catch (error) {
        console.error("Error creating session:", error);
      }
      
      setShowDecisionModal(true);
    } else {
      // No categories in spreadsheet, go directly to review
      setStep("review");
    }
  }, [applyMapping, createSession, state.extractedCategories, state.transactions.length]);

  const handleCategoryDecision = useCallback(async (decision: CategoryDecision) => {
    setCategoryDecision(decision);
    setShowDecisionModal(false);

    if (sessionId) {
      await updateSessionDecision.mutateAsync({ sessionId, decision });
    }

    if (decision === "keep_imported") {
      // User's categories REPLACE OIK defaults - this is the key principle
      // If family has existing transactions, we need to decide what to do with them
      if (hasExistingTransactions) {
        // Show history decision modal
        setShowHistoryDecisionModal(true);
      } else {
        // No existing transactions, just save categories and proceed
        await saveCategories.mutateAsync({
          categories: state.extractedCategories.map((cat) => ({
            name: cat.name,
            type: cat.type,
            subcategories: cat.subcategories,
          })),
          sessionId: sessionId || "",
        });
        setStep("review");
      }
    } else if (decision === "merge_with_oik") {
      // Show merge sheet
      setShowMergeSheet(true);
    } else if (decision === "replace_with_oik") {
      // Deactivate imported categories and show reclassification
      await deactivateCategories.mutateAsync();
      // Re-apply mapping using OIK categories
      applyMapping(mapping!, accountId, false);
      setShowReclassificationSheet(true);
    }
  }, [
    sessionId, 
    updateSessionDecision, 
    saveCategories, 
    state.extractedCategories, 
    deactivateCategories, 
    applyMapping, 
    mapping, 
    accountId,
    hasExistingTransactions,
  ]);

  // Handle history decision (reclassify vs forward-only)
  const handleHistoryDecision = useCallback(async (decision: 'reclassify' | 'forward_only') => {
    setHistoryMode(decision);
    setShowHistoryDecisionModal(false);
    
    // Save imported categories - they REPLACE OIK defaults
    await saveCategories.mutateAsync({
      categories: state.extractedCategories.map((cat) => ({
        name: cat.name,
        type: cat.type,
        subcategories: cat.subcategories,
      })),
      sessionId: sessionId || "",
    });

    if (decision === 'reclassify') {
      // Show reclassification mapping for existing transactions
      setShowReclassificationSheet(true);
    } else {
      // Forward only - existing transactions keep old categories
      // New transactions will use the imported categories
      setStep("review");
    }
  }, [saveCategories, state.extractedCategories, sessionId]);

  const handleMergeConfirm = useCallback(async (selections: Array<{ oikCategoryId: string; action: string; targetImportedCategoryName?: string }>) => {
    // Save imported categories first
    await saveCategories.mutateAsync({
      categories: state.extractedCategories.map((cat) => ({
        name: cat.name,
        type: cat.type,
        subcategories: cat.subcategories,
      })),
      sessionId: sessionId || "",
    });
    
    // TODO: Handle merge logic - add selected OIK categories
    toast.success(`${selections.length} categorias do OIK adicionadas`);
    setShowMergeSheet(false);
    setStep("review");
  }, [saveCategories, state.extractedCategories, sessionId]);

  const handleReclassificationConfirm = useCallback(async (results: Array<{ transactionId: string; newCategoryId: string; newSubcategoryId?: string }>) => {
    // Update transactions with new categories
    results.forEach((result) => {
      updateTransaction(result.transactionId, {
        category_id: result.newCategoryId,
        subcategory_id: result.newSubcategoryId || null,
      });
    });
    
    toast.success("Transações reclassificadas");
    setShowReclassificationSheet(false);
    setStep("review");
  }, [updateTransaction]);

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
            category_id: tx.category_id.startsWith("imported:") ? "desconhecidas" : tx.category_id,
            subcategory_id: tx.subcategory_id?.startsWith("imported:") ? null : tx.subcategory_id,
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

      {/* Category Decision Modal */}
      <CategoryDecisionModal
        open={showDecisionModal}
        onOpenChange={setShowDecisionModal}
        importedCategoriesCount={state.extractedCategories.length}
        importedSubcategoriesCount={state.extractedCategories.reduce((acc, cat) => acc + cat.subcategories.length, 0)}
        onDecision={handleCategoryDecision}
      />

      {/* Category Merge Sheet */}
      <CategoryMergeSheet
        open={showMergeSheet}
        onOpenChange={setShowMergeSheet}
        importedCategories={state.extractedCategories}
        onConfirm={handleMergeConfirm}
        loading={saveCategories.isPending}
      />

      {/* Category Reclassification Sheet */}
      <CategoryReclassificationSheet
        open={showReclassificationSheet}
        onOpenChange={setShowReclassificationSheet}
        transactions={state.transactions.slice(0, 50).map((tx) => ({
          id: tx.id,
          description: tx.description,
          amount: tx.amount,
          type: tx.type,
          originalCategory: tx.original_category || "Sem categoria",
          suggestedCategoryId: tx.category_id,
          suggestedSubcategoryId: tx.subcategory_id || undefined,
          confidence: tx.original_category ? 0.7 : 0.3,
        }))}
        onConfirm={handleReclassificationConfirm}
      />

      {/* History Decision Modal - Reclassify vs Forward Only */}
      <CategoryHistoryDecisionModal
        open={showHistoryDecisionModal}
        onClose={() => setShowHistoryDecisionModal(false)}
        onDecision={handleHistoryDecision}
        isImport={true}
      />
    </div>
  );
}

