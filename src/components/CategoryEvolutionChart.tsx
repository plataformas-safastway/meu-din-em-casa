import { useMemo } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters";
import { format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

interface CategoryEvolutionChartProps {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  transactions: any[];
  type: 'expense' | 'income';
}

export function CategoryEvolutionChart({ 
  categoryId, 
  categoryName, 
  categoryColor,
  transactions,
  type
}: CategoryEvolutionChartProps) {
  const chartData = useMemo(() => {
    const now = new Date();
    const months: { month: number; year: number; label: string }[] = [];
    
    // Generate last 6 months
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(now, i);
      months.push({
        month: date.getMonth(),
        year: date.getFullYear(),
        label: format(date, "MMM", { locale: ptBR })
      });
    }

    // Aggregate transactions by month for this category
    const data = months.map(({ month, year, label }) => {
      const monthTransactions = transactions.filter((t: any) => {
        const tDate = new Date(t.date);
        return (
          tDate.getMonth() === month &&
          tDate.getFullYear() === year &&
          t.category_id === categoryId &&
          t.type === type
        );
      });

      const total = monthTransactions.reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);

      return {
        name: label.charAt(0).toUpperCase() + label.slice(1),
        total,
        month,
        year
      };
    });

    return data;
  }, [transactions, categoryId, type]);

  const hasData = chartData.some(d => d.total > 0);

  if (!hasData) {
    return null;
  }

  return (
    <Card className="bg-card border-border/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
          <span 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: categoryColor }} 
          />
          {categoryName}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="h-[120px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={{ stroke: 'hsl(var(--border))' }}
                tickLine={false}
              />
              <YAxis 
                tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(value) => value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value}
              />
              <Tooltip 
                formatter={(value: number) => [formatCurrency(value), type === 'expense' ? 'Despesa' : 'Receita']}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '12px'
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Line 
                type="monotone" 
                dataKey="total" 
                stroke={categoryColor}
                strokeWidth={2}
                dot={{ fill: categoryColor, strokeWidth: 0, r: 3 }}
                activeDot={{ r: 5, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

interface CategoryEvolutionSectionProps {
  categories: Array<{ id: string; name: string; color: string }>;
  allTransactions: any[];
  type: 'expense' | 'income';
}

export function CategoryEvolutionSection({ 
  categories, 
  allTransactions,
  type 
}: CategoryEvolutionSectionProps) {
  // Filter categories that have transactions
  const categoriesWithData = useMemo(() => {
    return categories.filter(cat => {
      const hasTransactions = allTransactions.some(
        t => t.category_id === cat.id && t.type === type
      );
      return hasTransactions;
    });
  }, [categories, allTransactions, type]);

  if (categoriesWithData.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-foreground flex items-center gap-2">
        📊 Evolução dos últimos 6 meses
      </h3>
      <div className="grid gap-3">
        {categoriesWithData.slice(0, 6).map(category => (
          <CategoryEvolutionChart
            key={category.id}
            categoryId={category.id}
            categoryName={category.name}
            categoryColor={category.color}
            transactions={allTransactions}
            type={type}
          />
        ))}
      </div>
    </div>
  );
}
