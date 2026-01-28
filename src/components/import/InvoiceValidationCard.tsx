import { AlertTriangle, CheckCircle2, CreditCard, Calendar, Receipt, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/formatters";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useState } from "react";

export interface CreditCardInvoiceInfo {
  issuer: string;
  invoiceTotal: number | null;
  dueDate: string | null;
  closingDate: string | null;
  last4: string | null;
  transactionsSum: number;
  discrepancy: number | null;
  discrepancyPercent: number | null;
  needsReview: boolean;
}

interface InvoiceValidationCardProps {
  invoiceInfo: CreditCardInvoiceInfo;
  transactionCount: number;
  className?: string;
}

export function InvoiceValidationCard({ 
  invoiceInfo, 
  transactionCount,
  className 
}: InvoiceValidationCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const hasDiscrepancy = invoiceInfo.needsReview && invoiceInfo.discrepancy !== null;
  
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className={cn(
        "rounded-xl border p-4 space-y-3",
        hasDiscrepancy 
          ? "border-warning bg-warning/5" 
          : "border-success/50 bg-success/5",
        className
      )}>
        {/* Header */}
        <CollapsibleTrigger className="w-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center",
                hasDiscrepancy ? "bg-warning/20" : "bg-success/20"
              )}>
                <Receipt className={cn(
                  "w-5 h-5",
                  hasDiscrepancy ? "text-warning" : "text-success"
                )} />
              </div>
              <div className="text-left">
                <p className="font-semibold text-foreground">
                  Fatura {invoiceInfo.issuer}
                </p>
                <p className="text-sm text-muted-foreground">
                  {transactionCount} transações detectadas
                </p>
              </div>
            </div>
            
            <Badge 
              variant="outline" 
              className={cn(
                "text-xs",
                hasDiscrepancy ? "text-warning border-warning" : "text-success border-success"
              )}
            >
              {hasDiscrepancy ? (
                <>
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Revisão necessária
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Validada
                </>
              )}
            </Badge>
          </div>
        </CollapsibleTrigger>
        
        <CollapsibleContent className="space-y-3">
          {/* Invoice Details */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border/50">
            {invoiceInfo.invoiceTotal !== null && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Total da fatura</p>
                <p className="font-semibold text-foreground">
                  {formatCurrency(invoiceInfo.invoiceTotal)}
                </p>
              </div>
            )}
            
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Soma das transações</p>
              <p className="font-semibold text-foreground">
                {formatCurrency(invoiceInfo.transactionsSum)}
              </p>
            </div>
            
            {invoiceInfo.dueDate && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Vencimento
                </p>
                <p className="text-sm font-medium text-foreground">
                  {formatDate(invoiceInfo.dueDate)}
                </p>
              </div>
            )}
            
            {invoiceInfo.last4 && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <CreditCard className="w-3 h-3" />
                  Cartão
                </p>
                <p className="text-sm font-medium text-foreground font-mono">
                  ****{invoiceInfo.last4}
                </p>
              </div>
            )}
          </div>
          
          {/* Discrepancy Warning */}
          {hasDiscrepancy && invoiceInfo.discrepancy !== null && (
            <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-warning">
                    Divergência detectada: {formatCurrency(invoiceInfo.discrepancy)}
                    {invoiceInfo.discrepancyPercent !== null && (
                      <span className="text-xs ml-1">
                        ({invoiceInfo.discrepancyPercent.toFixed(1)}%)
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    A soma das transações não coincide com o total da fatura. 
                    Revise as transações antes de confirmar.
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* No total available info */}
          {invoiceInfo.invoiceTotal === null && (
            <div className="p-3 rounded-lg bg-muted/50 border border-border">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground">
                  Não foi possível detectar o valor total da fatura para validação automática.
                  Revise as transações manualmente.
                </p>
              </div>
            </div>
          )}
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}
