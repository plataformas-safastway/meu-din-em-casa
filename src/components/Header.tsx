import { Bell, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getGreeting, getCurrentMonth } from "@/lib/formatters";

interface HeaderProps {
  familyName?: string;
}

export function Header({ familyName = "Família" }: HeaderProps) {
  const greeting = getGreeting();
  const currentMonth = getCurrentMonth();

  return (
    <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border/50 safe-area-inset-top">
      <div className="container px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h1 className="text-lg font-semibold text-foreground">
              {greeting}, {familyName}! 👋
            </h1>
            <button className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <span className="capitalize">{currentMonth}</span>
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
          
          <Button 
            variant="ghost" 
            size="icon"
            className="relative"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-accent rounded-full" />
          </Button>
        </div>
      </div>
    </header>
  );
}
