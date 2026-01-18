import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImportUploadStep } from "./ImportUploadStep";
import { ImportPasswordStep } from "./ImportPasswordStep";
import { ImportReviewStep } from "./ImportReviewStep";
import { ImportResultStep } from "./ImportResultStep";

type ImportStep = 'upload' | 'password' | 'review' | 'result';

interface ImportFlowPageProps {
  onBack: () => void;
  onComplete: () => void;
}

export function ImportFlowPage({ onBack, onComplete }: ImportFlowPageProps) {
  const [step, setStep] = useState<ImportStep>('upload');
  const [importId, setImportId] = useState<string | null>(null);
  const [passwordRequired, setPasswordRequired] = useState(false);
  const [pendingFile, setPendingFile] = useState<{
    file: File;
    importType: 'bank_statement' | 'credit_card';
    sourceId: string;
    invoiceMonth?: string;
  } | null>(null);
  const [resultData, setResultData] = useState<{
    importedCount: number;
    skippedCount: number;
  } | null>(null);

  const handleUploadComplete = (data: {
    importId: string;
    needsPassword: boolean;
    file?: File;
    importType?: 'bank_statement' | 'credit_card';
    sourceId?: string;
    invoiceMonth?: string;
  }) => {
    setImportId(data.importId);
    
    if (data.needsPassword && data.file) {
      setPendingFile({
        file: data.file,
        importType: data.importType!,
        sourceId: data.sourceId!,
        invoiceMonth: data.invoiceMonth,
      });
      setPasswordRequired(true);
      setStep('password');
    } else {
      setStep('review');
    }
  };

  const handlePasswordSuccess = (newImportId: string) => {
    setImportId(newImportId);
    setPasswordRequired(false);
    setPendingFile(null);
    setStep('review');
  };

  const handlePasswordCancel = () => {
    // Delete the failed import if exists
    setImportId(null);
    setPendingFile(null);
    setPasswordRequired(false);
    setStep('upload');
  };

  const handleReviewComplete = (data: { importedCount: number; skippedCount: number }) => {
    setResultData(data);
    setStep('result');
  };

  const handleReviewCancel = () => {
    setImportId(null);
    setStep('upload');
  };

  const handleResultContinue = () => {
    onComplete();
  };

  const handleResultNewImport = () => {
    setImportId(null);
    setResultData(null);
    setStep('upload');
  };

  const getTitle = () => {
    switch (step) {
      case 'upload': return 'Importar Arquivo';
      case 'password': return 'Arquivo Protegido';
      case 'review': return 'Revisar Importação';
      case 'result': return 'Importação Concluída';
    }
  };

  const canGoBack = step === 'upload';

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="container px-4 py-4">
          <div className="flex items-center gap-4">
            {canGoBack && (
              <Button variant="ghost" size="icon" onClick={onBack}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
            )}
            <div>
              <h1 className="text-lg font-semibold">{getTitle()}</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="container px-4 py-6">
        {step === 'upload' && (
          <ImportUploadStep onComplete={handleUploadComplete} />
        )}
        
        {step === 'password' && pendingFile && (
          <ImportPasswordStep
            file={pendingFile.file}
            importType={pendingFile.importType}
            sourceId={pendingFile.sourceId}
            invoiceMonth={pendingFile.invoiceMonth}
            onSuccess={handlePasswordSuccess}
            onCancel={handlePasswordCancel}
          />
        )}
        
        {step === 'review' && importId && (
          <ImportReviewStep
            importId={importId}
            onComplete={handleReviewComplete}
            onCancel={handleReviewCancel}
          />
        )}
        
        {step === 'result' && resultData && (
          <ImportResultStep
            importedCount={resultData.importedCount}
            skippedCount={resultData.skippedCount}
            onContinue={handleResultContinue}
            onNewImport={handleResultNewImport}
          />
        )}
      </main>
    </div>
  );
}
