"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronDown, Globe, Menu, Search, X } from "lucide-react";
import { LogoLink } from "@/components/brand/logo";
import { Avatar } from "@/components/ui/display";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/overlays";
import { isActive, PUBLIC_NAV, type NavItem } from "@/config/navigation";
import { cn } from "@/lib/utils";

export interface HeaderUser {
  name: string;
  image: string | null;
  roles: string[];
}

export function PublicHeader({ user, extraNav }: { user: HeaderUser | null; extraNav?: NavItem[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const nav = extraNav ? [...PUBLIC_NAV, ...extraNav] : PUBLIC_NAV;

  // Rota değişince mobil menüyü kapat (render sırasında, efekt olmadan)
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(false);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const term = q.trim();
    router.push(term ? `/explore?q=${encodeURIComponent(term)}` : "/explore");
  }

  const panelHref = user?.roles.includes("admin") ? "/admin" : user?.roles.includes("creator") ? "/studio" : "/app";

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-white/95 shadow-[var(--shadow-header)] backdrop-blur">
      <div className="mx-auto flex h-[68px] max-w-[1440px] items-center gap-6 px-4 sm:px-6 lg:px-8">
        <LogoLink />
        <nav aria-label="Ana menü" className="hidden h-full flex-1 items-center justify-center gap-5 xl:flex">
          {nav.map((item) => {
            const active = isActive(pathname, item);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex h-full items-center whitespace-nowrap text-[12.5px] font-bold transition-colors",
                  active ? "text-brand-500 after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:rounded-full after:bg-brand-500" : "text-ink-soft hover:text-brand-500",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-2.5 xl:ml-0">
          <form onSubmit={submit} role="search" className="hidden lg:block">
            <label htmlFor="global-search" className="sr-only">
              İçerik üreticilerinde ara
            </label>
            <div className="flex h-9 w-[200px] items-center gap-2 rounded-full border border-line bg-soft px-3.5 text-xs focus-within:border-brand-300 focus-within:ring-4 focus-within:ring-brand-100 2xl:w-[230px]">
              <Search className="size-3.5 text-muted" aria-hidden />
              <input
                id="global-search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="İçerik üreticilerinde ara..."
                className="w-full bg-transparent text-xs text-ink outline-none placeholder:text-[#aaa5ae]"
              />
            </div>
          </form>
          <DropdownMenu>
            <DropdownMenuTrigger className="hidden items-center gap-1 rounded-full px-2 py-1.5 text-xs font-extrabold text-ink-soft hover:bg-soft sm:flex" aria-label="Dil seçimi">
              <Globe className="size-4" /> TR <ChevronDown className="size-3" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="min-w-36">
              <DropdownMenuItem>Türkçe</DropdownMenuItem>
              <DropdownMenuItem disabled>English (yakında)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {user ? (
            <Link href={panelHref} className="flex items-center gap-2 rounded-full border border-line py-1 pl-1 pr-3 text-xs font-extrabold text-ink hover:border-brand-200">
              <Avatar src={user.image} name={user.name} size={28} ring={false} />
              <span className="hidden sm:inline">Panelim</span>
            </Link>
          ) : (
            <>
              <Button asChild variant="secondary" size="sm" shape="pill" className="hidden sm:inline-flex">
                <Link href="/login">Giriş Yap</Link>
              </Button>
              <Button asChild size="sm" shape="pill" className="px-5">
                <Link href="/register">Başla</Link>
              </Button>
            </>
          )}
          <button
            type="button"
            className="grid size-10 place-items-center rounded-full text-ink hover:bg-soft xl:hidden"
            aria-label={open ? "Menüyü kapat" : "Menüyü aç"}
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      {open && (
        <div id="mobile-nav" className="border-t border-line bg-white px-4 pb-5 pt-3 xl:hidden">
          <form onSubmit={submit} role="search" className="mb-3 lg:hidden">
            <div className="flex h-11 items-center gap-2 rounded-full border border-line bg-soft px-4">
              <Search className="size-4 text-muted" aria-hidden />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="İçerik üreticilerinde ara..." aria-label="İçerik üreticilerinde ara" className="w-full bg-transparent text-sm outline-none" />
            </div>
          </form>
          <nav aria-label="Mobil menü" className="grid gap-1">
            {nav.map((item) => {
              const active = isActive(pathname, item);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn("rounded-xl px-3 py-3 text-sm font-bold", active ? "bg-brand-50 text-brand-600" : "text-ink-soft hover:bg-soft")}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          {!user && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button asChild variant="secondary" shape="pill">
                <Link href="/login">Giriş Yap</Link>
              </Button>
              <Button asChild shape="pill">
                <Link href="/register">Başla</Link>
              </Button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
