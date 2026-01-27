import { useState } from "react";
import { Eye, EyeOff, Copy, Check, Save, Lock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export interface ConfigField {
  key: string;
  label: string;
  type: 'text' | 'secret' | 'email' | 'url';
  placeholder?: string;
  required?: boolean;
  helperText?: string;
}

interface IntegrationConfigFormProps {
  fields: ConfigField[];
  currentConfig: Record<string, unknown>;
  onSave: (config: Record<string, unknown>) => Promise<void>;
  isSaving?: boolean;
}

export function IntegrationConfigForm({
  fields,
  currentConfig,
  onSave,
  isSaving,
}: IntegrationConfigFormProps) {
  const { toast } = useToast();
  const [formData, setFormData] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    fields.forEach((field) => {
      if (field.type === 'secret') {
        // Don't show secret values, show placeholder if configured
        const isConfigured = currentConfig[`${field.key}_configured`];
        initial[field.key] = isConfigured ? '' : '';
      } else {
        initial[field.key] = (currentConfig[field.key] as string) || '';
      }
    });
    return initial;
  });
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);

  const handleChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const toggleShowSecret = (key: string) => {
    setShowSecrets((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const copyToClipboard = async (key: string, value: string) => {
    // Only allow copying after confirmation for secrets
    const field = fields.find((f) => f.key === key);
    if (field?.type === 'secret') {
      toast({
        title: "Cópia não permitida",
        description: "Por segurança, valores secretos não podem ser copiados após salvar.",
        variant: "destructive",
      });
      return;
    }

    await navigator.clipboard.writeText(value);
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 2000);
    toast({ title: "Copiado!" });
  };

  const handleSave = async () => {
    // Validate required fields
    const missingFields = fields
      .filter((f) => f.required && !formData[f.key] && !currentConfig[`${f.key}_configured`])
      .map((f) => f.label);

    if (missingFields.length > 0) {
      toast({
        title: "Campos obrigatórios",
        description: `Preencha: ${missingFields.join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    setConfirmSaveOpen(false);

    // Build config object
    const configToSave: Record<string, unknown> = { ...currentConfig };
    fields.forEach((field) => {
      if (formData[field.key]) {
        if (field.type === 'secret') {
          // Mark as configured but don't store the actual value in config
          // The actual secret should be stored in vault/secrets
          configToSave[`${field.key}_configured`] = true;
          // In a real implementation, the secret would be stored securely
          // For now, we just mark it as configured
        } else {
          configToSave[field.key] = formData[field.key];
        }
      }
    });

    await onSave(configToSave);
  };

  const isSecretConfigured = (key: string) => {
    return !!currentConfig[`${key}_configured`];
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Lock className="w-5 h-5" />
          Configuração
        </CardTitle>
        <CardDescription>
          Configure as credenciais e parâmetros da integração
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-4">
          {fields.map((field) => {
            const isSecret = field.type === 'secret';
            const showValue = showSecrets[field.key] ?? false;
            const configured = isSecretConfigured(field.key);

            return (
              <div key={field.key} className="space-y-2">
                <Label htmlFor={field.key}>
                  {field.label}
                  {field.required && <span className="text-red-500 ml-1">*</span>}
                </Label>
                <div className="relative flex gap-2">
                  <Input
                    id={field.key}
                    type={isSecret && !showValue ? 'password' : field.type === 'email' ? 'email' : 'text'}
                    placeholder={
                      isSecret && configured
                        ? '••••••••••••••• (configurado)'
                        : field.placeholder
                    }
                    value={formData[field.key]}
                    onChange={(e) => handleChange(field.key, e.target.value)}
                    className={configured && isSecret && !formData[field.key] ? 'bg-muted' : ''}
                  />
                  <div className="flex gap-1">
                    {isSecret && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleShowSecret(field.key)}
                      >
                        {showValue ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                    {!isSecret && formData[field.key] && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => copyToClipboard(field.key, formData[field.key])}
                      >
                        {copiedField === field.key ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
                {field.helperText && (
                  <p className="text-xs text-muted-foreground">{field.helperText}</p>
                )}
                {isSecret && configured && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Segredo configurado. Deixe em branco para manter.
                  </p>
                )}
              </div>
            );
          })}

          <div className="pt-4 border-t">
            <AlertDialog open={confirmSaveOpen} onOpenChange={setConfirmSaveOpen}>
              <AlertDialogTrigger asChild>
                <Button type="button" disabled={isSaving}>
                  <Save className="w-4 h-4 mr-2" />
                  Salvar configuração
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar salvamento</AlertDialogTitle>
                  <AlertDialogDescription>
                    Você está prestes a salvar as configurações desta integração.
                    Esta ação será registrada no log de auditoria.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleSave} disabled={isSaving}>
                    {isSaving ? "Salvando..." : "Confirmar"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
