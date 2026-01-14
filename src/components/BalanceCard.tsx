import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { formatCurrency, formatPercentage } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface BalanceCardProps {
  balance: number;
  income: number;
  expenses: number;
  savingsRate: number;
}

export function BalanceCard({ balance, income, expenses, savingsRate }: BalanceCardProps) {
  const isPositive = balance >= 0;

  return (
    <div className="relative overflow-hidden rounded-3xl gradient-primary p-6 text-primary-foreground animate-fade-in">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
      
      <div className="relative space-y-4">
        {/* Balance */}
        <div className="space-y-1">
          <p className="text-sm text-primary-foreground/80 font-medium">
            Saldo da Família
          </p>
          <p className="text-3xl font-bold tracking-tight">
            {formatCurrency(balance)}
          </p>
        </div>

        {/* Income/Expenses Grid */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          {/* Income */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-primary-foreground/70">Receitas</p>
              <p className="text-sm font-semibold">{formatCurrency(income)}</p>
            </div>
          </div>

          {/* Expenses */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <ArrowDownRight className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-primary-foreground/70">Despesas</p>
              <p className="text-sm font-semibold">{formatCurrency(expenses)}</p>
            </div>
          </div>
        </div>

        {/* Savings Rate */}
        <div className="flex items-center justify-between pt-3 border-t border-white/20">
          <span className="text-sm text-primary-foreground/80">Taxa de poupança</span>
          <div className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-full text-sm font-semibold",
            isPositive ? "bg-white/20" : "bg-destructive/30"
          )}>
            {isPositive ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span>{formatPercentage(savingsRate)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
