import { useState } from "react";
import { 
  ChevronDown, 
  ChevronUp, 
  HelpCircle, 
  Store, 
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { EvidenceItem, MerchantResolution } from "@/lib/merchantEnrichment";

interface MerchantEvidenceCardProps {
  resolution: MerchantResolution | null;
  originalDescriptor: string;
  className?: string;
  onApplyAndLearn?: () => void;
}

export function MerchantEvidenceCard({
  resolution,
  originalDescriptor,
  className,
  onApplyAndLearn,
}: MerchantEvidenceCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  if (!resolution || resolution.confidence === 0) {
    return (
      <div className={cn("flex items-center gap-2 text-xs text-muted-foreground", className)}>
        <HelpCircle className="w-3.5 h-3.5" />
        <span className="italic">Não conseguimos identificar este comerciante</span>
      </div>
    );
  }
  
  const confidenceColor = 
    resolution.confidence >= 0.85 ? "text-success" :
    resolution.confidence >= 0.6 ? "text-warning" :
    "text-muted-foreground";
  
  const confidenceLabel =
    resolution.confidence >= 0.85 ? "Alta confiança" :
    resolution.confidence >= 0.6 ? "Média confiança" :
    "Baixa confiança";

  return (
    <div className={cn("rounded-lg border bg-card/50 overflow-hidden", className)}>
      {/* Header: Merchant suggestion */}
      <div className="p-3 flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <Store className="w-4 h-4 text-primary" />
        </div>
        
        <div className="flex-1 min-w-0">
          {/* Merchant name */}
          {resolution.merchantLabel ? (
            <p className="font-medium text-sm truncate">
              Parece ser: <span className="text-primary">{resolution.merchantLabel}</span>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              Comerciante não identificado
            </p>
          )}
          
          {/* Original descriptor */}
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {originalDescriptor}
          </p>
          
          {/* Confidence badge */}
          <div className="flex items-center gap-2 mt-1.5">
            <Badge 
              variant="outline" 
              className={cn("text-xs", confidenceColor)}
            >
              {confidenceLabel}
            </Badge>
            
            {resolution.isIntermediary && (
              <Badge variant="outline" className="text-xs text-warning">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Intermediador
              </Badge>
            )}
          </div>
        </div>
      </div>
      
      {/* Evidence expandable section */}
      {resolution.evidence.length > 0 && (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full rounded-none border-t h-8 text-xs text-muted-foreground hover:text-foreground"
            >
              {isOpen ? (
                <ChevronUp className="w-3.5 h-3.5 mr-1.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 mr-1.5" />
              )}
              {isOpen ? "Esconder detalhes" : "Ver por que sugerimos isso"}
            </Button>
          </CollapsibleTrigger>
          
          <CollapsibleContent>
            <div className="p-3 pt-2 border-t bg-muted/30 space-y-2">
              {resolution.evidence.map((evidence, idx) => (
                <EvidenceRow key={idx} evidence={evidence} />
              ))}
              
              {/* Intermediary warning */}
              {resolution.isIntermediary && (
                <div className="flex items-start gap-2 p-2 rounded-md bg-warning/10 border border-warning/20">
                  <Lightbulb className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                  <p className="text-xs text-warning">
                    Este é um intermediador de pagamentos. O lojista real pode ser diferente.
                    Se você souber quem é, ajuste para melhorar sugestões futuras.
                  </p>
                </div>
              )}
              
              {/* Learn action */}
              {onApplyAndLearn && resolution.source !== 'UNKNOWN' && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="w-full mt-2"
                  onClick={onApplyAndLearn}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  Confirmar e lembrar para o futuro
                </Button>
              )}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

function EvidenceRow({ evidence }: { evidence: EvidenceItem }) {
  const iconMap = {
    CACHE_MATCH: <CheckCircle2 className="w-3.5 h-3.5 text-success" />,
    PLATFORM_DETECTED: <Store className="w-3.5 h-3.5 text-primary" />,
    HEURISTIC: <Lightbulb className="w-3.5 h-3.5 text-muted-foreground" />,
    USER_CONFIRMED: <CheckCircle2 className="w-3.5 h-3.5 text-success" />,
    FAMILY_HISTORY: <CheckCircle2 className="w-3.5 h-3.5 text-primary" />,
    BANK_FEE: <AlertTriangle className="w-3.5 h-3.5 text-warning" />,
  };
  
  return (
    <div className="flex items-start gap-2 text-xs">
      {iconMap[evidence.type] || <HelpCircle className="w-3.5 h-3.5" />}
      <span className="text-muted-foreground">{evidence.detail}</span>
    </div>
  );
}
