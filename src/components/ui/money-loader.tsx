import { cn } from "@/lib/utils";
import { DollarSign } from "lucide-react";

interface MoneyLoaderProps {
  label?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

/**
 * Animated dollar sign loader component.
 * Respects "reduce motion" accessibility preferences.
 */
export function MoneyLoader({ 
  label = "Carregando...", 
  size = "md",
  className 
}: MoneyLoaderProps) {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-10 h-10",
    lg: "w-16 h-16",
  };

  const iconSizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-10 h-10",
  };

  const textSizeClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3",
        className
      )}
      role="status"
      aria-label={label}
    >
      {/* Animated container */}
      <div className="relative">
        {/* Outer pulsing ring */}
        <div
          className={cn(
            sizeClasses[size],
            "absolute inset-0 rounded-full bg-primary/20",
            "motion-safe:animate-ping"
          )}
        />
        
        {/* Inner circle with dollar sign */}
        <div
          className={cn(
            sizeClasses[size],
            "relative rounded-full bg-gradient-to-br from-primary to-primary/80",
            "flex items-center justify-center shadow-lg",
            "motion-safe:animate-pulse"
          )}
        >
          <DollarSign
            className={cn(
              iconSizeClasses[size],
              "text-primary-foreground",
              "motion-safe:animate-bounce"
            )}
            strokeWidth={2.5}
          />
        </div>
      </div>

      {/* Label */}
      {label && (
        <span
          className={cn(
            textSizeClasses[size],
            "text-muted-foreground font-medium",
            "motion-safe:animate-pulse"
          )}
        >
          {label}
        </span>
      )}
    </div>
  );
}

interface ScreenLoaderProps {
  label?: string;
  overlay?: boolean;
  className?: string;
}

/**
 * Full-screen loader overlay with MoneyLoader.
 */
export function ScreenLoader({
  label = "Carregando...",
  overlay = true,
  className,
}: ScreenLoaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-center",
        overlay
          ? "fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
          : "min-h-[200px] w-full",
        className
      )}
    >
      <MoneyLoader label={label} size="lg" />
    </div>
  );
}

interface SkeletonCardProps {
  className?: string;
}

/**
 * Skeleton card for loading states.
 */
export function SkeletonCard({ className }: SkeletonCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/30 bg-card p-4 space-y-3",
        "motion-safe:animate-pulse",
        className
      )}
    >
      <div className="h-4 w-1/3 rounded bg-muted" />
      <div className="h-8 w-2/3 rounded bg-muted" />
      <div className="h-3 w-1/2 rounded bg-muted" />
    </div>
  );
}

/**
 * Skeleton for the home/dashboard page.
 */
export function SkeletonHome() {
  return (
    <div className="space-y-4 p-4 motion-safe:animate-pulse">
      {/* Balance card skeleton */}
      <div className="rounded-2xl border border-border/30 bg-card p-6 space-y-4">
        <div className="h-4 w-24 rounded bg-muted" />
        <div className="h-10 w-40 rounded bg-muted" />
        <div className="flex gap-4">
          <div className="h-12 flex-1 rounded-xl bg-muted" />
          <div className="h-12 flex-1 rounded-xl bg-muted" />
        </div>
      </div>

      {/* Quick actions skeleton */}
      <div className="flex gap-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-20 flex-1 rounded-2xl border border-border/30 bg-card"
          />
        ))}
      </div>

      {/* Transaction list skeleton */}
      <div className="rounded-2xl border border-border/30 bg-card p-4 space-y-3">
        <div className="h-4 w-32 rounded bg-muted" />
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-3 py-2">
            <div className="w-10 h-10 rounded-full bg-muted" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-3/4 rounded bg-muted" />
              <div className="h-2 w-1/2 rounded bg-muted" />
            </div>
            <div className="h-4 w-16 rounded bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Skeleton for transaction list.
 */
export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3 motion-safe:animate-pulse">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/30">
          <div className="w-10 h-10 rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-3/4 rounded bg-muted" />
            <div className="h-2 w-1/2 rounded bg-muted" />
          </div>
          <div className="h-4 w-16 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}