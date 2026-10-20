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
import { m } from "@/i18n/m";

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
  { href: "/", label: m("Ana Sayfa"), match: "exact" },
  { href: "/explore", label: m("Keşfet") },
  { href: "/trending", label: m("Trendler") },
  { href: "/categories", label: m("Kategoriler") },
  { href: "/how-it-works", label: m("Nasıl Çalışır") },
  { href: "/for-creators", label: m("İçerik Üreticileri İçin") },
  { href: "/pricing", label: m("Fiyatlandırma") },
  { href: "/about", label: m("Hakkımızda") },
];

export const FAN_TOP_NAV: NavItem[] = [
  { href: "/app", label: m("Ana Sayfa"), match: "exact" },
  { href: "/explore", label: m("Keşfet") },
  { href: "/app/following", label: m("Takip Ettiklerim") },
  { href: "/app/favorites", label: m("Favorilerim") },
  { href: "/chat", label: m("Sohbetler") },
  { href: "/app/subscriptions", label: m("Üyeliklerim") },
];

export const FAN_SIDEBAR: NavItem[] = [
  { href: "/app", label: m("Ana Sayfa"), icon: Home, match: "exact" },
  { href: "/explore", label: m("Keşfet"), icon: Compass },
  { href: "/app/following", label: m("Takip Ettiklerim"), icon: Users },
  { href: "/app/favorites", label: m("Favorilerim"), icon: Heart },
  { href: "/chat", label: m("Sohbetler"), icon: MessageCircle, badgeKey: "unreadChats" },
  { href: "/app/subscriptions", label: m("Üyeliklerim"), icon: Crown },
  { href: "/app/experiences", label: m("Deneyimlerim"), icon: Sparkles },
  { href: "/app/wallet", label: m("Cüzdanım"), icon: Wallet },
  { href: "/app/gifts", label: m("Hediyeler"), icon: Gift },
  { href: "/app/notifications", label: m("Bildirimler"), icon: Bell, badgeKey: "unreadNotifications" },
  { href: "/app/profile", label: m("Profilim"), icon: User },
  { href: "/app/personalization", label: m("Kişiselleştirme"), icon: Brain },
  { href: "/app/settings", label: m("Ayarlar"), icon: Settings },
];

export const FAN_BOTTOM_NAV: NavItem[] = [
  { href: "/app", label: m("Ana Sayfa"), icon: Home, match: "exact" },
  { href: "/explore", label: m("Keşfet"), icon: Compass },
  { href: "/chat", label: m("Sohbetler"), icon: MessageCircle },
  { href: "/app/favorites", label: m("Favoriler"), icon: Heart },
  { href: "/app/profile", label: m("Profil"), icon: User },
];

export const STUDIO_NAV: NavGroup[] = [
  {
    label: m("CREATOR STUDIO"),
    items: [
      { href: "/studio", label: m("Genel Panel"), icon: LayoutDashboard, match: "exact" },
      { href: "/studio/ai-twin", label: m("AI İkizim"), icon: Bot },
      { href: "/studio/personality", label: m("Kişilik Stüdyosu"), icon: Sparkles },
      { href: "/studio/knowledge", label: m("Bilgi Tabanı"), icon: BookOpen },
      { href: "/studio/voice", label: m("Ses ve Görünüm"), icon: Mic2 },
      { href: "/studio/boundaries", label: m("Sınırlar ve İzinler"), icon: Shield },
      { href: "/studio/test", label: m("AI İkizi Testi"), icon: FlaskConical },
      { href: "/studio/content", label: m("İçerik Kütüphanesi"), icon: FileStack, match: "exact" },
      { href: "/studio/content/new", label: m("İçerik Oluşturma"), icon: PenSquare },
      { href: "/studio/memberships", label: m("Üyelik Yönetimi"), icon: Crown },
    ],
  },
  {
    label: m("YÖNETİM & BÜYÜME"),
    items: [
      { href: "/studio/requests", label: m("Özel Talepler"), icon: Inbox, badgeKey: "pendingRequests" },
      { href: "/studio/conversations", label: m("Sohbetler"), icon: MessageCircle },
      { href: "/studio/fans", label: m("Hayranlar ve Kitle"), icon: Users },
      { href: "/studio/earnings", label: m("Gelirler"), icon: BadgeDollarSign },
      { href: "/studio/payouts", label: m("Ödemeler"), icon: WalletCards },
      { href: "/studio/analytics", label: m("Analitik"), icon: BarChart3 },
      { href: "/studio/profile", label: m("Profil Düzenleyici"), icon: UserCog },
      { href: "/studio/settings", label: m("Stüdyo Ayarları"), icon: Settings },
    ],
  },
];

export const ADMIN_NAV: NavGroup[] = [
  {
    label: m("GENEL"),
    items: [
      { href: "/admin", label: m("Genel Bakış"), icon: LayoutDashboard, match: "exact", permission: "admin.dashboard" },
      { href: "/admin/creators", label: m("İçerik Üreticileri"), icon: Star, permission: "creators.read" },
      { href: "/admin/users", label: m("Kullanıcılar"), icon: Users, permission: "users.read" },
      { href: "/admin/ai-twins", label: m("AI İkizleri"), icon: Bot, permission: "twins.read" },
    ],
  },
  {
    label: m("GÜVENLİK VE UYUM"),
    items: [
      { href: "/admin/moderation", label: m("İçerik Moderasyonu"), icon: ShieldAlert, permission: "moderation.read", badgeKey: "openCases" },
      { href: "/admin/reports", label: m("Raporlar ve İtirazlar"), icon: Flag, permission: "reports.read", badgeKey: "openReports" },
    ],
  },
  {
    label: m("FİNANS VE YAPAY ZEKÂ"),
    items: [
      { href: "/admin/finance", label: m("Finans ve İşlemler"), icon: CreditCard, permission: "finance.read" },
      { href: "/admin/ai-operations", label: m("AI Operasyonları"), icon: Cpu, permission: "ai_ops.read" },
      { href: "/admin/analytics", label: m("Platform Analitiği"), icon: BarChart3, permission: "analytics.read" },
    ],
  },
  {
    label: m("İÇERİK VE SİSTEM"),
    items: [
      { href: "/admin/content", label: m("CMS ve Kampanyalar"), icon: Megaphone, permission: "cms.manage" },
      { href: "/admin/settings", label: m("Platform Ayarları"), icon: Settings, permission: "settings.read" },
    ],
  },
];

export const SUPPORT_NAV: NavItem[] = [
  { href: "/help", label: m("Yardım Merkezi") },
  { href: "/contact", label: m("İletişim") },
  { href: "/trust-and-safety", label: m("Güven ve Güvenlik") },
  { href: "/privacy", label: m("Gizlilik Politikası") },
  { href: "/terms", label: m("Kullanım Şartları") },
  { href: "/creator-agreement", label: m("Creator Sözleşmesi") },
  { href: "/community-guidelines", label: m("Topluluk Kuralları") },
  { href: "/copyright", label: m("Telif ve İçerik Kaldırma") },
  { href: "/cookies", label: m("Çerez Politikası") },
];

export const FOOTER_COLUMNS: { title: string; links: NavItem[] }[] = [
  {
    title: m("Platform"),
    links: [
      { href: "/", label: m("Ana Sayfa") },
      { href: "/explore", label: m("Keşfet") },
      { href: "/trending", label: m("Trendler") },
      { href: "/categories", label: m("Kategoriler") },
    ],
  },
  {
    title: m("Yardım"),
    links: [
      { href: "/how-it-works", label: m("Nasıl Çalışır") },
      { href: "/pricing", label: m("Fiyatlandırma") },
      { href: "/help", label: m("Yardım Merkezi") },
      { href: "/contact", label: m("İletişim") },
    ],
  },
  {
    title: m("Yasal"),
    links: [
      { href: "/terms", label: m("Kullanım Şartları") },
      { href: "/privacy", label: m("Gizlilik Politikası") },
      { href: "/cookies", label: m("Çerez Politikası") },
      { href: "/community-guidelines", label: m("Topluluk Kuralları") },
      { href: "/copyright", label: m("Telif ve İçerik Kaldırma") },
    ],
  },
  {
    title: m("İçerik Üreticileri İçin"),
    links: [
      { href: "/for-creators", label: m("HEYFANS'a Katıl") },
      { href: "/creator-agreement", label: m("Creator Sözleşmesi") },
      { href: "/trust-and-safety", label: m("Güven ve Güvenlik") },
      { href: "/studio", label: m("Creator Studio") },
    ],
  },
];

export function isActive(pathname: string, item: Pick<NavItem, "href" | "match">) {
  if (item.match === "exact") return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
