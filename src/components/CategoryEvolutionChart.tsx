import { useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatters";
import { format, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface Subcategory {
  id: string;
  name: string;
}

interface CategoryEvolutionChartProps {
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  subcategories: Subcategory[];
  transactions: any[];
  type: 'expense' | 'income';
}

// Generate distinct colors for subcategories
const generateSubcategoryColors = (baseColor: string, count: number): string[] => {
  const colors: string[] = [];
  for (let i = 0; i < count; i++) {
    const hueShift = (i * 30) % 360;
    colors.push(`hsl(${hueShift}, 70%, 50%)`);
  }
  return colors;
};

export function CategoryEvolutionChart({ 
  categoryId, 
  categoryName, 
  categoryColor,
  subcategories,
  transactions,
  type
}: CategoryEvolutionChartProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const { chartData, hasData, subcategoryData, subcategoriesWithData } = useMemo(() => {
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

    // Aggregate transactions by month for this category (total)
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

    // Aggregate by subcategory for expanded view
    const subData: Record<string, { name: string; data: number[] }> = {};
    const activeSubcategories: Subcategory[] = [];

    subcategories.forEach(sub => {
      const subTotals = months.map(({ month, year }) => {
        const monthTransactions = transactions.filter((t: any) => {
          const tDate = new Date(t.date);
          return (
            tDate.getMonth() === month &&
            tDate.getFullYear() === year &&
            t.category_id === categoryId &&
            t.subcategory_id === sub.id &&
            t.type === type
          );
        });
        return monthTransactions.reduce((sum: number, t: any) => sum + (Number(t.amount) || 0), 0);
      });

      if (subTotals.some(v => v > 0)) {
        subData[sub.id] = { name: sub.name, data: subTotals };
        activeSubcategories.push(sub);
      }
    });

    // Build expanded chart data with subcategory columns
    const expandedData = months.map(({ month, year, label }, idx) => {
      const row: any = {
        name: label.charAt(0).toUpperCase() + label.slice(1),
        month,
        year
      };
      
      activeSubcategories.forEach(sub => {
        row[sub.id] = subData[sub.id]?.data[idx] || 0;
      });

      return row;
    });

    return {
      chartData: data,
      hasData: data.some(d => d.total > 0),
      subcategoryData: expandedData,
      subcategoriesWithData: activeSubcategories
    };
  }, [transactions, categoryId, subcategories, type]);

  if (!hasData) {
    return null;
  }

  const subcategoryColors = generateSubcategoryColors(categoryColor, subcategoriesWithData.length);
  const hasSubcategories = subcategoriesWithData.length > 0;

  return (
    <Card className="bg-card border-border/30">
      <CardHeader className="pb-2">
        <CardTitle 
          className={cn(
            "text-sm font-medium text-foreground flex items-center justify-between",
            hasSubcategories && "cursor-pointer hover:text-primary transition-colors"
          )}
          onClick={() => hasSubcategories && setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            <span 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: categoryColor }} 
            />
            {categoryName}
            {hasSubcategories && (
              <span className="text-xs text-muted-foreground">
                ({subcategoriesWithData.length} subcategorias)
              </span>
            )}
          </div>
          {hasSubcategories && (
            isExpanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {/* Summary Chart (always visible) */}
        <div className={cn("transition-all", isExpanded ? "h-[100px]" : "h-[120px]")}>
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
                formatter={(value: number) => [formatCurrency(value), 'Total']}
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

        {/* Expanded Subcategory Chart */}
        {isExpanded && hasSubcategories && (
          <div className="mt-4 pt-4 border-t border-border/30">
            <p className="text-xs text-muted-foreground mb-3">Detalhamento por subcategoria</p>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={subcategoryData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
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
                    formatter={(value: number, name: string) => {
                      const sub = subcategoriesWithData.find(s => s.id === name);
                      return [formatCurrency(value), sub?.name || name];
                    }}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                  />
                  <Legend 
                    formatter={(value) => {
                      const sub = subcategoriesWithData.find(s => s.id === value);
                      return <span className="text-xs">{sub?.name || value}</span>;
                    }}
                    wrapperStyle={{ fontSize: '10px' }}
                  />
                  {subcategoriesWithData.map((sub, idx) => (
                    <Line 
                      key={sub.id}
                      type="monotone" 
                      dataKey={sub.id}
                      name={sub.id}
                      stroke={subcategoryColors[idx]}
                      strokeWidth={1.5}
                      dot={{ fill: subcategoryColors[idx], strokeWidth: 0, r: 2 }}
                      activeDot={{ r: 4, strokeWidth: 0 }}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface Category {
  id: string;
  name: string;
  color: string;
  subcategories: Subcategory[];
}

interface CategoryEvolutionSectionProps {
  categories: Category[];
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
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Nenhuma {type === 'expense' ? 'despesa' : 'receita'} encontrada nos últimos 6 meses.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-foreground flex items-center gap-2">
        📊 Evolução dos últimos 6 meses
      </h3>
      <p className="text-xs text-muted-foreground -mt-2">
        Clique em uma categoria para ver o detalhamento por subcategoria
      </p>
      <div className="grid gap-3">
        {categoriesWithData.map(category => (
          <CategoryEvolutionChart
            key={category.id}
            categoryId={category.id}
            categoryName={category.name}
            categoryColor={category.color}
            subcategories={category.subcategories}
            transactions={allTransactions}
            type={type}
          />
        ))}
      </div>
    </div>
  );
}
