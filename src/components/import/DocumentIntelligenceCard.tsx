import { Building2, CreditCard, CheckCircle2, AlertCircle, Info, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface DetectedInfo {
  bankName: string | null;
  documentType: string | null;
  agency?: string | null;
  accountNumber?: string | null;
  last4?: string | null;
}

interface DocumentIntelligenceCardProps {
  detected: DetectedInfo | null;
  confidenceLevel?: "HIGH" | "MEDIUM" | "LOW";
  className?: string;
}

export function DocumentIntelligenceCard({ 
  detected, 
  confidenceLevel = "HIGH",
  className 
}: DocumentIntelligenceCardProps) {
  if (!detected?.bankName && !detected?.documentType) {
    return null;
  }

  const isBank = detected.documentType === "bank_statement" || 
                 detected.documentType === "BANK_STATEMENT" ||
                 !detected.documentType?.toLowerCase().includes("card");

  const isCreditCard = detected.documentType?.toLowerCase().includes("credit") ||
                       detected.documentType?.toLowerCase().includes("card") ||
                       detected.documentType?.toLowerCase().includes("fatura");

  const getConfidenceConfig = () => {
    switch (confidenceLevel) {
      case "HIGH":
        return {
          label: "Confiança alta",
          color: "text-success",
          bg: "bg-success/10",
          icon: CheckCircle2,
          iconColor: "text-success",
        };
      case "MEDIUM":
        return {
          label: "Confiança média",
          color: "text-warning",
          bg: "bg-warning/10",
          icon: Info,
          iconColor: "text-warning",
        };
      case "LOW":
        return {
          label: "Baixa confiança",
          color: "text-destructive",
          bg: "bg-destructive/10",
          icon: AlertCircle,
          iconColor: "text-destructive",
        };
    }
  };

  const confidenceConfig = getConfidenceConfig();
  const ConfidenceIcon = confidenceConfig.icon;

  const displayType = isCreditCard ? "Fatura de Cartão" : "Extrato Bancário";
  const TypeIcon = isCreditCard ? CreditCard : Building2;

  // Format account info for display
  const accountDisplay = detected.agency && detected.accountNumber
    ? `Ag ${detected.agency} • C/C ••••${detected.accountNumber.slice(-4)}`
    : detected.accountNumber
    ? `Conta ••••${detected.accountNumber.slice(-4)}`
    : detected.last4
    ? `Final ****${detected.last4}`
    : null;

  return (
    <div className={cn(
      "rounded-xl border border-border p-4 space-y-3",
      confidenceConfig.bg,
      className
    )}>
      {/* Header with sparkles */}
      <div className="flex items-center gap-2 text-sm">
        <Sparkles className="w-4 h-4 text-primary" />
        <span className="font-medium text-foreground">Detecção inteligente</span>
        <Badge 
          variant="outline" 
          className={cn("ml-auto text-xs", confidenceConfig.color)}
        >
          <ConfidenceIcon className={cn("w-3 h-3 mr-1", confidenceConfig.iconColor)} />
          {confidenceConfig.label}
        </Badge>
      </div>

      {/* Document type and bank */}
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center",
          isCreditCard ? "bg-secondary/20" : "bg-primary/10"
        )}>
          <TypeIcon className={cn(
            "w-6 h-6",
            isCreditCard ? "text-secondary-foreground" : "text-primary"
          )} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground truncate">
            {detected.bankName || "Instituição não identificada"}
          </p>
          <p className="text-sm text-muted-foreground">
            {displayType}
          </p>
          {accountDisplay && (
            <p className="text-xs text-muted-foreground font-mono mt-0.5">
              {accountDisplay}
            </p>
          )}
        </div>
      </div>

      {/* Low confidence warning */}
      {confidenceLevel === "LOW" && (
        <p className="text-xs text-muted-foreground flex items-start gap-2 pt-2 border-t border-border/50">
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 text-warning shrink-0" />
          <span>
            Verifique se as informações estão corretas. A identificação pode não estar precisa.
          </span>
        </p>
      )}
    </div>
  );
}
