import { useState } from "react";
import { AlertCircle, CreditCard, Building2, Plus, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface DetectedSource {
  id: string;
  sourceType: "bank_account" | "credit_card";
  bankName: string;
  agency?: string;
  accountNumber?: string;
  last4?: string;
}

interface ExistingSource {
  id: string;
  name: string;
  details?: string;
}

interface SourceConflictDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  detectedSource: DetectedSource | null;
  existingSources: ExistingSource[];
  onUseExisting: (sourceId: string) => void;
  onCreate: () => void;
  onSkip: () => void;
}

export function SourceConflictDialog({
  open,
  onOpenChange,
  detectedSource,
  existingSources,
  onUseExisting,
  onCreate,
  onSkip,
}: SourceConflictDialogProps) {
  const [selectedOption, setSelectedOption] = useState<string>("create");
  const [selectedExistingId, setSelectedExistingId] = useState<string | null>(
    existingSources.length > 0 ? existingSources[0].id : null
  );

  if (!detectedSource) return null;

  const isBankAccount = detectedSource.sourceType === "bank_account";
  const Icon = isBankAccount ? Building2 : CreditCard;
  const typeLabel = isBankAccount ? "conta bancária" : "cartão de crédito";

  const handleConfirm = () => {
    if (selectedOption === "existing" && selectedExistingId) {
      onUseExisting(selectedExistingId);
    } else if (selectedOption === "create") {
      onCreate();
    } else {
      onSkip();
    }
  };

  const formatDetectedInfo = () => {
    if (isBankAccount) {
      const parts = [detectedSource.bankName];
      if (detectedSource.agency) parts.push(`Ag: ${detectedSource.agency}`);
      if (detectedSource.accountNumber) parts.push(`CC: ${detectedSource.accountNumber}`);
      return parts.join(" • ");
    } else {
      const parts = [detectedSource.bankName];
      if (detectedSource.last4) parts.push(`Final: ${detectedSource.last4}`);
      return parts.join(" • ");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center mx-auto mb-2">
            <AlertCircle className="w-6 h-6 text-warning" />
          </div>
          <DialogTitle className="text-center">
            {isBankAccount ? "Conta detectada" : "Cartão detectado"}
          </DialogTitle>
          <DialogDescription className="text-center">
            Identificamos uma {typeLabel} no arquivo importado
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Detected Source Info */}
          <div className="p-4 rounded-xl bg-muted/50 border border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">
                  {detectedSource.bankName}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatDetectedInfo()}
                </p>
              </div>
            </div>
          </div>

          {/* Options */}
          <RadioGroup value={selectedOption} onValueChange={setSelectedOption}>
            {existingSources.length > 0 && (
              <div
                className={cn(
                  "p-4 rounded-xl border transition-colors cursor-pointer",
                  selectedOption === "existing"
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-muted-foreground/30"
                )}
                onClick={() => setSelectedOption("existing")}
              >
                <div className="flex items-start gap-3">
                  <RadioGroupItem value="existing" id="existing" className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor="existing" className="font-medium cursor-pointer">
                      Usar cadastro existente
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Vincular as transações a uma {typeLabel} já cadastrada
                    </p>

                    {selectedOption === "existing" && (
                      <div className="mt-3 space-y-2">
                        {existingSources.map((source) => (
                          <div
                            key={source.id}
                            className={cn(
                              "p-3 rounded-lg border cursor-pointer transition-colors",
                              selectedExistingId === source.id
                                ? "border-primary bg-background"
                                : "border-border hover:border-muted-foreground/30"
                            )}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedExistingId(source.id);
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-sm">{source.name}</p>
                                {source.details && (
                                  <p className="text-xs text-muted-foreground">
                                    {source.details}
                                  </p>
                                )}
                              </div>
                              {selectedExistingId === source.id && (
                                <Check className="w-4 h-4 text-primary" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div
              className={cn(
                "p-4 rounded-xl border transition-colors cursor-pointer",
                selectedOption === "create"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground/30"
              )}
              onClick={() => setSelectedOption("create")}
            >
              <div className="flex items-start gap-3">
                <RadioGroupItem value="create" id="create" className="mt-1" />
                <div>
                  <Label htmlFor="create" className="font-medium cursor-pointer flex items-center gap-2">
                    <Plus className="w-4 h-4" />
                    Criar nova {typeLabel}
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Cadastrar automaticamente com os dados detectados
                  </p>
                </div>
              </div>
            </div>

            <div
              className={cn(
                "p-4 rounded-xl border transition-colors cursor-pointer",
                selectedOption === "skip"
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground/30"
              )}
              onClick={() => setSelectedOption("skip")}
            >
              <div className="flex items-start gap-3">
                <RadioGroupItem value="skip" id="skip" className="mt-1" />
                <div>
                  <Label htmlFor="skip" className="font-medium cursor-pointer">
                    Pular esta etapa
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Importar sem vincular a uma {typeLabel} específica
                  </p>
                </div>
              </div>
            </div>
          </RadioGroup>
        </div>

        <DialogFooter>
          <Button onClick={handleConfirm} className="w-full">
            Continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
