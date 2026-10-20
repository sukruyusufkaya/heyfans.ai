import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { ArrowRight, ChevronRight, Crown, FileText, Heart, MessageCircle, Search, SearchX, Settings, ShieldCheck, Sparkles, Users, Wallet } from "lucide-react";
import { z } from "zod";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/display";
import { PageBody, SupportHero } from "@/features/support/support-ui";
import { getLocale, getT, localeAlternates } from "@/i18n/server";
import { cn } from "@/lib/utils";
import { HELP_CATEGORIES, helpCategoryCounts, helpCategoryLabel, popularHelp, searchHelp } from "@/services/support/help";

type SearchParams = Record<string, string | string[] | undefined>;

const ICONS = { account: Users, ai_twins: Sparkles, subscriptions: Heart, payments: Wallet, safety: ShieldCheck, technical: Settings, creators: Crown } as const;

const schema = z.object({ q: z.string().trim().max(100).catch(""), category: z.string().trim().max(30).catch("") });

export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }): Promise<Metadata> {
  const t = await getT();
  const sp = await searchParams;
  const filtered = Boolean(sp.q || sp.category);
  return {
    title: t("Yardım Merkezi — Her Sorunun Bir Cevabı Var"),
    description: t("Hesap, AI ikizleri, abonelikler, ödemeler ve güvenlik hakkında sık sorulan soruların yanıtları. Bulamazsan destek talebi oluştur."),
    alternates: await localeAlternates("/help"),
    openGraph: { title: t("Yardım Merkezi | HEYFANS"), description: t("Sık sorulan soruların yanıtları ve destek."), url: "/help", type: "website" },
    robots: filtered ? { index: false, follow: true } : undefined,
  };
}

export default async function HelpCenterPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const [t, locale] = await Promise.all([getT(), getLocale()]);
  const sp = await searchParams;
  const { q, category } = schema.parse({ q: Array.isArray(sp.q) ? sp.q[0] : sp.q, category: Array.isArray(sp.category) ? sp.category[0] : sp.category });
  const validCategory = HELP_CATEGORIES.some((c) => c.key === category) ? category : "";
  const searching = Boolean(q || validCategory);
  const [counts, found, popular] = await Promise.all([helpCategoryCounts(), searching ? searchHelp({ q, category: validCategory }) : Promise.resolve(null), searching ? Promise.resolve([]) : popularHelp(6)]);
  // Veritabanı araması Türkçe metinde çalışır; Türkçe dışı dillerde çevrilmiş başlık/özet de eşleştirilir.
  let results = found;
  if (results && q && locale !== "tr") {
    const terms = q.toLocaleLowerCase(locale).split(/\s+/).filter((x) => x.length >= 2);
    const seen = new Set(results.map((r) => r.slug));
    const pool = terms.length ? await searchHelp({ category: validCategory, limit: 60 }) : [];
    const extra = pool.filter((a) => !seen.has(a.slug) && terms.every((term) => `${t(a.title)} ${t(a.summary)}`.toLocaleLowerCase(locale).includes(term)));
    results = [...results, ...extra];
  }

  return (
    <>
      <SupportHero eyebrow={t("Yardım Merkezi / Destek")} title={t("Her sorunun bir")} highlight={t("cevabı var.")} description={t("HEYFANS'ı keşfetmek, hesap işlemleri, AI ikizleri ve ödemeler hakkında aradığın yanıtlara kolayca ulaş.")}>
        <Form action="/help" role="search" className="flex w-full max-w-xl items-center gap-2 rounded-full border border-line bg-white p-1.5 ps-5 shadow-[var(--shadow-card)] focus-within:ring-4 focus-within:ring-brand-100">
          <Search className="size-[18px] shrink-0 text-muted" aria-hidden />
          <label htmlFor="help-q" className="sr-only">
            {t("Yardım merkezinde ara")}
          </label>
          <input id="help-q" name="q" defaultValue={q} maxLength={100} placeholder={t("Sorunu ya da anahtar kelimeyi yaz…")} className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#aaa5ae]" />
          {validCategory && <input type="hidden" name="category" value={validCategory} />}
          <button type="submit" className="h-11 shrink-0 rounded-full bg-brand-500 px-6 text-xs font-extrabold text-white shadow-[var(--shadow-pink)] hover:bg-brand-600">
            {t("Yardımda Ara")}
          </button>
        </Form>
      </SupportHero>

      <PageBody className="grid gap-9">
        <section aria-labelledby="cats-title">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 id="cats-title" className="text-xl font-extrabold tracking-[-0.03em]">
                {t("Hangi konuda yardıma ihtiyacın var?")}
              </h2>
              <p className="mt-1 text-xs text-muted">{t("İhtiyacına göre hazırlanmış destek kategorileri")}</p>
            </div>
            {validCategory && (
              <Link href="/help" className="text-xs font-extrabold text-brand-500 hover:text-brand-600">
                {t("Tümünü Gör →")}
              </Link>
            )}
          </div>
          <ul className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {HELP_CATEGORIES.map((c) => {
              const Icon = ICONS[c.key] ?? FileText;
              const active = validCategory === c.key;
              return (
                <li key={c.key}>
                  <Link href={`/help?category=${c.key}`} aria-current={active ? "true" : undefined} className={cn("hf-card group flex h-full flex-col p-5 transition-shadow hover:shadow-[var(--shadow-card-hover)]", active && "border-brand-300 ring-2 ring-brand-100")}>
                    <span className="grid size-10 place-items-center rounded-xl bg-brand-100 text-brand-500">
                      <Icon className="size-[18px]" aria-hidden />
                    </span>
                    <span className="mt-4 text-sm font-extrabold">{t(c.label)}</span>
                    <span className="mt-1 text-[11px] leading-snug text-muted">{t(c.description)}</span>
                    <span className="mt-auto flex items-center gap-1 pt-4 text-[11px] font-extrabold text-brand-500">
                      {t("{n} makale", { n: counts[c.key] ?? 0 })} <ArrowRight className="rtl:-scale-x-100 size-3 transition-transform group-hover:translate-x-0.5" aria-hidden />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        <div className="grid items-start gap-5 lg:grid-cols-[1.55fr_1fr]">
          <Card padded={false} className="p-5 sm:p-6">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-xl font-extrabold tracking-[-0.03em]">
                {searching ? (
                  <>
                    {t("{n} sonuç", { n: results?.length ?? 0 })}
                    {q ? <span className="text-muted"> · “{q}”</span> : null}
                    {validCategory ? <span className="text-muted"> · {t(helpCategoryLabel(validCategory))}</span> : null}
                  </>
                ) : (
                  t("En çok aranan yardım konuları")
                )}
              </h2>
              {searching && (
                <Link href="/help" className="shrink-0 text-xs font-extrabold text-brand-500 hover:text-brand-600">
                  {t("Aramayı temizle")}
                </Link>
              )}
            </div>
            {(searching ? results : popular)?.length ? (
              <ul className="divide-y divide-line-soft">
                {(searching ? results : popular)!.map((a) => (
                  <li key={a.slug}>
                    <Link href={`/help/${a.slug}`} className="group flex items-center gap-3.5 py-3.5">
                      <FileText className="size-4 shrink-0 text-brand-500" aria-hidden />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-bold text-ink group-hover:text-brand-600">{t(a.title)}</span>
                        {searching && <span className="mt-0.5 block truncate text-[11px] text-muted">{t(a.summary)}</span>}
                      </span>
                      {searching && <span className="hidden shrink-0 rounded-full bg-soft px-2.5 py-1 text-[10px] font-bold text-muted-strong sm:inline">{t(helpCategoryLabel(a.category))}</span>}
                      <ChevronRight className="rtl:-scale-x-100 size-4 shrink-0 text-muted" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState
                icon={<SearchX />}
                title={searching ? t("Aramana uygun makale bulunamadı") : t("Henüz yardım makalesi yok")}
                description={searching ? t("Farklı bir anahtar kelime dene ya da destek talebi oluştur.") : t("Makaleler eklendiğinde burada listelenecek.")}
                action={
                  searching ? (
                    <Link href="/contact" className="inline-flex h-10 items-center rounded-full bg-brand-500 px-5 text-xs font-extrabold text-white">
                      {t("Destek Talebi Oluştur")}
                    </Link>
                  ) : undefined
                }
              />
            )}
          </Card>

          <aside className="hf-card hf-gradient-pink flex flex-col p-6 sm:p-7">
            <span className="grid size-12 place-items-center rounded-2xl bg-white text-brand-500 shadow-sm">
              <MessageCircle className="size-6" aria-hidden />
            </span>
            <h2 className="mt-5 font-display text-2xl font-extrabold tracking-tight text-brand-600">{t("Yanıt bulamadın mı?")}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">{t("Sorunu bize ilet. Destek ekibi talebini inceleyerek sana yardımcı olsun.")}</p>
            <Link href="/contact" className="mt-6 inline-flex h-12 items-center gap-2 self-start rounded-full bg-brand-500 px-7 text-sm font-extrabold text-white shadow-[var(--shadow-pink)] hover:bg-brand-600">
              {t("Destek Talebi Oluştur")} <ArrowRight className="rtl:-scale-x-100 size-4" aria-hidden />
            </Link>
          </aside>
        </div>
      </PageBody>
    </>
  );
}
