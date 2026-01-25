import { useState, useEffect, useContext } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  Lightbulb, 
  HelpCircle, 
  TrendingUp,
  PiggyBank,
  Target,
  Upload,
  MessageCircle,
  Heart
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthContext } from "@/contexts/AuthContext";
import type { User } from "@supabase/supabase-js";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AuthFamily {
  id: string;
  name: string;
}

/**
 * In-App Message System for CS Automation
 * 
 * Displays empathetic, contextual messages based on user stage and signals.
 * NEVER spam - respects user preferences and frequency limits.
 */

export interface CSMessage {
  id: string;
  type: 'tip' | 'encouragement' | 'help_offer' | 'milestone' | 'gentle_nudge';
  title: string;
  content: string;
  icon: string;
  actionLabel?: string;
  actionPath?: string;
  priority: number;
  expiresAt?: string;
}

const ICON_MAP: Record<string, typeof Lightbulb> = {
  Lightbulb,
  HelpCircle,
  TrendingUp,
  PiggyBank,
  Target,
  Upload,
  MessageCircle,
  Heart,
};

const TYPE_STYLES = {
  tip: {
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-200 dark:border-blue-900',
    iconBg: 'bg-blue-100 dark:bg-blue-900',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
  encouragement: {
    bg: 'bg-green-50 dark:bg-green-950/30',
    border: 'border-green-200 dark:border-green-900',
    iconBg: 'bg-green-100 dark:bg-green-900',
    iconColor: 'text-green-600 dark:text-green-400',
  },
  help_offer: {
    bg: 'bg-purple-50 dark:bg-purple-950/30',
    border: 'border-purple-200 dark:border-purple-900',
    iconBg: 'bg-purple-100 dark:bg-purple-900',
    iconColor: 'text-purple-600 dark:text-purple-400',
  },
  milestone: {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    border: 'border-amber-200 dark:border-amber-900',
    iconBg: 'bg-amber-100 dark:bg-amber-900',
    iconColor: 'text-amber-600 dark:text-amber-400',
  },
  gentle_nudge: {
    bg: 'bg-teal-50 dark:bg-teal-950/30',
    border: 'border-teal-200 dark:border-teal-900',
    iconBg: 'bg-teal-100 dark:bg-teal-900',
    iconColor: 'text-teal-600 dark:text-teal-400',
  },
};

interface CSInAppMessageProps {
  className?: string;
}

/**
 * Wrapper component that safely checks for AuthProvider before rendering
 */
export function CSInAppMessage({ className }: CSInAppMessageProps) {
  const authContext = useContext(AuthContext);
  
  // If no auth context, silently return null - component is outside AuthProvider
  if (!authContext) {
    return null;
  }
  
  return <CSInAppMessageInner className={className} family={authContext.family} user={authContext.user} />;
}

interface CSInAppMessageInnerProps {
  className?: string;
  family: AuthFamily | null;
  user: User | null;
}

/**
 * Inner component with all hooks - only rendered when AuthContext is available
 */
function CSInAppMessageInner({ className, family, user }: CSInAppMessageInnerProps) {
  const queryClient = useQueryClient();
  const [currentMessage, setCurrentMessage] = useState<CSMessage | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Check if user has opted into smart tips
  const { data: preferences } = useQuery({
    queryKey: ['cs-user-preferences', family?.id],
    queryFn: async () => {
      if (!family?.id) return null;
      const { data } = await supabase
        .from('cs_user_preferences')
        .select('allow_smart_tips, allow_notifications')
        .eq('family_id', family.id)
        .maybeSingle();
      return data;
    },
    enabled: !!family?.id,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch pending messages for user
  const { data: messages } = useQuery({
    queryKey: ['cs-in-app-messages', family?.id],
    queryFn: async () => {
      if (!family?.id) return [];
      
      // Get messages from cs_ai_suggestions that are for in-app display
      const { data } = await supabase
        .from('cs_ai_suggestions')
        .select('*')
        .eq('family_id', family.id)
        .eq('status', 'accepted')
        .in('suggestion_type', ['notification', 'education'])
        .is('executed_at', null)
        .order('priority', { ascending: true })
        .limit(1);

      if (!data || data.length === 0) return [];

      return data.map((s) => ({
        id: s.id,
        type: s.suggestion_type === 'education' ? 'tip' : 'gentle_nudge',
        title: s.title,
        content: s.description,
        icon: 'Lightbulb',
        priority: s.priority === 'urgent' ? 1 : s.priority === 'high' ? 2 : 3,
      })) as CSMessage[];
    },
    enabled: !!family?.id && preferences?.allow_smart_tips !== false,
    staleTime: 60 * 1000,
  });

  // Dismiss message mutation
  const dismissMessage = useMutation({
    mutationFn: async (messageId: string) => {
      if (!user?.id) return;

      await supabase
        .from('cs_ai_suggestions')
        .update({ 
          executed_at: new Date().toISOString(),
          status: 'executed'
        })
        .eq('id', messageId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cs-in-app-messages'] });
    },
  });

  // Show first message
  useEffect(() => {
    if (messages && messages.length > 0 && !currentMessage) {
      // Add delay to avoid showing immediately on page load
      const timer = setTimeout(() => {
        setCurrentMessage(messages[0]);
        setIsVisible(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [messages, currentMessage]);

  const handleDismiss = () => {
    if (currentMessage) {
      dismissMessage.mutate(currentMessage.id);
      setIsVisible(false);
      setTimeout(() => setCurrentMessage(null), 300);
    }
  };

  // Don't show if user disabled tips
  if (preferences?.allow_smart_tips === false) return null;
  if (!currentMessage) return null;

  const styles = TYPE_STYLES[currentMessage.type as keyof typeof TYPE_STYLES] || TYPE_STYLES.tip;
  const IconComponent = ICON_MAP[currentMessage.icon] || Lightbulb;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className={`fixed bottom-20 left-4 right-4 z-50 max-w-md mx-auto ${className}`}
        >
          <div className={`${styles.bg} ${styles.border} border rounded-2xl shadow-lg p-4`}>
            <div className="flex gap-3">
              <div className={`w-10 h-10 rounded-xl ${styles.iconBg} flex items-center justify-center flex-shrink-0`}>
                <IconComponent className={`w-5 h-5 ${styles.iconColor}`} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm mb-1">{currentMessage.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {currentMessage.content}
                </p>
              </div>
              <button
                onClick={handleDismiss}
                className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors self-start"
                aria-label="Fechar"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            
            <div className="flex gap-2 mt-3">
              {currentMessage.actionLabel && currentMessage.actionPath && (
                <Button
                  size="sm"
                  variant="default"
                  className="flex-1"
                  onClick={() => {
                    handleDismiss();
                    window.location.href = currentMessage.actionPath!;
                  }}
                >
                  {currentMessage.actionLabel}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDismiss}
                className="flex-1"
              >
                Entendi
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Simple contextual encouragement based on user action
 */
interface EncouragementToastProps {
  message: string;
  type?: 'success' | 'milestone' | 'tip';
  onClose: () => void;
}

export function EncouragementToast({ message, type = 'success', onClose }: EncouragementToastProps) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed top-20 left-4 right-4 z-50 max-w-md mx-auto"
    >
      <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-xl p-3 shadow-lg">
        <div className="flex items-center gap-3">
          <Heart className="w-5 h-5 text-green-600" />
          <p className="text-sm text-green-800 dark:text-green-200 flex-1">
            {message}
          </p>
          <button onClick={onClose}>
            <X className="w-4 h-4 text-green-600" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
