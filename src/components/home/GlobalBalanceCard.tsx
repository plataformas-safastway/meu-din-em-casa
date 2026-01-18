import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, ChevronRight, Building2 } from "lucide-react";
import { formatCurrency, formatPercentage } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { AccountPreview } from "@/hooks/useHomeSummary";
import { Button } from "@/components/ui/button";

interface GlobalBalanceCardProps {
  balance: number;
  income: number;
  expenses: number;
  savingsRate: number;
  accounts: AccountPreview[];
  hasMoreAccounts: boolean;
  totalAccounts: number;
  onLearnMore?: () => void;
}

export function GlobalBalanceCard({
  balance,
  income,
  expenses,
  savingsRate,
  accounts,
  hasMoreAccounts,
  totalAccounts,
  onLearnMore,
}: GlobalBalanceCardProps) {
  const isPositive = balance >= 0;

  return (
    <div className="relative overflow-hidden rounded-3xl gradient-primary p-6 text-primary-foreground animate-fade-in">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
      
      <div className="relative space-y-4">
        {/* Global Balance */}
        <div className="space-y-1">
          <p className="text-sm text-primary-foreground/80 font-medium">
            Saldo Global
          </p>
          <p className="text-3xl font-bold tracking-tight">
            {formatCurrency(balance)}
          </p>
        </div>

        {/* Income/Expenses Grid */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-primary-foreground/70">Receitas</p>
              <p className="text-sm font-semibold">{formatCurrency(income)}</p>
            </div>
          </div>

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

        {/* Accounts Preview */}
        {accounts.length > 0 && (
          <div className="pt-3 border-t border-white/20 space-y-2">
            <p className="text-xs text-primary-foreground/70 font-medium uppercase tracking-wide">
              Por Conta
            </p>
            {accounts.map((account) => (
              <div key={account.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-primary-foreground/70" />
                  <span className="text-sm truncate max-w-[180px]">{account.label}</span>
                </div>
                <span className={cn(
                  "text-sm font-semibold",
                  account.balance < 0 && "text-red-300"
                )}>
                  {formatCurrency(account.balance)}
                </span>
              </div>
            ))}
            
            {hasMoreAccounts && (
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-primary-foreground/80 hover:text-primary-foreground hover:bg-white/10 mt-2"
                onClick={onLearnMore}
              >
                Ver todas as {totalAccounts} contas
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        )}

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
