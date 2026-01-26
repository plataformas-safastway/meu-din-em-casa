import { useState } from "react";
import { FileSpreadsheet, Layers, RefreshCw, Check, ChevronRight, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export type CategoryDecision = "keep_imported" | "merge_with_oik" | "replace_with_oik";

interface CategoryDecisionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  importedCategoriesCount: number;
  importedSubcategoriesCount: number;
  onDecision: (decision: CategoryDecision) => void;
}

interface DecisionOption {
  id: CategoryDecision;
  title: string;
  description: string;
  icon: React.ReactNode;
  details: string[];
  recommended?: boolean;
}

const DECISION_OPTIONS: DecisionOption[] = [
  {
    id: "keep_imported",
    title: "Manter categorias da planilha",
    description: "Use exclusivamente as categorias importadas",
    icon: <FileSpreadsheet className="w-6 h-6" />,
    details: [
      "Suas transações usarão as categorias da planilha",
      "Categorias do OIK ficam disponíveis apenas para novos lançamentos manuais",
      "Ideal se você já tem um sistema de categorias consolidado",
    ],
    recommended: true,
  },
  {
    id: "merge_with_oik",
    title: "Mesclar com categorias do OIK",
    description: "Adicione categorias do OIK às suas",
    icon: <Layers className="w-6 h-6" />,
    details: [
      "Mantenha suas categorias e adicione categorias do OIK",
      "Você escolhe quais categorias adicionar",
      "Pode adicionar subcategorias do OIK dentro das suas categorias",
    ],
  },
  {
    id: "replace_with_oik",
    title: "Usar categorias do OIK",
    description: "Substitua pelas categorias padrão do OIK",
    icon: <RefreshCw className="w-6 h-6" />,
    details: [
      "Suas transações serão reclassificadas usando categorias do OIK",
      "O histórico original será preservado para auditoria",
      "O OIK sugere categorias com base nas descrições",
    ],
  },
];

export function CategoryDecisionModal({
  open,
  onOpenChange,
  importedCategoriesCount,
  importedSubcategoriesCount,
  onDecision,
}: CategoryDecisionModalProps) {
  const [selected, setSelected] = useState<CategoryDecision | null>(null);
  const [confirming, setConfirming] = useState(false);

  const handleContinue = () => {
    if (!selected) return;

    if (selected === "replace_with_oik" && !confirming) {
      setConfirming(true);
      return;
    }

    onDecision(selected);
    onOpenChange(false);
  };

  const handleBack = () => {
    if (confirming) {
      setConfirming(false);
    } else {
      onOpenChange(false);
    }
  };

  // Confirmation screen for replace
  if (confirming && selected === "replace_with_oik") {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="w-5 h-5 text-warning" />
              Confirmar substituição
            </DialogTitle>
            <DialogDescription>
              Esta ação irá desativar suas categorias importadas
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 rounded-lg bg-warning/10 border border-warning/30 space-y-3">
              <p className="text-sm font-medium text-warning">
                O que vai acontecer:
              </p>
              <ul className="text-sm space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-warning mt-1">•</span>
                  <span>
                    Suas <strong>{importedCategoriesCount} categorias</strong> da planilha serão desativadas
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-warning mt-1">•</span>
                  <span>As transações serão reclassificadas para categorias do OIK</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-success mt-1">✓</span>
                  <span>O histórico original será preservado para consulta</span>
                </li>
              </ul>
            </div>

            <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50">
              <Info className="w-4 h-4 text-info shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Você poderá revisar e ajustar a reclassificação antes de confirmar.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={handleBack}>
              Voltar
            </Button>
            <Button className="flex-1" onClick={handleContinue}>
              Continuar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Como organizar suas categorias?</DialogTitle>
          <DialogDescription>
            Encontramos <strong>{importedCategoriesCount}</strong> categorias
            {importedSubcategoriesCount > 0 && (
              <> e <strong>{importedSubcategoriesCount}</strong> subcategorias</>
            )}{" "}
            na sua planilha
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {DECISION_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setSelected(option.id)}
              className={cn(
                "w-full p-4 rounded-xl border-2 text-left transition-all",
                "hover:border-primary/50 hover:bg-primary/5",
                selected === option.id
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card"
              )}
            >
              <div className="flex items-start gap-4">
                <div
                  className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                    selected === option.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {option.icon}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold">{option.title}</p>
                    {option.recommended && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-success/20 text-success font-medium">
                        Recomendado
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {option.description}
                  </p>

                  {selected === option.id && (
                    <ul className="mt-3 space-y-1.5">
                      {option.details.map((detail, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <Check className="w-3 h-3 text-success shrink-0 mt-0.5" />
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div
                  className={cn(
                    "w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center",
                    selected === option.id
                      ? "border-primary bg-primary"
                      : "border-muted-foreground/30"
                  )}
                >
                  {selected === option.id && (
                    <Check className="w-3 h-3 text-primary-foreground" />
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        <Button
          className="w-full h-12"
          disabled={!selected}
          onClick={handleContinue}
        >
          Continuar
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </DialogContent>
    </Dialog>
  );
}
