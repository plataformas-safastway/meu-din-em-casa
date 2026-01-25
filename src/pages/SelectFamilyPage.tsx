import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users, Check, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useUserFamilies, useSwitchFamily } from "@/hooks/useMultiFamily";
import oikMarca from "@/assets/oik-marca.png";
import { cn } from "@/lib/utils";

export function SelectFamilyPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: families, isLoading: familiesLoading } = useUserFamilies();
  const switchFamily = useSwitchFamily();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const isLoading = authLoading || familiesLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    navigate("/login", { replace: true });
    return null;
  }

  // If no families, redirect to signup to create one
  if (!families || families.length === 0) {
    navigate("/signup", { replace: true });
    return null;
  }

  // If only one family, select it automatically and redirect
  if (families.length === 1) {
    switchFamily.mutate(families[0].family_id, {
      onSuccess: () => navigate("/app", { replace: true })
    });
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleSelectFamily = async (familyId: string) => {
    setSelectedId(familyId);
    await switchFamily.mutateAsync(familyId);
    navigate("/app", { replace: true });
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
    <div className="min-h-screen relative flex flex-col overflow-hidden">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-primary/5" />
      
      {/* Organic shape accents */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-primary/3 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

      {/* Main Content */}
      <main className="relative flex-1 flex flex-col items-center justify-center px-6 z-10">
        <div className="w-full max-w-md space-y-8">
          {/* Brand Block */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <img 
                src={oikMarca} 
                alt="Oik" 
                className="h-16 sm:h-20 object-contain drop-shadow-sm"
              />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-semibold text-foreground">
                Qual família você quer ver agora?
              </h1>
              <p className="text-sm text-muted-foreground">
                Você participa de {families.length} famílias
              </p>
            </div>
          </div>

          {/* Family Cards */}
          <div className="space-y-3">
            {families.map((f) => {
              const isSelecting = selectedId === f.family_id && switchFamily.isPending;
              
              return (
                <Card 
                  key={f.family_id}
                  className={cn(
                    "cursor-pointer border-2 transition-all duration-300",
                    isSelecting 
                      ? "border-primary bg-primary/5" 
                      : "border-transparent hover:border-primary/30 hover:shadow-lg",
                    switchFamily.isPending && !isSelecting && "opacity-50 pointer-events-none"
                  )}
                  onClick={() => handleSelectFamily(f.family_id)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold transition-colors",
                        isSelecting 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-muted text-muted-foreground"
                      )}>
                        {isSelecting ? (
                          <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                          f.family_name.charAt(0).toUpperCase()
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h2 className="font-semibold text-foreground truncate">
                          {f.family_name}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          {getRoleLabel(f.member_role)} · {f.members_count} membro{f.members_count > 1 ? 's' : ''}
                        </p>
                      </div>

                      {f.is_owner && (
                        <div className="px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                          Dono
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Microcopy */}
          <p className="text-center text-xs text-muted-foreground/60">
            Você pode alternar entre famílias a qualquer momento no app.
          </p>
        </div>
      </main>
    </div>
  );
}
