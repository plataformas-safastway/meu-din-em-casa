import { useState } from "react";
import { Check, ChevronDown, Users, Plus, UserPlus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { useUserFamilies, useSwitchFamily } from "@/hooks/useMultiFamily";
import { cn } from "@/lib/utils";

interface FamilySelectorSheetProps {
  onCreateFamily?: () => void;
  onJoinFamily?: () => void;
}

export function FamilySelectorSheet({ onCreateFamily, onJoinFamily }: FamilySelectorSheetProps) {
  const { family } = useAuth();
  const { data: families, isLoading } = useUserFamilies();
  const switchFamily = useSwitchFamily();
  const [open, setOpen] = useState(false);

  // Only show if user has multiple families
  if (!families || families.length <= 1) {
    return null;
  }

  const handleSwitchFamily = async (familyId: string) => {
    if (familyId === family?.id) {
      setOpen(false);
      return;
    }

    await switchFamily.mutateAsync(familyId);
    setOpen(false);
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner': return 'Proprietário';
      case 'admin': return 'Administrador';
      case 'member': return 'Membro';
      case 'viewer': return 'Visualizador';
      default: return role;
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="gap-1.5 px-2 h-8 text-muted-foreground hover:text-foreground"
        >
          <Users className="w-4 h-4" />
          <span className="max-w-[100px] truncate text-xs font-medium">
            {family?.name || 'Família'}
          </span>
          <ChevronDown className="w-3 h-3" />
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-auto max-h-[70vh] rounded-t-2xl">
        <SheetHeader className="text-left pb-4">
          <SheetTitle className="text-lg">Trocar família</SheetTitle>
          <p className="text-sm text-muted-foreground">
            Você está vendo as finanças de: <span className="font-medium text-foreground">{family?.name}</span>
          </p>
        </SheetHeader>

        <div className="space-y-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {families?.map((f) => {
                const isActive = f.family_id === family?.id;
                return (
                  <button
                    key={f.family_id}
                    onClick={() => handleSwitchFamily(f.family_id)}
                    disabled={switchFamily.isPending}
                    className={cn(
                      "w-full flex items-center gap-4 p-4 rounded-xl border transition-all",
                      isActive 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:border-primary/30 hover:bg-muted/50",
                      switchFamily.isPending && "opacity-50 pointer-events-none"
                    )}
                  >
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold",
                      isActive ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}>
                      {f.family_name.charAt(0).toUpperCase()}
                    </div>
                    
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-medium text-foreground truncate">{f.family_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {getRoleLabel(f.member_role)} · {f.members_count} membro{f.members_count > 1 ? 's' : ''}
                      </p>
                    </div>

                    {isActive && (
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-4 h-4 text-primary-foreground" />
                      </div>
                    )}
                  </button>
                );
              })}
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4 mt-4 border-t border-border">
          {onCreateFamily && (
            <Button 
              variant="outline" 
              className="flex-1 gap-2"
              onClick={() => {
                setOpen(false);
                onCreateFamily();
              }}
            >
              <Plus className="w-4 h-4" />
              Criar família
            </Button>
          )}
          {onJoinFamily && (
            <Button 
              variant="outline" 
              className="flex-1 gap-2"
              onClick={() => {
                setOpen(false);
                onJoinFamily();
              }}
            >
              <UserPlus className="w-4 h-4" />
              Entrar com convite
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
