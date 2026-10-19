import {
  BookOpen,
  Briefcase,
  ChefHat,
  Dumbbell,
  Flower2,
  Gamepad2,
  Home,
  Music,
  Palette,
  PawPrint,
  Plane,
  Shirt,
  Sofa,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

const ICONS: Record<string, LucideIcon> = {
  home: Home,
  dumbbell: Dumbbell,
  plane: Plane,
  "gamepad-2": Gamepad2,
  music: Music,
  "book-open": BookOpen,
  shirt: Shirt,
  palette: Palette,
  briefcase: Briefcase,
  "flower-2": Flower2,
  "chef-hat": ChefHat,
  sofa: Sofa,
  "paw-print": PawPrint,
};

export function CategoryIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? Sparkles;
  return <Icon className={className} aria-hidden />;
}

export const CATEGORY_LABELS: Record<string, string> = {
  "yasam-tarzi": "Yaşam Tarzı",
  fitness: "Fitness",
  seyahat: "Seyahat",
  oyun: "Oyun",
  muzik: "Müzik",
  egitim: "Eğitim",
  moda: "Moda",
  sanat: "Sanat",
  "is-dunyasi": "İş Dünyası",
  wellness: "Wellness",
  yemek: "Yemek",
  "ev-yasam": "Ev & Yaşam",
  "evcil-dostlar": "Evcil Dostlar",
};

export const categoryLabel = (slug: string) => CATEGORY_LABELS[slug] ?? slug;
