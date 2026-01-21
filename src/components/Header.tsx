import { useState } from "react";
import { Bell, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getGreeting } from "@/lib/formatters";
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
  const greeting = getGreeting();

  // Use familyMember display_name as fallback
  const displayName = userName || familyMember?.display_name || "Usuário";
  const avatarUrl = familyMember?.avatar_url;
  
  const initials = displayName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

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
        <div className="container px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Left: Brand Mark */}
            <div className="flex items-center">
              <img 
                src={oikMarca} 
                alt="Oik" 
                className="h-7 object-contain"
              />
            </div>
            
            {/* Right: Actions */}
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
