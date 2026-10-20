import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BadgeCheck, BarChart3, Camera, Crown, Eye, Heart, Lock, MessageCircle, MessagesSquare, Search, ShieldCheck, Sparkles, UserPlus, Users, Video } from "lucide-react";
import { CreatorTile } from "@/components/creator/creator-cards";
import { CtaBand, HeroStats, PhoneChatMockup, PolaroidStack, PublicHero, Section, stat } from "@/components/public/marketing";
import { SectionTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { listCreators, platformCounters } from "@/services/creators/public";

export const metadata: Metadata = {
  title: "Nasıl Çalışır? — HEYFANS'ı Birkaç Adımda Keşfet",
  description: "Hayranlar için kayıt, keşif, AI ikizi sohbeti ve özel içerikler; içerik üreticileri için doğrulama, içerik paylaşımı, AI ikizi ve gelir. HEYFANS nasıl çalışır?",
  alternates: { canonical: "/how-it-works" },
  openGraph: { title: "Nasıl Çalışır? | HEYFANS", description: "HEYFANS'ı birkaç adımda keşfet.", url: "/how-it-works", type: "website" },
};

const FAN_STEPS = [
  { icon: UserPlus, title: "Hesabını Oluştur", text: "Sadece birkaç dakika içinde ücretsiz olarak kaydol." },
  { icon: Search, title: "Keşfet ve Takip Et", text: "Beğendiğin içerik üreticilerini ara, profillerini incele ve takip et." },
  { icon: MessageCircle, title: "Sohbete Başla", text: "AI ikizleriyle sohbet et; yanıtlar her zaman “AI İkizi” etiketiyle gösterilir." },
  { icon: Lock, title: "Özel İçeriklere Eriş", text: "Abonelik veya tekil satın alma ile yalnızca burada paylaşılan içeriklerin kilidini aç." },
];

const CREATOR_STEPS = [
  { icon: UserPlus, title: "Hesabını Oluştur", text: "Doğrulama adımlarını tamamla ve içerik üreticisi hesabını aç." },
  { icon: Camera, title: "İçeriklerini Paylaş", text: "Fotoğraf, video, ses ve yazılarını erişim seviyesini sen belirleyerek paylaş." },
  { icon: MessagesSquare, title: "AI İkizini Oluştur", text: "İstersen açık izninle AI ikizini kur; kişiliğini, sınırlarını ve bilgi kaynaklarını sen yönet." },
  { icon: BarChart3, title: "Gelir Elde Et", text: "Abonelik, tekil içerik satışı ve AI ikizi etkileşimleriyle kazan." },
];

const FEATURES = [
  { icon: Camera, title: "Özel İçerikler", text: "Yalnızca HEYFANS'ta paylaşılan fotoğraf, video ve yazılara erişim seviyesine göre ulaş." },
  { icon: MessageCircle, title: "Gerçek Sohbetler", text: "AI ikizleriyle 7/24 sohbet et; her yanıt yapay zekâ ürünü olarak açıkça etiketlenir." },
  { icon: ShieldCheck, title: "Güvenli ve Gizli", text: "Verilerini sen yönetirsin: sohbetlerini ve AI hafızanı istediğin an silebilirsin." },
  { icon: Crown, title: "İçerik Üreticilerine Destek", text: "Gelir paylaşımı kuralları şeffaf; içerik üreticileri fiyatlarını ve sınırlarını kendileri belirler." },
];

const TRUST = [
  { icon: BadgeCheck, title: "Doğrulanmış içerik üreticileri", text: "Kimlik ve hesap sahipliği doğrulanmadan profil yayına alınmaz.", href: "/trust-and-safety" },
  { icon: Eye, title: "Şeffaf AI", text: "AI ikizi yanıtları ve profilleri her yerde “AI İkizi” etiketiyle işaretlenir.", href: "/trust-and-safety" },
  { icon: Heart, title: "Açık rıza ve kontrol", text: "AI ikizi yalnız içerik üreticisinin açık izniyle çalışır; izin her an geri çekilebilir.", href: "/creator-agreement" },
];

function Journey({ title, subtitle, icon: Icon, steps, cta, href }: { title: string; subtitle: string; icon: typeof Users; steps: typeof FAN_STEPS; cta: string; href: string }) {
  return (
    <section className="hf-gradient-pink rounded-[22px] border border-brand-150 p-5 sm:p-6" aria-labelledby={`j-${href.replace(/\W/g, "")}`}>
      <div className="flex items-center gap-3.5">
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl bg-white text-brand-500 shadow-sm">
          <Icon className="size-7" aria-hidden />
        </span>
        <div>
          <h2 id={`j-${href.replace(/\W/g, "")}`} className="font-display text-xl font-extrabold tracking-tight sm:text-2xl">
            {title}
          </h2>
          <p className="mt-0.5 text-xs text-ink-soft">{subtitle}</p>
        </div>
      </div>
      <ol className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {steps.map((s, i) => (
          <li key={s.title} className="relative rounded-2xl bg-white p-4 text-center shadow-sm">
            <span className="absolute start-3 top-3 grid size-6 place-items-center rounded-full bg-brand-500 text-[11px] font-black text-white">{i + 1}</span>
            <span className="mx-auto grid size-12 place-items-center rounded-full bg-brand-100 text-brand-500">
              <s.icon className="size-5" aria-hidden />
            </span>
            <h3 className="mt-3 text-[13px] font-extrabold">{s.title}</h3>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted-strong">{s.text}</p>
          </li>
        ))}
      </ol>
      <Link href={href} className="mx-auto mt-5 flex h-12 w-full max-w-xs items-center justify-center gap-2 rounded-full bg-brand-500 text-sm font-extrabold text-white shadow-[var(--shadow-pink)] hover:bg-brand-600">
        {cta} <ArrowRight className="rtl:-scale-x-100 size-4" aria-hidden />
      </Link>
    </section>
  );
}

export default async function HowItWorksPage() {
  const [featured, counters] = await Promise.all([listCreators("featured", 6), platformCounters()]);
  const lead = featured[0];
  return (
    <>
      <PublicHero
        badge="Gerçek bağlantılar, gerçek insanlar, gerçek deneyimler"
        title={
          <>
            HEYFANS Nasıl Çalışır?
            <br />
            Çok Kolay, <span className="text-brand-500">Çok Gerçek.</span>
          </>
        }
        description="HEYFANS, hayranlarla sevdikleri içerik üreticilerini doğrudan bir araya getiren, güvenli ve şeffaf bir platformdur. Sadece birkaç adımda sen de topluluğun bir parçası ol."
        note="Gerçek insanlarla sohbet"
        art={
          <div className="relative flex h-full items-center justify-center gap-4 lg:justify-end">
            <PhoneChatMockup
              className="relative z-10 lg:me-[26%]"
              creatorName={lead?.displayName ?? "İçerik Üreticisi"}
              avatarUrl={lead?.avatarUrl}
              lines={[
                { from: "ai", text: "Merhaba! Bugün nasılsın? Seninle sohbet etmeyi çok seviyorum." },
                { from: "user", text: "Bugün yeni bir paylaşım olacak mı?" },
                { from: "ai", text: "Evet, bu akşam özel bir içerik yayınlıyorum." },
              ]}
            />
            <div className="absolute end-0 top-0 hidden h-full w-[34%] xl:block">
              <PolaroidStack people={featured.slice(1, 3).map((c) => ({ name: c.displayName, image: c.avatarUrl }))} caption="Sadece senin için" />
            </div>
            <p className="absolute -bottom-1 left-1/2 hidden -translate-x-1/2 text-[10px] text-muted lg:block">Örnek ekran — gerçek bir konuşma değildir</p>
          </div>
        }
      />

      <Section className="grid gap-5 lg:grid-cols-2">
        <Journey title="Hayranlar İçin Yolculuk" subtitle="Sevdiğin içerik üreticilerine daha yakın olmanın yolu çok kolay." icon={Users} steps={FAN_STEPS} cta="Şimdi Hayran Olarak Katıl" href="/register" />
        <Journey title="İçerik Üreticileri İçin Yolculuk" subtitle="Tutkunu gelire dönüştür, kendi topluluğunu oluştur." icon={Crown} steps={CREATOR_STEPS} cta="Şimdi İçerik Üreticisi Ol" href="/for-creators" />
      </Section>

      <Section className="py-4">
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {FEATURES.map((f) => (
            <li key={f.title} className="hf-card hf-gradient-pink flex gap-4 p-5">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white text-brand-500 shadow-sm">
                <f.icon className="size-6" aria-hidden />
              </span>
              <div>
                <h3 className="text-[15px] font-extrabold">{f.title}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">{f.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section className="py-4">
        <div className="hf-card hf-gradient-pink p-5">
          <HeroStats
            items={[
              { icon: <Users />, value: stat(counters.users), label: "Aktif Kullanıcı" },
              { icon: <MessageCircle />, value: stat(counters.messages), label: "Gönderilen Mesaj" },
              { icon: <Video />, value: stat(counters.creators), label: "İçerik Üreticisi" },
              { icon: <Sparkles />, value: stat(counters.liveTwins, ""), label: "Yayındaki AI İkizi" },
            ]}
          />
        </div>
      </Section>

      <Section>
        <SectionTitle title="Güven İlkelerimiz" icon={<ShieldCheck />} subtitle="HEYFANS deneyiminin temelindeki üç söz." />
        <ul className="grid gap-4 md:grid-cols-3">
          {TRUST.map((t) => (
            <li key={t.title}>
              <Link href={t.href} className="hf-card group flex h-full gap-4 p-5 transition-shadow hover:shadow-[var(--shadow-card-hover)]">
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-500">
                  <t.icon className="size-6" aria-hidden />
                </span>
                <span>
                  <span className="block text-[15px] font-extrabold group-hover:text-brand-600">{t.title}</span>
                  <span className="mt-1.5 block text-xs leading-relaxed text-muted-strong">{t.text}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      {featured.length > 0 && (
        <Section className={cn("pt-2")}>
          <SectionTitle title="Topluluktan İçerik Üreticileri" icon={<Heart className="fill-brand-500" />} subtitle="Platformdaki içerik üreticilerine göz at." />
          <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 xl:grid-cols-6">
            {featured.map((c) => (
              <CreatorTile key={c.id} creator={c} />
            ))}
          </div>
        </Section>
      )}

      <CtaBand className="pb-12" title="Sen de HEYFANS Topluluğuna Katıl!" text="Gerçek insanlar. Gerçek sohbetler. Gerçek bağlantılar. Hemen başla, ayrıcalıklı dünyayı keşfet." href="/register" label="Hemen Başla" />
    </>
  );
}
