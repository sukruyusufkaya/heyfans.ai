import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CircleHelp, Mail, MessageCircle, ShieldAlert, ShieldCheck, Users } from "lucide-react";
import { siteConfig } from "@/config/site";
import { ContactForm } from "@/features/support/contact-form";
import { Breadcrumbs, PageBody, SupportHero } from "@/features/support/support-ui";
import { getSession } from "@/lib/auth/session";
import { TICKET_CATEGORIES, TICKET_CATEGORY_LABELS } from "@/services/support/tickets";

export const metadata: Metadata = {
  title: "İletişim — Birlikte Çözebiliriz",
  description: "Sorular, öneriler, içerik üreticisi başvuruları veya güvenlik bildirimleri için HEYFANS destek ekibine ulaş.",
  alternates: { canonical: "/contact" },
  openGraph: { title: "İletişim | HEYFANS", description: "HEYFANS destek ekibine ulaş.", url: "/contact", type: "website" },
};

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function ContactPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const session = await getSession();
  const cat = one(sp.category);
  const defaultCategory = (TICKET_CATEGORIES as readonly string[]).includes(cat ?? "") ? cat : undefined;
  const defaultSubject = (one(sp.subject) ?? "").slice(0, 200);
  const categories = TICKET_CATEGORIES.map((value) => ({ value, label: TICKET_CATEGORY_LABELS[value] }));

  const channels = [
    { icon: Mail, title: "E-posta ile iletişim", text: "Sorunu ayrıntılarıyla yaz, başvurunu kayıt altına al.", href: `mailto:${siteConfig.supportEmail}`, external: true, hint: siteConfig.supportEmail },
    { icon: MessageCircle, title: "Destek talebi", text: "Hesap, ödeme ve teknik sorunlarını takip et.", href: "#iletisim-formu" },
    { icon: ShieldCheck, title: "Güvenlik bildirimi", text: "Riskli içerikleri ve izinsiz benzerlik kullanımlarını bildir.", href: "/trust-and-safety#bildir" },
    { icon: Users, title: "Creator başvuruları", text: "Creator doğrulama ve AI ikizi izinleriyle ilgili sorularını ilet.", href: "/contact?category=creator#iletisim-formu" },
  ];

  return (
    <>
      <SupportHero eyebrow="İletişim / HEYFANS Destek" title="Birlikte çözebiliriz." highlight="Bize ulaş." description="Soruların, önerilerin, içerik üreticisi başvuruların veya güvenlik bildirimlerin için doğru kanaldan bizimle iletişime geç." />
      <PageBody>
        <Breadcrumbs items={[{ label: "Destek", href: "/help" }, { label: "İletişim" }]} />
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.15fr)_minmax(0,0.65fr)]">
          <section className="hf-card p-6" aria-labelledby="channels-title">
            <h2 id="channels-title" className="text-xl font-extrabold tracking-[-0.03em]">
              İletişim kanalları
            </h2>
            <p className="mt-1 text-xs text-muted">Talebine en uygun iletişim yöntemini seç.</p>
            <ul className="mt-4 divide-y divide-line-soft">
              {channels.map((c) => (
                <li key={c.title}>
                  {c.external ? (
                    <a href={c.href} className="group flex items-center gap-3.5 py-4">
                      <ChannelBody {...c} />
                    </a>
                  ) : (
                    <Link href={c.href} className="group flex items-center gap-3.5 py-4">
                      <ChannelBody {...c} />
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section id="iletisim-formu" className="hf-card scroll-mt-28 p-6" aria-labelledby="form-title">
            <h2 id="form-title" className="text-xl font-extrabold tracking-[-0.03em]">
              Bize mesaj gönder
            </h2>
            <p className="mb-5 mt-1 text-xs text-muted">Başvurunu doğru ekibe yönlendirebilmemiz için formu doldur.</p>
            <ContactForm categories={categories} defaults={{ name: session?.user.name ?? "", email: session?.user.email ?? "" }} defaultCategory={defaultCategory} defaultSubject={defaultSubject} />
          </section>

          <div className="grid gap-5">
            <aside className="hf-card hf-gradient-pink p-6">
              <span className="grid size-11 place-items-center rounded-2xl bg-white text-brand-500 shadow-sm">
                <CircleHelp className="size-5" aria-hidden />
              </span>
              <h2 className="mt-4 text-lg font-extrabold text-brand-600">Önce Yardım Merkezi</h2>
              <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">En sık sorulan soruların yanıtları ve ayrıntılı rehberler göz atmaya değer.</p>
              <Link href="/help" className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-white px-5 text-xs font-extrabold text-brand-600 shadow-sm hover:bg-brand-50">
                Yardımı Keşfet <ArrowRight className="rtl:-scale-x-100 size-3.5" aria-hidden />
              </Link>
            </aside>
            <aside className="rounded-[16px] bg-night p-6 text-white shadow-[var(--shadow-card)]">
              <span className="grid size-11 place-items-center rounded-2xl bg-white/10 text-brand-300">
                <ShieldAlert className="size-5" aria-hidden />
              </span>
              <h2 className="mt-4 text-lg font-extrabold">Acil güvenlik bildirimi</h2>
              <p className="mt-1.5 text-xs leading-relaxed text-night-text">Kimliğe bürünme, izinsiz içerik ve olası ihlaller için ayrı bildirim kanalı.</p>
              <Link href="/trust-and-safety#bildir" className="mt-4 inline-flex h-10 items-center gap-2 rounded-full bg-brand-500 px-5 text-xs font-extrabold text-white hover:bg-brand-600">
                Bildirimi Başlat <ArrowRight className="rtl:-scale-x-100 size-3.5" aria-hidden />
              </Link>
              <p className="mt-4 text-[10px] leading-relaxed text-night-muted">Hayati tehlike durumunda önce 112 Acil Çağrı Merkezi&apos;ni ara.</p>
            </aside>
          </div>
        </div>
      </PageBody>
    </>
  );
}

function ChannelBody({ icon: Icon, title, text, hint }: { icon: typeof Mail; title: string; text: string; hint?: string }) {
  return (
    <>
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-500">
        <Icon className="size-[18px]" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-extrabold group-hover:text-brand-600">{title}</span>
        <span className="mt-0.5 block text-[11px] leading-snug text-muted">{text}</span>
        {hint && <span className="mt-0.5 block truncate text-[11px] font-bold text-brand-600">{hint}</span>}
      </span>
      <ArrowRight className="rtl:-scale-x-100 size-4 shrink-0 text-brand-500 transition-transform group-hover:translate-x-0.5" aria-hidden />
    </>
  );
}
