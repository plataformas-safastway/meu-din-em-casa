import { useState } from "react";
import { Shield, Check, FileCheck } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface ImportOwnershipConfirmationProps {
  confirmed: boolean;
  onConfirmChange: (confirmed: boolean) => void;
  className?: string;
}

export function ImportOwnershipConfirmation({
  confirmed,
  onConfirmChange,
  className,
}: ImportOwnershipConfirmationProps) {
  return (
    <div
      className={cn(
        "p-4 rounded-xl border transition-colors",
        confirmed
          ? "border-green-500/30 bg-green-500/5"
          : "border-warning/30 bg-warning/5",
        className
      )}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          id="ownership-confirmation"
          checked={confirmed}
          onCheckedChange={(checked) => onConfirmChange(checked === true)}
          className="mt-1"
        />
        <div className="flex-1">
          <Label
            htmlFor="ownership-confirmation"
            className="font-medium cursor-pointer flex items-center gap-2"
          >
            {confirmed ? (
              <Check className="w-4 h-4 text-green-600" />
            ) : (
              <Shield className="w-4 h-4 text-warning" />
            )}
            {confirmed
              ? "Titularidade confirmada"
              : "Confirmo que este extrato pertence a mim"}
          </Label>
          <p className="text-sm text-muted-foreground mt-1">
            {confirmed ? (
              "Você confirmou que é o titular do arquivo importado."
            ) : (
              "Declaro que este arquivo pertence a mim ou à minha família e que tenho autorização para acessá-lo."
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
