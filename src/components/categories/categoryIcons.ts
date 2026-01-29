import {
  Home,
  Utensils,
  Car,
  PartyPopper,
  Baby,
  Dog,
  Heart,
  Shirt,
  GraduationCap,
  CreditCard,
  Package,
  Wrench,
  AlertTriangle,
  Target,
  Wallet,
  TrendingUp,
  Building,
  Plane,
  ShoppingCart,
  Lightbulb,
  Droplet,
  Wifi,
  Phone,
  Tv,
  Briefcase,
  Gift,
  Music,
  Camera,
  Dumbbell,
  Pill,
  Stethoscope,
  Scissors,
  Book,
  Coffee,
  Wine,
  UtensilsCrossed,
  Fuel,
  Bus,
  Bike,
  PlaneTakeoff,
  Hotel,
  Map,
  Gamepad2,
  Theater,
  Ticket,
  ShoppingBag,
  Gem,
  Watch,
  Brush,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export const categoryIcons: Record<string, LucideIcon> = {
  // Home & Living
  home: Home,
  casa: Home,
  building: Building,
  
  // Food & Dining
  utensils: Utensils,
  alimentacao: Utensils,
  coffee: Coffee,
  wine: Wine,
  restaurant: UtensilsCrossed,
  
  // Transportation
  car: Car,
  transporte: Car,
  fuel: Fuel,
  bus: Bus,
  bike: Bike,
  plane: Plane,
  planetakeoff: PlaneTakeoff,
  
  // Entertainment
  party: PartyPopper,
  lazer: PartyPopper,
  music: Music,
  camera: Camera,
  gamepad: Gamepad2,
  theater: Theater,
  ticket: Ticket,
  
  // Family
  baby: Baby,
  filhos: Baby,
  
  // Pets
  dog: Dog,
  pet: Dog,
  
  // Health
  heart: Heart,
  saude: Heart,
  pill: Pill,
  stethoscope: Stethoscope,
  dumbbell: Dumbbell,
  
  // Fashion
  shirt: Shirt,
  roupa: Shirt,
  scissors: Scissors,
  gem: Gem,
  watch: Watch,
  brush: Brush,
  sparkles: Sparkles,
  shoppingbag: ShoppingBag,
  
  // Education
  graduationcap: GraduationCap,
  educacao: GraduationCap,
  book: Book,
  
  // Finance
  creditcard: CreditCard,
  financeiro: CreditCard,
  wallet: Wallet,
  trendingup: TrendingUp,
  
  // Work
  briefcase: Briefcase,
  trabalho: Briefcase,
  
  // Other
  package: Package,
  diversos: Package,
  wrench: Wrench,
  manutencao: Wrench,
  alerttriangle: AlertTriangle,
  eventuais: AlertTriangle,
  target: Target,
  objetivos: Target,
  gift: Gift,
  shoppingcart: ShoppingCart,
  
  // Utilities
  lightbulb: Lightbulb,
  droplet: Droplet,
  wifi: Wifi,
  phone: Phone,
  tv: Tv,
  
  // Travel
  hotel: Hotel,
  map: Map,
};

export const iconOptions = [
  { key: 'home', label: 'Casa', icon: Home },
  { key: 'utensils', label: 'Alimentação', icon: Utensils },
  { key: 'car', label: 'Transporte', icon: Car },
  { key: 'party', label: 'Lazer', icon: PartyPopper },
  { key: 'baby', label: 'Filhos', icon: Baby },
  { key: 'dog', label: 'Pet', icon: Dog },
  { key: 'heart', label: 'Saúde', icon: Heart },
  { key: 'shirt', label: 'Roupas', icon: Shirt },
  { key: 'graduationcap', label: 'Educação', icon: GraduationCap },
  { key: 'creditcard', label: 'Financeiro', icon: CreditCard },
  { key: 'package', label: 'Diversos', icon: Package },
  { key: 'wrench', label: 'Manutenção', icon: Wrench },
  { key: 'target', label: 'Objetivos', icon: Target },
  { key: 'wallet', label: 'Carteira', icon: Wallet },
  { key: 'trendingup', label: 'Investimentos', icon: TrendingUp },
  { key: 'briefcase', label: 'Trabalho', icon: Briefcase },
  { key: 'gift', label: 'Presentes', icon: Gift },
  { key: 'plane', label: 'Viagens', icon: Plane },
  { key: 'shoppingcart', label: 'Compras', icon: ShoppingCart },
  { key: 'coffee', label: 'Café', icon: Coffee },
];

export const getIconByKey = (key: string): LucideIcon => {
  return categoryIcons[key.toLowerCase()] || Package;
};
