import type { Metadata } from "next";
import { m } from "@/i18n/m";
import Link from "next/link";
import { ArrowRight, BadgeCheck, BarChart3, Camera, Crown, Eye, Heart, Lock, MessageCircle, MessagesSquare, Search, ShieldCheck, Sparkles, UserPlus, Users, Video, type LucideIcon } from "lucide-react";
import { CreatorTile } from "@/components/creator/creator-cards";
import { CtaBand, HeroStats, PhoneChatMockup, PolaroidStack, PublicHero, Section, getStat } from "@/components/public/marketing";
import { SectionTitle } from "@/components/ui/card";
import { getT } from "@/i18n/server";
import { cn } from "@/lib/utils";
import { listCreators, platformCounters } from "@/services/creators/public";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("Nasıl Çalışır? — HEYFANS'ı Birkaç Adımda Keşfet"),
    description: t("Hayranlar için kayıt, keşif, AI ikizi sohbeti ve özel içerikler; içerik üreticileri için doğrulama, içerik paylaşımı, AI ikizi ve gelir. HEYFANS nasıl çalışır?"),
    alternates: { canonical: "/how-it-works" },
    openGraph: { title: t("Nasıl Çalışır? | HEYFANS"), description: t("HEYFANS'ı birkaç adımda keşfet."), url: "/how-it-works", type: "website" },
  };
}

const FAN_STEPS = [
  { icon: UserPlus, title: m("Hesabını Oluştur"), text: m("Sadece birkaç dakika içinde ücretsiz olarak kaydol.") },
  { icon: Search, title: m("Keşfet ve Takip Et"), text: m("Beğendiğin içerik üreticilerini ara, profillerini incele ve takip et.") },
  { icon: MessageCircle, title: m("Sohbete Başla"), text: m("AI ikizleriyle sohbet et; yanıtlar her zaman “AI İkizi” etiketiyle gösterilir.") },
  { icon: Lock, title: m("Özel İçeriklere Eriş"), text: m("Abonelik veya tekil satın alma ile yalnızca burada paylaşılan içeriklerin kilidini aç.") },
];

const CREATOR_STEPS = [
  { icon: UserPlus, title: m("Hesabını Oluştur"), text: m("Doğrulama adımlarını tamamla ve içerik üreticisi hesabını aç.") },
  { icon: Camera, title: m("İçeriklerini Paylaş"), text: m("Fotoğraf, video, ses ve yazılarını erişim seviyesini sen belirleyerek paylaş.") },
  { icon: MessagesSquare, title: m("AI İkizini Oluştur"), text: m("İstersen açık izninle AI ikizini kur; kişiliğini, sınırlarını ve bilgi kaynaklarını sen yönet.") },
  { icon: BarChart3, title: m("Gelir Elde Et"), text: m("Abonelik, tekil içerik satışı ve AI ikizi etkileşimleriyle kazan.") },
];

const FEATURES = [
  { icon: Camera, title: m("Özel İçerikler"), text: m("Yalnızca HEYFANS'ta paylaşılan fotoğraf, video ve yazılara erişim seviyesine göre ulaş.") },
  { icon: MessageCircle, title: m("Gerçek Sohbetler"), text: m("AI ikizleriyle 7/24 sohbet et; her yanıt yapay zekâ ürünü olarak açıkça etiketlenir.") },
  { icon: ShieldCheck, title: m("Güvenli ve Gizli"), text: m("Verilerini sen yönetirsin: sohbetlerini ve AI hafızanı istediğin an silebilirsin.") },
  { icon: Crown, title: m("İçerik Üreticilerine Destek"), text: m("Gelir paylaşımı kuralları şeffaf; içerik üreticileri fiyatlarını ve sınırlarını kendileri belirler.") },
];

const TRUST = [
  { icon: BadgeCheck, title: m("Doğrulanmış içerik üreticileri"), text: m("Kimlik ve hesap sahipliği doğrulanmadan profil yayına alınmaz."), href: "/trust-and-safety" },
  { icon: Eye, title: m("Şeffaf AI"), text: m("AI ikizi yanıtları ve profilleri her yerde “AI İkizi” etiketiyle işaretlenir."), href: "/trust-and-safety" },
  { icon: Heart, title: m("Açık rıza ve kontrol"), text: m("AI ikizi yalnız içerik üreticisinin açık izniyle çalışır; izin her an geri çekilebilir."), href: "/creator-agreement" },
];

async function Journey({ title, subtitle, icon: Icon, steps, cta, href }: { title: string; subtitle: string; icon: typeof Users; steps: { icon: LucideIcon; title: string; text: string }[]; cta: string; href: string }) {
  const t = await getT();
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
            <h3 className="mt-3 text-[13px] font-extrabold">{t(s.title)}</h3>
            <p className="mt-1.5 text-[11px] leading-relaxed text-muted-strong">{t(s.text)}</p>
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
  const [t, stat] = await Promise.all([getT(), getStat()]);
  const [featured, counters] = await Promise.all([listCreators("featured", 6), platformCounters()]);
  const lead = featured[0];
  return (
    <>
      <PublicHero
        badge={t("Gerçek bağlantılar, gerçek insanlar, gerçek deneyimler")}
        title={
          <>
            {t("HEYFANS Nasıl Çalışır?")}
            <br />
            {t("Çok Kolay,")} <span className="text-brand-500">{t("Çok Gerçek.")}</span>
          </>
        }
        description={t("HEYFANS, hayranlarla sevdikleri içerik üreticilerini doğrudan bir araya getiren, güvenli ve şeffaf bir platformdur. Sadece birkaç adımda sen de topluluğun bir parçası ol.")}
        note={t("Gerçek insanlarla sohbet")}
        art={
          <div className="relative flex h-full items-center justify-center gap-4 lg:justify-end">
            <PhoneChatMockup
              className="relative z-10 lg:me-[26%]"
              creatorName={lead?.displayName ?? t("İçerik Üreticisi")}
              avatarUrl={lead?.avatarUrl}
              lines={[
                { from: "ai", text: t("Merhaba! Bugün nasılsın? Seninle sohbet etmeyi çok seviyorum.") },
                { from: "user", text: t("Bugün yeni bir paylaşım olacak mı?") },
                { from: "ai", text: t("Evet, bu akşam özel bir içerik yayınlıyorum.") },
              ]}
            />
            <div className="absolute end-0 top-0 hidden h-full w-[34%] xl:block">
              <PolaroidStack people={featured.slice(1, 3).map((c) => ({ name: c.displayName, image: c.avatarUrl }))} caption={t("Sadece senin için")} />
            </div>
            <p className="absolute -bottom-1 left-1/2 hidden -translate-x-1/2 text-[10px] text-muted lg:block">{t("Örnek ekran — gerçek bir konuşma değildir")}</p>
          </div>
        }
      />

      <Section className="grid gap-5 lg:grid-cols-2">
        <Journey title={t("Hayranlar İçin Yolculuk")} subtitle={t("Sevdiğin içerik üreticilerine daha yakın olmanın yolu çok kolay.")} icon={Users} steps={FAN_STEPS} cta={t("Şimdi Hayran Olarak Katıl")} href="/register" />
        <Journey title={t("İçerik Üreticileri İçin Yolculuk")} subtitle={t("Tutkunu gelire dönüştür, kendi topluluğunu oluştur.")} icon={Crown} steps={CREATOR_STEPS} cta={t("Şimdi İçerik Üreticisi Ol")} href="/for-creators" />
      </Section>

      <Section className="py-4">
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {FEATURES.map((f) => (
            <li key={f.title} className="hf-card hf-gradient-pink flex gap-4 p-5">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white text-brand-500 shadow-sm">
                <f.icon className="size-6" aria-hidden />
              </span>
              <div>
                <h3 className="text-[15px] font-extrabold">{t(f.title)}</h3>
                <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">{t(f.text)}</p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section className="py-4">
        <div className="hf-card hf-gradient-pink p-5">
          <HeroStats
            items={[
              { icon: <Users />, value: stat(counters.users), label: t("Aktif Kullanıcı") },
              { icon: <MessageCircle />, value: stat(counters.messages), label: t("Gönderilen Mesaj") },
              { icon: <Video />, value: stat(counters.creators), label: t("İçerik Üreticisi") },
              { icon: <Sparkles />, value: stat(counters.liveTwins, ""), label: t("Yayındaki AI İkizi") },
            ]}
          />
        </div>
      </Section>

      <Section>
        <SectionTitle title={t("Güven İlkelerimiz")} icon={<ShieldCheck />} subtitle={t("HEYFANS deneyiminin temelindeki üç söz.")} />
        <ul className="grid gap-4 md:grid-cols-3">
          {TRUST.map((item) => (
            <li key={item.title}>
              <Link href={item.href} className="hf-card group flex h-full gap-4 p-5 transition-shadow hover:shadow-[var(--shadow-card-hover)]">
                <span className="grid size-12 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-500">
                  <item.icon className="size-6" aria-hidden />
                </span>
                <span>
                  <span className="block text-[15px] font-extrabold group-hover:text-brand-600">{t(item.title)}</span>
                  <span className="mt-1.5 block text-xs leading-relaxed text-muted-strong">{t(item.text)}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      {featured.length > 0 && (
        <Section className={cn("pt-2")}>
          <SectionTitle title={t("Topluluktan İçerik Üreticileri")} icon={<Heart className="fill-brand-500" />} subtitle={t("Platformdaki içerik üreticilerine göz at.")} />
          <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 xl:grid-cols-6">
            {featured.map((c) => (
              <CreatorTile key={c.id} creator={c} />
            ))}
          </div>
        </Section>
      )}

      <CtaBand className="pb-12" title={t("Sen de HEYFANS Topluluğuna Katıl!")} text={t("Gerçek insanlar. Gerçek sohbetler. Gerçek bağlantılar. Hemen başla, ayrıcalıklı dünyayı keşfet.")} href="/register" label={t("Hemen Başla")} />
    </>
  );
}
