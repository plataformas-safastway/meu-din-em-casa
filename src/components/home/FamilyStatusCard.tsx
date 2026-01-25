import { memo } from "react";
import { Shield, AlertTriangle, AlertCircle, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface FamilyStatusCardProps {
  balance: number;
  income: number;
  expenses: number;
  savingsRate: number;
}

type FinancialStatus = "tranquil" | "attention" | "critical";

function getFinancialStatus(balance: number, savingsRate: number, expenses: number, income: number): FinancialStatus {
  // Critical: negative balance or spending more than earning
  if (balance < 0 || expenses > income * 1.1) {
    return "critical";
  }
  
  // Attention: low savings rate or tight margins
  if (savingsRate < 10 || (income > 0 && expenses > income * 0.9)) {
    return "attention";
  }
  
  // Tranquil: healthy finances
  return "tranquil";
}

const statusConfig = {
  tranquil: {
    icon: Shield,
    title: "Hoje, sua família está financeiramente tranquila",
    gradient: "from-success/90 to-success",
    iconBg: "bg-success-foreground/20",
    textColor: "text-success-foreground",
  },
  attention: {
    icon: AlertTriangle,
    title: "Hoje, sua família precisa de atenção",
    gradient: "from-warning/90 to-warning",
    iconBg: "bg-warning-foreground/20",
    textColor: "text-warning-foreground",
  },
  critical: {
    icon: AlertCircle,
    title: "Hoje, vale parar e decidir com calma",
    gradient: "from-destructive/90 to-destructive",
    iconBg: "bg-destructive-foreground/20",
    textColor: "text-destructive-foreground",
  },
};

function getSubtext(status: FinancialStatus, balance: number, savingsRate: number, expenses: number, income: number): string {
  switch (status) {
    case "tranquil":
      if (savingsRate >= 20) {
        return "Vocês estão guardando bem. Excelente ritmo!";
      }
      return "Você tem margem este mês.";
    case "attention":
      if (savingsRate < 10 && savingsRate > 0) {
        return "A margem está apertada. Pequenos ajustes ajudam.";
      }
      return "Algumas despesas estão se aproximando do limite.";
    case "critical":
      if (balance < 0) {
        return `Despesas superaram receitas em ${formatCurrency(Math.abs(balance))}.`;
      }
      return "Antes de avançar, vale revisar.";
  }
}

export const FamilyStatusCard = memo(function FamilyStatusCard({
  balance,
  income,
  expenses,
  savingsRate,
}: FamilyStatusCardProps) {
  const status = getFinancialStatus(balance, savingsRate, expenses, income);
  const config = statusConfig[status];
  const subtext = getSubtext(status, balance, savingsRate, expenses, income);
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={cn(
        "relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br",
        config.gradient
      )}
    >
      {/* Decorative elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

      <div className="relative space-y-5">
        {/* Status Header */}
        <div className="flex items-start gap-3">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
            className={cn("p-2.5 rounded-2xl", config.iconBg)}
          >
            <Icon className={cn("w-6 h-6", config.textColor)} />
          </motion.div>
          <div className="space-y-1 flex-1">
            <h2 className={cn("text-lg font-semibold leading-tight", config.textColor)}>
              {config.title}
            </h2>
            <p className={cn("text-sm opacity-90", config.textColor)}>
              {subtext}
            </p>
          </div>
        </div>

        {/* Financial Summary - Clean reading */}
        <div className="grid grid-cols-3 gap-3 pt-2">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white/15 backdrop-blur-sm rounded-2xl p-3 text-center"
          >
            <p className={cn("text-[10px] uppercase tracking-wide opacity-80 mb-1", config.textColor)}>
              Saldo
            </p>
            <p className={cn("text-base font-bold", config.textColor)}>
              {formatCurrency(balance)}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white/15 backdrop-blur-sm rounded-2xl p-3 text-center"
          >
            <p className={cn("text-[10px] uppercase tracking-wide opacity-80 mb-1 flex items-center justify-center gap-1", config.textColor)}>
              <ArrowUpRight className="w-3 h-3" />
              Receita
            </p>
            <p className={cn("text-base font-bold", config.textColor)}>
              {formatCurrency(income)}
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-white/15 backdrop-blur-sm rounded-2xl p-3 text-center"
          >
            <p className={cn("text-[10px] uppercase tracking-wide opacity-80 mb-1 flex items-center justify-center gap-1", config.textColor)}>
              <ArrowDownRight className="w-3 h-3" />
              Despesa
            </p>
            <p className={cn("text-base font-bold", config.textColor)}>
              {formatCurrency(expenses)}
            </p>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
});
