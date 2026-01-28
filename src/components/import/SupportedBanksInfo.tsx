import { Building2, CheckCircle2, AlertCircle, Info, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from "react";

interface SupportedBanksInfoProps {
  className?: string;
  variant?: "compact" | "full";
}

// Supported banks for credit card invoice parsing
const SUPPORTED_CREDIT_CARD_BANKS = [
  { name: "Nubank", logo: "🟣" },
  { name: "Itaú", logo: "🟠" },
  { name: "Inter", logo: "🟠" },
  { name: "Bradesco", logo: "🔴" },
  { name: "Santander", logo: "🔴" },
  { name: "C6 Bank", logo: "⚫" },
  { name: "BTG Pactual", logo: "🔵" },
];

// Supported banks for bank statement parsing
const SUPPORTED_BANK_STATEMENT_BANKS = [
  { name: "Bradesco", logo: "🔴" },
  { name: "BTG Pactual", logo: "🔵" },
  { name: "Itaú", logo: "🟠" },
  { name: "Santander", logo: "🔴" },
  { name: "Nubank", logo: "🟣" },
  { name: "Inter", logo: "🟠" },
  { name: "C6 Bank", logo: "⚫" },
];

export function SupportedBanksInfo({ className, variant = "compact" }: SupportedBanksInfoProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  if (variant === "compact") {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger className="w-full">
          <div className={cn(
            "flex items-center justify-between p-3 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors",
            className
          )}>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Info className="w-4 h-4" />
              <span>Ver bancos suportados</span>
            </div>
            <Badge variant="secondary" className="text-xs">
              {SUPPORTED_CREDIT_CARD_BANKS.length} bancos
            </Badge>
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="pt-2">
          <div className="p-4 rounded-lg border border-border bg-background space-y-4">
            {/* Credit Card Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <CreditCard className="w-4 h-4 text-primary" />
                Faturas de Cartão de Crédito
              </div>
              <div className="flex flex-wrap gap-2">
                {SUPPORTED_CREDIT_CARD_BANKS.map((bank) => (
                  <Badge key={bank.name} variant="outline" className="text-xs">
                    <span className="mr-1">{bank.logo}</span>
                    {bank.name}
                  </Badge>
                ))}
              </div>
            </div>
            
            {/* Bank Statement Section */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Building2 className="w-4 h-4 text-primary" />
                Extratos Bancários
              </div>
              <div className="flex flex-wrap gap-2">
                {SUPPORTED_BANK_STATEMENT_BANKS.map((bank) => (
                  <Badge key={bank.name} variant="outline" className="text-xs">
                    <span className="mr-1">{bank.logo}</span>
                    {bank.name}
                  </Badge>
                ))}
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground pt-2 border-t border-border">
              💡 Para outros bancos, recomendamos exportar o extrato em formato OFX (Open Financial Exchange).
            </p>
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  }
  
  // Full variant
  return (
    <div className={cn(
      "p-4 rounded-xl border border-border bg-muted/30 space-y-4",
      className
    )}>
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <CheckCircle2 className="w-4 h-4 text-success" />
        Bancos com importação automática
      </div>
      
      {/* Credit Card Section */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CreditCard className="w-3 h-3" />
          Faturas de Cartão
        </div>
        <div className="flex flex-wrap gap-2">
          {SUPPORTED_CREDIT_CARD_BANKS.map((bank) => (
            <Badge key={bank.name} variant="secondary" className="text-xs">
              <span className="mr-1">{bank.logo}</span>
              {bank.name}
            </Badge>
          ))}
        </div>
      </div>
      
      {/* Bank Statement Section */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Building2 className="w-3 h-3" />
          Extratos Bancários
        </div>
        <div className="flex flex-wrap gap-2">
          {SUPPORTED_BANK_STATEMENT_BANKS.map((bank) => (
            <Badge key={bank.name} variant="secondary" className="text-xs">
              <span className="mr-1">{bank.logo}</span>
              {bank.name}
            </Badge>
          ))}
        </div>
      </div>
      
      <div className="pt-3 border-t border-border space-y-2">
        <div className="flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <div className="text-xs text-muted-foreground">
            <p className="font-medium text-foreground mb-1">Importante:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>PDFs escaneados ou baseados em imagem não são suportados</li>
              <li>Para melhores resultados, exporte PDFs diretamente do app/internet banking</li>
              <li>Formato OFX é sempre recomendado para maior precisão</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
