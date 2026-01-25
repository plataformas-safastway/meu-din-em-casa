import { useState } from "react";
import { ArrowLeft, UserPlus, Shield, Bell, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useMyPermissions } from "@/hooks/useFamilyPermissions";
import { useActiveMembersCount } from "@/hooks/useFamilyMembersSoftDelete";
import { InviteFamilyMemberSheet } from "@/components/InviteFamilyMemberSheet";
import { NotificationPreferencesSheet } from "@/components/family/NotificationPreferencesSheet";
import { LocationContextCard } from "@/components/family/LocationContextCard";
import { FamilyActivityFeed } from "@/components/family/FamilyActivityFeed";
import { FamilyMembersTabs } from "@/components/family/FamilyMembersTabs";

interface FamilyPageProps {
  onBack: () => void;
}

export function FamilyPage({ onBack }: FamilyPageProps) {
  const { family } = useAuth();
  const { data: myPermissions } = useMyPermissions();
  const { data: activeMembersCount } = useActiveMembersCount();

  const [showNotifications, setShowNotifications] = useState(false);

  const canManage = myPermissions?.can_manage_family || myPermissions?.is_owner;

  const initials = family?.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "FF";

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="container px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-semibold">Minha Família</h1>
          </div>
        </div>
      </header>

      <main className="container px-4 py-6 space-y-6">
        {/* Family Card */}
        <div className="p-5 rounded-2xl bg-card border border-border/30">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center text-2xl text-primary-foreground font-bold">
              {initials}
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-foreground text-lg">{family?.name}</h2>
              <p className="text-sm text-muted-foreground">
                {activeMembersCount || 1} membro{(activeMembersCount || 1) > 1 ? "s" : ""} ativo{(activeMembersCount || 1) > 1 ? "s" : ""}
              </p>
            </div>
            {canManage && (
              <InviteFamilyMemberSheet
                trigger={
                  <Button size="sm" className="gap-2">
                    <UserPlus className="w-4 h-4" />
                    Convidar
                  </Button>
                }
              />
            )}
          </div>
        </div>

        {/* Members List with Tabs */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 px-1">
            MEMBROS
          </h3>
          <FamilyMembersTabs />
        </div>

        {/* Quick Actions */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 px-1">
            CONFIGURAÇÕES
          </h3>
          <div className="bg-card rounded-2xl border border-border/30 overflow-hidden divide-y divide-border/30">
            <button
              onClick={() => setShowNotifications(true)}
              className="flex items-center gap-4 p-4 w-full hover:bg-muted/50 transition-colors"
            >
              <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                <Bell className="w-5 h-5 text-muted-foreground" />
              </div>
              <span className="flex-1 text-left font-medium">Notificações</span>
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Location Context */}
        <LocationContextCard />

        {/* Activity Feed */}
        <FamilyActivityFeed />

        {/* Permissions Info */}
        <div className="bg-muted/50 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-primary mt-0.5" />
            <div>
              <h4 className="font-medium text-sm">Sobre permissões</h4>
              <p className="text-xs text-muted-foreground mt-1">
                O proprietário tem acesso total. Membros podem ter permissões personalizadas
                para visualizar, editar ou gerenciar as finanças da família.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Sheets */}
      <NotificationPreferencesSheet
        open={showNotifications}
        onOpenChange={setShowNotifications}
      />
    </div>
  );
}
