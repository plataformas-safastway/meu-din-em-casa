import { Bell, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getGreeting, getCurrentMonth } from "@/lib/formatters";

interface HeaderProps {
  familyName?: string;
  onSettingsClick?: () => void;
}

export function Header({ familyName = "Família", onSettingsClick }: HeaderProps) {
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
            <p className="text-sm text-muted-foreground capitalize">
              {currentMonth}
            </p>
          </div>
          
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon"
              className="relative"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-accent rounded-full" />
            </Button>
            
            {onSettingsClick && (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={onSettingsClick}
              >
                <Settings className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
