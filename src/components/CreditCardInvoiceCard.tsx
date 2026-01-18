import { CreditCard } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { Card, CardContent } from "@/components/ui/card";

interface CreditCardInvoiceCardProps {
  total: number;
  transactionCount: number;
}

export function CreditCardInvoiceCard({ total, transactionCount }: CreditCardInvoiceCardProps) {
  if (total === 0) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-br from-slate-800 to-slate-900 text-white border-0 overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-white/70">Fatura do Cartão</p>
              <p className="text-lg font-bold">{formatCurrency(total)}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/70">{transactionCount} lançamento{transactionCount !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
