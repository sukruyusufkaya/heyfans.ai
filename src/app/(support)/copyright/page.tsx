import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, CircleHelp, FileText, RefreshCw, ShieldCheck, TriangleAlert } from "lucide-react";
import { CopyrightForm } from "@/features/support/copyright-form";
import { DraftBadge, DraftNotice, legalMetadata, stripDraftNote } from "@/features/support/legal";
import { Breadcrumbs, PageBody, SupportHero } from "@/features/support/support-ui";
import { getSession } from "@/lib/auth/session";
import { getCmsPage } from "@/services/cms/cms";
import { COPYRIGHT_CLAIM_TYPES } from "@/services/support/reports";

export async function generateMetadata(): Promise<Metadata> {
  return legalMetadata("copyright", "Telif ve İçerik Kaldırma — Emeğini, İçeriğini ve Kimliğini Koru", "Telif hakkı ihlalleri, izinsiz creator materyali kullanımı ve AI ile kimliğe bürünme talepleri için başvuru merkezi.", "/copyright");
}

const PROCESS = [
  { icon: FileText, title: "Başvuru ve belge", text: "Talebin ve ilgili içerik bağlantısı alınır." },
  { icon: ShieldCheck, title: "İnceleme", text: "Hak sahibi ve ihlal iddiası değerlendirilir." },
  { icon: TriangleAlert, title: "Gerekiyorsa işlem", text: "İçerik, hesap veya AI ikizi için uygun işlem belirlenir." },
  { icon: RefreshCw, title: "İtiraz yolu", text: "Karara ilişkin itiraz ve ek belge kanalı sunulur." },
];

export default async function CopyrightPage() {
  const [page, session] = await Promise.all([getCmsPage("copyright"), getSession()]);
  const claimTypes = Object.entries(COPYRIGHT_CLAIM_TYPES).map(([value, label]) => ({ value, label }));

  return (
    <>
      <SupportHero eyebrow="Telif ve İçerik Kaldırma" title="Emeğini, içeriğini ve" highlight="kimliğini koru." description="Telif hakkı ihlalleri, izinsiz creator materyali kullanımı ve AI ile kimliğe bürünme talepleri için başvuru merkezi.">
        <DraftBadge page={page} />
      </SupportHero>
      <PageBody>
        <Breadcrumbs items={[{ label: "Destek", href: "/help" }, { label: "Telif ve İçerik Kaldırma" }]} />
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)_minmax(0,0.6fr)]">
          <section className="hf-card p-6" aria-labelledby="claim-title">
            <h2 id="claim-title" className="text-xl font-extrabold tracking-[-0.03em]">
              İçerik kaldırma talebi
            </h2>
            <p className="mb-5 mt-1 text-xs text-muted">Hak ihlali olduğunu düşündüğün içeriği bildir.</p>
            <CopyrightForm claimTypes={claimTypes} defaults={{ name: session?.user.name ?? "", email: session?.user.email ?? "" }} />
          </section>

          <section className="hf-card p-6" aria-labelledby="process-title">
            <h2 id="process-title" className="text-xl font-extrabold tracking-[-0.03em]">
              Değerlendirme süreci
            </h2>
            <ol className="mt-4 divide-y divide-line-soft">
              {PROCESS.map((s, i) => (
                <li key={s.title} className="flex items-start gap-3.5 py-3.5">
                  <span className="relative grid size-10 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-500">
                    <s.icon className="size-[18px]" aria-hidden />
                    <span className="absolute -start-1.5 -top-1.5 grid size-4 place-items-center rounded-full bg-brand-500 text-[9px] font-black text-white">{i + 1}</span>
                  </span>
                  <div>
                    <h3 className="text-[13px] font-extrabold">{s.title}</h3>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted">{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-4">
              <DraftNotice page={page} />
            </div>
            {page && page.sections.length > 0 && (
              <div className="mt-4 grid gap-2">
                {page.sections.map((s) => (
                  <details key={s.id} className="group rounded-xl border border-line px-4 py-3">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-extrabold marker:hidden">
                      {s.heading}
                      <span className="grid size-5 place-items-center rounded-full bg-brand-100 text-brand-600 transition-transform group-open:rotate-45" aria-hidden>
                        +
                      </span>
                    </summary>
                    <p className="mt-2 text-xs leading-relaxed text-muted-strong">{stripDraftNote(s.body)}</p>
                  </details>
                ))}
              </div>
            )}
          </section>

          <div className="grid gap-5">
            <aside className="hf-card hf-gradient-pink p-6">
              <BadgeCheck className="size-8 text-brand-500" aria-hidden />
              <h2 className="mt-3 text-lg font-extrabold text-brand-600">Creator hakları</h2>
              <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">Ses, yüz ve kişisel içeriklerin kullanım kapsamı creator tarafından onaylanmalıdır.</p>
              <Link href="/creator-agreement" className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-white px-5 text-xs font-extrabold text-brand-600 shadow-sm hover:bg-brand-50">
                Hakları İncele <ArrowRight className="rtl:-scale-x-100 size-3.5" aria-hidden />
              </Link>
            </aside>
            <aside className="hf-card p-6">
              <span className="grid size-11 place-items-center rounded-2xl bg-brand-100 text-brand-500">
                <CircleHelp className="size-5" aria-hidden />
              </span>
              <h2 className="mt-3 text-base font-extrabold">Yardım mı gerekli?</h2>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-strong">Uygun başvuru kategorisini bulmana yardımcı olalım.</p>
              <Link href="/help" className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-4 text-xs font-extrabold hover:border-brand-300 hover:text-brand-600">
                Destek Merkezi <ArrowRight className="rtl:-scale-x-100 size-3.5" aria-hidden />
              </Link>
            </aside>
          </div>
        </div>
      </PageBody>
    </>
  );
}
