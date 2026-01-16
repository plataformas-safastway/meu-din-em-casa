import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Upload, ArrowRight } from "lucide-react";

interface OnboardingImportStepProps {
  onImport: () => void;
  onSkip: () => void;
}

export function OnboardingImportStep({ onImport, onSkip }: OnboardingImportStepProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Main Content - Centered */}
      <main className="flex-1 flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm space-y-10">
          {/* Title */}
          <div className="text-center space-y-3">
            <h1 className="text-2xl font-semibold text-foreground">
              Importar dados
            </h1>
            <p className="text-sm text-muted-foreground text-center opacity-60">
              (opcional)
            </p>
          </div>

          {/* Description */}
          <p className="text-center text-base text-muted-foreground leading-relaxed">
            Vocês podem importar extratos ou faturas agora para ganhar tempo.
            <br />
            <span className="text-sm opacity-80">
              Também dá para fazer isso depois.
            </span>
          </p>

          {/* Actions */}
          <div className="space-y-3">
            <Button 
              onClick={onImport}
              className="w-full h-12 font-medium rounded-xl"
            >
              <Upload className="w-4 h-4 mr-2" />
              Importar agora
            </Button>

            <Button 
              variant="ghost"
              onClick={onSkip}
              className="w-full h-12 font-medium rounded-xl text-muted-foreground hover:text-foreground"
            >
              Pular por enquanto
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
