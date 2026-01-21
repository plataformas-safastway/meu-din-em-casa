import { forwardRef } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { CategoryExpense } from "@/types/finance";
import { getCategoryById } from "@/data/categories";
import { formatCurrency, formatPercentage } from "@/lib/formatters";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface CategoryChartProps {
  categories: CategoryExpense[];
  onViewAll?: () => void;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const CustomTooltip = forwardRef<HTMLDivElement, any>(({ active, payload }, ref) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const category = getCategoryById(data.category);
    
    return (
      <div ref={ref} className="bg-card rounded-lg shadow-lg border border-border p-3 z-50">
        <div className="flex items-center gap-2">
          <span className="text-lg">{category?.icon}</span>
          <span className="font-medium">{category?.name}</span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {formatCurrency(data.amount)} ({formatPercentage(data.percentage)})
        </p>
      </div>
    );
  }
  return null;
});

CustomTooltip.displayName = "CustomTooltip";

export function CategoryChart({ categories, onViewAll }: CategoryChartProps) {
  const chartData = categories.map(cat => ({
    ...cat,
    name: getCategoryById(cat.category)?.name || cat.category,
  }));

  return (
    <div className="stat-card animate-fade-in">
      <h3 className="font-semibold text-foreground mb-4">Despesas por Categoria</h3>
      
      <div className="flex items-center gap-6">
        {/* Chart */}
        <div className="w-32 h-32">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={55}
                paddingAngle={3}
                dataKey="amount"
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.color}
                    stroke="none"
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-2">
          {categories.slice(0, 4).map((cat) => {
            const category = getCategoryById(cat.category);
            const changeIcon = cat.change && cat.change > 0 
              ? <TrendingUp className="w-3 h-3 text-destructive" />
              : cat.change && cat.change < 0 
              ? <TrendingDown className="w-3 h-3 text-success" />
              : <Minus className="w-3 h-3 text-muted-foreground" />;
            
            return (
              <div key={cat.category} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0" 
                  style={{ backgroundColor: cat.color }}
                />
                <span className="text-sm truncate flex-1">
                  {category?.icon} {category?.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatPercentage(cat.percentage)}
                </span>
                {cat.change !== undefined && (
                  <span className="flex-shrink-0">
                    {changeIcon}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      <button 
        onClick={onViewAll}
        className="w-full mt-4 text-sm text-primary hover:text-primary/80 font-medium transition-colors"
      >
        Ver todas as categorias →
      </button>
    </div>
  );
}
