import { Check, X } from "lucide-react";
import { getPasswordStrength } from "@/lib/passwordValidation";
import { cn } from "@/lib/utils";

interface PasswordStrengthIndicatorProps {
  password: string;
  className?: string;
}

export function PasswordStrengthIndicator({ password, className }: PasswordStrengthIndicatorProps) {
  const strength = getPasswordStrength(password);

  if (!password) return null;

  const requirements = [
    { met: strength.hasMinLength, label: "Mínimo 8 caracteres" },
    { met: strength.hasLetter, label: "Pelo menos uma letra" },
    { met: strength.hasNumber, label: "Pelo menos um número" },
  ];

  return (
    <div className={cn("space-y-1.5 pt-1", className)}>
      {requirements.map((req, index) => (
        <div 
          key={index}
          className={cn(
            "flex items-center gap-2 text-xs transition-colors duration-200",
            req.met ? "text-primary" : "text-muted-foreground"
          )}
        >
          {req.met ? (
            <Check className="w-3.5 h-3.5" />
          ) : (
            <X className="w-3.5 h-3.5" />
          )}
          <span>{req.label}</span>
        </div>
      ))}
    </div>
  );
}
