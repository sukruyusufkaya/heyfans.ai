"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Bell, Coins, Heart, LogOut, MessageCircle, Search, Settings, Shield, Sparkles, Star, User } from "lucide-react";
import { LogoLink } from "@/components/brand/logo";
import { Avatar } from "@/components/ui/display";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/overlays";
import { FAN_BOTTOM_NAV, FAN_SIDEBAR, FAN_TOP_NAV, isActive } from "@/config/navigation";
import { authClient } from "@/lib/auth/client";
import { cn, formatNumber } from "@/lib/utils";

export interface FanShellProps {
  user: { name: string; image: string | null; roles: string[] };
  credits: number;
  unreadNotifications: number;
  unreadChats: number;
  membershipLabel: string;
  children: React.ReactNode;
}

export function FanShell({ user, credits, unreadNotifications, unreadChats, membershipLabel, children }: FanShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [q, setQ] = useState("");
  const badges: Record<string, number> = { unreadNotifications, unreadChats };

  async function signOut() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-dvh bg-canvas">
      <header className="sticky top-0 z-40 h-[70px] border-b border-line bg-white shadow-[var(--shadow-header)]">
        <div className="flex h-full items-center gap-6 px-4 lg:gap-10 lg:px-8">
          <LogoLink href="/app" />
          <nav aria-label="Hayran menüsü" className="hidden h-full flex-1 items-center gap-6 lg:flex">
            {FAN_TOP_NAV.map((item) => {
              const active = isActive(pathname, item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex h-full items-center whitespace-nowrap text-[13px] font-bold",
                    active ? "text-brand-500 after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:rounded-full after:bg-brand-500" : "text-[#7d7788] hover:text-brand-500",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="ms-auto flex items-center gap-3 lg:ms-0">
            <form
              role="search"
              className="hidden md:block"
              onSubmit={(e) => {
                e.preventDefault();
                router.push(q.trim() ? `/explore?q=${encodeURIComponent(q.trim())}` : "/explore");
              }}
            >
              <div className="flex h-[38px] w-[210px] items-center gap-2 rounded-full border border-[#f0eef2] bg-[#f7f6f9] px-3.5 focus-within:border-brand-300">
                <Search className="size-3.5 text-[#aaa5ae]" aria-hidden />
                <input value={q} onChange={(e) => setQ(e.target.value)} aria-label="İçerik üreticisi ara" placeholder="İçerik üreticisi ara..." className="w-full bg-transparent text-xs outline-none" />
              </div>
            </form>
            <Link href="/app/wallet" className="flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-2.5 text-xs font-extrabold text-brand-500" aria-label={`Kredi bakiyesi: ${credits}`}>
              <Coins className="size-3.5" /> {formatNumber(credits)} Kredi
            </Link>
            <Link href="/chat" className="relative hidden text-[#55505d] hover:text-brand-500 sm:block" aria-label={`Sohbetler${unreadChats ? `, ${unreadChats} okunmamış` : ""}`}>
              <MessageCircle className="size-5" />
              {unreadChats > 0 && <i className="absolute -end-0.5 -top-0.5 size-2 rounded-full bg-brand-500 ring-2 ring-white" />}
            </Link>
            <Link href="/app/favorites" className="hidden text-[#55505d] hover:text-brand-500 sm:block" aria-label="Favoriler">
              <Heart className="size-5" />
            </Link>
            <Link href="/app/notifications" className="relative text-[#55505d] hover:text-brand-500" aria-label={`Bildirimler${unreadNotifications ? `, ${unreadNotifications} okunmamış` : ""}`}>
              <Bell className="size-5" />
              {unreadNotifications > 0 && <i className="absolute -end-0.5 -top-0.5 size-2 rounded-full bg-brand-500 ring-2 ring-white" />}
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger className="rounded-full" aria-label="Hesap menüsü">
                <Avatar src={user.image} name={user.name} size={36} />
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>{user.name}</DropdownMenuLabel>
                <DropdownMenuItem asChild>
                  <Link href="/app/profile"><User /> Profilim</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/app/settings"><Settings /> Hesap ve ödeme ayarları</Link>
                </DropdownMenuItem>
                {user.roles.includes("creator") && (
                  <DropdownMenuItem asChild>
                    <Link href="/studio"><Star /> Creator Studio</Link>
                  </DropdownMenuItem>
                )}
                {user.roles.includes("admin") && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin"><Shield /> Yönetim paneli</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={signOut} className="text-danger data-[highlighted]:bg-danger-soft data-[highlighted]:text-danger">
                  <LogOut className="rtl:-scale-x-100" /> Çıkış yap
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
        <aside className="sticky top-[70px] hidden h-[calc(100dvh-70px)] flex-col gap-1 overflow-y-auto border-e border-line bg-white px-4 py-6 scrollbar-thin lg:flex">
          <div className="mb-5 flex items-center gap-2.5 rounded-2xl border border-[#f3ebf0] bg-[#faf8fb] p-2.5">
            <Avatar src={user.image} name={user.name} size={38} />
            <div className="min-w-0">
              <p className="text-[11px] text-muted">Merhaba,</p>
              <p className="truncate text-[13px] font-extrabold">{user.name}</p>
              <p className="mt-0.5 flex items-center gap-1 text-[10px] text-[#6a6471]">
                <span className="size-1.5 rounded-full bg-[#08bb8e]" /> {membershipLabel}
              </p>
            </div>
          </div>
          <p className="mx-3 mb-2 text-[10px] font-extrabold tracking-[0.2em] text-[#aaa5b0]">MENÜ</p>
          <nav aria-label="Yan menü" className="grid gap-0.5">
            {FAN_SIDEBAR.map((item) => {
              const active = isActive(pathname, item);
              const Icon = item.icon!;
              const count = item.badgeKey ? badges[item.badgeKey] ?? 0 : 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3.5 rounded-xl px-3 py-[11px] text-[13px] font-bold transition-colors",
                    active ? "bg-brand-100 text-brand-500" : "text-[#746d79] hover:bg-soft hover:text-ink",
                  )}
                >
                  <Icon className="size-[18px]" aria-hidden />
                  {item.label}
                  {count > 0 && <span className="ms-auto size-[7px] rounded-full bg-brand-500" aria-label={`${count} yeni`} />}
                </Link>
              );
            })}
          </nav>
          <div className="hf-gradient-pink mt-auto rounded-[18px] p-4 shadow-[inset_0_0_0_1px_#fbdfed]">
            <span className="mb-3 grid size-10 place-items-center rounded-[13px] bg-white text-brand-500">
              <Sparkles className="size-5" />
            </span>
            <p className="text-sm font-extrabold">Yeni AI ikizleri keşfet</p>
            <p className="mt-1 text-[11px] leading-relaxed text-[#918495]">İlgi alanlarına uygun yepyeni bağlantılar seni bekliyor.</p>
            <Link href="/explore" className="mt-3 flex items-center justify-center gap-2 rounded-[9px] bg-brand-500 py-2.5 text-[11px] font-bold text-white hover:bg-brand-600">
              Şimdi keşfet →
            </Link>
          </div>
        </aside>
        <main id="main" className="min-w-0 px-4 pb-28 pt-6 sm:px-6 lg:px-7 lg:pb-10">
          {children}
        </main>
      </div>

      <nav aria-label="Alt menü" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
        {FAN_BOTTOM_NAV.map((item) => {
          const active = isActive(pathname, item);
          const Icon = item.icon!;
          return (
            <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={cn("flex flex-col items-center gap-1 py-2.5 text-[10px] font-bold", active ? "text-brand-500" : "text-muted")}>
              <Icon className="size-5" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
