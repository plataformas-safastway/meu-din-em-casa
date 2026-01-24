import { useState, useEffect } from "react";
import { Loader2, Eye, Pencil, Plus, Trash2, TrendingUp, PieChart, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  PERMISSION_PROFILES,
  useUpdateMemberPermissions,
  MemberPermissions,
} from "@/hooks/useFamilyPermissions";

interface MemberPermissionsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: {
    id: string;
    display_name: string;
    avatar_url?: string | null;
    member_permissions?: Array<{
      can_view_all: boolean;
      can_edit_all: boolean;
      can_insert_transactions: boolean;
      can_delete_transactions: boolean;
      can_view_projection: boolean;
      can_view_budget: boolean;
      can_manage_family: boolean;
    }>;
  };
}

export function MemberPermissionsSheet({
  open,
  onOpenChange,
  member,
}: MemberPermissionsSheetProps) {
  const updatePermissions = useUpdateMemberPermissions();

  const existingPermissions = member.member_permissions?.[0];

  const [mode, setMode] = useState<"profile" | "custom">("profile");
  const [selectedProfile, setSelectedProfile] = useState<string>("viewer");
  const [permissions, setPermissions] = useState<Partial<MemberPermissions>>({
    can_view_all: true,
    can_edit_all: false,
    can_insert_transactions: true,
    can_delete_transactions: false,
    can_view_projection: true,
    can_view_budget: true,
    can_manage_family: false,
  });

  // Initialize from existing permissions
  useEffect(() => {
    if (existingPermissions) {
      setPermissions({
        can_view_all: existingPermissions.can_view_all,
        can_edit_all: existingPermissions.can_edit_all,
        can_insert_transactions: existingPermissions.can_insert_transactions,
        can_delete_transactions: existingPermissions.can_delete_transactions,
        can_view_projection: existingPermissions.can_view_projection,
        can_view_budget: existingPermissions.can_view_budget,
        can_manage_family: existingPermissions.can_manage_family,
      });

      // Determine current profile
      const matchingProfile = PERMISSION_PROFILES.find((p) => {
        const pp = p.permissions;
        return (
          pp.can_view_all === existingPermissions.can_view_all &&
          pp.can_edit_all === existingPermissions.can_edit_all &&
          pp.can_insert_transactions === existingPermissions.can_insert_transactions &&
          pp.can_delete_transactions === existingPermissions.can_delete_transactions &&
          pp.can_manage_family === existingPermissions.can_manage_family
        );
      });

      if (matchingProfile) {
        setSelectedProfile(matchingProfile.id);
        setMode("profile");
      } else {
        setMode("custom");
      }
    }
  }, [existingPermissions]);

  const handleProfileChange = (profileId: string) => {
    setSelectedProfile(profileId);
    const profile = PERMISSION_PROFILES.find((p) => p.id === profileId);
    if (profile) {
      setPermissions({ ...permissions, ...profile.permissions });
    }
  };

  const handleSave = async () => {
    await updatePermissions.mutateAsync({
      memberId: member.id,
      permissions,
    });
    onOpenChange(false);
  };

  const permissionItems = [
    { key: "can_view_all", label: "Visualizar tudo", icon: Eye },
    { key: "can_edit_all", label: "Editar lançamentos", icon: Pencil },
    { key: "can_insert_transactions", label: "Inserir lançamentos", icon: Plus },
    { key: "can_delete_transactions", label: "Excluir lançamentos", icon: Trash2 },
    { key: "can_view_projection", label: "Ver projeção", icon: TrendingUp },
    { key: "can_view_budget", label: "Ver orçamento", icon: PieChart },
    { key: "can_manage_family", label: "Gerenciar família", icon: Users },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Permissões do Membro</SheetTitle>
          <SheetDescription>
            Defina o que este membro pode fazer
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Member Info */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50">
            <Avatar className="w-10 h-10">
              <AvatarImage src={member.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary">
                {member.display_name?.charAt(0)?.toUpperCase() || "?"}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium">{member.display_name}</span>
          </div>

          {/* Mode Selection */}
          <div className="flex gap-2">
            <Button
              variant={mode === "profile" ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => setMode("profile")}
            >
              Perfis
            </Button>
            <Button
              variant={mode === "custom" ? "default" : "outline"}
              size="sm"
              className="flex-1"
              onClick={() => setMode("custom")}
            >
              Personalizado
            </Button>
          </div>

          {mode === "profile" ? (
            /* Profile Selection */
            <RadioGroup
              value={selectedProfile}
              onValueChange={handleProfileChange}
              className="space-y-3"
            >
              {PERMISSION_PROFILES.map((profile) => (
                <label
                  key={profile.id}
                  className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${
                    selectedProfile === profile.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <RadioGroupItem value={profile.id} className="mt-0.5" />
                  <div>
                    <div className="font-medium">{profile.name}</div>
                    <p className="text-sm text-muted-foreground">
                      {profile.description}
                    </p>
                  </div>
                </label>
              ))}
            </RadioGroup>
          ) : (
            /* Custom Permissions */
            <div className="space-y-4">
              {permissionItems.map((item) => {
                const Icon = item.icon;
                const key = item.key as keyof MemberPermissions;
                return (
                  <div
                    key={item.key}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <Label htmlFor={item.key} className="font-normal">
                        {item.label}
                      </Label>
                    </div>
                    <Switch
                      id={item.key}
                      checked={permissions[key] ?? false}
                      onCheckedChange={(checked) =>
                        setPermissions({ ...permissions, [key]: checked })
                      }
                    />
                  </div>
                );
              })}
            </div>
          )}

          <Separator />

          <Button
            onClick={handleSave}
            className="w-full"
            disabled={updatePermissions.isPending}
          >
            {updatePermissions.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              "Salvar Permissões"
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
