import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Crown, Flame, Gem, Heart, Lock, MessageCircle, MonitorSmartphone, Search, Settings2, ShieldCheck, Star, Users, Check } from "lucide-react";
import { CreatorTile } from "@/components/creator/creator-cards";
import { CreatorPhoto } from "@/components/creator/creator-photo";
import { CtaBand, HeroStats, PhoneChatMockup, PolaroidStack, PrimaryCta, PublicHero, Section, SecondaryCta, SeeAll, stat } from "@/components/public/marketing";
import { SectionTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/display";
import { isDemo } from "@/config/env";
import { siteConfig } from "@/config/site";
import { getSections } from "@/services/cms/cms";
import { listCreators, platformCounters } from "@/services/creators/public";

export const metadata: Metadata = {
  title: { absolute: `${siteConfig.name} — ${siteConfig.tagline}` },
  description: siteConfig.description,
  alternates: { canonical: "/" },
};

const STEPS = [
  { icon: Search, title: "Keşfet", text: "Senin ilgi alanlarına uygun içerik üreticilerini keşfet." },
  { icon: MessageCircle, title: "Sohbet Et", text: "İçerik üreticilerinin AI ikizleriyle 7/24 sohbet et." },
  { icon: Lock, title: "Özel İçeriğin Kilidini Aç", text: "Sadece burada paylaşılan özel fotoğraf, video ve içeriklere eriş." },
  { icon: Heart, title: "Gerçek Bağ Kur", text: "Daha kişisel, daha samimi ve her zaman seninle olan bir deneyim yaşa." },
];

const WHY = [
  { icon: Users, title: "Gerçek İçerik Üreticileri", text: "Doğrulanmış, gerçek ve sevilen içerik üreticileri." },
  { icon: Clock, title: "Her Zaman Erişilebilir", text: "AI ikizlerle 7/24 sınırsız sohbet deneyimi." },
  { icon: ShieldCheck, title: "Özel ve Güvenli", text: "Gizliliğin bizim için önemli. Verilerin her zaman güvende." },
  { icon: Star, title: "Şeffaf AI", text: "AI ikizi yanıtları her zaman açıkça etiketlenir." },
];

function splitHighlight(title: string) {
  const parts = title.split(". ").filter(Boolean);
  if (parts.length < 2) return <>{title}</>;
  const last = parts.pop()!;
  return (
    <>
      {parts.join(". ")}.
      <br />
      <span className="text-brand-500">{last}</span>
    </>
  );
}

export default async function HomePage() {
  const [sections, featured, counters] = await Promise.all([getSections("home"), listCreators("featured", 6), platformCounters()]);
  const hero = sections.hero;
  const cfg = (hero?.config ?? {}) as { badge?: string; primaryCta?: { label: string; href: string }; secondaryCta?: { label: string; href: string } };
  const announcement = sections.announcement;
  const lead = featured[0];

  return (
    <>
      <PublicHero
        badge={cfg.badge ?? "AI ile daha yakın, daha gerçek bağlantılar"}
        title={splitHighlight(hero?.title ?? "Gerçek İçerik Üreticileri. AI İkizler. Gerçek Bağlantılar.")}
        description={hero?.subtitle ?? "Sevdiğin içerik üreticilerinin AI ikizleriyle 7/24 sohbet et, özel içeriklere eriş ve onlarla her zamankinden daha yakın bir bağ kur."}
        actions={
          <>
            <PrimaryCta href={cfg.primaryCta?.href ?? "/explore"}>{cfg.primaryCta?.label ?? "İçerik Üreticilerini Keşfet"}</PrimaryCta>
            <SecondaryCta href={cfg.secondaryCta?.href ?? "/how-it-works"} icon={<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>}>
              {cfg.secondaryCta?.label ?? "Nasıl Çalışır?"}
            </SecondaryCta>
          </>
        }
        stats={
          <HeroStats
            demo={isDemo()}
            items={[
              { icon: <Users />, value: stat(counters.users), label: "Aktif Kullanıcı" },
              { icon: <Heart className="fill-current" />, value: stat(counters.messages), label: "Gönderilen Mesaj" },
              { icon: <Users />, value: stat(counters.creators), label: "İçerik Üreticisi" },
            ]}
          />
        }
        note="Daha yakın, daha kişisel, her zaman seninle"
        art={
          <div className="relative flex h-full items-center justify-center gap-4 lg:justify-end">
            <div className="absolute inset-y-6 left-[8%] right-[38%] hidden overflow-hidden rounded-[40px] shadow-2xl lg:block">
              <CreatorPhoto src={lead?.avatarUrl ?? lead?.coverUrl} name={lead?.displayName ?? "HEYFANS"} rounded="rounded-[40px]" priority />
            </div>
            <PhoneChatMockup
              className="relative z-10 lg:mr-[22%]"
              creatorName={lead?.displayName ?? "Melis Ertürk"}
              avatarUrl={lead?.avatarUrl}
              lines={[
                { from: "ai", text: "Merhaba tatlım! Bugün nasılsın? Seninle konuşmak için sabırsızlanıyordum 💕" },
                { from: "user", text: "Seni çok özledim! Bugün neler yapıyorsun? 😊" },
                { from: "ai", text: "Yeni bir çekimden çıktım. Sadece seninle paylaşacağım harika fotoğraflarım var…" },
              ]}
            />
            <div className="absolute right-0 top-0 hidden h-full w-[34%] xl:block">
              <PolaroidStack people={featured.slice(1, 3).map((c) => ({ name: c.displayName, image: c.avatarUrl }))} caption="Sadece senin için" />
            </div>
          </div>
        }
      />

      <Section>
        <SectionTitle title="Öne Çıkan İçerik Üreticileri" icon={<Flame className="fill-brand-500" />} action={<SeeAll href="/explore" />} />
        {featured.length ? (
          <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 xl:grid-cols-6">
            {featured.map((c) => (
              <CreatorTile key={c.id} creator={c} />
            ))}
          </div>
        ) : (
          <EmptyState title="Henüz öne çıkan içerik üreticisi yok" description="Onaylanan creator'lar burada listelenecek." />
        )}
      </Section>

      <Section className="grid gap-8 py-6 lg:grid-cols-[1.25fr_1fr]">
        <div>
          <SectionTitle title="Nasıl Çalışır?" icon={<Settings2 />} subtitle="Sadece birkaç adımda favori içerik üreticilerinle daha yakın bir deneyim yaşa." />
          <ol className="grid gap-6 sm:grid-cols-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="text-center">
                <div className="relative mx-auto mb-3 grid size-14 place-items-center rounded-full bg-brand-100 text-brand-500">
                  <s.icon className="size-6" />
                  <span className="absolute -left-2 -top-1 grid size-6 place-items-center rounded-full bg-brand-500 text-[11px] font-black text-white">{i + 1}</span>
                </div>
                <p className="text-sm font-extrabold">{s.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-strong">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
        <div>
          <SectionTitle title="Neden HEYFANS?" icon={<Gem />} />
          <div className="grid gap-3 sm:grid-cols-2">
            {WHY.map((w) => (
              <div key={w.title} className="hf-card flex gap-3 p-4">
                <w.icon className="size-6 shrink-0 text-brand-500" />
                <div>
                  <p className="text-[13px] font-extrabold">{w.title}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-strong">{w.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section className="grid gap-5 lg:grid-cols-2">
        {[
          {
            title: "Hayranlar İçin",
            icon: Heart,
            text: "Sevdiğin içerik üreticilerine her zamankinden daha yakın ol. AI ikizlerle sohbet et, özel içeriklere eriş ve benzersiz bir deneyim yaşa.",
            chips: ["7/24 Sohbet", "Özel İçerikler", "Daha Yakın Bir Bağ"],
            href: "/explore",
            cta: "Hemen Keşfet",
            person: featured[2],
          },
          {
            title: "İçerik Üreticileri İçin",
            icon: Crown,
            text: "Kendi AI ikizini oluştur, hayran kitleni büyüt, yeni gelir fırsatları yakala ve topluluğuna daha güçlü bağ kur.",
            chips: ["Gelirini Artır", "Hayranlarınla 7/24 Etkileşimde Ol", "Özel İçeriklerini Paylaş", "Kendi AI İkizini Oluştur"],
            href: "/for-creators",
            cta: "Hemen Başla",
            person: featured[3],
          },
        ].map((p) => (
          <div key={p.title} className="hf-gradient-pink relative overflow-hidden rounded-[22px] p-6 sm:p-7">
            <div className="relative z-10 max-w-[60%]">
              <h3 className="flex items-center gap-2 font-display text-xl font-extrabold tracking-tight sm:text-2xl">
                <p.icon className="size-6 fill-brand-500 text-brand-500" /> {p.title} <span className="text-brand-500">HEYFANS</span>
              </h3>
              <p className="mt-3 text-[13px] leading-relaxed text-ink-soft">{p.text}</p>
              <Link href={p.href} className="mt-5 inline-flex h-10 items-center gap-2 rounded-full bg-brand-500 px-5 text-xs font-extrabold text-white shadow-[var(--shadow-pink)] hover:bg-brand-600">
                {p.cta} →
              </Link>
            </div>
            <ul className="absolute right-4 top-1/2 z-10 hidden -translate-y-1/2 flex-col items-end gap-2 sm:flex">
              {p.chips.map((c) => (
                <li key={c} className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[10px] font-bold shadow-sm">
                  <Check className="size-3 text-brand-500" /> {c}
                </li>
              ))}
            </ul>
            <div aria-hidden className="absolute -bottom-6 right-[18%] hidden h-[115%] w-[34%] opacity-80 sm:block">
              <CreatorPhoto src={p.person?.avatarUrl} name={p.person?.displayName ?? p.title} rounded="rounded-t-full" showMonogram={false} />
            </div>
          </div>
        ))}
      </Section>

      <Section className="grid items-start gap-5 lg:grid-cols-[220px_1fr]">
        <div>
          <h2 className="flex items-center gap-2 font-display text-2xl font-extrabold tracking-tight">
            <MonitorSmartphone className="size-6 text-brand-500" /> Platform Deneyimi
          </h2>
          <p className="mt-2 text-xs text-muted-strong">Platformdan bazı ekranlarla tanış.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="hf-card p-3">
            <p className="mb-2 flex items-center gap-2 text-[11px] font-extrabold">
              <span className="size-6 overflow-hidden rounded-full"><CreatorPhoto src={lead?.avatarUrl} name={lead?.displayName ?? "Creator"} rounded="rounded-full" showMonogram={false} /></span>
              {lead?.displayName ?? "Creator"} <span className="text-[9px] font-bold text-success">Çevrimiçi</span>
            </p>
            <p className="rounded-xl bg-soft px-3 py-2 text-[10px] text-ink-soft">Bugün senin için özel bir şey hazırladım 💕</p>
            <div className="mt-2 grid h-16 place-items-center rounded-xl bg-gradient-to-br from-[#3a2340] to-[#6b2a55] text-white"><Lock className="size-4" /></div>
          </div>
          <div className="hf-card p-3">
            <p className="mb-2 text-[11px] font-extrabold">Özel İçerikler</p>
            <div className="h-24 overflow-hidden rounded-xl"><CreatorPhoto name="Özel içerik" rounded="rounded-xl" showMonogram={false} /></div>
          </div>
          <div className="hf-card p-3 text-center">
            <p className="mb-2 text-left text-[11px] font-extrabold">Profil</p>
            <div className="mx-auto size-12 overflow-hidden rounded-full"><CreatorPhoto src={featured[1]?.avatarUrl} name={featured[1]?.displayName ?? "Creator"} rounded="rounded-full" /></div>
            <p className="mt-1.5 text-[11px] font-extrabold">{featured[1]?.displayName ?? "Creator"}</p>
            <span className="mt-1.5 inline-block rounded-full bg-brand-500 px-3 py-1 text-[9px] font-extrabold text-white">Takip Et</span>
          </div>
          <div className="hf-card p-3">
            <p className="mb-2 text-[11px] font-extrabold">Keşfet</p>
            <div className="mb-2 flex flex-wrap gap-1">
              {["Tümü", "Fitness", "Moda", "Oyun"].map((c, i) => (
                <span key={c} className={i === 0 ? "rounded-full bg-brand-500 px-2 py-0.5 text-[9px] font-bold text-white" : "rounded-full bg-soft px-2 py-0.5 text-[9px] font-bold text-muted-strong"}>{c}</span>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-1">
              {featured.slice(0, 3).map((c) => (
                <div key={c.id} className="aspect-[3/4] overflow-hidden rounded-md"><CreatorPhoto src={c.avatarUrl} name={c.displayName} rounded="rounded-md" showMonogram={false} /></div>
              ))}
            </div>
          </div>
          <div className="hf-card p-3">
            <p className="text-[11px] font-extrabold">Mobil Deneyim</p>
            <p className="mt-1 text-[10px] leading-relaxed text-muted-strong">Her yerde seninle. Web uygulaması mobil tarayıcıda tam uyumlu çalışır; iOS ve Android uygulamaları yakında.</p>
            <span className="mt-2 inline-block rounded-lg bg-ink px-2.5 py-1.5 text-[9px] font-bold text-white">Mağaza uygulamaları yakında</span>
          </div>
        </div>
      </Section>

      <CtaBand
        className="pb-12"
        title={announcement?.title ?? "Şimdi HEYFANS topluluğuna katıl."}
        text={announcement?.subtitle}
        href={String((announcement?.config as { ctaHref?: string })?.ctaHref ?? "/register")}
        label={String((announcement?.config as { ctaLabel?: string })?.ctaLabel ?? "Hemen Başla")}
      />
    </>
  );
}
