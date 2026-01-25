import { useState } from "react";
import { Loader2, Mail, UserPlus, Copy, Check, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useCreateInvite } from "@/hooks/useFamilyInvites";
import { toast } from "sonner";

interface InviteFamilyMemberSheetProps {
  trigger?: React.ReactNode;
}

export function InviteFamilyMemberSheet({ trigger }: InviteFamilyMemberSheetProps) {
  const { family, familyMember } = useAuth();
  const createInvite = useCreateInvite();
  
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [inviteLink, setInviteLink] = useState("");
  const [generatingLink, setGeneratingLink] = useState(false);

  // Generate a secure invite link
  const generateInviteLink = async () => {
    if (!family) return;
    
    setGeneratingLink(true);
    try {
      const result = await createInvite.mutateAsync({
        familyId: family.id,
      });
      
      const link = `${window.location.origin}/invite?token=${result.token}`;
      setInviteLink(link);
      toast.success("Link de convite gerado!");
    } catch (error) {
      console.error('Error creating invite:', error);
      toast.error("Erro ao gerar link de convite");
    } finally {
      setGeneratingLink(false);
    }
  };

  // Generate link when sheet opens
  const handleOpenChange = async (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && !inviteLink && family) {
      await generateInviteLink();
    }
  };

  const handleCopyLink = async () => {
    if (!inviteLink) return;
    
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast.success("Link copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Erro ao copiar link");
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error("Informe o e-mail do convidado");
      return;
    }

    if (!family || !familyMember) {
      toast.error("Você precisa estar em uma família para convidar membros");
      return;
    }

    setLoading(true);

    try {
      // Create a new invite with the email
      const result = await createInvite.mutateAsync({
        familyId: family.id,
        email,
      });
      
      const link = `${window.location.origin}/invite?token=${result.token}`;

      // Send email with the invite link
      const { error } = await supabase.functions.invoke('send-family-invite', {
        body: {
          email,
          familyName: family.name,
          inviterName: familyMember.display_name,
          inviteLink: link,
        },
      });

      if (error) {
        throw error;
      }

      toast.success("Convite enviado!", {
        description: `Um e-mail foi enviado para ${email}`
      });
      setEmail("");
      setOpen(false);
    } catch (error) {
      console.error('Error sending invite:', error);
      toast.error("Erro ao enviar convite", {
        description: "Tente novamente mais tarde."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <UserPlus className="w-4 h-4 mr-2" />
            Convidar membro
          </Button>
        )}
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Convidar para a família</SheetTitle>
          <SheetDescription>
            Convide outras pessoas para gerenciar as finanças da família {family?.name}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Email invite */}
          <form onSubmit={handleSendInvite} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">E-mail do convidado</Label>
              <div className="flex gap-2">
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="email@exemplo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Mail className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                ou compartilhe o link
              </span>
            </div>
          </div>

          {/* Link sharing */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Link de convite</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={generateInviteLink}
                disabled={generatingLink}
                className="h-6 px-2 text-xs"
              >
                {generatingLink ? (
                  <Loader2 className="w-3 h-3 animate-spin mr-1" />
                ) : (
                  <RefreshCw className="w-3 h-3 mr-1" />
                )}
                Gerar novo
              </Button>
            </div>
            <div className="flex gap-2">
              <Input
                value={inviteLink}
                readOnly
                placeholder={generatingLink ? "Gerando link..." : "Clique em 'Gerar novo'"}
                className="flex-1 text-sm bg-muted"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleCopyLink}
                className="shrink-0"
                disabled={!inviteLink}
              >
                {copied ? (
                  <Check className="w-4 h-4 text-primary" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              O link expira em 7 dias e pode ser usado apenas uma vez.
            </p>
          </div>

          {/* Info */}
          <div className="p-4 rounded-xl bg-muted/50 border border-border">
            <h4 className="font-medium text-sm mb-2">Como funciona?</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• O convidado receberá um e-mail com o link</li>
              <li>• Ele precisará apenas completar seus dados pessoais</li>
              <li>• Não precisa configurar nada da família</li>
              <li>• Você pode remover membros a qualquer momento</li>
            </ul>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
