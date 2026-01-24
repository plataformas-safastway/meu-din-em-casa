import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard, Calendar, TrendingUp, Info } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface CreditCardInstallment {
  cardName: string;
  description: string;
  installmentNumber: number;
  totalInstallments: number;
  amount: number;
  dueDay?: number;
}

interface ProjectionCreditCardBreakdownProps {
  installments: CreditCardInstallment[];
  totalAmount: number;
  monthLabel: string;
}

export function ProjectionCreditCardBreakdown({
  installments,
  totalAmount,
  monthLabel,
}: ProjectionCreditCardBreakdownProps) {
  if (installments.length === 0) return null;

  // Group by card
  const byCard = installments.reduce((acc, inst) => {
    const key = inst.cardName || "Cartão";
    if (!acc[key]) acc[key] = [];
    acc[key].push(inst);
    return acc;
  }, {} as Record<string, CreditCardInstallment[]>);

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" />
            Parcelas do Cartão em {monthLabel}
          </div>
          <Tooltip>
            <TooltipTrigger>
              <Info className="w-4 h-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p className="text-xs">
                Parcelar espalha o impacto no tempo — pode ser bom para grandes 
                compras planejadas, mas requer atenção ao total comprometido.
              </p>
            </TooltipContent>
          </Tooltip>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total Summary */}
        <div className="bg-primary/10 rounded-xl p-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total em parcelas</span>
            <span className="text-lg font-bold">{formatCurrency(totalAmount)}</span>
          </div>
        </div>

        {/* Cards Breakdown */}
        {Object.entries(byCard).map(([cardName, cardInstallments], cardIdx) => {
          const cardTotal = cardInstallments.reduce((sum, i) => sum + i.amount, 0);
          
          return (
            <motion.div
              key={cardName}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: cardIdx * 0.1 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium flex items-center gap-2">
                  <CreditCard className="w-3 h-3 text-muted-foreground" />
                  {cardName}
                </span>
                <span className="text-muted-foreground">
                  {formatCurrency(cardTotal)}
                </span>
              </div>
              
              <div className="space-y-1.5 pl-5">
                {cardInstallments.map((inst, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center justify-between text-xs py-1.5 px-2 rounded-lg bg-muted/30"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium">{inst.description}</p>
                      <p className="text-muted-foreground">
                        Parcela {inst.installmentNumber}/{inst.totalInstallments}
                      </p>
                    </div>
                    <span className="font-medium ml-2">
                      {formatCurrency(inst.amount)}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })}

        {/* Educational Hint */}
        <div className="flex items-start gap-2 p-3 bg-info/10 rounded-xl border border-info/20">
          <TrendingUp className="w-4 h-4 text-info flex-shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            Este cartão concentra mais parcelas neste período. Acompanhe para 
            evitar surpresas na fatura.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
