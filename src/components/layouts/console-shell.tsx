"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, ChevronRight, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Search, Settings, User, X } from "lucide-react";
import { LogoLink } from "@/components/brand/logo";
import { Avatar } from "@/components/ui/display";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/overlays";
import { isActive, type NavGroup } from "@/config/navigation";
import { authClient } from "@/lib/auth/client";
import { cn } from "@/lib/utils";

export interface ConsoleShellProps {
  variant: "studio" | "admin";
  sectionLabel: string; // "Creator Studio" | "ADMIN CONSOLE"
  rootCrumb: string; // "Panel" | "Platform Yönetimi"
  nav: NavGroup[];
  badges?: Record<string, number>;
  identity: { title: string; subtitle: string; image?: string | null; mark?: React.ReactNode };
  user: { name: string; image: string | null; subtitle: string };
  headerStatus?: React.ReactNode;
  searchPlaceholder: string;
  searchAction: string; // GET hedefi
  sideCard?: React.ReactNode;
  footerNote?: React.ReactNode;
  notificationsHref: string;
  unreadNotifications?: number;
  menuLinks?: { href: string; label: string }[];
  children: React.ReactNode;
}

function findLabel(nav: NavGroup[], pathname: string) {
  for (const g of nav) for (const i of g.items) if (isActive(pathname, i)) return i.label;
  return null;
}

export function ConsoleShell(props: ConsoleShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const current = findLabel(props.nav, pathname);

  useEffect(() => setMobileOpen(false), [pathname]);
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(`hf.${props.variant}.collapsed`) === "1");
    } catch {}
  }, [props.variant]);
  function toggleCollapsed() {
    setCollapsed((v) => {
      try {
        localStorage.setItem(`hf.${props.variant}.collapsed`, v ? "0" : "1");
      } catch {}
      return !v;
    });
  }

  async function signOut() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  const sidebar = (isMobile: boolean) => (
    <div className={cn("hf-gradient-night flex h-full flex-col px-3.5 pb-4 pt-5 text-night-text", !isMobile && collapsed && "px-2.5")}>
      <div className={cn("mb-3 flex items-center gap-2.5 rounded-[14px] border border-night-line bg-night-card p-2.5 text-white", !isMobile && collapsed && "justify-center p-2")}>
        {props.identity.mark ?? <Avatar src={props.identity.image} name={props.identity.title} size={34} ring={false} />}
        {(isMobile || !collapsed) && (
          <div className="min-w-0">
            <p className="truncate text-xs font-extrabold">{props.identity.title}</p>
            <p className="mt-1 truncate text-[9px] text-[#bcb0bf]">{props.identity.subtitle}</p>
          </div>
        )}
      </div>
      <nav aria-label={`${props.sectionLabel} menüsü`} className="-mx-1 flex-1 overflow-y-auto px-1 scrollbar-thin">
        {props.nav.map((group, gi) => (
          <div key={gi}>
            {group.label && (isMobile || !collapsed) && <p className="mx-3 mb-2 mt-4 text-[9px] font-black tracking-[0.17em] text-night-muted">{group.label}</p>}
            {group.label && !isMobile && collapsed && <div className="mx-2 my-3 h-px bg-night-line" />}
            <ul className="grid gap-0.5">
              {group.items.map((item) => {
                const active = isActive(pathname, item);
                const Icon = item.icon!;
                const count = item.badgeKey ? props.badges?.[item.badgeKey] ?? 0 : 0;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      title={!isMobile && collapsed ? item.label : undefined}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "flex min-h-10 items-center gap-3 rounded-[11px] px-3 py-2 text-xs font-bold transition-colors",
                        active ? "bg-gradient-to-r from-brand-500 to-[#d70a87] text-white shadow-[0_7px_18px_rgb(237_0_136/0.24)]" : "hover:bg-white/5 hover:text-white",
                        !isMobile && collapsed && "justify-center px-0",
                      )}
                    >
                      <Icon className="size-[17px] shrink-0 opacity-90" aria-hidden />
                      {(isMobile || !collapsed) && <span className="truncate">{item.label}</span>}
                      {count > 0 && (isMobile || !collapsed) && (
                        <span className={cn("ml-auto rounded-full px-1.5 py-0.5 text-[9px] font-black", active ? "bg-white/25 text-white" : "bg-[#f5e1ef] text-[#d00075]")}>{count}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
      {(isMobile || !collapsed) && props.sideCard && <div className="mt-3">{props.sideCard}</div>}
      {(isMobile || !collapsed) && props.footerNote && <div className="mt-3 px-2 text-[9px] text-[#807587]">{props.footerNote}</div>}
      {!isMobile && (
        <button type="button" onClick={toggleCollapsed} className="mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-[10px] font-bold text-[#807587] hover:bg-white/5 hover:text-white" aria-label={collapsed ? "Menüyü genişlet" : "Menüyü daralt"}>
          {collapsed ? <PanelLeftOpen className="size-4" /> : <><PanelLeftClose className="size-4" /> Menüyü daralt</>}
        </button>
      )}
    </div>
  );

  return (
    <div className="min-h-dvh bg-[#f8f7fa]">
      <header className="sticky top-0 z-40 flex h-[72px] items-center gap-4 border-b border-[#eee9f0] bg-white px-4 shadow-[var(--shadow-header)] lg:gap-6 lg:px-7">
        <button type="button" className="grid size-10 place-items-center rounded-full hover:bg-soft lg:hidden" aria-label="Menüyü aç" onClick={() => setMobileOpen(true)}>
          <Menu className="size-5" />
        </button>
        <LogoLink href={props.variant === "admin" ? "/admin" : "/studio"} />
        <span className="hidden h-7 w-px bg-[#e9e4ec] md:block" aria-hidden />
        <span className="hidden whitespace-nowrap text-xs font-extrabold text-[#534a57] md:block">{props.sectionLabel}</span>
        <nav aria-label="Konum" className="hidden min-w-0 flex-1 items-center gap-2 text-[11px] text-[#8a8290] lg:flex">
          <span>{props.rootCrumb}</span>
          {current && (
            <>
              <ChevronRight className="size-3" aria-hidden />
              <b className="truncate text-brand-500">{current}</b>
            </>
          )}
        </nav>
        <div className="ml-auto flex items-center gap-3.5">
          <form action={props.searchAction} method="get" role="search" className="hidden xl:block">
            <div className="flex h-[38px] w-[290px] items-center gap-2.5 rounded-full border border-[#eeeaf1] bg-[#f6f5f8] px-4 focus-within:border-brand-300">
              <Search className="size-3.5 text-[#a99fae]" aria-hidden />
              <input name="q" aria-label={props.searchPlaceholder} placeholder={props.searchPlaceholder} className="w-full bg-transparent text-[11px] outline-none" />
            </div>
          </form>
          {props.headerStatus}
          <Link href={props.notificationsHref} className="relative text-[#585060] hover:text-brand-500" aria-label="Bildirimler">
            <Bell className="size-5" />
            {(props.unreadNotifications ?? 0) > 0 && <i className="absolute -right-0.5 -top-0.5 size-2 rounded-full bg-brand-500 ring-2 ring-white" />}
          </Link>
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-full text-left" aria-label="Hesap menüsü">
              <Avatar src={props.user.image} name={props.user.name} size={36} />
              <span className="hidden text-[11px] font-extrabold leading-tight 2xl:block">
                {props.user.name}
                <small className="block text-[9px] font-medium text-muted">{props.user.subtitle}</small>
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>{props.user.name}</DropdownMenuLabel>
              {props.menuLinks?.map((l) => (
                <DropdownMenuItem key={l.href} asChild>
                  <Link href={l.href}>{l.href.includes("settings") ? <Settings /> : <User />} {l.label}</Link>
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={signOut} className="text-danger data-[highlighted]:bg-danger-soft data-[highlighted]:text-danger">
                <LogOut /> Çıkış yap
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <div className={cn("lg:grid", collapsed ? "lg:grid-cols-[76px_minmax(0,1fr)]" : "lg:grid-cols-[256px_minmax(0,1fr)]")}>
        <aside className="sticky top-[72px] hidden h-[calc(100dvh-72px)] lg:block">{sidebar(false)}</aside>
        <main id="main" className="min-w-0 px-4 py-6 sm:px-6 lg:px-7">
          {props.children}
        </main>
      </div>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menü">
          <button type="button" className="absolute inset-0 bg-night-deep/50" aria-label="Menüyü kapat" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[280px] max-w-[85vw]">
            {sidebar(true)}
            <button type="button" onClick={() => setMobileOpen(false)} className="absolute right-3 top-4 grid size-8 place-items-center rounded-full bg-white/10 text-white" aria-label="Kapat">
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
