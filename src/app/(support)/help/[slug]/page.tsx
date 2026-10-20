import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { ArrowRight, ChevronRight, FileText, MessageCircle } from "lucide-react";
import { cache } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { HelpFeedback } from "@/features/support/help-feedback";
import { Breadcrumbs, PageBody } from "@/features/support/support-ui";
import { getFormatters, getLocale, getT, localeAlternates } from "@/i18n/server";
import { getHelpArticle, helpCategoryLabel, incrementHelpViews } from "@/services/support/help";

type Props = { params: Promise<{ slug: string }> };

const load = cache((slug: string) => getHelpArticle(slug));

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const [data, t] = await Promise.all([load(slug), getT()]);
  if (!data) return { title: t("Makale bulunamadı"), robots: { index: false } };
  const title = t(data.article.title);
  const summary = t(data.article.summary);
  return {
    title: t("{title} — Yardım Merkezi", { title }),
    description: summary,
    alternates: await localeAlternates(`/help/${slug}`),
    openGraph: { title: t("{title} | HEYFANS Yardım", { title }), description: summary, url: `/help/${slug}`, type: "article" },
  };
}

export default async function HelpArticlePage({ params }: Props) {
  const { slug } = await params;
  const [data, t, locale, { formatDate }] = await Promise.all([load(slug), getT(), getLocale(), getFormatters()]);
  if (!data) notFound();
  const { article, related } = data;
  const title = t(article.title);
  const summary = t(article.summary);
  after(() => incrementHelpViews(slug).catch(() => undefined));
  const catLabel = t(helpCategoryLabel(article.category));
  const jsonLd = { "@context": "https://schema.org", "@type": "Article", headline: title, description: summary, dateModified: article.updatedAt, inLanguage: locale }; // i18n-ignore (schema.org anahtarları)

  return (
    <PageBody className="max-w-[1100px]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Breadcrumbs items={[{ label: t("Yardım Merkezi"), href: "/help" }, { label: catLabel, href: `/help?category=${article.category}` }, { label: title }]} />
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_300px]">
        <article className="hf-card p-6 sm:p-9">
          <Badge tone="pink" size="md">
            {catLabel}
          </Badge>
          <h1 className="mt-4 font-display text-3xl font-extrabold leading-tight tracking-[-0.04em] sm:text-4xl">{title}</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-strong">{summary}</p>
          <p className="mt-2 text-[11px] text-muted">{t("Son güncelleme: {date}", { date: formatDate(article.updatedAt) })}</p>
          <div className="mt-7 grid gap-4 border-t border-line pt-7">
            {t(article.body)
              .split(/\n{2,}/)
              .filter(Boolean)
              .map((p, i) => (
                <p key={i} className="whitespace-pre-line text-[15px] leading-[1.8] text-ink-soft">
                  {p}
                </p>
              ))}
          </div>
          {article.tags.length > 0 && (
            <ul className="mt-7 flex flex-wrap gap-2" aria-label={t("Etiketler")}>
              {article.tags.map((tag) => (
                <li key={tag}>
                  <Link href={`/help?q=${encodeURIComponent(tag)}`} className="rounded-full bg-soft px-3 py-1.5 text-[11px] font-bold text-muted-strong hover:bg-brand-50 hover:text-brand-600">
                    #{tag}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-8 rounded-2xl bg-soft p-5">
            <HelpFeedback slug={article.slug} />
          </div>
        </article>

        <aside className="grid gap-5 lg:sticky lg:top-24">
          {related.length > 0 && (
            <Card>
              <h2 className="mb-3 text-sm font-extrabold">{t("İlgili makaleler")}</h2>
              <ul className="grid gap-0.5">
                {related.map((r) => (
                  <li key={r.slug}>
                    <Link href={`/help/${r.slug}`} className="group flex items-center gap-2.5 rounded-lg px-2 py-2.5 text-xs font-bold text-ink-soft hover:bg-brand-50 hover:text-brand-600">
                      <FileText className="size-3.5 shrink-0 text-brand-500" aria-hidden />
                      <span className="flex-1">{t(r.title)}</span>
                      <ChevronRight className="rtl:-scale-x-100 size-3.5 text-muted" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
          <div className="hf-card hf-gradient-pink p-5">
            <MessageCircle className="size-6 text-brand-500" aria-hidden />
            <h2 className="mt-3 text-base font-extrabold text-brand-600">{t("Yanıt bulamadın mı?")}</h2>
            <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">{t("Destek ekibi talebini inceleyerek sana yardımcı olsun.")}</p>
            <Link href="/contact" className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-brand-500 px-5 text-xs font-extrabold text-white shadow-[var(--shadow-pink)] hover:bg-brand-600">
              {t("Destek Talebi Oluştur")} <ArrowRight className="rtl:-scale-x-100 size-3.5" aria-hidden />
            </Link>
          </div>
        </aside>
      </div>
    </PageBody>
  );
}
