import { useState, useEffect } from "react";
import { Building2, CreditCard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SourceConflictDialog } from "./SourceConflictDialog";
import {
  useDetectedSources,
  useUpdateDetectedSource,
  useCreateSourceFromDetected,
  useMatchSimilarSources,
  DetectedSource,
} from "@/hooks/useDetectedSources";
import { cn } from "@/lib/utils";

interface DetectedSourceHandlerProps {
  importId: string;
  onComplete?: () => void;
}

export function DetectedSourceHandler({ importId, onComplete }: DetectedSourceHandlerProps) {
  const { data: detectedSources, isLoading } = useDetectedSources(importId);
  const updateSource = useUpdateDetectedSource();
  const createSource = useCreateSourceFromDetected();

  // Find first pending source
  const pendingSource = detectedSources?.find((s) => s.match_status === "pending" && !s.user_confirmed);
  const { data: similarSources } = useMatchSimilarSources(pendingSource || null);

  const [showDialog, setShowDialog] = useState(false);

  // Show dialog when there's a pending source
  useEffect(() => {
    if (pendingSource && !showDialog) {
      setShowDialog(true);
    }
  }, [pendingSource]);

  // Check if all sources are handled
  useEffect(() => {
    if (detectedSources && detectedSources.length > 0) {
      const allHandled = detectedSources.every((s) => s.user_confirmed || s.match_status !== "pending");
      if (allHandled && onComplete) {
        onComplete();
      }
    }
  }, [detectedSources, onComplete]);

  const handleUseExisting = async (sourceId: string) => {
    if (!pendingSource) return;

    await updateSource.mutateAsync({
      id: pendingSource.id,
      matched_source_id: sourceId,
      match_status: "matched",
      user_confirmed: true,
    });

    setShowDialog(false);
  };

  const handleCreate = async () => {
    if (!pendingSource) return;

    await createSource.mutateAsync(pendingSource);
    setShowDialog(false);
  };

  const handleSkip = async () => {
    if (!pendingSource) return;

    await updateSource.mutateAsync({
      id: pendingSource.id,
      match_status: "skipped",
      user_confirmed: true,
    });

    setShowDialog(false);
  };

  if (isLoading) {
    return null;
  }

  // Show summary of detected sources if any
  const hasDetectedSources = detectedSources && detectedSources.length > 0;
  const handledSources = detectedSources?.filter((s) => s.user_confirmed) || [];

  return (
    <>
      {/* Summary Banner */}
      {hasDetectedSources && handledSources.length > 0 && (
        <div className="p-4 rounded-xl bg-muted/50 border border-border mb-4">
          <h4 className="text-sm font-medium text-foreground mb-2">
            Fontes detectadas
          </h4>
          <div className="space-y-2">
            {handledSources.map((source) => (
              <div key={source.id} className="flex items-center gap-3 text-sm">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center",
                  source.source_type === "bank_account" 
                    ? "bg-primary/10" 
                    : "bg-secondary/10"
                )}>
                  {source.source_type === "bank_account" ? (
                    <Building2 className="w-4 h-4 text-primary" />
                  ) : (
                    <CreditCard className="w-4 h-4 text-secondary-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{source.bank_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {source.match_status === "matched" && "Vinculado a cadastro existente"}
                    {source.match_status === "created" && "Criado automaticamente"}
                    {source.match_status === "skipped" && "Pulado"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Conflict Dialog */}
      <SourceConflictDialog
        open={showDialog && !!pendingSource}
        onOpenChange={setShowDialog}
        detectedSource={
          pendingSource
            ? {
                id: pendingSource.id,
                sourceType: pendingSource.source_type,
                bankName: pendingSource.bank_name,
                agency: pendingSource.agency || undefined,
                accountNumber: pendingSource.account_number || undefined,
                last4: pendingSource.last4 || undefined,
              }
            : null
        }
        existingSources={similarSources || []}
        onUseExisting={handleUseExisting}
        onCreate={handleCreate}
        onSkip={handleSkip}
      />
    </>
  );
}
