import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowRight, BadgeCheck, Eye, Flag, Globe2, Heart, KeyRound, Lightbulb, Lock, MessageCircle, Rocket, Scale, ShieldCheck, Sparkles, Target, Users, UsersRound, Crown } from "lucide-react";
import { CtaBand, HeroStats, PolaroidStack, PrimaryCta, PublicHero, Section, getStat } from "@/components/public/marketing";
import { Card, SectionTitle } from "@/components/ui/card";
import { getFormatters, getT, localeAlternates } from "@/i18n/server";
import { m } from "@/i18n/m";
import { listCreators, platformCounters } from "@/services/creators/public";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getT();
  return {
    title: t("Hakkımızda — Yeni Nesil İçerik Ekonomisinin Evi"),
    description: t("HEYFANS'ın misyonu, değerleri ve güven yaklaşımı: içerik üreticilerinin kontrolü ve açık rızasıyla çalışan AI ikizleri, şeffaf gelir paylaşımı ve güvenli deneyim."),
    alternates: await localeAlternates("/about"),
    openGraph: { title: t("Hakkımızda | HEYFANS"), description: t("Misyonumuz, değerlerimiz ve güven yaklaşımımız."), url: "/about", type: "website" },
  };
}

const VALUES = [
  { icon: Crown, title: m("Üretici Odaklılık"), text: m("Her kararda içerik üreticilerinin kontrolünü ve çıkarlarını önceliklendiririz.") },
  { icon: Heart, title: m("Gerçeklik ve Samimiyet"), text: m("Sahte değil, gerçek bağlantılara inanırız; AI her zaman açıkça etiketlenir.") },
  { icon: KeyRound, title: m("Rıza ve Kontrol"), text: m("AI ikizleri ve benzerlik özellikleri yalnız açık izinle çalışır; izin her an geri çekilebilir.") },
  { icon: Scale, title: m("Adalet ve Şeffaflık"), text: m("Gelir paylaşımı ve platform kuralları açık, anlaşılır ve itiraza açıktır.") },
  { icon: Lightbulb, title: m("Yenilikçilik"), text: m("Teknolojiyi insanı öne alarak kullanır, deneyimi sürekli geliştiririz.") },
];

const TRUST = [
  { icon: BadgeCheck, title: m("Kimlik Doğrulama"), text: m("Kimlik ve hesap sahipliği doğrulanmadan creator profili yayına alınmaz.") },
  { icon: ShieldCheck, title: m("Moderasyon"), text: m("Otomatik filtreler ve insan incelemesi birlikte çalışır.") },
  { icon: Lock, title: m("Gizlilik ve Veri Koruma"), text: m("Sohbetlerini ve AI hafızanı istediğin an silebilirsin.") },
  { icon: UsersRound, title: m("Topluluk Kuralları"), text: m("Saygılı ve pozitif bir ortam için net kurallar ve bildirim süreci.") },
];

const ROADMAP = [
  { phase: m("Şimdi"), title: m("Temel platform"), text: m("Doğrulanmış içerik üreticileri, AI ikizi sohbeti, abonelik ve tekil içerik satışı, kredi sistemi ve güvenlik/moderasyon araçları.") },
  { phase: m("Sırada"), title: m("Deneyimi derinleştirme"), text: m("Sesli ve görüntülü görüşme, daha zengin içerik ve etkileşim araçları, mobil uygulamalar.") },
  { phase: m("Sonrası"), title: m("Büyüme ve erişim"), text: m("Çok dilli destek ve yeni bölgelere açılma.") },
];

export default async function AboutPage() {
  const [t, stat, { formatNumber }] = await Promise.all([getT(), getStat(), getFormatters()]);
  const [counters, featured] = await Promise.all([platformCounters(), listCreators("featured", 3)]);
  return (
    <>
      <PublicHero
        badge={t("Gerçek insanlar. Gerçek bağlantılar. Daha özgür bir yarın.")}
        title={
          <>
            {t("Yeni Nesil")}
            <br />
            {t("İçerik Ekonomisinin")}
            <br />
            {t("Evi:")} <span className="text-brand-500">HEYFANS{/* i18n-ignore */}</span>
          </>
        }
        description={t("İçerik üreticilerinin özgürce kendilerini ifade edebildiği, hayranlarıyla gerçek bağlar kurduğu ve emeğinin karşılığını adilce kazandığı daha açık, daha özgür ve daha insancıl bir dijital dünya inşa ediyoruz.")}
        actions={
          <PrimaryCta href="#misyon">
            {t("Hikâyemizi Keşfet")} <ArrowDown className="size-4" aria-hidden />
          </PrimaryCta>
        }
        stats={
          <HeroStats
            items={[
              { icon: <Users />, value: stat(counters.users), label: t("Aktif Kullanıcı") },
              { icon: <MessageCircle />, value: stat(counters.messages), label: t("Gönderilen Mesaj") },
              { icon: <Crown />, value: stat(counters.creators), label: t("İçerik Üreticisi") },
              { icon: <Globe2 />, value: stat(counters.liveTwins, ""), label: t("Yayındaki AI İkizi") },
            ]}
          />
        }
        note={t("Gerçek insanlar, gerçek hikâyeler")}
        art={featured.length ? <PolaroidStack people={featured.map((c) => ({ name: c.displayName, image: c.avatarUrl }))} caption={t("İçerik üreticileri daha güçlü bir geleceği hak ediyor")} /> : undefined}
      />

      <Section id="misyon" className="grid scroll-mt-24 gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <SectionTitle title={t("Misyonumuz ve Vizyonumuz")} icon={<Target />} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="hf-gradient-pink">
              <h3 className="flex items-center gap-2.5 text-lg font-extrabold">
                <Rocket className="size-5 text-brand-500" aria-hidden /> {t("Misyonumuz")}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                {t("İçerik üreticilerinin tutkularını özgürce paylaşabildiği, hayranlarıyla gerçek ve anlamlı bağlar kurabildiği; güvenli, saygılı ve sürdürülebilir bir platform sunmak. Herkesin kendi hikâyesini kendi kurallarıyla yazabileceği bir dijital ekosistem oluşturmak.")}
              </p>
            </Card>
            <Card className="hf-gradient-pink">
              <h3 className="flex items-center gap-2.5 text-lg font-extrabold">
                <Eye className="size-5 text-brand-500" aria-hidden /> {t("Vizyonumuz")}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                {t("Yapay zekânın, gerçek insanların izni ve kontrolü altında bağlantıyı yok etmek yerine güçlendirdiği; içerik üreticilerinin ekonomik özgürlüğe ulaştığı, hayranların ise sevdiklerine her zamankinden daha yakın hissettiği bir içerik ekonomisi.")}
              </p>
            </Card>
          </div>
        </div>
        <div>
          <SectionTitle title={t("Marka Değerlerimiz")} icon={<Sparkles className="fill-brand-500" />} />
          <ul className="grid gap-2.5">
            {VALUES.map((v) => (
              <li key={v.title} className="hf-card flex items-start gap-3.5 p-3.5">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-500">
                  <v.icon className="size-5" aria-hidden />
                </span>
                <div>
                  <h3 className="text-[13px] font-extrabold">{t(v.title)}</h3>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-muted-strong">{t(v.text)}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section>
        <div className="hf-card hf-gradient-pink p-5 sm:p-7">
          <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr] lg:items-center">
            <div>
              <h2 className="flex items-center gap-2.5 font-display text-2xl font-extrabold tracking-tight">
                <ShieldCheck className="size-7 text-brand-500" aria-hidden /> {t("Güvenli ve Güvenilir Bir Deneyim")}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">{t("Topluluğumuzun güvenliği bizim için her şeyden önce gelir. Doğrulama, açık rıza, şeffaf AI etiketleme, moderasyon ve itiraz süreçleriyle hem içerik üreticilerinin hem de kullanıcıların güvende olduğu bir deneyim hedefliyoruz.")}</p>
              <Link href="/trust-and-safety" className="mt-4 inline-flex h-11 items-center gap-2 rounded-full bg-brand-500 px-6 text-xs font-extrabold text-white shadow-[var(--shadow-pink)] hover:bg-brand-600">
                {t("Güven ve Güvenlik")} <ArrowRight className="rtl:-scale-x-100 size-4" aria-hidden />
              </Link>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {TRUST.map((item) => (
                <li key={item.title} className="flex items-start gap-3 rounded-2xl bg-white p-4 shadow-sm">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-500">
                    <item.icon className="size-5" aria-hidden />
                  </span>
                  <div>
                    <h3 className="text-[13px] font-extrabold">{t(item.title)}</h3>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted-strong">{t(item.text)}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section className="py-4">
        <SectionTitle title={t("Platform Bugün")} icon={<Globe2 />} subtitle={t("Veritabanındaki güncel sayılar.")} />
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: t("Aktif kullanıcı"), value: formatNumber(counters.users) },
            { label: t("İçerik üreticisi"), value: formatNumber(counters.creators) },
            { label: t("Yayındaki AI ikizi"), value: formatNumber(counters.liveTwins) },
            { label: t("Gönderilen mesaj"), value: formatNumber(counters.messages) },
          ].map((s) => (
            <li key={s.label} className="hf-card p-4 text-center">
              <p className="font-display text-3xl font-extrabold tracking-tight text-brand-600">{s.value}</p>
              <p className="mt-1 text-[11px] font-bold text-muted-strong">{s.label}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section>
        <SectionTitle title={t("Yol Haritamız")} icon={<Flag className="fill-brand-500" />} subtitle={t("Planlanan öncelikler; sıra ve zamanlama bağlayıcı bir taahhüt değildir.")} />
        <ol className="grid gap-4 md:grid-cols-3">
          {ROADMAP.map((r, i) => (
            <li key={r.phase} className="hf-card relative p-5">
              <span className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-3 py-1 text-[11px] font-black text-brand-600">
                <span className="grid size-4 place-items-center rounded-full bg-brand-500 text-[9px] text-white">{i + 1}</span> {t(r.phase)}
              </span>
              <h3 className="mt-3 text-[15px] font-extrabold">{t(r.title)}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-strong">{t(r.text)}</p>
            </li>
          ))}
        </ol>
      </Section>

      <CtaBand className="pb-12" title={t("Sen de Bu Hikâyenin Bir Parçası Ol!")} text={t("Gerçek bağlantıların, özgür içeriklerin ve daha güçlü bir topluluğun parçası ol.")} href="/register" label={t("Hemen Başla")} />
    </>
  );
}
