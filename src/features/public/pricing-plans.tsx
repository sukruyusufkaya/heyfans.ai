"use client";
import Link from "next/link";
import { useState } from "react";
import { Check, Crown, Gem, Heart, Send, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useFormatters, useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

export interface PlanCardData {
  id: string;
  tier: "free" | "basic" | "premium" | "vip";
  name: string;
  /** Ad, açıklama ve maddeler sunucuda çevrilmiş olarak gelir. */
  description: string | null;
  benefits: string[];
  priceMonthlyMinor: number;
  priceYearlyMinor: number | null;
  currency: string;
  isPopular: boolean;
  /** Plan özelliklerinden türetilen "yok" maddeleri (ör. "Özel içerikler") */
  missing: string[];
}

/** Türkçe yönelme eki ("Premium'a Geç", "Temel'e Geç", "VIP'e Geç"): son ünlüye göre a/e; ünlüyle bitiyorsa ek y alır. Yalnız ek döner; çeviride `{suffix}` atılabilir. */
function dativeSuffix(name: string) {
  if (name.length > 1 && name === name.toUpperCase()) return "'e"; // kısaltma: telaffuzda "-pi"
  const lower = name.toLocaleLowerCase("tr");
  // i18n-ignore: ünlü harf listeleri (metin değil)
  const lastVowel = [...lower].reverse().find((c) => "aeıioöuü".includes(c));
  const back = lastVowel ? "aıou".includes(lastVowel) : false; // i18n-ignore
  const endsVowel = "aeıioöuü".includes(lower.at(-1) ?? ""); // i18n-ignore
  return `'${endsVowel ? "y" : ""}${back ? "a" : "e"}`;
}

const ICONS = { free: Send, basic: Crown, premium: Gem, vip: Crown } as const;

/** Aylık/yıllık geçişli platform planı kartları. Fiyatlar yalnız veritabanından gelir; ödeme sayfası fiyatı yine sunucuda hesaplar. */
export function PricingPlans({ plans, savingPct, canYearly }: { plans: PlanCardData[]; savingPct: number | null; canYearly: boolean }) {
  const t = useT();
  const { formatMoney } = useFormatters();
  const [interval, setIntervalValue] = useState<"month" | "year">("month");
  return (
    <div>
      {canYearly && (
        <div className="mb-8 flex justify-center">
          <div role="group" aria-label={t("Faturalama dönemi")} className="inline-flex items-center rounded-full border border-brand-150 bg-white p-1 shadow-sm">
            <button type="button" aria-pressed={interval === "month"} onClick={() => setIntervalValue("month")} className={cn("h-9 rounded-full px-6 text-xs font-extrabold transition-colors", interval === "month" ? "bg-brand-500 text-white shadow-[var(--shadow-pink)]" : "text-muted-strong hover:text-ink")}>
              {t("Aylık")}
            </button>
            <button type="button" aria-pressed={interval === "year"} onClick={() => setIntervalValue("year")} className={cn("flex h-9 items-center gap-2 rounded-full px-5 text-xs font-extrabold transition-colors", interval === "year" ? "bg-brand-500 text-white shadow-[var(--shadow-pink)]" : "text-muted-strong hover:text-ink")}>
              {t("Yıllık")}
              {savingPct ? <span className={cn("rounded-full px-2 py-0.5 text-[9px] font-black", interval === "year" ? "bg-white/25 text-white" : "bg-brand-500 text-white")}>{t("%{pct} Tasarruf", { pct: savingPct })}</span> : null}
            </button>
          </div>
        </div>
      )}
      <ul className={cn("grid gap-5 sm:grid-cols-2", plans.length >= 4 ? "xl:grid-cols-4" : plans.length === 3 ? "lg:grid-cols-3" : "")}>
        {plans.map((p) => {
          const Icon = p.tier === "free" ? Send : (ICONS[p.tier] ?? Heart);
          const yearly = interval === "year" && p.priceYearlyMinor && p.tier !== "free";
          const effectiveInterval = yearly ? "year" : "month";
          const price = yearly ? p.priceYearlyMinor! : p.priceMonthlyMinor;
          const href = p.tier === "free" ? "/register" : `/checkout?type=plan&planId=${p.id}&interval=${effectiveInterval}`;
          return (
            <li key={p.id} className={cn("relative flex flex-col rounded-[20px] border bg-white p-6", p.isPopular ? "border-2 border-brand-500 shadow-[var(--shadow-pink)]" : "border-line hf-gradient-pink")}>
              {p.isPopular && (
                <Badge tone="solid" size="md" className="absolute -top-3 left-1/2 -translate-x-1/2">
                  {t("En Popüler")}
                </Badge>
              )}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-display text-2xl font-extrabold tracking-tight">{p.name}</h3>
                  {p.description && <p className="mt-1 text-xs leading-relaxed text-muted-strong">{p.description}</p>}
                </div>
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-500">
                  <Icon className="size-5" aria-hidden />
                </span>
              </div>
              <p className="mt-5 flex items-baseline gap-1.5">
                <span className="font-display text-[40px] font-extrabold leading-none tracking-tight">{formatMoney(price, p.currency, { decimals: false })}</span>
                <span className="text-sm text-muted">{effectiveInterval === "year" ? t("/ yıl") : t("/ ay")}</span>
              </p>
              <p className="mt-1 h-4 text-[11px] text-muted">
                {yearly ? t("Aylık yaklaşık {price}", { price: formatMoney(Math.round(price / 12), p.currency, { decimals: false }) }) : interval === "year" && p.tier !== "free" ? t("Bu plan için yıllık seçenek yok") : ""}
              </p>
              <Link
                href={href}
                className={cn("mt-4 grid h-12 place-items-center rounded-full text-sm font-extrabold transition", p.tier === "free" ? "bg-brand-100 text-brand-600 hover:bg-brand-150" : "bg-brand-500 text-white shadow-[var(--shadow-pink)] hover:bg-brand-600")}
              >
                {p.tier === "free" ? t("Ücretsiz Katıl") : t("{plan}{suffix} Geç", { plan: p.name, suffix: dativeSuffix(p.name) })}
              </Link>
              <ul className="mt-5 grid gap-2.5">
                {p.benefits.map((b) => (
                  <li key={b} className="flex items-start gap-2.5 text-[13px] leading-snug text-ink-soft">
                    <Check className="mt-0.5 size-4 shrink-0 text-brand-500" strokeWidth={3} aria-hidden /> {b}
                  </li>
                ))}
                {p.missing.map((b) => (
                  <li key={b} className="flex items-start gap-2.5 text-[13px] leading-snug text-muted">
                    <X className="mt-0.5 size-4 shrink-0" aria-hidden /> <span>{b}</span>
                    <span className="sr-only"> {t("(bu planda yok)")}</span>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
