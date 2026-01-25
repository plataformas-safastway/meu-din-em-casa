import { useState } from "react";
import { Users, UserPlus, UserMinus, Crown, MoreVertical, Settings, Trash2, ChevronRight, Mail } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useMyPermissions } from "@/hooks/useFamilyPermissions";
import { useFamilyMembersByStatus, FamilyMemberWithAudit } from "@/hooks/useFamilyMembersSoftDelete";
import { MemberPermissionsSheet } from "@/components/family/MemberPermissionsSheet";
import { RemoveMemberDialog } from "@/components/family/RemoveMemberDialog";
import { RemovedMemberCard } from "@/components/family/RemovedMemberCard";

export function FamilyMembersTabs() {
  const { familyMember: currentMember } = useAuth();
  const { data: myPermissions } = useMyPermissions();
  
  const { data: activeMembers, isLoading: loadingActive } = useFamilyMembersByStatus("ACTIVE");
  const { data: invitedMembers, isLoading: loadingInvited } = useFamilyMembersByStatus("INVITED");
  const { data: removedMembers, isLoading: loadingRemoved } = useFamilyMembersByStatus("REMOVED");

  const [selectedMember, setSelectedMember] = useState<FamilyMemberWithAudit | null>(null);
  const [showPermissions, setShowPermissions] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<FamilyMemberWithAudit | null>(null);

  const canManage = myPermissions?.can_manage_family || myPermissions?.is_owner;

  const renderMemberRow = (member: FamilyMemberWithAudit) => {
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
  };

  const renderInvitedRow = (member: FamilyMemberWithAudit) => {
    return (
      <div
        key={member.id}
        className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
      >
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
          <Mail className="w-5 h-5 text-muted-foreground" />
        </div>

        <div className="flex-1 min-w-0">
          <span className="font-medium truncate">{member.display_name}</span>
          <div className="flex items-center gap-2 mt-0.5">
            <Badge variant="secondary" className="text-xs">
              Convite pendente
            </Badge>
          </div>
        </div>

        {canManage && (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={() => setMemberToRemove(member)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        )}
      </div>
    );
  };

  return (
    <>
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="w-full grid grid-cols-3">
          <TabsTrigger value="active" className="gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Ativos</span>
            {activeMembers && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {activeMembers.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="invited" className="gap-2">
            <UserPlus className="w-4 h-4" />
            <span className="hidden sm:inline">Convidados</span>
            {invitedMembers && invitedMembers.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">
                {invitedMembers.length}
              </Badge>
            )}
          </TabsTrigger>
          {canManage && (
            <TabsTrigger value="removed" className="gap-2">
              <UserMinus className="w-4 h-4" />
              <span className="hidden sm:inline">Deletados</span>
              {removedMembers && removedMembers.length > 0 && (
                <Badge variant="destructive" className="ml-1 text-xs">
                  {removedMembers.length}
                </Badge>
              )}
            </TabsTrigger>
          )}
        </TabsList>

        {/* Active Members */}
        <TabsContent value="active" className="mt-4">
          <div className="bg-card rounded-2xl border border-border/30 overflow-hidden divide-y divide-border/30">
            {loadingActive ? (
              <div className="p-4 text-center text-muted-foreground">
                Carregando membros...
              </div>
            ) : activeMembers?.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>Nenhum membro ativo</p>
              </div>
            ) : (
              activeMembers?.map(renderMemberRow)
            )}
          </div>
        </TabsContent>

        {/* Invited Members */}
        <TabsContent value="invited" className="mt-4">
          <div className="bg-card rounded-2xl border border-border/30 overflow-hidden divide-y divide-border/30">
            {loadingInvited ? (
              <div className="p-4 text-center text-muted-foreground">
                Carregando convites...
              </div>
            ) : invitedMembers?.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <UserPlus className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>Nenhum convite pendente</p>
              </div>
            ) : (
              invitedMembers?.map(renderInvitedRow)
            )}
          </div>
        </TabsContent>

        {/* Removed Members (only for admins) */}
        {canManage && (
          <TabsContent value="removed" className="mt-4">
            {loadingRemoved ? (
              <div className="p-4 text-center text-muted-foreground">
                Carregando histórico...
              </div>
            ) : removedMembers?.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground bg-card rounded-2xl border border-border/30">
                <UserMinus className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>Nenhum membro removido</p>
                <p className="text-xs mt-1">
                  Membros removidos aparecerão aqui para auditoria
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {removedMembers?.map((member) => (
                  <RemovedMemberCard
                    key={member.id}
                    member={member}
                    canRestore={canManage}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* Sheets & Dialogs */}
      {selectedMember && (
        <MemberPermissionsSheet
          open={showPermissions}
          onOpenChange={setShowPermissions}
          member={selectedMember}
        />
      )}

      <RemoveMemberDialog
        member={memberToRemove}
        open={!!memberToRemove}
        onOpenChange={(open) => !open && setMemberToRemove(null)}
      />
    </>
  );
}
