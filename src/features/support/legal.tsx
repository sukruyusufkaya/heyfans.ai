import Link from "next/link";
import type { Metadata } from "next";
import { ChevronRight, CircleHelp, FileText, ScrollText, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/display";
import { siteConfig } from "@/config/site";
import { getFormatters, getT } from "@/i18n/server";
import type { Translator } from "@/i18n/translate";
import type { ICmsPage } from "@/models/platform";
import { getCmsPage } from "@/services/cms/cms";
import { PageBody, SupportHero } from "./support-ui";

export type LegalCms = Awaited<ReturnType<typeof getCmsPage>>;

export const isDraftLegal = (page: Pick<ICmsPage, "legalReview"> | null | undefined) => page?.legalReview === "draft_requires_legal_review";

/** Yasal sayfa metadata'sı: taslak metinler arama motorlarına açılmaz (noindex); onaylanınca index'lenir. */
export async function legalMetadata(slug: string, title: string, description: string, path: string): Promise<Metadata> {
  const page = await getCmsPage(slug);
  const indexable = page?.legalReview === "approved" || page?.legalReview === "not_required";
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { title: `${title} | ${siteConfig.name}`, description, url: path, type: "website" }, // i18n-ignore (başlık çağıran tarafından çevrilmiş gelir)
    robots: indexable ? { index: true, follow: true } : { index: false, follow: true },
  };
}

/** Belirgin "TASLAK — Hukuki onay gerekli" rozeti (yalnız legalReview=draft_requires_legal_review iken). */
export async function DraftBadge({ page, className }: { page: Pick<ICmsPage, "legalReview"> | null | undefined; className?: string }) {
  if (!isDraftLegal(page)) return null;
  const t = await getT();
  return (
    <Badge tone="warn" size="lg" className={className}>
      <TriangleAlert aria-hidden /> {t("TASLAK — Hukuki onay gerekli")}
    </Badge>
  );
}

export async function DraftNotice({ page }: { page: Pick<ICmsPage, "legalReview"> | null | undefined }) {
  if (!isDraftLegal(page)) return null;
  const t = await getT();
  return (
    <p role="note" className="flex items-start gap-3 rounded-xl border border-[#f9d9aa] bg-[#fff7e9] px-4 py-3 text-xs leading-relaxed text-[#7d4300]">
      <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>
        {t.rich("<b>Bu metin bağlayıcı bir hukuki belge değildir.</b> Taslaktır; KVKK ve ilgili mevzuata göre hukuk incelemesinden geçmeden yürürlüğe girmez ve kullanıcılar için sözleşme niteliği taşımaz.", { b: (c) => <b>{c}</b> })}
      </span>
    </p>
  );
}

function Paragraphs({ text }: { text: string }) {
  return (
    <>
      {text
        .split(/\n{2,}/)
        .filter(Boolean)
        .map((p, i) => (
          <p key={i} className="whitespace-pre-line text-sm leading-[1.75] text-ink-soft">
            {p}
          </p>
        ))}
    </>
  );
}

/**
 * Yasal doküman iskeleti (Gizlilik, Kullanım Şartları, Creator Sözleşmesi, Topluluk Kuralları):
 * sol bölüm gezinmesi + sağda CMS'ten gelen bölümler. Taslak ise belirgin rozet ve uyarı gösterilir.
 */
export async function LegalDocument({
  slug,
  eyebrow,
  title,
  highlight,
  description,
  intro,
  icon,
  extra,
  actions,
}: {
  slug: string;
  eyebrow: string;
  title: string;
  highlight?: string;
  description: string;
  intro?: string;
  icon?: React.ReactNode;
  extra?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const [page, t, { formatDate }] = await Promise.all([getCmsPage(slug), getT(), getFormatters()]);
  const sections = page?.sections.map((s) => ({ id: s.id, heading: t(s.heading), body: t(s.body) })) ?? [];
  const versionLabel = !page
    ? ""
    : t("Sürüm {version} · {status}", {
        version: page.version,
        status: isDraftLegal(page) ? t("Yürürlükte değil (taslak)") : page.effectiveDate ? t("Yürürlük: {date}", { date: formatDate(page.effectiveDate) }) : t("Güncelleme: {date}", { date: formatDate(page.updatedAt) }),
      });
  return (
    <>
      <SupportHero eyebrow={eyebrow} title={title} highlight={highlight} description={description} icon={icon ?? <FileText />} />
      <PageBody>
        {!page ? (
          <div className="hf-card">
            <EmptyState icon={<ScrollText />} title={t("Bu doküman henüz yayınlanmadı")} description={t("Metin hazırlanıp onaylandığında burada yer alacak. Sorularını İletişim sayfasından iletebilirsin.")} action={<Link href="/contact" className="text-xs font-extrabold text-brand-600 hover:underline">{t("İletişime geç")}</Link>} />
          </div>
        ) : (
          <div className="grid items-start gap-6 lg:grid-cols-[270px_1fr]">
            <aside className="lg:sticky lg:top-24">
              <details className="hf-card group lg:hidden" open={false}>
                <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-xs font-black uppercase tracking-wider text-muted-strong">
                  {t("Sayfa içeriği")} <ChevronRight className="rtl:-scale-x-100 size-4 transition-transform group-open:rotate-90" aria-hidden />
                </summary>
                <SectionNav sections={sections} label={t("Doküman bölümleri")} />
              </details>
              <div className="hf-card hidden p-3 lg:block">
                <p className="px-3 pb-2 pt-2 text-[10px] font-black uppercase tracking-[0.14em] text-muted">{t("Sayfa içeriği")}</p>
                <SectionNav sections={sections} label={t("Doküman bölümleri")} />
                <div className="mx-2 mt-3 border-t border-line pt-4">
                  <p className="flex items-center gap-2 text-xs font-extrabold text-ink">
                    <CircleHelp className="size-4 text-brand-500" aria-hidden /> {t("Yardıma mı ihtiyacın var?")}
                  </p>
                  <Link href="/contact" className="mt-1 block text-[11px] text-muted hover:text-brand-600">
                    {t("Destek ekibine ulaşabilirsin →")}
                  </Link>
                </div>
              </div>
            </aside>

            <article className="hf-card p-5 sm:p-8" aria-labelledby="legal-title">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <DraftBadge page={page} />
                <span className="rounded-full bg-soft px-3 py-1.5 text-[10px] font-bold text-muted-strong">
                  {versionLabel}
                </span>
              </div>
              <h2 id="legal-title" className="mt-5 text-2xl font-black tracking-[-0.03em] text-ink">
                {t(page.title)}
              </h2>
              {(intro || page.summary) && <p className="mt-3 text-sm leading-relaxed text-muted-strong">{intro ?? summaryText(page.summary ?? "", t)}</p>}
              <div className="mt-5">
                <DraftNotice page={page} />
              </div>
              {extra && <div className="mt-6">{extra}</div>}
              <div className="mt-8 grid gap-7">
                {sections.map((s, i) => (
                  <section key={s.id} id={s.id} className="scroll-mt-28">
                    <h3 className="text-base font-extrabold text-ink">
                      {i + 1}. {s.heading}
                    </h3>
                    <div className="mt-2 grid gap-3">
                      <Paragraphs text={s.body} />
                    </div>
                  </section>
                ))}
              </div>
              {actions && <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">{actions}</div>}
            </article>
          </div>
        )}
      </PageBody>
    </>
  );
}

function SectionNav({ sections, label }: { sections: { id: string; heading: string }[]; label: string }) {
  return (
    <nav aria-label={label} className="px-2 pb-2 lg:px-0 lg:pb-0">
      <ol className="grid gap-0.5">
        {sections.map((s) => (
          <li key={s.id}>
            <a href={`#${s.id}`} className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-bold text-ink-soft transition-colors hover:bg-brand-50 hover:text-brand-600">
              <ChevronRight className="rtl:-scale-x-100 size-3.5 text-muted" aria-hidden /> {s.heading}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

/**
 * CMS özetini geçerli dile çevirir ve yinelenen taslak notunu ayıklar. Tohum veride özet + not ayrı `m()` parçalarıdır;
 * not `Bu metin TASLAKTIR` ile başlar, önceki parça çeviri anahtarıdır.
 */
export function summaryText(summary: string, t: Translator) {
  const i = summary.search(/Bu metin TASLAKTIR/i);
  return (i < 0 ? t(summary) : t(summary.slice(0, i))).trim();
}

/** CMS özetlerindeki yinelenen "TASLAKTIR…" notunu ayıklar (zaten rozet ve uyarı gösteriliyor). */
export function stripDraftNote(summary: string) {
  return summary.replace(/\s*Bu metin TASLAKTIR[^.]*\.[^.]*\.?/i, "").trim();
}
