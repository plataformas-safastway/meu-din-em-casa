import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertTriangle,
  Monitor,
  Smartphone,
  Globe,
  FileCode,
  User,
  Clock,
  MessageSquare,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { SupportError, useUpdateErrorStatus } from "@/hooks/useSupportModule";

interface SupportErrorDetailSheetProps {
  error: SupportError | null;
  onClose: () => void;
}

const STATUS_OPTIONS = [
  { value: "new", label: "Novo", color: "text-red-600" },
  { value: "analyzing", label: "Em Análise", color: "text-yellow-600" },
  { value: "resolved", label: "Resolvido", color: "text-green-600" },
  { value: "wont_fix", label: "Não Corrigir", color: "text-gray-600" },
];

export function SupportErrorDetailSheet({ error, onClose }: SupportErrorDetailSheetProps) {
  const { toast } = useToast();
  const [notes, setNotes] = useState(error?.internal_notes || "");
  const [status, setStatus] = useState<string>(error?.status || "new");
  const updateStatus = useUpdateErrorStatus();

  const handleSave = async () => {
    if (!error) return;

    try {
      await updateStatus.mutateAsync({
        errorId: error.id,
        status,
        notes,
      });

      toast({
        title: "Erro atualizado",
        description: "As alterações foram salvas com sucesso.",
      });

      onClose();
    } catch (e) {
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive",
      });
    }
  };

  if (!error) return null;

  const deviceIcon = error.device_type === "mobile" ? (
    <Smartphone className="w-4 h-4" />
  ) : (
    <Monitor className="w-4 h-4" />
  );

  return (
    <Sheet open={!!error} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-destructive" />
            Detalhes do Erro
          </SheetTitle>
          <SheetDescription>
            ID: {error.id.substring(0, 8)}...
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Status Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Status</label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <span className={opt.color}>{opt.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Error Message */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Mensagem do Erro</label>
            <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
              <p className="text-sm font-mono">{error.error_message}</p>
            </div>
          </div>

          {/* Stack Trace (Sanitized) */}
          {error.error_stack && (
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <FileCode className="w-4 h-4" />
                Stack Trace (resumido)
              </label>
              <div className="p-3 bg-muted rounded-lg max-h-40 overflow-y-auto">
                <pre className="text-xs font-mono whitespace-pre-wrap break-all">
                  {error.error_stack}
                </pre>
              </div>
            </div>
          )}

          <Separator />

          {/* Context Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Tipo de Erro</label>
              <Badge variant="outline">{error.error_type}</Badge>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Módulo</label>
              <Badge variant="outline">{error.module || "N/A"}</Badge>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Tela</label>
              <p className="text-sm font-mono">{error.screen || "N/A"}</p>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Última Ação</label>
              <p className="text-sm">{error.user_action || "N/A"}</p>
            </div>
          </div>

          <Separator />

          {/* Device Info */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Informações do Dispositivo</label>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                {deviceIcon}
                <span className="capitalize">{error.device_type || "N/A"}</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                <Globe className="w-4 h-4" />
                <span>{error.browser || "N/A"}</span>
              </div>
              <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                <Monitor className="w-4 h-4" />
                <span>{error.os || "N/A"}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* User Info (Masked) */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <User className="w-4 h-4" />
              Usuário Afetado
            </label>
            <p className="text-sm text-muted-foreground">
              ID: {error.user_id ? `${error.user_id.substring(0, 8)}...` : "Não identificado"}
            </p>
            {error.family_id && (
              <p className="text-sm text-muted-foreground">
                Família: {error.family_id.substring(0, 8)}...
              </p>
            )}
          </div>

          <Separator />

          {/* Timestamps */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>
                Criado: {format(new Date(error.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </span>
            </div>
            {error.resolved_at && (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span>
                  Resolvido: {format(new Date(error.resolved_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </span>
              </div>
            )}
          </div>

          <Separator />

          {/* Internal Notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Observações Internas
            </label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Adicione observações sobre este erro..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Visível apenas para a equipe de suporte
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleSave}
              disabled={updateStatus.isPending}
              className="flex-1"
            >
              {updateStatus.isPending ? "Salvando..." : "Salvar Alterações"}
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
