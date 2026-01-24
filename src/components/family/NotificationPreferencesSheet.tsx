import { Loader2, Bell, TrendingUp, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  useWebPushSubscription,
} from "@/hooks/useNotificationPreferences";

interface NotificationPreferencesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NotificationPreferencesSheet({
  open,
  onOpenChange,
}: NotificationPreferencesSheetProps) {
  const { data: preferences, isLoading } = useNotificationPreferences();
  const updatePreferences = useUpdateNotificationPreferences();
  const { subscribe: subscribeWebPush } = useWebPushSubscription();

  const handleToggle = async (key: string, value: boolean) => {
    // If enabling push for the first time, request permission
    if (value && key === "push_transactions" && !preferences?.push_subscription) {
      const success = await subscribeWebPush();
      if (!success) return;
    }

    await updatePreferences.mutateAsync({ [key]: value });
  };

  const notificationItems = [
    {
      key: "push_transactions",
      label: "Lançamentos da família",
      description: "Receba notificações quando outros membros registrarem gastos ou receitas",
      icon: Bell,
    },
    {
      key: "push_budget_alerts",
      label: "Alertas de orçamento",
      description: "Seja notificado quando atingir 80% ou ultrapassar um orçamento",
      icon: TrendingUp,
    },
    {
      key: "push_location_context",
      label: "Alertas por localização",
      description: "Receba dicas sobre orçamento baseadas na sua localização atual",
      icon: MapPin,
    },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Notificações</SheetTitle>
          <SheetDescription>
            Escolha quais notificações deseja receber
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              {notificationItems.map((item) => {
                const Icon = item.icon;
                const isEnabled = preferences?.[item.key as keyof typeof preferences] ?? false;

                return (
                  <div
                    key={item.key}
                    className="flex items-start justify-between gap-4 p-4 rounded-xl border border-border"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5 text-muted-foreground" />
                      </div>
                      <div>
                        <Label
                          htmlFor={item.key}
                          className="font-medium cursor-pointer"
                        >
                          {item.label}
                        </Label>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {item.description}
                        </p>
                      </div>
                    </div>
                    <Switch
                      id={item.key}
                      checked={!!isEnabled}
                      onCheckedChange={(checked) =>
                        handleToggle(item.key, checked)
                      }
                      disabled={updatePreferences.isPending}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* Info Card */}
          <div className="p-4 rounded-xl bg-muted/50 border border-border">
            <h4 className="font-medium text-sm mb-2">Sobre notificações</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• Notificações são opcionais e respeitam sua privacidade</li>
              <li>• Você pode desativar a qualquer momento</li>
              <li>• Alertas por localização usam dados apenas quando o app está aberto</li>
            </ul>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
