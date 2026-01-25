import { useState } from "react";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/formatters";
import { CreditCard, Calendar, HelpCircle } from "lucide-react";

interface InstallmentConfirmationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  description: string;
  amount: number;
  detectedCurrent?: number | null;
  detectedTotal?: number | null;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  onConfirm: (isInstallment: boolean, totalInstallments?: number) => void;
  onDecideLater: () => void;
}

export function InstallmentConfirmationModal({
  open,
  onOpenChange,
  description,
  amount,
  detectedCurrent,
  detectedTotal,
  confidence,
  onConfirm,
  onDecideLater,
}: InstallmentConfirmationModalProps) {
  const [installmentsInput, setInstallmentsInput] = useState(detectedTotal?.toString() || "");

  const handleConfirmInstallment = () => {
    const total = parseInt(installmentsInput);
    if (!isNaN(total) && total >= 2 && total <= 48) {
      onConfirm(true, total);
    }
  };

  const handleNotInstallment = () => {
    onConfirm(false);
  };

  const confidenceLabel = {
    HIGH: { text: "Alta confiança", color: "text-success" },
    MEDIUM: { text: "Confiança média", color: "text-warning" },
    LOW: { text: "Baixa confiança", color: "text-muted-foreground" },
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-primary" />
            </div>
            <AlertDialogTitle>Compra parcelada?</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-left space-y-3">
            <p>Identificamos que esta compra pode ser parcelada:</p>
            
            <div className="p-3 bg-muted rounded-lg space-y-2">
              <p className="font-medium text-foreground truncate">{description}</p>
              <div className="flex items-center justify-between">
                <span className="text-sm">{formatCurrency(amount)}</span>
                <span className={`text-xs ${confidenceLabel[confidence].color}`}>
                  {confidenceLabel[confidence].text}
                </span>
              </div>
              
              {detectedCurrent && detectedTotal && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>Detectado: Parcela {detectedCurrent} de {detectedTotal}</span>
                </div>
              )}
            </div>

            <p className="text-sm">
              Se for parcelado, o OIK vai projetar as parcelas futuras automaticamente.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3 py-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="total-installments" className="text-sm whitespace-nowrap">
              Total de parcelas:
            </Label>
            <Input
              id="total-installments"
              type="number"
              min={2}
              max={48}
              placeholder="Ex: 10"
              value={installmentsInput}
              onChange={(e) => setInstallmentsInput(e.target.value)}
              className="w-20"
            />
          </div>
          
          {detectedCurrent && parseInt(installmentsInput) > 0 && (
            <p className="text-xs text-muted-foreground">
              Restam {parseInt(installmentsInput) - detectedCurrent} parcelas a serem projetadas.
            </p>
          )}
        </div>

        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleNotInstallment}
            className="sm:flex-1"
          >
            Não, é compra única
          </Button>
          <Button
            variant="secondary"
            onClick={onDecideLater}
            className="sm:flex-1"
          >
            <HelpCircle className="w-4 h-4 mr-1" />
            Decidir depois
          </Button>
          <Button
            onClick={handleConfirmInstallment}
            disabled={!installmentsInput || parseInt(installmentsInput) < 2}
            className="sm:flex-1"
          >
            Sim, é parcelado
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
