import { useState } from "react";
import { Shield, AlertTriangle } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useRequestBreakglass } from "@/hooks/useLegalVault";

interface BreakglassRequestSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scope: "LEGAL_VAULT" | "FULL_EXPORT" | "INCIDENT_DETAILS" | "AUDIT_FULL";
  familyId?: string;
  targetUserId?: string;
}

const scopeLabels: Record<string, string> = {
  LEGAL_VAULT: "Cofre Legal",
  FULL_EXPORT: "Exportação Completa LGPD",
  INCIDENT_DETAILS: "Detalhes de Incidente",
  AUDIT_FULL: "Auditoria Completa",
};

export function BreakglassRequestSheet({
  open,
  onOpenChange,
  scope,
  familyId,
  targetUserId,
}: BreakglassRequestSheetProps) {
  const { toast } = useToast();
  const requestBreakglass = useRequestBreakglass();

  const [reasonCode, setReasonCode] = useState<string>("");
  const [reasonText, setReasonText] = useState("");
  const [expiresHours, setExpiresHours] = useState("24");
  const [acknowledged, setAcknowledged] = useState(false);

  const handleSubmit = async () => {
    if (!reasonCode || !reasonText || !acknowledged) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos e confirme o reconhecimento.",
        variant: "destructive",
      });
      return;
    }

    try {
      await requestBreakglass.mutateAsync({
        scope,
        reason_code: reasonCode as any,
        reason_text: reasonText,
        family_id: familyId,
        target_user_id: targetUserId,
        expires_hours: parseInt(expiresHours),
      });

      toast({
        title: "Solicitação enviada",
        description: "Aguarde a aprovação de um ADMIN_MASTER.",
      });

      onOpenChange(false);
      setReasonCode("");
      setReasonText("");
      setAcknowledged(false);
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível enviar a solicitação.",
        variant: "destructive",
      });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Solicitar Acesso Excepcional
          </SheetTitle>
          <SheetDescription>
            {scopeLabels[scope] || scope}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Warning */}
          <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-1">Atenção</p>
                <p>
                  Este acesso é temporário, exige aprovação e será registrado em auditoria.
                  MFA será exigido após aprovação.
                </p>
              </div>
            </div>
          </div>

          {/* Reason Code */}
          <div className="space-y-2">
            <Label>Motivo</Label>
            <Select value={reasonCode} onValueChange={setReasonCode}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o motivo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DSAR">Solicitação DSAR (Titular)</SelectItem>
                <SelectItem value="FRAUD">Investigação de Fraude</SelectItem>
                <SelectItem value="COURT">Ordem Judicial</SelectItem>
                <SelectItem value="SECURITY">Incidente de Segurança</SelectItem>
                <SelectItem value="OTHER">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reason Text */}
          <div className="space-y-2">
            <Label>Justificativa detalhada</Label>
            <Textarea
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              placeholder="Descreva o motivo específico da solicitação..."
              rows={4}
            />
          </div>

          {/* Expiration */}
          <div className="space-y-2">
            <Label>Duração do acesso</Label>
            <Select value={expiresHours} onValueChange={setExpiresHours}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1 hora</SelectItem>
                <SelectItem value="4">4 horas</SelectItem>
                <SelectItem value="8">8 horas</SelectItem>
                <SelectItem value="24">24 horas</SelectItem>
                <SelectItem value="48">48 horas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Acknowledgement */}
          <div className="flex items-start gap-3">
            <Checkbox
              id="acknowledge"
              checked={acknowledged}
              onCheckedChange={(checked) => setAcknowledged(!!checked)}
            />
            <label htmlFor="acknowledge" className="text-sm text-muted-foreground">
              Reconheço que este acesso é excepcional, será auditado e deve ser utilizado
              exclusivamente para o motivo informado.
            </label>
          </div>

          {/* Submit */}
          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={!reasonCode || !reasonText || !acknowledged || requestBreakglass.isPending}
          >
            {requestBreakglass.isPending ? "Enviando..." : "Solicitar Acesso"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
