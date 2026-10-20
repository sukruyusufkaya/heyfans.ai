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
import { m } from "@/i18n/m";

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
  "yasam-tarzi": m("Yaşam Tarzı"),
  fitness: m("Fitness"),
  seyahat: m("Seyahat"),
  oyun: m("Oyun"),
  muzik: m("Müzik"),
  egitim: m("Eğitim"),
  moda: m("Moda"),
  sanat: m("Sanat"),
  "is-dunyasi": m("İş Dünyası"),
  wellness: m("Wellness"),
  yemek: m("Yemek"),
  "ev-yasam": m("Ev & Yaşam"),
  "evcil-dostlar": m("Evcil Dostlar"),
};

/** Kaynak (Türkçe) etiketi döner; gösterirken `t(categoryLabel(slug))` kullanın. */
export const categoryLabel = (slug: string) => CATEGORY_LABELS[slug] ?? slug;
