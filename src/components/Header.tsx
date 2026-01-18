import { useState } from "react";
import { Bell, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getGreeting } from "@/lib/formatters";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface HeaderProps {
  userName?: string;
  onSettingsClick?: () => void;
  onNotificationsClick?: () => void;
}

export function Header({ userName = "Usuário", onSettingsClick, onNotificationsClick }: HeaderProps) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const greeting = getGreeting();

  const handleNotificationsClick = () => {
    if (onNotificationsClick) {
      onNotificationsClick();
    } else {
      setNotificationsOpen(true);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border/50 safe-area-inset-top">
        <div className="container px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h1 className="text-lg font-semibold text-foreground">
                {greeting}, {userName}! 👋
              </h1>
            </div>
            
            <div className="flex items-center gap-1">
              <Button 
                variant="ghost" 
                size="icon"
                className="relative"
                onClick={handleNotificationsClick}
              >
                <Bell className="w-5 h-5" />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-accent rounded-full" />
              </Button>
              
              <Button 
                variant="ghost" 
                size="icon"
                onClick={onSettingsClick}
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
