import { useState, useEffect } from "react";
import { Bell, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getGreeting, getFirstName } from "@/lib/formatters";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import oikMarca from "@/assets/oik-marca.png";

interface HeaderProps {
  userName?: string;
  onSettingsClick?: () => void;
  onNotificationsClick?: () => void;
}

export function Header({ userName, onSettingsClick, onNotificationsClick }: HeaderProps) {
  const { familyMember } = useAuth();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [greeting, setGreeting] = useState(getGreeting());

  // Update greeting when app comes back from background or time changes
  useEffect(() => {
    const updateGreeting = () => setGreeting(getGreeting());
    
    // Update every minute to catch turn changes
    const interval = setInterval(updateGreeting, 60000);
    
    // Update when visibility changes (app comes back from background)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateGreeting();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Get first name from familyMember or userName prop
  const displayName = userName || familyMember?.display_name;
  const firstName = getFirstName(displayName);

  const handleNotificationsClick = () => {
    if (onNotificationsClick) {
      onNotificationsClick();
    } else {
      setNotificationsOpen(true);
    }
  };

  // Build aria label for accessibility
  const ariaLabel = firstName 
    ? `Oik. Olá, ${firstName}. ${greeting}.`
    : `Oik. Olá! ${greeting}.`;

  return (
    <>
      <header 
        className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border/50 safe-area-inset-top"
        role="banner"
        aria-label={ariaLabel}
      >
        <div className="container px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            {/* Left: Brand + Greeting */}
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <img 
                src={oikMarca} 
                alt="Oik" 
                className="h-7 object-contain flex-shrink-0"
              />
              
              {/* Greeting - responsive */}
              <div className="min-w-0 flex-1">
                <p className="text-sm text-muted-foreground truncate">
                  {firstName ? (
                    <>
                      <span>Olá, </span>
                      <span className="font-medium text-foreground">{firstName}</span>
                      <span className="hidden xs:inline"> · </span>
                      <span className="hidden xs:inline">{greeting}</span>
                    </>
                  ) : (
                    <>
                      <span>Olá!</span>
                      <span className="hidden xs:inline"> · {greeting}</span>
                    </>
                  )}
                </p>
                {/* Mobile: Show greeting on second line if needed */}
                <p className="text-xs text-muted-foreground xs:hidden">
                  {greeting}
                </p>
              </div>
            </div>
            
            {/* Right: Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button 
                variant="ghost" 
                size="icon"
                className="relative"
                onClick={handleNotificationsClick}
                aria-label="Notificações"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-accent rounded-full" />
              </Button>
              
              <Button 
                variant="ghost" 
                size="icon"
                onClick={onSettingsClick}
                aria-label="Configurações"
              >
                <Settings className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Notifications Sheet */}
      <Sheet open={notificationsOpen} onOpenChange={setNotificationsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Notificações</SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <div className="text-center py-8 text-muted-foreground">
              <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Nenhuma notificação no momento</p>
              <p className="text-xs mt-1">Suas notificações aparecerão aqui</p>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
