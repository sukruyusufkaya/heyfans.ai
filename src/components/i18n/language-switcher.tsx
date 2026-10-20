"use client";
import * as React from "react";
import { Check, ChevronDown, Globe, Loader2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/overlays";
import { setLocaleAction } from "@/i18n/actions";
import { useLocale, useT } from "@/i18n/client";
import { LOCALE_META, LOCALES, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

/** Seçimi kaydedip sayfayı yeniden yükler (yön, yazı tipi ve tüm sunucu metinleri yeni dilde gelsin). */
function useSwitchLocale() {
  const [pending, setPending] = React.useState<Locale | null>(null);
  const current = useLocale();
  const change = React.useCallback(
    async (next: Locale) => {
      if (next === current || pending) return;
      setPending(next);
      try {
        await setLocaleAction(next);
      } finally {
        // Adres çubuğundaki ?lang= parametresi seçimi ezmesin.
        const url = new URL(window.location.href);
        url.searchParams.delete("lang");
        window.location.replace(url.toString());
      }
    },
    [current, pending],
  );
  return { current, pending, change };
}

/**
 * Dil seçici.
 * - `menu`: başlık/çubuk düğmesi (küre + dil kodu).
 * - `select`: altbilgi ve ayarlar için tam genişlikte seçim kutusu.
 */
export function LanguageSwitcher({ variant = "menu", className, align = "end" }: { variant?: "menu" | "select"; className?: string; align?: "start" | "end" }) {
  const t = useT();
  const { current, pending, change } = useSwitchLocale();

  if (variant === "select") {
    return (
      <label className={cn("relative inline-flex items-center", className)}>
        <span className="sr-only">{t("Dil")}</span>
        <Globe className="pointer-events-none absolute start-3 size-4 text-muted" aria-hidden />
        <select
          value={pending ?? current}
          onChange={(e) => change(e.target.value as Locale)}
          disabled={pending !== null}
          className="h-10 w-full appearance-none rounded-[10px] border border-line bg-white ps-9 pe-9 text-[13px] font-bold text-ink outline-none focus:border-brand-300 focus:ring-4 focus:ring-brand-100 disabled:opacity-60"
        >
          {LOCALES.map((l) => (
            <option key={l} value={l} lang={l} dir={LOCALE_META[l].dir}>
              {LOCALE_META[l].label}
            </option>
          ))}
        </select>
        {pending ? (
          <Loader2 className="pointer-events-none absolute end-3 size-4 animate-spin text-muted" aria-hidden />
        ) : (
          <ChevronDown className="pointer-events-none absolute end-3 size-4 text-muted" aria-hidden />
        )}
      </label>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn("flex items-center gap-1 rounded-full px-2 py-1.5 text-xs font-extrabold uppercase text-ink-soft outline-none hover:bg-soft focus-visible:ring-4 focus-visible:ring-brand-100", className)}
        aria-label={t("Dil seçimi: {language}", { language: LOCALE_META[current].label })}
      >
        {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Globe className="size-4" aria-hidden />}
        {current}
        <ChevronDown className="size-3" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="min-w-44">
        <DropdownMenuLabel>{t("Dil")}</DropdownMenuLabel>
        {LOCALES.map((l) => (
          <DropdownMenuItem key={l} onSelect={() => change(l)} disabled={pending !== null} className="justify-between gap-3">
            <span lang={l} dir={LOCALE_META[l].dir}>
              {LOCALE_META[l].label}
            </span>
            {l === current ? <Check className="size-4 text-brand-600" aria-hidden /> : <span className="text-[11px] font-bold uppercase text-muted">{l}</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
