import Link from "next/link";
import type { Metadata } from "next";
import { ChevronRight, CircleHelp, FileText, ScrollText, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/display";
import { siteConfig } from "@/config/site";
import { formatDate } from "@/lib/utils";
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
    openGraph: { title: `${title} | ${siteConfig.name}`, description, url: path, type: "website" },
    robots: indexable ? { index: true, follow: true } : { index: false, follow: true },
  };
}

/** Belirgin "TASLAK — Hukuki onay gerekli" rozeti (yalnız legalReview=draft_requires_legal_review iken). */
export function DraftBadge({ page, className }: { page: Pick<ICmsPage, "legalReview"> | null | undefined; className?: string }) {
  if (!isDraftLegal(page)) return null;
  return (
    <Badge tone="warn" size="lg" className={className}>
      <TriangleAlert aria-hidden /> TASLAK — Hukuki onay gerekli
    </Badge>
  );
}

export function DraftNotice({ page }: { page: Pick<ICmsPage, "legalReview"> | null | undefined }) {
  if (!isDraftLegal(page)) return null;
  return (
    <p role="note" className="flex items-start gap-3 rounded-xl border border-[#f9d9aa] bg-[#fff7e9] px-4 py-3 text-xs leading-relaxed text-[#7d4300]">
      <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>
        <b>Bu metin bağlayıcı bir hukuki belge değildir.</b> Taslaktır; KVKK ve ilgili mevzuata göre hukuk incelemesinden geçmeden yürürlüğe girmez ve kullanıcılar için sözleşme niteliği taşımaz.
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
  const page = await getCmsPage(slug);
  return (
    <>
      <SupportHero eyebrow={eyebrow} title={title} highlight={highlight} description={description} icon={icon ?? <FileText />} />
      <PageBody>
        {!page ? (
          <div className="hf-card">
            <EmptyState icon={<ScrollText />} title="Bu doküman henüz yayınlanmadı" description="Metin hazırlanıp onaylandığında burada yer alacak. Sorularını İletişim sayfasından iletebilirsin." action={<Link href="/contact" className="text-xs font-extrabold text-brand-600 hover:underline">İletişime geç</Link>} />
          </div>
        ) : (
          <div className="grid items-start gap-6 lg:grid-cols-[270px_1fr]">
            <aside className="lg:sticky lg:top-24">
              <details className="hf-card group lg:hidden" open={false}>
                <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 text-xs font-black uppercase tracking-wider text-muted-strong">
                  Sayfa içeriği <ChevronRight className="rtl:-scale-x-100 size-4 transition-transform group-open:rotate-90" aria-hidden />
                </summary>
                <SectionNav page={page} />
              </details>
              <div className="hf-card hidden p-3 lg:block">
                <p className="px-3 pb-2 pt-2 text-[10px] font-black uppercase tracking-[0.14em] text-muted">Sayfa içeriği</p>
                <SectionNav page={page} />
                <div className="mx-2 mt-3 border-t border-line pt-4">
                  <p className="flex items-center gap-2 text-xs font-extrabold text-ink">
                    <CircleHelp className="size-4 text-brand-500" aria-hidden /> Yardıma mı ihtiyacın var?
                  </p>
                  <Link href="/contact" className="mt-1 block text-[11px] text-muted hover:text-brand-600">
                    Destek ekibine ulaşabilirsin →
                  </Link>
                </div>
              </div>
            </aside>

            <article className="hf-card p-5 sm:p-8" aria-labelledby="legal-title">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <DraftBadge page={page} />
                <span className="rounded-full bg-soft px-3 py-1.5 text-[10px] font-bold text-muted-strong">
                  Sürüm {page.version} · {isDraftLegal(page) ? "Yürürlükte değil (taslak)" : page.effectiveDate ? `Yürürlük: ${formatDate(page.effectiveDate)}` : `Güncelleme: ${formatDate(page.updatedAt)}`}
                </span>
              </div>
              <h2 id="legal-title" className="mt-5 text-2xl font-black tracking-[-0.03em] text-ink">
                {page.title}
              </h2>
              {(intro || page.summary) && <p className="mt-3 text-sm leading-relaxed text-muted-strong">{intro ?? stripDraftNote(page.summary ?? "")}</p>}
              <div className="mt-5">
                <DraftNotice page={page} />
              </div>
              {extra && <div className="mt-6">{extra}</div>}
              <div className="mt-8 grid gap-7">
                {page.sections.map((s, i) => (
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

function SectionNav({ page }: { page: NonNullable<LegalCms> }) {
  return (
    <nav aria-label="Doküman bölümleri" className="px-2 pb-2 lg:px-0 lg:pb-0">
      <ol className="grid gap-0.5">
        {page.sections.map((s) => (
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

/** CMS özetlerindeki yinelenen "TASLAKTIR…" notunu ayıklar (zaten rozet ve uyarı gösteriliyor). */
export function stripDraftNote(summary: string) {
  return summary.replace(/\s*Bu metin TASLAKTIR[^.]*\.[^.]*\.?/i, "").trim();
}
