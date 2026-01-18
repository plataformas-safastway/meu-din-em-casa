import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, addMonths, subMonths } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MonthSelectorProps {
  selectedDate: Date;
  onMonthChange: (date: Date) => void;
}

export function MonthSelector({ selectedDate, onMonthChange }: MonthSelectorProps) {
  const handlePrevious = () => {
    onMonthChange(subMonths(selectedDate, 1));
  };

  const handleNext = () => {
    onMonthChange(addMonths(selectedDate, 1));
  };

  const handleCurrent = () => {
    onMonthChange(new Date());
  };

  const isCurrentMonth =
    selectedDate.getMonth() === new Date().getMonth() &&
    selectedDate.getFullYear() === new Date().getFullYear();

  return (
    <div className="flex items-center justify-between bg-card rounded-2xl p-3 border border-border/50">
      <Button
        variant="ghost"
        size="icon"
        onClick={handlePrevious}
        className="h-9 w-9 rounded-xl"
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>

      <button
        onClick={handleCurrent}
        className="flex flex-col items-center px-4 py-1 rounded-xl hover:bg-muted/50 transition-colors"
      >
        <span className="text-lg font-semibold capitalize">
          {format(selectedDate, "MMMM", { locale: ptBR })}
        </span>
        <span className="text-xs text-muted-foreground">
          {format(selectedDate, "yyyy")}
        </span>
        {!isCurrentMonth && (
          <span className="text-[10px] text-primary font-medium mt-0.5">
            Toque para voltar ao atual
          </span>
        )}
      </button>

      <Button
        variant="ghost"
        size="icon"
        onClick={handleNext}
        className="h-9 w-9 rounded-xl"
        disabled={isCurrentMonth}
      >
        <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  );
}
