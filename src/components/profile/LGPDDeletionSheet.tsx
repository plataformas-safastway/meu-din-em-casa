import { useState, useEffect } from "react";
import { 
  AlertTriangle, 
  Loader2, 
  Shield, 
  Mail, 
  CheckCircle2, 
  Clock,
  XCircle,
  ChevronRight
} from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { 
  useLGPDRequestStatus, 
  useSendLGPDCode, 
  useVerifyLGPDCode, 
  useCancelLGPDRequest 
} from "@/hooks/useLGPDDeletion";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LGPDDeletionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = "info" | "confirm" | "code" | "success" | "status";

export function LGPDDeletionSheet({ open, onOpenChange }: LGPDDeletionSheetProps) {
  const [step, setStep] = useState<Step>("info");
  const [agreed, setAgreed] = useState(false);
  const [code, setCode] = useState("");

  const { data: pendingRequest, isLoading: isLoadingStatus } = useLGPDRequestStatus();
  const sendCode = useSendLGPDCode();
  const verifyCode = useVerifyLGPDCode();
  const cancelRequest = useCancelLGPDRequest();

  // Reset state when opening
  useEffect(() => {
    if (open) {
      if (pendingRequest) {
        setStep("status");
      } else {
        setStep("info");
      }
      setAgreed(false);
      setCode("");
    }
  }, [open, pendingRequest]);

  const handleSendCode = async () => {
    try {
      await sendCode.mutateAsync();
      setStep("code");
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleVerifyCode = async () => {
    if (code.length !== 6) return;
    
    try {
      await verifyCode.mutateAsync(code);
      setStep("success");
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleCancel = async () => {
    if (!pendingRequest) return;
    
    try {
      await cancelRequest.mutateAsync(pendingRequest.id);
      setStep("info");
    } catch (error) {
      // Error handled by mutation
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING": return "text-amber-600 bg-amber-100";
      case "PROCESSING": return "text-blue-600 bg-blue-100";
      case "COMPLETED": return "text-green-600 bg-green-100";
      case "CANCELLED": return "text-muted-foreground bg-muted";
      default: return "text-muted-foreground bg-muted";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "PENDING": return "Aguardando processamento";
      case "PROCESSING": return "Em processamento";
      case "COMPLETED": return "Concluída";
      case "CANCELLED": return "Cancelada";
      default: return status;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[90vh] rounded-t-3xl overflow-y-auto">
        <SheetHeader className="text-left pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Exclusão de Dados (LGPD)
          </SheetTitle>
          <SheetDescription>
            Solicite a exclusão dos seus dados pessoais conforme a Lei Geral de Proteção de Dados.
          </SheetDescription>
        </SheetHeader>

        {isLoadingStatus ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Step: Status (existing request) */}
            {step === "status" && pendingRequest && (
              <div className="space-y-4">
                <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Status da solicitação</span>
                    <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(pendingRequest.status)}`}>
                      {getStatusLabel(pendingRequest.status)}
                    </span>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="w-4 h-4" />
                      <span>
                        Solicitado em {format(new Date(pendingRequest.requested_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>
                        Prazo: até {format(new Date(pendingRequest.deadline_at), "dd/MM/yyyy", { locale: ptBR })}
                        {" "}({formatDistanceToNow(new Date(pendingRequest.deadline_at), { locale: ptBR, addSuffix: true })})
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-sm text-blue-800">
                    Sua solicitação está sendo processada. Você receberá um e-mail quando a exclusão for concluída.
                  </p>
                </div>

                {pendingRequest.status === "PENDING" && (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleCancel}
                    disabled={cancelRequest.isPending}
                  >
                    {cancelRequest.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Cancelando...
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 mr-2" />
                        Cancelar Solicitação
                      </>
                    )}
                  </Button>
                )}
              </div>
            )}

            {/* Step: Info */}
            {step === "info" && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <h3 className="font-medium text-sm">O que acontece ao solicitar exclusão:</h3>
                  
                  <div className="space-y-2">
                    <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <span className="text-red-500 text-lg">🗑️</span>
                      <div>
                        <p className="text-sm font-medium text-red-800">Excluído definitivamente</p>
                        <p className="text-xs text-red-700">
                          Nome, e-mail, telefone, foto, preferências, tokens e integrações.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <span className="text-amber-500 text-lg">🔒</span>
                      <div>
                        <p className="text-sm font-medium text-amber-800">Anonimizado</p>
                        <p className="text-xs text-amber-700">
                          Dados financeiros e comportamentais perdem vínculo com você, mantidos apenas para estatísticas.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <span className="text-blue-500 text-lg">⚖️</span>
                      <div>
                        <p className="text-sm font-medium text-blue-800">Retido por obrigação legal</p>
                        <p className="text-xs text-blue-700">
                          Registros de auditoria (sem dados pessoais) mantidos por até 10 anos, isolados e criptografados.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground">
                    <strong>Prazo de processamento:</strong> até 30 dias conforme LGPD. 
                    Você receberá confirmação por e-mail ao concluir.
                  </p>
                </div>

                <Button 
                  className="w-full"
                  onClick={() => setStep("confirm")}
                >
                  Entendi, continuar
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}

            {/* Step: Confirm */}
            {step === "confirm" && (
              <div className="space-y-4">
                <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
                    <div>
                      <p className="font-medium text-sm text-destructive">Ação irreversível</p>
                      <p className="text-xs text-muted-foreground">
                        Após confirmada, não será possível recuperar seus dados pessoais. 
                        Certifique-se de exportar seus dados antes de continuar.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Checkbox 
                    id="agree" 
                    checked={agreed}
                    onCheckedChange={(checked) => setAgreed(checked === true)}
                  />
                  <label htmlFor="agree" className="text-sm cursor-pointer">
                    Li e compreendi que meus dados pessoais serão excluídos ou anonimizados, 
                    e que alguns registros podem ser mantidos por obrigação legal.
                  </label>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setStep("info")}
                  >
                    Voltar
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={handleSendCode}
                    disabled={!agreed || sendCode.isPending}
                  >
                    {sendCode.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4 mr-2" />
                        Receber código
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Step: Code verification */}
            {step === "code" && (
              <div className="space-y-4">
                <div className="text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <Mail className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-medium">Digite o código</h3>
                  <p className="text-sm text-muted-foreground">
                    Enviamos um código de 6 dígitos para seu e-mail. O código expira em 15 minutos.
                  </p>
                </div>

                <div className="flex justify-center py-4">
                  <InputOTP 
                    maxLength={6} 
                    value={code}
                    onChange={setCode}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setStep("confirm");
                      setCode("");
                    }}
                  >
                    Voltar
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={handleVerifyCode}
                    disabled={code.length !== 6 || verifyCode.isPending}
                  >
                    {verifyCode.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Verificando...
                      </>
                    ) : (
                      "Confirmar exclusão"
                    )}
                  </Button>
                </div>

                <button 
                  className="w-full text-center text-sm text-primary hover:underline disabled:opacity-50"
                  onClick={handleSendCode}
                  disabled={sendCode.isPending}
                >
                  Reenviar código
                </button>
              </div>
            )}

            {/* Step: Success */}
            {step === "success" && (
              <div className="space-y-4 text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">Solicitação registrada!</h3>
                  <p className="text-sm text-muted-foreground">
                    Sua solicitação de exclusão foi registrada com sucesso. 
                    O processamento será concluído em até 30 dias.
                  </p>
                </div>

                <div className="bg-muted/50 rounded-lg p-4 text-left space-y-2">
                  <p className="text-sm font-medium">Próximos passos:</p>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Você pode continuar usando o app normalmente até o processamento</li>
                    <li>Enviaremos um e-mail quando a exclusão for concluída</li>
                    <li>Você pode cancelar a solicitação a qualquer momento</li>
                  </ul>
                </div>

                <Button
                  className="w-full"
                  onClick={() => onOpenChange(false)}
                >
                  Entendi
                </Button>
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
