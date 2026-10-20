import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { ArrowRight, Cookie, Info } from "lucide-react";
import { CookiePreferences } from "@/features/support/cookie-preferences";
import { CONSENT_COOKIE, decodeConsent } from "@/features/support/consent";
import { DraftBadge, DraftNotice, legalMetadata, stripDraftNote } from "@/features/support/legal";
import { Breadcrumbs, PageBody, SupportHero } from "@/features/support/support-ui";
import { getFormatters, getT } from "@/i18n/server";
import { getCmsPage } from "@/services/cms/cms";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return legalMetadata("cookies", t("Çerez Politikası — Çerez Tercihlerin Senin Kontrolünde"), t("Çerez türlerini incele ve isteğe bağlı çerezler için tercihlerini yönet. Zorunlu çerezler her zaman etkindir."), "/cookies");
}

export default async function CookiesPage() {
  const [page, jar, t, { formatDateTime }] = await Promise.all([getCmsPage("cookies"), cookies(), getT(), getFormatters()]);
  const consent = decodeConsent(jar.get(CONSENT_COOKIE)?.value);

  return (
    <>
      <SupportHero eyebrow={t("Çerez Politikası / Tercihler")} title={t("Çerez tercihlerin,")} highlight={t("senin kontrolünde.")} description={t("Platform deneyimini geliştirmeye yönelik çerez türlerini incele ve isteğe bağlı kullanımlar için tercihlerini yönet.")}>
        <DraftBadge page={page} />
      </SupportHero>
      <PageBody>
        <Breadcrumbs items={[{ label: t("Destek"), href: "/help" }, { label: t("Çerez Politikası") }]} />
        <div className="grid items-start gap-5 lg:grid-cols-[1.7fr_1fr]">
          <div className="grid gap-5">
            <section className="hf-card p-6 sm:p-7" aria-labelledby="prefs-title">
              <h2 id="prefs-title" className="text-xl font-extrabold tracking-[-0.03em]">
                {t("Çerez tercih merkezi")}
              </h2>
              <p className="mb-2 mt-1 text-xs text-muted">{t("Yalnızca isteğe bağlı çerezler için seçimlerini düzenle.")}</p>
              <CookiePreferences initial={{ preferences: consent?.preferences ?? false, analytics: consent?.analytics ?? false, marketing: consent?.marketing ?? false }} decidedAt={consent?.at ? formatDateTime(new Date(consent.at)) : null} />
            </section>

            {page && page.sections.length > 0 && (
              <section className="hf-card p-6 sm:p-7" aria-labelledby="types-title">
                <h2 id="types-title" className="text-xl font-extrabold tracking-[-0.03em]">
                  {t("Çerez türleri")}
                </h2>
                <div className="mt-4 grid gap-5">
                  {page.sections.map((s, i) => (
                    <section key={s.id} id={s.id}>
                      <h3 className="text-sm font-extrabold">
                        {i + 1}. {t(s.heading)}
                      </h3>
                      <p className="mt-1.5 text-sm leading-[1.75] text-ink-soft">{stripDraftNote(t(s.body))}</p>
                    </section>
                  ))}
                </div>
                <div className="mt-6">
                  <DraftNotice page={page} />
                </div>
              </section>
            )}
          </div>

          <div className="grid gap-5">
            <aside className="hf-card hf-gradient-pink p-6">
              <span className="grid size-16 place-items-center rounded-3xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-[var(--shadow-pink)]">
                <Cookie className="size-8" aria-hidden />
              </span>
              <h2 className="mt-4 text-xl font-extrabold text-brand-600">{t("Çerez nedir?")}</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-soft">{t("Çerezler, cihazında saklanabilen küçük tanımlayıcılardır. Her çerezin amacı, saklama süresi ve sağlayıcısı politikada açıkça gösterilmelidir.")}</p>
              <Link href="/privacy" className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-white px-5 text-xs font-extrabold text-brand-600 shadow-sm hover:bg-brand-50">
                {t("Gizlilik Politikası")} <ArrowRight className="rtl:-scale-x-100 size-3.5" aria-hidden />
              </Link>
            </aside>
            <aside className="hf-card p-6">
              <p role="note" className="flex items-start gap-2.5 rounded-xl border border-brand-200 bg-brand-50 px-4 py-3 text-xs leading-relaxed text-brand-700">
                <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>{t("Şu anda sitede isteğe bağlı bir analitik, pazarlama veya izleme aracı çalışmıyor. Tercihin kayıt altına alınır; ileride eklenecek araçlar yalnız bu tercihe uygun şekilde ve onay öncesinde çalışmaz.")}</span>
              </p>
              <h2 className="mt-4 text-base font-extrabold">{t("Şeffaf tercih yönetimi")}</h2>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-strong">{t("Tercihlerini istediğin zaman değiştirebilir, verdiğin rızayı tek tıkla geri çekebilirsin.")}</p>
            </aside>
          </div>
        </div>
      </PageBody>
    </>
  );
}
