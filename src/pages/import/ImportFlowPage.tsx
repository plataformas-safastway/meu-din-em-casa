import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImportUploadStep } from "./ImportUploadStep";
import { ImportPasswordStep } from "./ImportPasswordStep";
import { toast } from "sonner";

type ImportStep = 'upload' | 'password';

interface ImportFlowPageProps {
  onBack: () => void;
  onComplete: () => void;
}

export function ImportFlowPage({ onBack, onComplete }: ImportFlowPageProps) {
  const navigate = useNavigate();
  const [step, setStep] = useState<ImportStep>('upload');
  const [pendingFile, setPendingFile] = useState<{
    file: File;
    importType: 'bank_statement' | 'credit_card';
    invoiceMonth?: string;
  } | null>(null);

  const handleUploadComplete = (data: {
    importId: string;
    needsPassword: boolean;
    file?: File;
    importType?: 'bank_statement' | 'credit_card';
    sourceId?: string;
    invoiceMonth?: string;
  }) => {
    if (!data.importId) {
      toast.error("Não foi possível iniciar a revisão", {
        description: "Importação sem ID. Tente reenviar o arquivo.",
      });
      setStep('upload');
      return;
    }
    
    if (data.needsPassword && data.file) {
      setPendingFile({
        file: data.file,
        importType: data.importType!,
        invoiceMonth: data.invoiceMonth,
      });
      setStep('password');
    } else {
      // ✅ Navigate to review page with ID (rehydratable)
      navigate(`/app/import/${data.importId}/review`, { replace: true });
    }
  };

  const handlePasswordSuccess = (newImportId: string) => {
    if (!newImportId) {
      toast.error("Não foi possível abrir a revisão", {
        description: "Importação sem ID após desbloqueio.",
      });
      setStep('upload');
      return;
    }
    setPendingFile(null);
    navigate(`/app/import/${newImportId}/review`, { replace: true });
  };

  const handlePasswordCancel = () => {
    setPendingFile(null);
    setStep('upload');
  };

  const getTitle = () => {
    switch (step) {
      case 'upload': return 'Importar Arquivo';
      case 'password': return 'Arquivo Protegido';
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
              <p className="text-sm text-muted-foreground">
                Detecção automática de banco
              </p>
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
            sourceId="" // No longer required - auto-detected
            invoiceMonth={pendingFile.invoiceMonth}
            onSuccess={handlePasswordSuccess}
            onCancel={handlePasswordCancel}
          />
        )}
      </main>
    </div>
  );
}
