import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

export type ChargeType = 'ONE_SHOT' | 'INSTALLMENT';

interface InstallmentInputProps {
  chargeType: ChargeType;
  onChargeTypeChange: (type: ChargeType) => void;
  installmentsTotal: number;
  onInstallmentsTotalChange: (total: number) => void;
  totalAmount: number;
  className?: string;
}

export function InstallmentInput({
  chargeType,
  onChargeTypeChange,
  installmentsTotal,
  onInstallmentsTotalChange,
  totalAmount,
  className,
}: InstallmentInputProps) {
  const [customInstallments, setCustomInstallments] = useState("");

  // Calculate installment value
  const installmentValue = installmentsTotal > 0 ? totalAmount / installmentsTotal : totalAmount;

  // Quick installment options
  const quickOptions = [2, 3, 4, 5, 6, 10, 12];

  const handleQuickOption = (value: number) => {
    onInstallmentsTotalChange(value);
    setCustomInstallments("");
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomInstallments(value);
    const num = parseInt(value);
    if (!isNaN(num) && num >= 2 && num <= 48) {
      onInstallmentsTotalChange(num);
    }
  };

  // Reset installments when switching to ONE_SHOT
  useEffect(() => {
    if (chargeType === 'ONE_SHOT') {
      onInstallmentsTotalChange(1);
    }
  }, [chargeType, onInstallmentsTotalChange]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Charge Type Selector */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Tipo de Compra</Label>
        <RadioGroup
          value={chargeType}
          onValueChange={(v) => onChargeTypeChange(v as ChargeType)}
          className="flex gap-4"
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="ONE_SHOT" id="one-shot" />
            <Label htmlFor="one-shot" className="cursor-pointer font-normal">
              À vista
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="INSTALLMENT" id="installment" />
            <Label htmlFor="installment" className="cursor-pointer font-normal">
              Parcelado
            </Label>
          </div>
        </RadioGroup>
      </div>

      {/* Installment Options */}
      {chargeType === 'INSTALLMENT' && (
        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <Label className="text-sm font-medium">Número de Parcelas</Label>
          
          {/* Quick Options */}
          <div className="flex flex-wrap gap-2">
            {quickOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => handleQuickOption(opt)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm font-medium transition-colors",
                  installmentsTotal === opt
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted hover:bg-muted/80"
                )}
              >
                {opt}x
              </button>
            ))}
            
            {/* Custom Input */}
            <div className="flex items-center gap-1">
              <Input
                type="number"
                min={2}
                max={48}
                placeholder="Outro"
                value={customInstallments}
                onChange={handleCustomChange}
                className={cn(
                  "w-16 h-8 text-sm text-center",
                  !quickOptions.includes(installmentsTotal) && installmentsTotal > 1 && "ring-2 ring-primary"
                )}
              />
              <span className="text-sm text-muted-foreground">x</span>
            </div>
          </div>

          {/* Summary */}
          {installmentsTotal > 1 && totalAmount > 0 && (
            <div className="p-3 bg-muted/50 rounded-lg space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Valor total:</span>
                <span className="font-medium">{formatCurrency(totalAmount)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Valor por parcela:</span>
                <span className="font-bold text-primary">{formatCurrency(installmentValue)}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {installmentsTotal}x de {formatCurrency(installmentValue)} nos próximos meses
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
