import {
  BadgeDollarSign,
  BarChart3,
  Bell,
  BookOpen,
  Bot,
  Brain,
  Compass,
  CreditCard,
  FileStack,
  FlaskConical,
  Gift,
  Heart,
  Home,
  Inbox,
  LayoutDashboard,
  Megaphone,
  MessageCircle,
  Mic2,
  PenSquare,
  Settings,
  Shield,
  ShieldAlert,
  Sparkles,
  Star,
  User,
  UserCog,
  Users,
  Wallet,
  WalletCards,
  Crown,
  Flag,
  Cpu,
  type LucideIcon,
} from "lucide-react";
import type { Permission } from "@/lib/permissions";

export interface NavItem {
  href: string;
  label: string;
  icon?: LucideIcon;
  /** Aktiflik eşleşmesi: "exact" ya da önek */
  match?: "exact" | "prefix";
  permission?: Permission;
  badgeKey?: string;
}
export interface NavGroup {
  label?: string;
  items: NavItem[];
}

export const PUBLIC_NAV: NavItem[] = [
  { href: "/", label: "Ana Sayfa", match: "exact" },
  { href: "/explore", label: "Keşfet" },
  { href: "/trending", label: "Trendler" },
  { href: "/categories", label: "Kategoriler" },
  { href: "/how-it-works", label: "Nasıl Çalışır" },
  { href: "/for-creators", label: "İçerik Üreticileri İçin" },
  { href: "/pricing", label: "Fiyatlandırma" },
  { href: "/about", label: "Hakkımızda" },
];

export const FAN_TOP_NAV: NavItem[] = [
  { href: "/app", label: "Ana Sayfa", match: "exact" },
  { href: "/explore", label: "Keşfet" },
  { href: "/app/following", label: "Takip Ettiklerim" },
  { href: "/app/favorites", label: "Favorilerim" },
  { href: "/chat", label: "Sohbetler" },
  { href: "/app/subscriptions", label: "Üyeliklerim" },
];

export const FAN_SIDEBAR: NavItem[] = [
  { href: "/app", label: "Ana Sayfa", icon: Home, match: "exact" },
  { href: "/explore", label: "Keşfet", icon: Compass },
  { href: "/app/following", label: "Takip Ettiklerim", icon: Users },
  { href: "/app/favorites", label: "Favorilerim", icon: Heart },
  { href: "/chat", label: "Sohbetler", icon: MessageCircle, badgeKey: "unreadChats" },
  { href: "/app/subscriptions", label: "Üyeliklerim", icon: Crown },
  { href: "/app/experiences", label: "Deneyimlerim", icon: Sparkles },
  { href: "/app/wallet", label: "Cüzdanım", icon: Wallet },
  { href: "/app/gifts", label: "Hediyeler", icon: Gift },
  { href: "/app/notifications", label: "Bildirimler", icon: Bell, badgeKey: "unreadNotifications" },
  { href: "/app/profile", label: "Profilim", icon: User },
  { href: "/app/personalization", label: "Kişiselleştirme", icon: Brain },
  { href: "/app/settings", label: "Ayarlar", icon: Settings },
];

export const FAN_BOTTOM_NAV: NavItem[] = [
  { href: "/app", label: "Ana Sayfa", icon: Home, match: "exact" },
  { href: "/explore", label: "Keşfet", icon: Compass },
  { href: "/chat", label: "Sohbetler", icon: MessageCircle },
  { href: "/app/favorites", label: "Favoriler", icon: Heart },
  { href: "/app/profile", label: "Profil", icon: User },
];

export const STUDIO_NAV: NavGroup[] = [
  {
    label: "CREATOR STUDIO",
    items: [
      { href: "/studio", label: "Genel Panel", icon: LayoutDashboard, match: "exact" },
      { href: "/studio/ai-twin", label: "AI İkizim", icon: Bot },
      { href: "/studio/personality", label: "Kişilik Stüdyosu", icon: Sparkles },
      { href: "/studio/knowledge", label: "Bilgi Tabanı", icon: BookOpen },
      { href: "/studio/voice", label: "Ses ve Görünüm", icon: Mic2 },
      { href: "/studio/boundaries", label: "Sınırlar ve İzinler", icon: Shield },
      { href: "/studio/test", label: "AI İkizi Testi", icon: FlaskConical },
      { href: "/studio/content", label: "İçerik Kütüphanesi", icon: FileStack, match: "exact" },
      { href: "/studio/content/new", label: "İçerik Oluşturma", icon: PenSquare },
      { href: "/studio/memberships", label: "Üyelik Yönetimi", icon: Crown },
    ],
  },
  {
    label: "YÖNETİM & BÜYÜME",
    items: [
      { href: "/studio/requests", label: "Özel Talepler", icon: Inbox, badgeKey: "pendingRequests" },
      { href: "/studio/conversations", label: "Sohbetler", icon: MessageCircle },
      { href: "/studio/fans", label: "Hayranlar ve Kitle", icon: Users },
      { href: "/studio/earnings", label: "Gelirler", icon: BadgeDollarSign },
      { href: "/studio/payouts", label: "Ödemeler", icon: WalletCards },
      { href: "/studio/analytics", label: "Analitik", icon: BarChart3 },
      { href: "/studio/profile", label: "Profil Düzenleyici", icon: UserCog },
      { href: "/studio/settings", label: "Stüdyo Ayarları", icon: Settings },
    ],
  },
];

export const ADMIN_NAV: NavGroup[] = [
  {
    label: "GENEL",
    items: [
      { href: "/admin", label: "Genel Bakış", icon: LayoutDashboard, match: "exact", permission: "admin.dashboard" },
      { href: "/admin/creators", label: "İçerik Üreticileri", icon: Star, permission: "creators.read" },
      { href: "/admin/users", label: "Kullanıcılar", icon: Users, permission: "users.read" },
      { href: "/admin/ai-twins", label: "AI İkizleri", icon: Bot, permission: "twins.read" },
    ],
  },
  {
    label: "GÜVENLİK VE UYUM",
    items: [
      { href: "/admin/moderation", label: "İçerik Moderasyonu", icon: ShieldAlert, permission: "moderation.read", badgeKey: "openCases" },
      { href: "/admin/reports", label: "Raporlar ve İtirazlar", icon: Flag, permission: "reports.read", badgeKey: "openReports" },
    ],
  },
  {
    label: "FİNANS VE YAPAY ZEKÂ",
    items: [
      { href: "/admin/finance", label: "Finans ve İşlemler", icon: CreditCard, permission: "finance.read" },
      { href: "/admin/ai-operations", label: "AI Operasyonları", icon: Cpu, permission: "ai_ops.read" },
      { href: "/admin/analytics", label: "Platform Analitiği", icon: BarChart3, permission: "analytics.read" },
    ],
  },
  {
    label: "İÇERİK VE SİSTEM",
    items: [
      { href: "/admin/content", label: "CMS ve Kampanyalar", icon: Megaphone, permission: "cms.manage" },
      { href: "/admin/settings", label: "Platform Ayarları", icon: Settings, permission: "settings.read" },
    ],
  },
];

export const SUPPORT_NAV: NavItem[] = [
  { href: "/help", label: "Yardım Merkezi" },
  { href: "/contact", label: "İletişim" },
  { href: "/trust-and-safety", label: "Güven ve Güvenlik" },
  { href: "/privacy", label: "Gizlilik Politikası" },
  { href: "/terms", label: "Kullanım Şartları" },
  { href: "/creator-agreement", label: "Creator Sözleşmesi" },
  { href: "/community-guidelines", label: "Topluluk Kuralları" },
  { href: "/copyright", label: "Telif ve İçerik Kaldırma" },
  { href: "/cookies", label: "Çerez Politikası" },
];

export const FOOTER_COLUMNS: { title: string; links: NavItem[] }[] = [
  {
    title: "Platform",
    links: [
      { href: "/", label: "Ana Sayfa" },
      { href: "/explore", label: "Keşfet" },
      { href: "/trending", label: "Trendler" },
      { href: "/categories", label: "Kategoriler" },
    ],
  },
  {
    title: "Yardım",
    links: [
      { href: "/how-it-works", label: "Nasıl Çalışır" },
      { href: "/pricing", label: "Fiyatlandırma" },
      { href: "/help", label: "Yardım Merkezi" },
      { href: "/contact", label: "İletişim" },
    ],
  },
  {
    title: "Yasal",
    links: [
      { href: "/terms", label: "Kullanım Şartları" },
      { href: "/privacy", label: "Gizlilik Politikası" },
      { href: "/cookies", label: "Çerez Politikası" },
      { href: "/community-guidelines", label: "Topluluk Kuralları" },
      { href: "/copyright", label: "Telif ve İçerik Kaldırma" },
    ],
  },
  {
    title: "İçerik Üreticileri İçin",
    links: [
      { href: "/for-creators", label: "HEYFANS'a Katıl" },
      { href: "/creator-agreement", label: "Creator Sözleşmesi" },
      { href: "/trust-and-safety", label: "Güven ve Güvenlik" },
      { href: "/studio", label: "Creator Studio" },
    ],
  },
];

export function isActive(pathname: string, item: Pick<NavItem, "href" | "match">) {
  if (item.match === "exact") return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
