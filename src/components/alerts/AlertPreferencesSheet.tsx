import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { 
  Bell, 
  BellOff, 
  Clock, 
  Smartphone,
  Loader2,
  Save
} from "lucide-react";
import { useAlertPreferences, useUpdateAlertPreferences } from "@/hooks/useAlertPreferences";

interface AlertPreferencesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DAYS_OPTIONS = [
  { value: 7, label: "7 dias antes" },
  { value: 3, label: "3 dias antes" },
  { value: 1, label: "1 dia antes" },
  { value: 0, label: "No dia" },
];

export function AlertPreferencesSheet({ open, onOpenChange }: AlertPreferencesSheetProps) {
  const { data: preferences, isLoading } = useAlertPreferences();
  const updatePreferences = useUpdateAlertPreferences();

  const [localPrefs, setLocalPrefs] = useState({
    alertsEnabled: true,
    receivePush: true,
    receiveInApp: true,
    quietHoursStart: 20,
    quietHoursEnd: 8,
    notifyDaysBefore: [7, 3, 0] as number[],
  });

  useEffect(() => {
    if (preferences) {
      setLocalPrefs({
        alertsEnabled: preferences.alertsEnabled,
        receivePush: preferences.receivePush,
        receiveInApp: preferences.receiveInApp,
        quietHoursStart: preferences.quietHoursStart,
        quietHoursEnd: preferences.quietHoursEnd,
        notifyDaysBefore: preferences.notifyDaysBefore,
      });
    }
  }, [preferences]);

  const handleSave = () => {
    updatePreferences.mutate(localPrefs, {
      onSuccess: () => onOpenChange(false),
    });
  };

  const toggleDay = (day: number) => {
    setLocalPrefs(prev => ({
      ...prev,
      notifyDaysBefore: prev.notifyDaysBefore.includes(day)
        ? prev.notifyDaysBefore.filter(d => d !== day)
        : [...prev.notifyDaysBefore, day].sort((a, b) => b - a),
    }));
  };

  const formatHour = (hour: number) => `${hour.toString().padStart(2, '0')}:00`;

  if (isLoading) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-md">
          <div className="flex items-center justify-center h-full">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Configurar Alertas
          </SheetTitle>
          <SheetDescription>
            Personalize como e quando você recebe avisos de vencimentos
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Master toggle */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-3">
              {localPrefs.alertsEnabled ? (
                <Bell className="w-5 h-5 text-primary" />
              ) : (
                <BellOff className="w-5 h-5 text-muted-foreground" />
              )}
              <div>
                <Label className="text-base font-medium">Alertas ativos</Label>
                <p className="text-sm text-muted-foreground">
                  {localPrefs.alertsEnabled 
                    ? "Você receberá avisos de vencimentos" 
                    : "Alertas desativados"}
                </p>
              </div>
            </div>
            <Switch
              checked={localPrefs.alertsEnabled}
              onCheckedChange={(checked) => 
                setLocalPrefs(prev => ({ ...prev, alertsEnabled: checked }))
              }
            />
          </div>

          {localPrefs.alertsEnabled && (
            <>
              <Separator />

              {/* Notification channels */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Smartphone className="w-4 h-4" />
                  Canais de notificação
                </h4>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="push" className="text-sm">
                      Notificações push
                    </Label>
                    <Switch
                      id="push"
                      checked={localPrefs.receivePush}
                      onCheckedChange={(checked) =>
                        setLocalPrefs(prev => ({ ...prev, receivePush: checked }))
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="inapp" className="text-sm">
                      Alertas no aplicativo
                    </Label>
                    <Switch
                      id="inapp"
                      checked={localPrefs.receiveInApp}
                      onCheckedChange={(checked) =>
                        setLocalPrefs(prev => ({ ...prev, receiveInApp: checked }))
                      }
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Days before notification */}
              <div className="space-y-4">
                <h4 className="font-medium">Antecedência dos avisos</h4>
                <p className="text-sm text-muted-foreground">
                  Escolha quando deseja ser avisado sobre vencimentos
                </p>

                <div className="grid grid-cols-2 gap-2">
                  {DAYS_OPTIONS.map((option) => (
                    <div
                      key={option.value}
                      className="flex items-center space-x-2"
                    >
                      <Checkbox
                        id={`day-${option.value}`}
                        checked={localPrefs.notifyDaysBefore.includes(option.value)}
                        onCheckedChange={() => toggleDay(option.value)}
                      />
                      <Label 
                        htmlFor={`day-${option.value}`} 
                        className="text-sm cursor-pointer"
                      >
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </div>

                {localPrefs.notifyDaysBefore.length === 0 && (
                  <p className="text-xs text-destructive">
                    Selecione pelo menos uma opção para receber alertas
                  </p>
                )}
              </div>

              <Separator />

              {/* Quiet hours */}
              <div className="space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Horário silencioso
                </h4>
                <p className="text-sm text-muted-foreground">
                  Notificações push respeitarão este horário
                </p>

                <div className="space-y-4">
                  <div>
                    <Label className="text-sm">Início do silêncio</Label>
                    <div className="flex items-center gap-2 mt-2">
                      <Slider
                        value={[localPrefs.quietHoursStart]}
                        onValueChange={([value]) =>
                          setLocalPrefs(prev => ({ ...prev, quietHoursStart: value }))
                        }
                        min={0}
                        max={23}
                        step={1}
                        className="flex-1"
                      />
                      <Badge variant="secondary" className="w-16 justify-center">
                        {formatHour(localPrefs.quietHoursStart)}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm">Fim do silêncio</Label>
                    <div className="flex items-center gap-2 mt-2">
                      <Slider
                        value={[localPrefs.quietHoursEnd]}
                        onValueChange={([value]) =>
                          setLocalPrefs(prev => ({ ...prev, quietHoursEnd: value }))
                        }
                        min={0}
                        max={23}
                        step={1}
                        className="flex-1"
                      />
                      <Badge variant="secondary" className="w-16 justify-center">
                        {formatHour(localPrefs.quietHoursEnd)}
                      </Badge>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Push desativado das {formatHour(localPrefs.quietHoursStart)} às{" "}
                    {formatHour(localPrefs.quietHoursEnd)}
                  </p>
                </div>
              </div>
            </>
          )}

          <div className="pt-4">
            <Button 
              onClick={handleSave} 
              className="w-full"
              disabled={updatePreferences.isPending}
            >
              {updatePreferences.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar preferências
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
