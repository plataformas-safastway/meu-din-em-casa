import { useState } from "react";
import { Calculator, Check, AlertTriangle, CreditCard, Info } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { useAccountingRegime } from "@/hooks/useAccountingRegime";
import {
  AccountingRegime,
  ACCOUNTING_REGIME_DESCRIPTIONS,
  ACCOUNTING_REGIME_CHANGE_NOTES,
  ACCOUNTING_REGIME_CHANGE_WARNING,
} from "@/types/accountingRegime";
import { cn } from "@/lib/utils";

interface RegimeCardProps {
  regime: AccountingRegime;
  isSelected: boolean;
  isDefault: boolean;
  onSelect: () => void;
}

function RegimeCard({ regime, isSelected, isDefault, onSelect }: RegimeCardProps) {
  const info = ACCOUNTING_REGIME_DESCRIPTIONS[regime];
  
  return (
    <Card 
      className={cn(
        "cursor-pointer transition-all duration-200 border-2",
        isSelected 
          ? "border-primary bg-primary/5" 
          : "border-border hover:border-primary/50"
      )}
      onClick={onSelect}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RadioGroupItem value={regime} id={regime} className="sr-only" />
            <div className={cn(
              "w-5 h-5 rounded-full border-2 flex items-center justify-center",
              isSelected ? "border-primary bg-primary" : "border-muted-foreground"
            )}>
              {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
            </div>
            <Label 
              htmlFor={regime} 
              className="text-base font-semibold cursor-pointer"
            >
              {info.title}
            </Label>
          </div>
          {isDefault && (
            <Badge variant="secondary" className="text-xs">
              {info.note}
            </Badge>
          )}
          {!isDefault && (
            <Badge variant="outline" className="text-xs">
              {info.note}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {info.description}
        </p>
        
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Exemplos:</p>
          <ul className="space-y-1">
            {info.examples.map((example, idx) => (
              <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>{example}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Credit Card Behavior */}
        <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/50">
          <CreditCard className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            {info.creditCardBehavior}
          </p>
        </div>

        <p className="text-xs text-muted-foreground italic">
          {info.recommendation}
        </p>
      </CardContent>
    </Card>
  );
}

export function AccountingRegimeSettings() {
  const { regime, updateRegime, isUpdating } = useAccountingRegime();
  const [selectedRegime, setSelectedRegime] = useState<AccountingRegime>(regime);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleRegimeChange = (newRegime: AccountingRegime) => {
    setSelectedRegime(newRegime);
    if (newRegime !== regime) {
      setShowConfirmDialog(true);
    }
  };

  const confirmChange = () => {
    updateRegime(selectedRegime);
    setShowConfirmDialog(false);
  };

  const cancelChange = () => {
    setSelectedRegime(regime);
    setShowConfirmDialog(false);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <Calculator className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Regime de Registro Financeiro</h3>
          <p className="text-sm text-muted-foreground">
            Escolha como o OIK deve calcular o realizado do seu orçamento
          </p>
        </div>
      </div>

      {/* Regime Selection */}
      <RadioGroup value={selectedRegime} onValueChange={(v) => handleRegimeChange(v as AccountingRegime)}>
        <div className="space-y-3">
          <RegimeCard 
            regime="cash_basis"
            isSelected={selectedRegime === 'cash_basis'}
            isDefault={true}
            onSelect={() => handleRegimeChange('cash_basis')}
          />
          <RegimeCard 
            regime="accrual_basis"
            isSelected={selectedRegime === 'accrual_basis'}
            isDefault={false}
            onSelect={() => handleRegimeChange('accrual_basis')}
          />
        </div>
      </RadioGroup>

      {/* Important Notes */}
      <div className="p-3 rounded-lg bg-muted/50 space-y-2">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-primary" />
          <span className="text-xs font-medium text-foreground">Importante</span>
        </div>
        <ul className="space-y-1">
          {ACCOUNTING_REGIME_CHANGE_NOTES.map((note, idx) => (
            <li key={idx} className="text-xs text-muted-foreground flex items-start gap-2">
              <span className="text-primary">•</span>
              <span>{note}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-primary" />
              {ACCOUNTING_REGIME_CHANGE_WARNING.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>{ACCOUNTING_REGIME_CHANGE_WARNING.message}</p>
              
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className={cn(
                  "p-3 rounded-lg border-2",
                  selectedRegime === 'cash_basis' ? "border-primary bg-primary/5" : "border-border"
                )}>
                  <div className="flex items-center gap-2 mb-1">
                    {selectedRegime === 'cash_basis' && <Check className="w-4 h-4 text-primary" />}
                    <span className="text-sm font-medium">Fluxo de Caixa</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {ACCOUNTING_REGIME_DESCRIPTIONS.cash_basis.recommendation}
                  </p>
                </div>
                <div className={cn(
                  "p-3 rounded-lg border-2",
                  selectedRegime === 'accrual_basis' ? "border-primary bg-primary/5" : "border-border"
                )}>
                  <div className="flex items-center gap-2 mb-1">
                    {selectedRegime === 'accrual_basis' && <Check className="w-4 h-4 text-primary" />}
                    <span className="text-sm font-medium">Competência</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {ACCOUNTING_REGIME_DESCRIPTIONS.accrual_basis.recommendation}
                  </p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelChange}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmChange} disabled={isUpdating}>
              {isUpdating ? "Alterando..." : "Confirmar Alteração"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
