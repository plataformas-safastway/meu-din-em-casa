import { forwardRef } from "react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { MonthlyBalance } from "@/types/finance";
import { formatCurrency } from "@/lib/formatters";

interface MonthlyChartProps {
  data: MonthlyBalance[];
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const CustomTooltip = forwardRef<HTMLDivElement, any>(({ active, payload, label }, ref) => {
  if (active && payload && payload.length) {
    return (
      <div ref={ref} className="bg-card rounded-lg shadow-lg border border-border p-3 z-50">
        <p className="font-medium text-foreground mb-2">{label}</p>
        <div className="space-y-1">
          <p className="text-sm text-success">
            Receitas: {formatCurrency(payload[0]?.value || 0)}
          </p>
          <p className="text-sm text-destructive">
            Despesas: {formatCurrency(payload[1]?.value || 0)}
          </p>
        </div>
      </div>
    );
  }
  return null;
});

CustomTooltip.displayName = "CustomTooltip";

export function MonthlyChart({ data }: MonthlyChartProps) {
  return (
    <div className="stat-card animate-fade-in">
      <h3 className="font-semibold text-foreground mb-4">Evolução Mensal</h3>
      
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={2}>
            <XAxis 
              dataKey="month" 
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis hide />
            <Tooltip content={<CustomTooltip />} />
            <Bar 
              dataKey="income" 
              fill="hsl(var(--success))" 
              radius={[4, 4, 0, 0]}
              maxBarSize={20}
            />
            <Bar 
              dataKey="expenses" 
              fill="hsl(var(--destructive))" 
              radius={[4, 4, 0, 0]}
              maxBarSize={20}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center justify-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-success" />
          <span className="text-xs text-muted-foreground">Receitas</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-destructive" />
          <span className="text-xs text-muted-foreground">Despesas</span>
        </div>
      </div>
    </div>
  );
}
