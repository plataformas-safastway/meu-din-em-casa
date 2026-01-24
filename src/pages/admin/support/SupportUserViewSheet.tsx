import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Eye,
  AlertTriangle,
  Shield,
  Clock,
  StickyNote,
  Plus,
  CreditCard,
  Wallet,
  Target,
  FileText,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  useStartSupportSession,
  useEndSupportSession,
  useSupportNotes,
  useAddSupportNote,
  useSupportErrors,
  useSupportSessions,
} from "@/hooks/useSupportModule";

interface SupportUserViewSheetProps {
  user: {
    userId: string;
    familyId: string;
    displayName: string;
  } | null;
  onClose: () => void;
}

export function SupportUserViewSheet({ user, onClose }: SupportUserViewSheetProps) {
  const { toast } = useToast();
  const [showStartDialog, setShowStartDialog] = useState(false);
  const [sessionReason, setSessionReason] = useState("");
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [newNote, setNewNote] = useState("");
  const [noteType, setNoteType] = useState("general");
  const [userData, setUserData] = useState<{
    bankAccounts: number;
    creditCards: number;
    transactions: number;
    goals: number;
  } | null>(null);

  const startSession = useStartSupportSession();
  const endSession = useEndSupportSession();
  const addNote = useAddSupportNote();

  const { data: notes } = useSupportNotes(user?.familyId || null);
  const { data: errorsData } = useSupportErrors({ family_id: user?.familyId }, 0, 10);
  const { data: sessionsData } = useSupportSessions(user?.familyId);

  const userErrors = errorsData?.errors ?? [];
  const userSessions = sessionsData ?? [];

  // Fetch user data summary when session starts
  useEffect(() => {
    if (user && currentSessionId) {
      fetchUserSummary(user.familyId);
    }
  }, [user, currentSessionId]);

  const fetchUserSummary = async (familyId: string) => {
    try {
      const [accounts, cards, transactions, goals] = await Promise.all([
        supabase.from("bank_accounts").select("id", { count: "exact" }).eq("family_id", familyId),
        supabase.from("credit_cards").select("id", { count: "exact" }).eq("family_id", familyId),
        supabase.from("transactions").select("id", { count: "exact" }).eq("family_id", familyId),
        supabase.from("goals").select("id", { count: "exact" }).eq("family_id", familyId),
      ]);

      setUserData({
        bankAccounts: accounts.count || 0,
        creditCards: cards.count || 0,
        transactions: transactions.count || 0,
        goals: goals.count || 0,
      });
    } catch (error) {
      console.error("Failed to fetch user summary:", error);
    }
  };

  const handleStartSession = async () => {
    if (!user || !sessionReason.trim()) return;

    try {
      const result = await startSession.mutateAsync({
        familyId: user.familyId,
        reason: sessionReason,
      });
      setCurrentSessionId(result.id);
      setShowStartDialog(false);
      setSessionReason("");

      toast({
        title: "Sessão iniciada",
        description: "Você está visualizando a conta do usuário.",
      });
    } catch (error) {
      toast({
        title: "Erro ao iniciar sessão",
        description: "Não foi possível iniciar a sessão de suporte.",
        variant: "destructive",
      });
    }
  };

  const handleEndSession = async () => {
    if (!currentSessionId) return;

    try {
      await endSession.mutateAsync({
        sessionId: currentSessionId,
        screensVisited: ["user-view", "summary"],
      });
      setCurrentSessionId(null);
      setUserData(null);

      toast({
        title: "Sessão encerrada",
        description: "A sessão de suporte foi finalizada.",
      });
    } catch (error) {
      toast({
        title: "Erro ao encerrar sessão",
        variant: "destructive",
      });
    }
  };

  const handleAddNote = async () => {
    if (!user || !newNote.trim()) return;

    try {
      await addNote.mutateAsync({
        familyId: user.familyId,
        note: newNote,
        noteType,
      });
      setNewNote("");
      toast({
        title: "Nota adicionada",
        description: "A observação foi salva com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao adicionar nota",
        variant: "destructive",
      });
    }
  };

  if (!user) return null;

  return (
    <>
      <Sheet open={!!user} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5" />
              {user.displayName}
            </SheetTitle>
            <SheetDescription>
              Visualização assistida da conta do usuário
            </SheetDescription>
          </SheetHeader>

          {/* Session Banner */}
          {currentSessionId && (
            <div className="mt-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-amber-600" />
                  <span className="text-sm font-medium text-amber-700">
                    Sessão de Suporte Ativa
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEndSession}
                  disabled={endSession.isPending}
                  className="text-amber-700 border-amber-300"
                >
                  <X className="w-3 h-3 mr-1" />
                  Encerrar
                </Button>
              </div>
              <p className="text-xs text-amber-600 mt-1">
                Todas as ações estão sendo registradas. Modo somente leitura.
              </p>
            </div>
          )}

          <div className="mt-6">
            {!currentSessionId ? (
              <div className="text-center py-12">
                <Shield className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Acesso Protegido</h3>
                <p className="text-muted-foreground mb-4">
                  Para visualizar os dados do usuário, é necessário iniciar uma sessão de suporte.
                </p>
                <Button onClick={() => setShowStartDialog(true)}>
                  Iniciar Sessão de Suporte
                </Button>
              </div>
            ) : (
              <Tabs defaultValue="summary" className="space-y-4">
                <TabsList className="grid grid-cols-4 w-full">
                  <TabsTrigger value="summary">Resumo</TabsTrigger>
                  <TabsTrigger value="errors">Erros</TabsTrigger>
                  <TabsTrigger value="notes">Notas</TabsTrigger>
                  <TabsTrigger value="history">Histórico</TabsTrigger>
                </TabsList>

                {/* Summary Tab */}
                <TabsContent value="summary" className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Card>
                      <CardContent className="p-4 flex items-center gap-3">
                        <Wallet className="w-8 h-8 text-primary" />
                        <div>
                          <p className="text-xs text-muted-foreground">Contas</p>
                          <p className="text-xl font-bold">{userData?.bankAccounts ?? 0}</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 flex items-center gap-3">
                        <CreditCard className="w-8 h-8 text-primary" />
                        <div>
                          <p className="text-xs text-muted-foreground">Cartões</p>
                          <p className="text-xl font-bold">{userData?.creditCards ?? 0}</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 flex items-center gap-3">
                        <FileText className="w-8 h-8 text-primary" />
                        <div>
                          <p className="text-xs text-muted-foreground">Transações</p>
                          <p className="text-xl font-bold">{userData?.transactions ?? 0}</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 flex items-center gap-3">
                        <Target className="w-8 h-8 text-primary" />
                        <div>
                          <p className="text-xs text-muted-foreground">Metas</p>
                          <p className="text-xl font-bold">{userData?.goals ?? 0}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Separator />

                  <div className="text-sm text-muted-foreground">
                    <p>ID do Usuário: {user.userId.substring(0, 8)}...</p>
                    <p>ID da Família: {user.familyId.substring(0, 8)}...</p>
                  </div>
                </TabsContent>

                {/* Errors Tab */}
                <TabsContent value="errors" className="space-y-3">
                  {userErrors.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>Nenhum erro recente</p>
                    </div>
                  ) : (
                    userErrors.map((error) => (
                      <div key={error.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <Badge variant="destructive">{error.error_type}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(error.created_at), "dd/MM HH:mm")}
                          </span>
                        </div>
                        <p className="text-sm mt-2">{error.error_message}</p>
                      </div>
                    ))
                  )}
                </TabsContent>

                {/* Notes Tab */}
                <TabsContent value="notes" className="space-y-4">
                  <div className="space-y-3">
                    <Textarea
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      placeholder="Adicione uma observação..."
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Select value={noteType} onValueChange={setNoteType}>
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">Geral</SelectItem>
                          <SelectItem value="error">Erro</SelectItem>
                          <SelectItem value="followup">Acompanhamento</SelectItem>
                          <SelectItem value="resolved">Resolvido</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        onClick={handleAddNote}
                        disabled={!newNote.trim() || addNote.isPending}
                        className="flex-1"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Adicionar Nota
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    {notes?.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <StickyNote className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>Nenhuma nota registrada</p>
                      </div>
                    ) : (
                      notes?.map((note) => (
                        <div key={note.id} className="p-3 border rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant="outline">{note.note_type}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(note.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                            </span>
                          </div>
                          <p className="text-sm">{note.note}</p>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>

                {/* History Tab */}
                <TabsContent value="history" className="space-y-3">
                  {userSessions.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p>Nenhuma sessão anterior</p>
                    </div>
                  ) : (
                    userSessions.map((session) => (
                      <div key={session.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="outline">{session.session_type}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(session.started_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{session.reason}</p>
                        {session.ended_at && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Duração: {Math.round((new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 60000)} min
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </TabsContent>
              </Tabs>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Start Session Dialog */}
      <AlertDialog open={showStartDialog} onOpenChange={setShowStartDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Iniciar Sessão de Suporte
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                Você está prestes a visualizar a conta de <strong>{user.displayName}</strong>.
                Esta ação será registrada no sistema de auditoria.
              </p>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Motivo da sessão *
                </label>
                <Textarea
                  value={sessionReason}
                  onChange={(e) => setSessionReason(e.target.value)}
                  placeholder="Descreva o motivo do acesso..."
                  rows={3}
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleStartSession}
              disabled={!sessionReason.trim() || startSession.isPending}
            >
              {startSession.isPending ? "Iniciando..." : "Confirmar e Iniciar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
