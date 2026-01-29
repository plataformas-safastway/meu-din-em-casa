import { useState } from "react";
import { Calculator, Check, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
              Recomendado
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

        <div className={cn(
          "text-xs p-2 rounded-lg",
          regime === 'cash_basis' 
            ? "bg-primary/10 text-primary" 
            : "bg-destructive/10 text-destructive"
        )}>
          {info.note}
        </div>
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
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
          <Calculator className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">Regime de Registro</h3>
          <p className="text-sm text-muted-foreground">
            Define como o realizado é calculado no orçamento
          </p>
        </div>
      </div>

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

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Alterar Regime Contábil?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Ao alterar o regime financeiro, a forma como o <strong>realizado</strong> é calculado será modificada.
              </p>
              <p>
                Seus lançamentos <strong>não serão apagados</strong>. Apenas a forma de leitura e agregação dos dados mudará.
              </p>
              <p className="text-muted-foreground">
                O orçamento planejado permanece o mesmo — apenas o confronto entre Planejado × Realizado será afetado.
              </p>
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
