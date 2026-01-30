import { useState, useEffect } from "react";
import { ChevronDown, Phone } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// Common countries with their codes
const COUNTRIES = [
  { code: "BR", name: "Brasil", dialCode: "+55", flag: "🇧🇷" },
  { code: "US", name: "Estados Unidos", dialCode: "+1", flag: "🇺🇸" },
  { code: "PT", name: "Portugal", dialCode: "+351", flag: "🇵🇹" },
  { code: "ES", name: "Espanha", dialCode: "+34", flag: "🇪🇸" },
  { code: "AR", name: "Argentina", dialCode: "+54", flag: "🇦🇷" },
  { code: "MX", name: "México", dialCode: "+52", flag: "🇲🇽" },
  { code: "CL", name: "Chile", dialCode: "+56", flag: "🇨🇱" },
  { code: "CO", name: "Colômbia", dialCode: "+57", flag: "🇨🇴" },
  { code: "PE", name: "Peru", dialCode: "+51", flag: "🇵🇪" },
  { code: "UY", name: "Uruguai", dialCode: "+598", flag: "🇺🇾" },
  { code: "GB", name: "Reino Unido", dialCode: "+44", flag: "🇬🇧" },
  { code: "FR", name: "França", dialCode: "+33", flag: "🇫🇷" },
  { code: "DE", name: "Alemanha", dialCode: "+49", flag: "🇩🇪" },
  { code: "IT", name: "Itália", dialCode: "+39", flag: "🇮🇹" },
  { code: "JP", name: "Japão", dialCode: "+81", flag: "🇯🇵" },
];

interface PhoneInputProps {
  value?: string; // E.164 format
  countryCode?: string; // ISO code like "BR"
  onChange: (phoneE164: string, countryCode: string) => void;
  disabled?: boolean;
  className?: string;
}

// Format phone number for display (Brazilian format)
function formatPhoneDisplay(phone: string, country: string): string {
  if (!phone) return "";
  
  // Remove non-digits
  const digits = phone.replace(/\D/g, "");
  
  if (country === "BR") {
    // Brazilian format: (XX) XXXXX-XXXX
    if (digits.length >= 11) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
    } else if (digits.length >= 7) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    } else if (digits.length >= 2) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    }
    return digits;
  }
  
  // Generic format for other countries
  return digits;
}

// Parse E.164 to local number and country
function parseE164(e164: string, defaultCountry: string = "BR"): { localNumber: string; country: string } {
  if (!e164 || !e164.startsWith("+")) {
    return { localNumber: e164 || "", country: defaultCountry };
  }
  
  // Try to match country code
  for (const country of COUNTRIES) {
    if (e164.startsWith(country.dialCode)) {
      const localNumber = e164.slice(country.dialCode.length);
      return { localNumber, country: country.code };
    }
  }
  
  return { localNumber: e164.slice(1), country: defaultCountry };
}

// Convert to E.164 format
function toE164(localNumber: string, countryCode: string): string {
  if (!localNumber) return "";
  
  const digits = localNumber.replace(/\D/g, "");
  const country = COUNTRIES.find(c => c.code === countryCode);
  
  if (!country || !digits) return "";
  
  return `${country.dialCode}${digits}`;
}

// Validate phone number by country
function isValidPhone(localNumber: string, countryCode: string): boolean {
  const digits = localNumber.replace(/\D/g, "");
  
  if (countryCode === "BR") {
    // Brazil: 10-11 digits (DDD + number)
    return digits.length >= 10 && digits.length <= 11;
  }
  
  // Generic: at least 6 digits
  return digits.length >= 6;
}

export function PhoneInput({ 
  value = "", 
  countryCode = "BR", 
  onChange, 
  disabled = false,
  className 
}: PhoneInputProps) {
  const [open, setOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(
    COUNTRIES.find(c => c.code === countryCode) || COUNTRIES[0]
  );
  const [localNumber, setLocalNumber] = useState("");
  
  // Parse initial value
  useEffect(() => {
    if (value) {
      const { localNumber: parsed, country } = parseE164(value, countryCode);
      setLocalNumber(parsed);
      const foundCountry = COUNTRIES.find(c => c.code === country);
      if (foundCountry) {
        setSelectedCountry(foundCountry);
      }
    } else if (countryCode) {
      const foundCountry = COUNTRIES.find(c => c.code === countryCode);
      if (foundCountry) {
        setSelectedCountry(foundCountry);
      }
    }
  }, [value, countryCode]);
  
  const handleCountrySelect = (country: typeof COUNTRIES[0]) => {
    setSelectedCountry(country);
    setOpen(false);
    const e164 = toE164(localNumber, country.code);
    onChange(e164, country.code);
  };
  
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    // Keep only digits for internal storage - this ensures backspace works naturally
    // When user hits backspace on a mask character, we just strip non-digits
    const digits = inputValue.replace(/\D/g, "");
    
    // Limit digits based on country
    const maxDigits = selectedCountry.code === "BR" ? 11 : 15;
    const limitedDigits = digits.slice(0, maxDigits);
    
    setLocalNumber(limitedDigits);
    
    const e164 = toE164(limitedDigits, selectedCountry.code);
    onChange(e164, selectedCountry.code);
  };
  
  // Handle keydown specifically for better backspace behavior
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // For backspace, if the current display shows mask chars, we just let the 
    // normal flow handle it (digits will be extracted in onChange)
    if (e.key === "Backspace" && localNumber.length > 0) {
      // Prevent default only if we need to handle it manually
      // Actually, we let the input handle it naturally and just strip digits in onChange
    }
  };
  
  const displayValue = formatPhoneDisplay(localNumber, selectedCountry.code);
  const isValid = !localNumber || isValidPhone(localNumber, selectedCountry.code);
  
  return (
    <div className={cn("space-y-2", className)}>
      {/* Country Selector */}
      <div className="flex items-center gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="justify-between min-w-[180px]"
              disabled={disabled}
            >
              <span className="flex items-center gap-2">
                <span className="text-lg">{selectedCountry.flag}</span>
                <span className="text-sm">{selectedCountry.name}</span>
                <span className="text-xs text-muted-foreground">
                  ({selectedCountry.dialCode})
                </span>
              </span>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[240px] p-0" align="start">
            <div className="max-h-[300px] overflow-y-auto">
              {COUNTRIES.map((country) => (
                <button
                  key={country.code}
                  onClick={() => handleCountrySelect(country)}
                  className={cn(
                    "flex w-full items-center gap-3 px-3 py-2 hover:bg-accent text-left",
                    selectedCountry.code === country.code && "bg-accent"
                  )}
                >
                  <span className="text-lg">{country.flag}</span>
                  <span className="flex-1 text-sm">{country.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {country.dialCode}
                  </span>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
      
      {/* Phone Number Input */}
      <div className="relative">
        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="tel"
          value={displayValue}
          onChange={handlePhoneChange}
          placeholder={selectedCountry.code === "BR" ? "(48) 99999-9999" : "Número de telefone"}
          className={cn(
            "pl-9",
            !isValid && localNumber && "border-destructive"
          )}
          disabled={disabled}
        />
      </div>
      
      {/* Validation hint */}
      {!isValid && localNumber && (
        <p className="text-xs text-destructive">
          {selectedCountry.code === "BR" 
            ? "Digite DDD + número (10 ou 11 dígitos)"
            : "Número de telefone inválido"}
        </p>
      )}
    </div>
  );
}

// Export utilities for external use
export { toE164, parseE164, isValidPhone, COUNTRIES };
