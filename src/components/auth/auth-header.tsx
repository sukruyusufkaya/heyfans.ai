"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoLink } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/i18n/language-switcher";
import { useT } from "@/i18n/client";
import { m } from "@/i18n/m";

function ctaFor(pathname: string, accountHref: string | null): { label: string; href: string } {
  if (pathname.startsWith("/login")) return { label: m("Hesap Oluştur"), href: "/register" };
  if (accountHref && (pathname.startsWith("/onboarding") || pathname.startsWith("/age-verification") || pathname.startsWith("/security"))) {
    return { label: m("Hesabım"), href: accountHref };
  }
  return { label: m("Giriş Yap"), href: "/login" };
}

/** Giriş/kayıt/karşılama sayfalarının ortak üst çubuğu: logo, dil, yardım ve sayfaya göre değişen eylem. */
export function AuthHeader({ accountHref }: { accountHref: string | null }) {
  const t = useT();
  const pathname = usePathname();
  const cta = ctaFor(pathname, accountHref);
  return (
    <header className="border-b border-line/80 bg-white">
      <div className="flex h-[68px] items-center justify-between gap-4 px-4 sm:px-8 lg:h-[82px] lg:px-[73px]">
        <LogoLink dot />
        <div className="flex items-center gap-1.5 sm:gap-4">
          <LanguageSwitcher />
          <Link href="/help" className="hidden rounded-full px-2 py-1.5 text-xs font-bold text-ink-soft hover:text-brand-600 sm:inline">
            {t("Yardım Merkezi")}
          </Link>
          <span className="hidden h-7 w-px bg-line sm:block" aria-hidden />
          <Button asChild variant="secondary" size="md" className="px-5 text-[13px]">
            <Link href={cta.href}>{t(cta.label)}</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
