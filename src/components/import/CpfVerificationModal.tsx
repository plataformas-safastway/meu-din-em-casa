import { useState } from "react";
import { AlertTriangle, Shield, Lock, Check, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface CpfVerificationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  familyMemberId?: string;
}

// CPF validation helper
function isValidCpf(cpf: string): boolean {
  const cleanCpf = cpf.replace(/\D/g, "");
  
  if (cleanCpf.length !== 11) return false;
  
  // Check for all same digits
  if (/^(\d)\1+$/.test(cleanCpf)) return false;
  
  // Validate check digits
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleanCpf.charAt(i)) * (10 - i);
  }
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCpf.charAt(9))) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleanCpf.charAt(i)) * (11 - i);
  }
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCpf.charAt(10))) return false;
  
  return true;
}

// Format CPF for display
function formatCpf(value: string): string {
  const cleanValue = value.replace(/\D/g, "").slice(0, 11);
  if (cleanValue.length <= 3) return cleanValue;
  if (cleanValue.length <= 6) return `${cleanValue.slice(0, 3)}.${cleanValue.slice(3)}`;
  if (cleanValue.length <= 9) return `${cleanValue.slice(0, 3)}.${cleanValue.slice(3, 6)}.${cleanValue.slice(6)}`;
  return `${cleanValue.slice(0, 3)}.${cleanValue.slice(3, 6)}.${cleanValue.slice(6, 9)}-${cleanValue.slice(9)}`;
}

export function CpfVerificationModal({
  open,
  onOpenChange,
  onSuccess,
  familyMemberId,
}: CpfVerificationModalProps) {
  const [cpf, setCpf] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cleanCpf = cpf.replace(/\D/g, "");
  const isValid = isValidCpf(cleanCpf);
  const canSubmit = isValid && confirmed && !loading;

  const handleCpfChange = (value: string) => {
    setCpf(formatCpf(value));
    setError(null);
  };

  const handleSubmit = async () => {
    if (!canSubmit || !familyMemberId) return;

    setLoading(true);
    setError(null);

    try {
      // Update the family member's CPF
      const { error: updateError } = await supabase
        .from("family_members")
        .update({ cpf: cleanCpf })
        .eq("id", familyMemberId);

      if (updateError) {
        throw updateError;
      }

      toast.success("CPF confirmado com sucesso!", {
        description: "Agora você pode importar arquivos protegidos por senha.",
      });

      onSuccess();
      onOpenChange(false);
      
      // Reset state
      setCpf("");
      setConfirmed(false);
    } catch (err) {
      console.error("Error saving CPF:", err);
      setError("Não foi possível salvar o CPF. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-2">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-center">
            Confirme seu CPF para importar extratos
          </DialogTitle>
          <DialogDescription className="text-center">
            Muitos bancos protegem extratos e faturas com senha baseada no CPF do titular.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Info Box */}
          <div className="p-3 rounded-lg bg-muted/50 border border-border">
            <div className="flex items-start gap-2">
              <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                Seu CPF será usado apenas para tentar desbloquear arquivos protegidos 
                por senha. Ele é armazenado de forma segura e <strong>nunca aparece em logs</strong>.
              </p>
            </div>
          </div>

          {/* CPF Input */}
          <div className="space-y-2">
            <Label htmlFor="cpf">CPF</Label>
            <Input
              id="cpf"
              type="text"
              inputMode="numeric"
              placeholder="000.000.000-00"
              value={cpf}
              onChange={(e) => handleCpfChange(e.target.value)}
              className={`h-12 text-lg ${error ? "border-destructive" : ""}`}
            />
            {cpf.length > 0 && !isValid && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                CPF inválido
              </p>
            )}
            {isValid && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <Check className="w-3 h-3" />
                CPF válido
              </p>
            )}
            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}
          </div>

          {/* Confirmation Checkbox */}
          <div className="flex items-start gap-3 p-3 rounded-lg bg-warning/5 border border-warning/20">
            <Checkbox
              id="confirm-ownership"
              checked={confirmed}
              onCheckedChange={(checked) => setConfirmed(checked === true)}
              className="mt-0.5"
            />
            <div className="space-y-1">
              <Label 
                htmlFor="confirm-ownership" 
                className="text-sm font-medium cursor-pointer"
              >
                Confirmo que sou o titular
              </Label>
              <p className="text-xs text-muted-foreground">
                Declaro que os arquivos que irei importar pertencem a mim ou à minha família 
                e que tenho autorização para acessá-los.
              </p>
            </div>
          </div>

          {/* Security Info */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Lock className="w-3 h-3" />
            <span>Dados protegidos conforme LGPD</span>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="w-full sm:w-auto"
          >
            {loading ? "Salvando..." : "Confirmar e continuar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
