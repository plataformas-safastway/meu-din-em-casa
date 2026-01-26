import { TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight, ChevronRight, Building2, Sparkles } from "lucide-react";
import { formatCurrency, formatPercentage } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { AccountPreview } from "@/hooks/useHomeSummary";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

interface GlobalBalanceCardProps {
  balance: number;
  income: number;
  expenses: number;
  savingsRate: number;
  accounts: AccountPreview[];
  hasMoreAccounts: boolean;
  totalAccounts: number;
  onLearnMore?: () => void;
  /** CTA: Add expense */
  onAddExpense?: (accountId?: string) => void;
  /** CTA: Add income */
  onAddIncome?: (accountId?: string) => void;
  /** CTA: View statement */
  onViewStatement?: (accountId?: string) => void;
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
  onAddExpense,
  onAddIncome,
  onViewStatement,
}: GlobalBalanceCardProps) {
  const isPositive = balance >= 0;
  const savingsIsGood = savingsRate >= 10;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="relative overflow-hidden rounded-3xl gradient-primary p-6 text-primary-foreground"
    >
      {/* Animated background decorations */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 animate-pulse-soft" />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
      <div className="absolute top-1/2 right-1/4 w-16 h-16 bg-white/5 rounded-full animate-pulse-soft" style={{ animationDelay: '1s' }} />
      
      <div className="relative space-y-4">
        {/* Global Balance with animation */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className="text-sm text-primary-foreground/80 font-medium">
              Saldo Global
            </p>
            {savingsIsGood && (
              <motion.span 
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-1 text-xs bg-white/20 px-2 py-0.5 rounded-full"
              >
                <Sparkles className="w-3 h-3" />
                Ótimo!
              </motion.span>
            )}
          </div>
          <motion.p 
            key={balance}
            initial={{ opacity: 0.5 }}
            animate={{ opacity: 1 }}
            className="text-3xl font-bold tracking-tight"
          >
            {formatCurrency(balance)}
          </motion.p>
        </div>

        {/* Income/Expenses Grid - Clickable for CTAs */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onAddIncome?.()}
            className="flex items-center gap-3 p-2 rounded-xl bg-white/5 transition-colors hover:bg-white/10 text-left"
          >
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-primary-foreground/70">Receitas</p>
              <p className="text-sm font-semibold">{formatCurrency(income)}</p>
            </div>
          </motion.button>

          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onAddExpense?.()}
            className="flex items-center gap-3 p-2 rounded-xl bg-white/5 transition-colors hover:bg-white/10 text-left"
          >
            <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
              <ArrowDownRight className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-primary-foreground/70">Despesas</p>
              <p className="text-sm font-semibold">{formatCurrency(expenses)}</p>
            </div>
          </motion.button>
        </div>

        {/* Accounts Preview */}
        {accounts.length > 0 && (
          <div className="pt-3 border-t border-white/20 space-y-2">
            <p className="text-xs text-primary-foreground/70 font-medium uppercase tracking-wide">
              Por Conta
            </p>
            {accounts.map((account, index) => (
              <motion.button 
                key={account.id} 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                onClick={() => onViewStatement?.(account.id)}
                className="flex items-center justify-between w-full hover:bg-white/5 rounded-lg p-1 -mx-1 transition-colors"
              >
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
              </motion.button>
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

        {/* Savings Rate - Enhanced visual */}
        <div className="flex items-center justify-between pt-3 border-t border-white/20">
          <span className="text-sm text-primary-foreground/80">Taxa de poupança</span>
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className={cn(
              "flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-semibold transition-colors",
              isPositive ? "bg-white/20" : "bg-destructive/30"
            )}
          >
            {isPositive ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span>{formatPercentage(savingsRate)}</span>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}