import { useState } from "react";
import {
  ArrowLeft,
  Users,
  UserPlus,
  Shield,
  Bell,
  MapPin,
  ChevronRight,
  Crown,
  MoreVertical,
  Trash2,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useFamilyMembers, useMyPermissions, useRemoveFamilyMember } from "@/hooks/useFamilyPermissions";
import { InviteFamilyMemberSheet } from "@/components/InviteFamilyMemberSheet";
import { MemberPermissionsSheet } from "@/components/family/MemberPermissionsSheet";
import { NotificationPreferencesSheet } from "@/components/family/NotificationPreferencesSheet";
import { LocationContextCard } from "@/components/family/LocationContextCard";
import { FamilyActivityFeed } from "@/components/family/FamilyActivityFeed";

interface FamilyPageProps {
  onBack: () => void;
}

export function FamilyPage({ onBack }: FamilyPageProps) {
  const { family, familyMember: currentMember } = useAuth();
  const { data: members, isLoading } = useFamilyMembers();
  const { data: myPermissions } = useMyPermissions();
  const removeMember = useRemoveFamilyMember();

  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [showPermissions, setShowPermissions] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<any>(null);

  const canManage = myPermissions?.can_manage_family || myPermissions?.is_owner;

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    await removeMember.mutateAsync(memberToRemove.id);
    setMemberToRemove(null);
  };

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
                {members?.length || 1} membro{(members?.length || 1) > 1 ? "s" : ""}
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

        {/* Members List */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 px-1">
            MEMBROS
          </h3>
          <div className="bg-card rounded-2xl border border-border/30 overflow-hidden divide-y divide-border/30">
            {isLoading ? (
              <div className="p-4 text-center text-muted-foreground">
                Carregando membros...
              </div>
            ) : (
              members?.map((member: any) => {
                const isOwner = member.role === "owner";
                const isCurrentUser = member.id === currentMember?.id;
                const permissions = member.member_permissions?.[0];

                return (
                  <div
                    key={member.id}
                    className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                  >
                    <Avatar className="w-12 h-12">
                      <AvatarImage src={member.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {member.display_name?.charAt(0)?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">
                          {member.display_name}
                        </span>
                        {isCurrentUser && (
                          <Badge variant="secondary" className="text-xs">
                            Você
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {isOwner ? (
                          <Badge variant="default" className="text-xs gap-1">
                            <Crown className="w-3 h-3" />
                            Proprietário
                          </Badge>
                        ) : permissions?.can_manage_family ? (
                          <Badge variant="outline" className="text-xs">
                            Administrador
                          </Badge>
                        ) : permissions?.can_edit_all ? (
                          <Badge variant="outline" className="text-xs">
                            Editor
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">
                            Visualizador
                          </Badge>
                        )}
                      </div>
                    </div>

                    {canManage && !isOwner && !isCurrentUser && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedMember(member);
                              setShowPermissions(true);
                            }}
                          >
                            <Settings className="w-4 h-4 mr-2" />
                            Permissões
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setMemberToRemove(member)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Remover
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}

                    {(isOwner || isCurrentUser) && !canManage && (
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                );
              })
            )}
          </div>
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
      {selectedMember && (
        <MemberPermissionsSheet
          open={showPermissions}
          onOpenChange={setShowPermissions}
          member={selectedMember}
        />
      )}

      <NotificationPreferencesSheet
        open={showNotifications}
        onOpenChange={setShowNotifications}
      />

      {/* Remove Member Dialog */}
      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover membro?</AlertDialogTitle>
            <AlertDialogDescription>
              {memberToRemove?.display_name} perderá acesso às finanças da família.
              O histórico de lançamentos será mantido.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
