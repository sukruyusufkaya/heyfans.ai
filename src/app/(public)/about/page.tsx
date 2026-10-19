import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDown, ArrowRight, BadgeCheck, Eye, Flag, Globe2, Heart, KeyRound, Lightbulb, Lock, MessageCircle, Rocket, Scale, ShieldCheck, Sparkles, Target, Users, UsersRound, Crown } from "lucide-react";
import { CtaBand, HeroStats, PolaroidStack, PrimaryCta, PublicHero, Section, stat } from "@/components/public/marketing";
import { Card, SectionTitle } from "@/components/ui/card";
import { formatNumber } from "@/lib/utils";
import { listCreators, platformCounters } from "@/services/creators/public";

export const metadata: Metadata = {
  title: "Hakkımızda — Yeni Nesil İçerik Ekonomisinin Evi",
  description: "HEYFANS'ın misyonu, değerleri ve güven yaklaşımı: içerik üreticilerinin kontrolü ve açık rızasıyla çalışan AI ikizleri, şeffaf gelir paylaşımı ve güvenli deneyim.",
  alternates: { canonical: "/about" },
  openGraph: { title: "Hakkımızda | HEYFANS", description: "Misyonumuz, değerlerimiz ve güven yaklaşımımız.", url: "/about", type: "website" },
};

const VALUES = [
  { icon: Crown, title: "Üretici Odaklılık", text: "Her kararda içerik üreticilerinin kontrolünü ve çıkarlarını önceliklendiririz." },
  { icon: Heart, title: "Gerçeklik ve Samimiyet", text: "Sahte değil, gerçek bağlantılara inanırız; AI her zaman açıkça etiketlenir." },
  { icon: KeyRound, title: "Rıza ve Kontrol", text: "AI ikizleri ve benzerlik özellikleri yalnız açık izinle çalışır; izin her an geri çekilebilir." },
  { icon: Scale, title: "Adalet ve Şeffaflık", text: "Gelir paylaşımı ve platform kuralları açık, anlaşılır ve itiraza açıktır." },
  { icon: Lightbulb, title: "Yenilikçilik", text: "Teknolojiyi insanı öne alarak kullanır, deneyimi sürekli geliştiririz." },
];

const TRUST = [
  { icon: BadgeCheck, title: "Kimlik Doğrulama", text: "Kimlik ve hesap sahipliği doğrulanmadan creator profili yayına alınmaz." },
  { icon: ShieldCheck, title: "Moderasyon", text: "Otomatik filtreler ve insan incelemesi birlikte çalışır." },
  { icon: Lock, title: "Gizlilik ve Veri Koruma", text: "Sohbetlerini ve AI hafızanı istediğin an silebilirsin." },
  { icon: UsersRound, title: "Topluluk Kuralları", text: "Saygılı ve pozitif bir ortam için net kurallar ve bildirim süreci." },
];

const ROADMAP = [
  { phase: "Şimdi", title: "Temel platform", text: "Doğrulanmış içerik üreticileri, AI ikizi sohbeti, abonelik ve tekil içerik satışı, kredi sistemi ve güvenlik/moderasyon araçları." },
  { phase: "Sırada", title: "Deneyimi derinleştirme", text: "Sesli ve görüntülü görüşme, daha zengin içerik ve etkileşim araçları, mobil uygulamalar." },
  { phase: "Sonrası", title: "Büyüme ve erişim", text: "Çok dilli destek ve yeni bölgelere açılma." },
];

export default async function AboutPage() {
  const [counters, featured] = await Promise.all([platformCounters(), listCreators("featured", 3)]);
  return (
    <>
      <PublicHero
        badge="Gerçek insanlar. Gerçek bağlantılar. Daha özgür bir yarın."
        title={
          <>
            Yeni Nesil
            <br />
            İçerik Ekonomisinin
            <br />
            Evi: <span className="text-brand-500">HEYFANS</span>
          </>
        }
        description="İçerik üreticilerinin özgürce kendilerini ifade edebildiği, hayranlarıyla gerçek bağlar kurduğu ve emeğinin karşılığını adilce kazandığı daha açık, daha özgür ve daha insancıl bir dijital dünya inşa ediyoruz."
        actions={
          <PrimaryCta href="#misyon">
            Hikâyemizi Keşfet <ArrowDown className="size-4" aria-hidden />
          </PrimaryCta>
        }
        stats={
          <HeroStats
            items={[
              { icon: <Users />, value: stat(counters.users), label: "Aktif Kullanıcı" },
              { icon: <MessageCircle />, value: stat(counters.messages), label: "Gönderilen Mesaj" },
              { icon: <Crown />, value: stat(counters.creators), label: "İçerik Üreticisi" },
              { icon: <Globe2 />, value: stat(counters.liveTwins, ""), label: "Yayındaki AI İkizi" },
            ]}
          />
        }
        note="Gerçek insanlar, gerçek hikâyeler"
        art={featured.length ? <PolaroidStack people={featured.map((c) => ({ name: c.displayName, image: c.avatarUrl }))} caption="İçerik üreticileri daha güçlü bir geleceği hak ediyor" /> : undefined}
      />

      <Section id="misyon" className="grid scroll-mt-24 gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <SectionTitle title="Misyonumuz ve Vizyonumuz" icon={<Target />} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="hf-gradient-pink">
              <h3 className="flex items-center gap-2.5 text-lg font-extrabold">
                <Rocket className="size-5 text-brand-500" aria-hidden /> Misyonumuz
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                İçerik üreticilerinin tutkularını özgürce paylaşabildiği, hayranlarıyla gerçek ve anlamlı bağlar kurabildiği; güvenli, saygılı ve sürdürülebilir bir platform sunmak. Herkesin kendi hikâyesini kendi kurallarıyla yazabileceği bir dijital ekosistem oluşturmak.
              </p>
            </Card>
            <Card className="hf-gradient-pink">
              <h3 className="flex items-center gap-2.5 text-lg font-extrabold">
                <Eye className="size-5 text-brand-500" aria-hidden /> Vizyonumuz
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">
                Yapay zekânın, gerçek insanların izni ve kontrolü altında bağlantıyı yok etmek yerine güçlendirdiği; içerik üreticilerinin ekonomik özgürlüğe ulaştığı, hayranların ise sevdiklerine her zamankinden daha yakın hissettiği bir içerik ekonomisi.
              </p>
            </Card>
          </div>
        </div>
        <div>
          <SectionTitle title="Marka Değerlerimiz" icon={<Sparkles className="fill-brand-500" />} />
          <ul className="grid gap-2.5">
            {VALUES.map((v) => (
              <li key={v.title} className="hf-card flex items-start gap-3.5 p-3.5">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-500">
                  <v.icon className="size-5" aria-hidden />
                </span>
                <div>
                  <h3 className="text-[13px] font-extrabold">{v.title}</h3>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-muted-strong">{v.text}</p>
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
                <ShieldCheck className="size-7 text-brand-500" aria-hidden /> Güvenli ve Güvenilir Bir Deneyim
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-ink-soft">Topluluğumuzun güvenliği bizim için her şeyden önce gelir. Doğrulama, açık rıza, şeffaf AI etiketleme, moderasyon ve itiraz süreçleriyle hem içerik üreticilerinin hem de kullanıcıların güvende olduğu bir deneyim hedefliyoruz.</p>
              <Link href="/trust-and-safety" className="mt-4 inline-flex h-11 items-center gap-2 rounded-full bg-brand-500 px-6 text-xs font-extrabold text-white shadow-[var(--shadow-pink)] hover:bg-brand-600">
                Güven ve Güvenlik <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {TRUST.map((t) => (
                <li key={t.title} className="flex items-start gap-3 rounded-2xl bg-white p-4 shadow-sm">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-500">
                    <t.icon className="size-5" aria-hidden />
                  </span>
                  <div>
                    <h3 className="text-[13px] font-extrabold">{t.title}</h3>
                    <p className="mt-0.5 text-[11px] leading-relaxed text-muted-strong">{t.text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section className="py-4">
        <SectionTitle title="Platform Bugün" icon={<Globe2 />} subtitle="Veritabanındaki güncel sayılar." />
        <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            { label: "Aktif kullanıcı", value: formatNumber(counters.users) },
            { label: "İçerik üreticisi", value: formatNumber(counters.creators) },
            { label: "Yayındaki AI ikizi", value: formatNumber(counters.liveTwins) },
            { label: "Gönderilen mesaj", value: formatNumber(counters.messages) },
          ].map((s) => (
            <li key={s.label} className="hf-card p-4 text-center">
              <p className="font-display text-3xl font-extrabold tracking-tight text-brand-600">{s.value}</p>
              <p className="mt-1 text-[11px] font-bold text-muted-strong">{s.label}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section>
        <SectionTitle title="Yol Haritamız" icon={<Flag className="fill-brand-500" />} subtitle="Planlanan öncelikler; sıra ve zamanlama bağlayıcı bir taahhüt değildir." />
        <ol className="grid gap-4 md:grid-cols-3">
          {ROADMAP.map((r, i) => (
            <li key={r.phase} className="hf-card relative p-5">
              <span className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-3 py-1 text-[11px] font-black text-brand-600">
                <span className="grid size-4 place-items-center rounded-full bg-brand-500 text-[9px] text-white">{i + 1}</span> {r.phase}
              </span>
              <h3 className="mt-3 text-[15px] font-extrabold">{r.title}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-strong">{r.text}</p>
            </li>
          ))}
        </ol>
      </Section>

      <CtaBand className="pb-12" title="Sen de Bu Hikâyenin Bir Parçası Ol!" text="Gerçek bağlantıların, özgür içeriklerin ve daha güçlü bir topluluğun parçası ol." href="/register" label="Hemen Başla" />
    </>
  );
}
