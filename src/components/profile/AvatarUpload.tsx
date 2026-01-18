import { useRef, useState } from "react";
import { Camera, Trash2, Loader2, User, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { useUploadAvatar, useRemoveAvatar, validateImageFile } from "@/hooks/useProfile";
import { toast } from "sonner";

interface AvatarUploadProps {
  avatarUrl?: string | null;
  displayName: string;
  size?: "sm" | "md" | "lg";
}

export function AvatarUpload({ avatarUrl, displayName, size = "lg" }: AvatarUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadAvatar = useUploadAvatar();
  const removeAvatar = useRemoveAvatar();
  const [showRemoveDialog, setShowRemoveDialog] = useState(false);

  const isLoading = uploadAvatar.isPending || removeAvatar.isPending;

  const initials = displayName
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  const sizeClasses = {
    sm: "w-12 h-12 text-lg",
    md: "w-16 h-16 text-xl",
    lg: "w-24 h-24 text-3xl",
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    await uploadAvatar.mutateAsync(file);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    await removeAvatar.mutateAsync();
    setShowRemoveDialog(false);
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        {/* Avatar Circle */}
        <div
          className={`${sizeClasses[size]} rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-primary to-primary/80 text-primary-foreground font-bold shadow-lg ring-4 ring-background`}
        >
          {isLoading ? (
            <Loader2 className="w-8 h-8 animate-spin" />
          ) : avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to initials if image fails to load
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <span>{initials}</span>
          )}
        </div>

        {/* Edit Button */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="icon"
              variant="secondary"
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full shadow-md"
              disabled={isLoading}
            >
              <Camera className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center" className="w-48">
            <DropdownMenuItem
              onClick={() => fileInputRef.current?.click()}
              className="gap-2"
            >
              <ImagePlus className="w-4 h-4" />
              {avatarUrl ? "Trocar foto" : "Adicionar foto"}
            </DropdownMenuItem>
            {avatarUrl && (
              <DropdownMenuItem
                onClick={() => setShowRemoveDialog(true)}
                className="gap-2 text-destructive focus:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
                Remover foto
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Remove Confirmation Dialog */}
      <AlertDialog open={showRemoveDialog} onOpenChange={setShowRemoveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover foto de perfil?</AlertDialogTitle>
            <AlertDialogDescription>
              Sua foto de perfil será removida. Você pode adicionar uma nova foto a qualquer momento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemove}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeAvatar.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}