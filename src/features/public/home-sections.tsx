import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Bell,
  BrainCircuit,
  Check,
  Crown,
  Eye,
  Gift,
  Globe2,
  HandHeart,
  Heart,
  Image as ImageIcon,
  Infinity as InfinityIcon,
  Lock,
  MessageCircle,
  Mic,
  Minus,
  MonitorSmartphone,
  Scale,
  Search,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Star,
  TrendingUp,
  UserCheck,
  Users,
  Video,
  Wallet,
  X,
} from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { CategoryIcon, categoryLabel } from "@/components/creator/category-icon";
import { CreatorPhoto } from "@/components/creator/creator-photo";
import { AiTwinLabel } from "@/components/ui/badge";
import { SocialIcon, socialLabel } from "@/features/public/social-icon";
import { cn, formatCompact } from "@/lib/utils";
import type { CreatorCard } from "@/services/creators/public";

type Person = Pick<CreatorCard, "id" | "username" | "displayName" | "avatarUrl" | "coverUrl" | "categories">;
type CategoryIconMap = Record<string, string>;

const pick = (list: Person[], i: number) => (list.length ? list[i % list.length] : undefined);

/* ─── Ortak parçalar ─────────────────────────────────────── */
function Eyebrow({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.22em] text-muted">
      <span className="font-display text-brand-500">{n}</span>
      <span className="h-px w-10 bg-brand-200" aria-hidden />
      {children}
    </p>
  );
}

function SectionHead({ n, eyebrow, title, accent, text, align = "left" }: { n: string; eyebrow: string; title: React.ReactNode; accent?: React.ReactNode; text?: string; align?: "left" | "split" }) {
  return (
    <div className={cn("mb-10", align === "split" && "grid gap-5 lg:grid-cols-[1.4fr_1fr] lg:items-end")}>
      <div>
        <Eyebrow n={n}>{eyebrow}</Eyebrow>
        <h2 className="mt-4 font-display text-[32px] font-extrabold leading-[1.05] tracking-[-0.045em] text-ink sm:text-[44px]">
          {title}
          {accent && (
            <>
              <br />
              <span className="bg-gradient-to-r from-brand-500 to-[#8b3dff] bg-clip-text text-transparent">{accent}</span>
            </>
          )}
        </h2>
      </div>
      {text && <p className={cn("text-[15px] leading-relaxed text-muted-strong", align === "left" && "mt-4 max-w-2xl")}>{text}</p>}
    </div>
  );
}

function StepNo({ n, className }: { n: number; className?: string }) {
  return <span className={cn("grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand-500 to-[#c4007a] font-display text-sm font-black text-white shadow-[var(--shadow-pink)]", className)}>{n}</span>;
}

/** Telefon kasası (gerçek arayüz parçalarıyla doldurulur). */
function Phone({ children, className, size = "md", label }: { children: React.ReactNode; className?: string; size?: "sm" | "md"; label: string }) {
  return (
    <div
      role="img"
      aria-label={label}
      className={cn(
        "relative shrink-0 overflow-hidden border-ink bg-white shadow-[0_30px_60px_-20px_rgba(43,10,40,0.45)]",
        size === "md" ? "w-[236px] rounded-[38px] border-[7px] p-2.5" : "w-[200px] rounded-[32px] border-[6px] p-2",
        className,
      )}
    >
      <div className={cn("mx-auto mb-2 rounded-full bg-ink", size === "md" ? "h-[18px] w-20" : "h-4 w-16")} aria-hidden />
      <div aria-hidden>{children}</div>
    </div>
  );
}

function Bubble({ from, children }: { from: "ai" | "user"; children: React.ReactNode }) {
  return <p className={cn("max-w-[86%] rounded-2xl px-2.5 py-1.5 text-[9px] leading-snug", from === "ai" ? "self-start rounded-es-sm bg-soft text-ink-soft" : "self-end rounded-ee-sm bg-brand-500 text-white")}>{children}</p>;
}

function ChatHeader({ p }: { p?: Person }) {
  return (
    <div className="mb-2 flex items-center gap-2 border-b border-line pb-2">
      <span className="size-7 overflow-hidden rounded-full">
        <CreatorPhoto src={p?.avatarUrl} name={p?.displayName ?? "Creator"} rounded="rounded-full" showMonogram={false} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[10px] font-extrabold text-ink">{p?.displayName ?? "Creator"}</span>
        <AiTwinLabel className="mt-0.5 !px-1.5 !py-0.5 !text-[6.5px]" />
      </span>
      <span className="size-1.5 rounded-full bg-success" />
    </div>
  );
}

function ChatInput() {
  return (
    <div className="mt-2 flex h-8 items-center gap-2 rounded-full border border-line bg-soft px-2.5 text-[8px] text-muted">
      Mesajını yaz…
      <span className="ms-auto grid size-5 place-items-center rounded-full bg-brand-500 text-white">
        <Send className="rtl:-scale-x-100 size-2.5" />
      </span>
    </div>
  );
}

/* ─── 01 · Hero ──────────────────────────────────────────── */
export interface HeroStat {
  icon: React.ReactNode;
  value: string;
  label: string;
  hint: string;
}

export function HomeHero({
  people,
  catIcons,
  badge,
  title,
  description,
  primary,
  secondary,
  stats,
}: {
  people: Person[];
  catIcons: CategoryIconMap;
  badge: string;
  title: string;
  description: string;
  primary: { label: string; href: string };
  secondary: { label: string; href: string };
  stats: HeroStat[];
}) {
  const parts = title.split(". ").map((t) => t.replace(/\.$/, "")).filter(Boolean);
  const cols = [0, 1, 2].map((c) => [0, 1, 2].map((r) => pick(people, c * 3 + r)));
  const lead = pick(people, 0);
  return (
    <section className="relative overflow-hidden bg-[radial-gradient(120%_80%_at_0%_0%,#fff0f8_0%,#ffffff_45%),radial-gradient(60%_60%_at_100%_10%,#f6e9ff_0%,transparent_60%)]">
      <div aria-hidden className="pointer-events-none absolute -start-40 top-24 size-[460px] rounded-full bg-brand-200/30 blur-3xl" />
      <div className="relative mx-auto grid max-w-[1440px] items-center gap-10 px-4 pb-8 pt-10 sm:px-6 lg:grid-cols-[0.92fr_1.18fr] lg:px-8 lg:pb-10 lg:pt-14">
        <div className="relative z-10 animate-fade-up">
          <span className="inline-flex items-center gap-2 rounded-full border border-brand-150 bg-white/90 px-3.5 py-1.5 text-[11px] font-bold text-brand-600 shadow-sm">
            <Sparkles className="size-3.5" /> {badge}
          </span>
          <h1 className="mt-6 font-display text-[40px] font-extrabold leading-[0.98] tracking-[-0.055em] text-ink sm:text-[58px] xl:text-[68px]">
            {parts.map((p, i) => (
              <span key={p} className={cn("block", i === parts.length - 1 && "bg-gradient-to-r from-brand-500 via-[#f0109a] to-[#8b3dff] bg-clip-text pb-1 text-transparent")}>
                {p}.
              </span>
            ))}
          </h1>
          <p className="mt-6 max-w-[520px] text-[16px] leading-relaxed text-ink-soft sm:text-[18px]">{description}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={primary.href} className="group inline-flex h-[52px] items-center gap-2 rounded-full bg-gradient-to-r from-brand-500 to-[#d4007c] px-7 text-sm font-extrabold text-white shadow-[0_14px_30px_-10px_rgba(236,0,136,0.65)] transition hover:brightness-110">
              {primary.label} <ArrowRight className="rtl:-scale-x-100 size-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link href={secondary.href} className="inline-flex h-[52px] items-center gap-2.5 rounded-full border border-brand-150 bg-white px-6 text-sm font-extrabold text-ink shadow-sm transition hover:border-brand-300">
              <span className="grid size-7 place-items-center rounded-full bg-ink text-white">
                <svg viewBox="0 0 24 24" fill="currentColor" className="size-3" aria-hidden>
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
              {secondary.label}
            </Link>
          </div>
          <ul className="mt-9 grid max-w-[560px] grid-cols-3 gap-3">
            {[
              { icon: BadgeCheck, t: "Doğrulanmış creator'lar", d: "Kimliği ve hesabı doğrulanan gerçek kişiler" },
              { icon: MessageCircle, t: "Gerçek sohbetler", d: "Metin, ses ve görsellerle etkileşim" },
              { icon: ShieldCheck, t: "Güvenli ve kontrollü", d: "Sınırları creator belirler" },
            ].map((f) => (
              <li key={f.t} className="flex flex-col gap-2">
                <span className="grid size-10 place-items-center rounded-2xl bg-white text-brand-500 shadow-[0_8px_20px_-10px_rgba(236,0,136,0.5)] ring-1 ring-brand-100">
                  <f.icon className="size-5" />
                </span>
                <span className="text-[12px] font-extrabold leading-tight text-ink">{f.t}</span>
                <span className="text-[11px] leading-snug text-muted-strong">{f.d}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Kolaj: eğik creator panelleri + uygulama görünümleri */}
        <div className="relative h-[380px] sm:h-[480px] lg:h-[600px]" aria-hidden>
          <div className="absolute inset-y-0 start-[2%] end-[30%] hidden -skew-x-[8deg] grid-cols-3 gap-3 sm:grid lg:end-[26%]">
            {cols.map((col, ci) => (
              <div key={ci} className={cn("flex flex-col gap-3", ci === 1 ? "-translate-y-8" : ci === 2 ? "translate-y-10" : "")}>
                {col.map((p, ri) => {
                  const cat = p?.categories[0];
                  return (
                    <div key={ri} className="relative flex-1 overflow-hidden rounded-[22px] shadow-[0_18px_40px_-18px_rgba(43,10,40,0.55)] ring-1 ring-white/60">
                      <div className="absolute inset-[-12%] skew-x-[8deg]">
                        <CreatorPhoto src={p?.avatarUrl ?? p?.coverUrl} name={p?.displayName ?? "Creator"} rounded="rounded-none" showMonogram={false} priority={ci === 0 && ri < 2} />
                      </div>
                      <span className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/55 to-transparent" />
                      {cat && (
                        <span className="absolute bottom-2.5 start-3 inline-flex skew-x-[8deg] items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-[10px] font-extrabold text-white ring-1 ring-white/30 backdrop-blur-md">
                          <CategoryIcon name={catIcons[cat] ?? "sparkles"} className="size-3" /> {categoryLabel(cat)}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          {/* Mobil: düz ızgara */}
          <div className="absolute inset-0 grid grid-cols-3 gap-2 sm:hidden">
            {[0, 1, 2, 3, 4, 5].map((i) => {
              const p = pick(people, i);
              return (
                <div key={i} className={cn("relative overflow-hidden rounded-2xl", i % 2 === 1 && "translate-y-5")}>
                  <CreatorPhoto src={p?.avatarUrl ?? p?.coverUrl} name={p?.displayName ?? "Creator"} rounded="rounded-none" showMonogram={false} />
                </div>
              );
            })}
          </div>
          <span className="pointer-events-none absolute inset-y-0 start-0 hidden w-24 bg-gradient-to-r from-white to-transparent lg:block" />

          {/* Uygulama ana ekranı */}
          <Phone label="Uygulama ana ekranı" className="hf-float absolute end-[16%] top-[8%] z-10 hidden md:block">
            <div className="mb-2 flex items-center justify-between">
              <LogoMark className="h-5" />
              <span className="flex gap-1.5 text-muted">
                <Search className="size-3" />
                <Bell className="size-3" />
              </span>
            </div>
            <div className="mb-2 flex gap-1">
              {["Senin için", "Trend", "Yeni"].map((t, i) => (
                <span key={t} className={cn("rounded-full px-2 py-0.5 text-[7.5px] font-extrabold", i === 0 ? "bg-brand-500 text-white" : "bg-soft text-muted-strong")}>
                  {t}
                </span>
              ))}
            </div>
            <p className="mb-1.5 flex items-center justify-between text-[9px] font-extrabold text-ink">
              Trend creator&apos;lar <span className="text-[7px] text-brand-500">Tümü</span>
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {[0, 1, 2, 3].map((i) => {
                const p = pick(people, i + 3);
                return (
                  <div key={i} className="overflow-hidden rounded-xl bg-soft">
                    <div className="aspect-[4/3.6]">
                      <CreatorPhoto src={p?.avatarUrl} name={p?.displayName ?? "Creator"} rounded="rounded-none" showMonogram={false} />
                    </div>
                    <p className="truncate px-1.5 py-1 text-[7.5px] font-extrabold text-ink">{p?.displayName}</p>
                  </div>
                );
              })}
            </div>
            <p className="mb-1 mt-2 text-[9px] font-extrabold text-ink">Kategoriler</p>
            <div className="grid grid-cols-4 gap-1">
              {Object.entries(catIcons)
                .slice(0, 4)
                .map(([slug, icon]) => (
                  <span key={slug} className="flex flex-col items-center gap-0.5 rounded-lg bg-brand-50 py-1.5 text-[6.5px] font-bold text-brand-700">
                    <CategoryIcon name={icon} className="size-3" />
                    <span className="max-w-full truncate px-0.5">{categoryLabel(slug)}</span>
                  </span>
                ))}
            </div>
          </Phone>

          {/* Sohbet ekranı */}
          <Phone label="AI ikizi sohbet ekranı" className="hf-float-delay absolute -end-1 top-[30%] z-20 hidden lg:block" size="sm">
            <ChatHeader p={lead} />
            <div className="flex flex-col gap-1.5">
              <Bubble from="ai">Selam! Seni görmek çok güzel 💕 Bugün ne yapmak istersin?</Bubble>
              <Bubble from="user">Hafta sonu için bir şehir rotası önerir misin?</Bubble>
              <Bubble from="ai">Tabii! Sana özel bir plan hazırladım ✨</Bubble>
              <div className="grid h-14 place-items-center rounded-xl bg-gradient-to-br from-[#2b0f2f] to-[#7a1a5c] text-[8px] font-bold text-white">
                <span className="flex items-center gap-1">
                  <Lock className="size-3" /> Özel rota planı
                </span>
              </div>
            </div>
            <ChatInput />
          </Phone>
        </div>
      </div>

      {/* İstatistik şeridi */}
      {stats.length > 0 && (
        <div className="relative mx-auto max-w-[1440px] px-4 pb-10 sm:px-6 lg:px-8">
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[22px] border border-brand-100 bg-brand-100 shadow-[0_20px_50px_-30px_rgba(236,0,136,0.35)] lg:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="flex items-center gap-3.5 bg-white px-5 py-5">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-500 [&_svg]:size-5">{s.icon}</span>
                <div className="min-w-0">
                  <dt className="sr-only">{s.label}</dt>
                  <dd className="font-display text-[20px] font-extrabold leading-none tracking-tight text-ink">{s.value}</dd>
                  <dd className="mt-1 text-[11px] font-bold text-ink-soft">{s.label}</dd>
                  <dd className="text-[10px] text-muted">{s.hint}</dd>
                </div>
              </div>
            ))}
          </dl>
        </div>
      )}
    </section>
  );
}

/* ─── 02 · Yolculuk (creator → bağlantı) ─────────────────── */
export function JourneySection({ people }: { people: Person[] }) {
  const steps = [
    {
      title: "Creator katılır",
      text: "Sosyal hesaplarını bağlar, kimliğini doğrular ve AI ikizini oluşturur.",
      visual: (
        <div className="flex h-full gap-2">
          <div className="w-[42%] overflow-hidden rounded-xl">
            <CreatorPhoto src={pick(people, 1)?.avatarUrl} name="Creator" rounded="rounded-none" showMonogram={false} />
          </div>
          <ul className="flex flex-1 flex-col justify-center gap-1.5">
            {(["instagram", "tiktok", "youtube", "x"] as const).map((p) => (
              <li key={p} className="flex items-center gap-1.5 rounded-lg bg-white px-2 py-1.5 text-[9px] font-bold text-ink shadow-sm ring-1 ring-line">
                <SocialIcon platform={p} className="size-3" />
                <span className="flex-1">{socialLabel(p)}</span>
                <Check className="size-3 text-success" strokeWidth={3} />
              </li>
            ))}
          </ul>
        </div>
      ),
    },
    {
      title: "AI ikizi doğar",
      text: "Creator'ın onayladığı kişilik, bilgi ve sınırlarla, açıkça etiketlenmiş bir ikiz.",
      visual: (
        <div className="relative h-full overflow-hidden rounded-xl">
          <CreatorPhoto src={pick(people, 2)?.avatarUrl} name="Creator" rounded="rounded-none" showMonogram={false} />
          <span className="absolute inset-y-0 end-0 w-1/2 bg-gradient-to-l from-[#8b3dff]/70 via-brand-500/40 to-transparent mix-blend-multiply" />
          <span className="absolute inset-y-3 start-1/2 w-px bg-white/80" />
          <span className="absolute bottom-2 start-2 rounded-full bg-black/45 px-2 py-0.5 text-[8px] font-extrabold text-white">Gerçek creator</span>
          <span className="absolute bottom-2 end-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[8px] font-extrabold text-violet">
            <Sparkles className="size-2.5" /> AI ikizi
          </span>
        </div>
      ),
    },
    {
      title: "Hayranlar keşfeder",
      text: "Kategori, trend ve ilgi alanına göre sevdiği creator'ları bulur.",
      visual: (
        <div className="grid h-full grid-cols-2 gap-1.5">
          {[3, 4, 5, 6].map((i) => {
            const p = pick(people, i);
            return (
              <div key={i} className="relative overflow-hidden rounded-lg">
                <CreatorPhoto src={p?.avatarUrl} name={p?.displayName ?? "Creator"} rounded="rounded-none" showMonogram={false} />
                <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/60 to-transparent px-1.5 pb-1 pt-3 text-[8px] font-extrabold text-white">{p?.displayName}</span>
              </div>
            );
          })}
        </div>
      ),
    },
    {
      title: "Sohbet başlar",
      text: "Metin, ses ve görsellerle kişisel, her an ulaşılabilir sohbetler.",
      visual: (
        <div className="flex h-full flex-col justify-center gap-1.5 rounded-xl bg-white p-2.5 ring-1 ring-line">
          <Bubble from="ai">Selam! Bugün nasıl hissediyorsun? 😊</Bubble>
          <Bubble from="user">Çok iyiyim! Bir tarif önerir misin?</Bubble>
          <Bubble from="ai">Sana en sevdiğim tarifi hazırladım 🍝</Bubble>
          <span className="mt-1 flex gap-1.5 text-muted">
            <Mic className="size-3" />
            <ImageIcon className="size-3" />
            <Video className="size-3" />
          </span>
        </div>
      ),
    },
    {
      title: "Değer büyür",
      text: "Abonelik, özel içerik, hediye ve özel deneyimlerle sürdürülebilir gelir.",
      visual: (
        <div className="grid h-full grid-cols-2 gap-1.5">
          {[
            { i: Crown, t: "Abonelik" },
            { i: MessageCircle, t: "Mesaj başına" },
            { i: Lock, t: "Premium içerik" },
            { i: Gift, t: "Hediye ve bahşiş" },
          ].map((x) => (
            <span key={x.t} className="flex flex-col items-center justify-center gap-1 rounded-xl bg-white text-center text-[9px] font-extrabold text-ink ring-1 ring-line">
              <x.i className="size-4 text-brand-500" /> {x.t}
            </span>
          ))}
        </div>
      ),
    },
  ];
  return (
    <section className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <SectionHead
        n="02"
        eyebrow="Nasıl çalışır"
        title="Creator'dan bağlantıya,"
        accent="basit ve güçlü bir yolculuk."
        text="HEYFANS, creator'ın mevcut kitlesini etkileşimli AI ikizi deneyimlerine dönüştürür. Katılımdan kazanca kadar her adım hem creator hem hayran için akıcıdır."
        align="split"
      />
      <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {steps.map((s, i) => (
          <li key={s.title} className="group relative flex flex-col rounded-[24px] border border-line bg-gradient-to-b from-white to-[#fff7fb] p-4 transition hover:-translate-y-1 hover:shadow-[0_24px_50px_-28px_rgba(236,0,136,0.45)]">
            <div className="flex items-start gap-3">
              <StepNo n={i + 1} />
              <div>
                <h3 className="text-[15px] font-extrabold text-ink">{s.title}</h3>
                <p className="mt-1 text-[12px] leading-relaxed text-muted-strong">{s.text}</p>
              </div>
            </div>
            <div className="mt-4 h-[168px] rounded-2xl bg-brand-50/60 p-2" aria-hidden>
              {s.visual}
            </div>
            {i < steps.length - 1 && (
              <span className="absolute -end-3 top-1/2 z-10 hidden size-6 -translate-y-1/2 place-items-center rounded-full bg-white text-brand-500 shadow ring-1 ring-brand-100 lg:grid" aria-hidden>
                <ArrowRight className="rtl:-scale-x-100 size-3.5" />
              </span>
            )}
          </li>
        ))}
      </ol>
      <ul className="mt-6 grid gap-px overflow-hidden rounded-[20px] border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
        {[
          { i: Users, t: "Daha fazla etkileşim", d: "Hayranlarla daha derin ve sık iletişim" },
          { i: TrendingUp, t: "Yeni gelir akışları", d: "Birden fazla kazanç modeli bir arada" },
          { i: Heart, t: "Güçlü hayran bağı", d: "Kişisel ve her an ulaşılabilir deneyim" },
          { i: InfinityIcon, t: "Uzun vadeli büyüme", d: "Ölçeklenebilir bir creator ekonomisi" },
        ].map((b) => (
          <li key={b.t} className="flex items-center gap-3 bg-white px-5 py-4">
            <b.i className="size-6 shrink-0 text-brand-500" />
            <span>
              <span className="block text-[13px] font-extrabold text-ink">{b.t}</span>
              <span className="block text-[11px] text-muted-strong">{b.d}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ─── 04 · Hayran deneyimi ───────────────────────────────── */
export function FanExperienceSection({ people, catIcons }: { people: Person[]; catIcons: CategoryIconMap }) {
  const lead = pick(people, 4);
  const screens = [
    {
      title: "Creator'ları keşfet",
      text: "Kategorilere göz at, trendleri takip et.",
      body: (
        <>
          <div className="mb-1.5 flex gap-1">
            {Object.entries(catIcons)
              .slice(0, 3)
              .map(([slug, icon]) => (
                <span key={slug} className="inline-flex items-center gap-0.5 rounded-full bg-brand-50 px-1.5 py-0.5 text-[6.5px] font-bold text-brand-700">
                  <CategoryIcon name={icon} className="size-2.5" /> {categoryLabel(slug)}
                </span>
              ))}
          </div>
          <div className="grid grid-cols-2 gap-1">
            {[0, 1, 2, 3].map((i) => {
              const p = pick(people, i + 1);
              return (
                <div key={i} className="overflow-hidden rounded-lg bg-soft">
                  <div className="aspect-square">
                    <CreatorPhoto src={p?.avatarUrl} name={p?.displayName ?? "Creator"} rounded="rounded-none" showMonogram={false} />
                  </div>
                  <p className="truncate px-1 py-0.5 text-[6.5px] font-extrabold">{p?.displayName}</p>
                </div>
              );
            })}
          </div>
        </>
      ),
    },
    {
      title: "Sohbet başlat",
      text: "AI ikizine ilk mesajını gönder.",
      body: (
        <>
          <ChatHeader p={lead} />
          <div className="flex flex-col gap-1">
            <Bubble from="ai">Hoş geldin! Seni tanımak isterim 😊</Bubble>
            <Bubble from="user">Bu hafta sonu Kapadokya&apos;ya gidiyorum!</Bubble>
            <Bubble from="ai">Harika! Gün doğumu rotamı paylaşayım mı? 🎈</Bubble>
          </div>
          <ChatInput />
        </>
      ),
    },
    {
      title: "Deneyimi kişiselleştir",
      text: "İlgi alanların ve tarzınla şekillenir.",
      body: (
        <div className="space-y-2">
          <p className="text-[8px] font-extrabold text-ink">İlgi alanların</p>
          <div className="flex flex-wrap gap-1">
            {["Seyahat", "Fitness", "Müzik", "Yemek"].map((t, i) => (
              <span key={t} className={cn("rounded-full px-1.5 py-0.5 text-[6.5px] font-bold", i < 2 ? "bg-brand-500 text-white" : "bg-soft text-muted-strong")}>
                {t}
              </span>
            ))}
          </div>
          <p className="text-[8px] font-extrabold text-ink">Sohbet tarzı</p>
          <div className="grid grid-cols-3 gap-1 text-center text-[6.5px] font-bold">
            {["Samimi", "Eğlenceli", "Sakin"].map((t, i) => (
              <span key={t} className={cn("rounded-md py-1", i === 0 ? "bg-brand-100 text-brand-700" : "bg-soft text-muted-strong")}>
                {t}
              </span>
            ))}
          </div>
          {["Beni hatırla", "Yeni içerik bildirimi"].map((t) => (
            <p key={t} className="flex items-center justify-between rounded-md bg-soft px-1.5 py-1 text-[7px] font-bold text-ink">
              {t}
              <span className="flex h-3 w-5 items-center justify-end rounded-full bg-brand-500 px-0.5">
                <span className="size-2 rounded-full bg-white" />
              </span>
            </p>
          ))}
        </div>
      ),
    },
    {
      title: "Daha fazlasının kilidini aç",
      text: "Üyelik veya tekil içerikle derinleş.",
      body: (
        <div className="space-y-1.5">
          <p className="text-center text-[8px] font-extrabold text-ink">Üyelik planları</p>
          {[
            { n: "Temel", d: "Genel gönderiler" },
            { n: "Premium", d: "Sınırsız sohbet", pop: true },
            { n: "VIP", d: "Özel deneyimler" },
          ].map((pl) => (
            <div key={pl.n} className={cn("rounded-lg px-2 py-1.5", pl.pop ? "bg-gradient-to-r from-brand-500 to-[#c4007a] text-white" : "bg-soft text-ink")}>
              <p className="flex items-center justify-between text-[8px] font-extrabold">
                {pl.n} {pl.pop && <span className="rounded-full bg-white/25 px-1 text-[6px]">En popüler</span>}
              </p>
              <p className={cn("text-[6.5px]", pl.pop ? "text-white/85" : "text-muted-strong")}>{pl.d}</p>
            </div>
          ))}
          <div className="grid grid-cols-3 gap-1">
            {[0, 1, 2].map((i) => (
              <div key={i} className="relative aspect-square overflow-hidden rounded-md">
                <CreatorPhoto src={pick(people, i + 5)?.coverUrl} name="İçerik" rounded="rounded-none" showMonogram={false} />
                {i > 0 && (
                  <span className="absolute inset-0 grid place-items-center bg-black/45 text-white">
                    <Lock className="size-2.5" />
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      title: "Hep yeni bir şey",
      text: "Yeni paylaşımlar ve sana özel anlar.",
      body: (
        <div className="space-y-1.5">
          <p className="flex items-center gap-1 rounded-lg bg-brand-50 px-1.5 py-1 text-[7px] font-bold text-brand-700">
            <Bell className="size-2.5" /> Senin için yeni bir paylaşım var
          </p>
          <div className="relative aspect-[4/3] overflow-hidden rounded-lg">
            <CreatorPhoto src={pick(people, 7)?.coverUrl} name="Paylaşım" rounded="rounded-none" showMonogram={false} />
            <span className="absolute bottom-1 start-1 rounded-full bg-black/50 px-1.5 py-0.5 text-[6.5px] font-bold text-white">Kamera arkası</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-soft px-1.5 py-1">
            <span className="size-5 overflow-hidden rounded-full">
              <CreatorPhoto src={pick(people, 7)?.avatarUrl} name="Creator" rounded="rounded-full" showMonogram={false} />
            </span>
            <span className="flex-1 text-[6.5px] font-bold text-ink">Sesli mesaj</span>
            <span className="flex items-end gap-px" aria-hidden>
              {[3, 6, 4, 8, 5, 7, 3].map((h, i) => (
                <span key={i} className="w-0.5 rounded-full bg-brand-500" style={{ height: h * 1.4 }} />
              ))}
            </span>
          </div>
        </div>
      ),
    },
  ];
  return (
    <section className="relative overflow-hidden bg-[linear-gradient(180deg,#fff7fb_0%,#ffffff_100%)] py-16 lg:py-20">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <SectionHead n="04" eyebrow="Hayran deneyimi" title="Keşfet. Sohbet et. Kişiselleştir." accent="Kilidi aç, tekrar gel." text="Sevdiğin creator'ların AI ikizleriyle eğlenceli, güvenli ve kişisel bir bağ kurmanın en kolay yolu." align="split" />
        <ol className="-mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto px-4 pb-4 no-scrollbar lg:mx-0 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-0">
          {screens.map((s, i) => (
            <li key={s.title} className="flex snap-center flex-col items-center text-center">
              <div className="mb-4 flex items-center gap-2">
                <StepNo n={i + 1} className="size-7 text-xs" />
                <span className="text-start">
                  <span className="block text-[13px] font-extrabold text-ink">{s.title}</span>
                  <span className="block text-[11px] text-muted-strong">{s.text}</span>
                </span>
              </div>
              <Phone label={`${s.title} ekranı`} size="sm" className={cn(i % 2 === 1 && "lg:translate-y-6")}>
                <div className="min-h-[220px]">{s.body}</div>
              </Phone>
            </li>
          ))}
        </ol>
        <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { i: Sparkles, t: "Anında başla", d: "Birkaç saniyede kaydol, keşfetmeye başla" },
            { i: HandHeart, t: "Kişisel deneyim", d: "Ne kadar konuşursan o kadar sana özel" },
            { i: MessageCircle, t: "Çok yönlü etkileşim", d: "Metin, ses, görsel ve özel deneyimler" },
            { i: Lock, t: "Özel içerik", d: "Creator'a özel içeriklerin kilidini aç" },
            { i: Bell, t: "Hep yeni bir şey", d: "Taze içerikler ve süregelen sohbetler" },
          ].map((f) => (
            <li key={f.t} className="flex items-start gap-3 rounded-2xl bg-white p-4 ring-1 ring-line">
              <f.i className="mt-0.5 size-5 shrink-0 text-brand-500" />
              <span>
                <span className="block text-[13px] font-extrabold text-ink">{f.t}</span>
                <span className="block text-[11px] leading-snug text-muted-strong">{f.d}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ─── 05 · Creator avantajı ──────────────────────────────── */
export function CreatorAdvantageSection({ people }: { people: Person[] }) {
  const hero = pick(people, 2);
  const points = [
    { i: Users, t: "Kitleni getir", d: "Instagram, TikTok, YouTube ve X'teki takipçilerini AI ikizine taşı." },
    { i: SlidersHorizontal, t: "AI ikizin, senin kontrolün", d: "Kişilik, konuşma tarzı, içerik erişimi, sınırlar ve fiyatları sen belirle." },
    { i: Wallet, t: "Yeni gelir akışları", d: "Abonelik, mesaj başına ödeme, premium içerik, hediye ve özel deneyimler." },
    { i: Heart, t: "Daha derin hayran ilişkileri", d: "Hayranların 7/24 seninle bağ kurar, sadakat ve etkileşim artar." },
    { i: BarChart3, t: "İçgörü ve analitik", d: "Gelirini, etkileşimi, öne çıkan konuları ve hayran büyümesini izle." },
  ];
  return (
    <section className="relative overflow-hidden bg-night py-16 text-white lg:py-24">
      <div aria-hidden className="pointer-events-none absolute -end-32 -top-32 size-[520px] rounded-full bg-brand-500/25 blur-[120px]" />
      <div aria-hidden className="pointer-events-none absolute -bottom-40 start-1/4 size-[460px] rounded-full bg-[#8b3dff]/20 blur-[120px]" />
      <div className="relative mx-auto grid max-w-[1440px] gap-12 px-4 sm:px-6 lg:grid-cols-[0.9fr_1fr_0.95fr] lg:items-center lg:px-8">
        <div>
          <p className="flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.22em] text-white/60">
            <span className="font-display text-brand-400">05</span> <span className="h-px w-10 bg-white/25" /> Creator avantajı
          </p>
          <h2 className="mt-4 font-display text-[40px] font-extrabold leading-[0.98] tracking-[-0.05em] sm:text-[54px]">
            Senin kitlen.
            <br />
            <span className="bg-gradient-to-r from-[#ff69b8] to-[#b98cff] bg-clip-text text-transparent">Senin ikizin.</span>
            <br />
            Senin kuralların.
          </h2>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-white/75">Mevcut takipçilerini etkileşimli bir AI ikizi deneyimine dönüştür. Daha fazla etkileşim, daha fazla gelir, tam kontrol.</p>
          <div className="relative mt-8 h-[260px] max-w-[340px] overflow-hidden rounded-[28px] ring-1 ring-white/15" aria-hidden>
            <CreatorPhoto src={hero?.avatarUrl ?? hero?.coverUrl} name={hero?.displayName ?? "Creator"} rounded="rounded-none" showMonogram={false} />
            <span className="absolute inset-0 bg-gradient-to-t from-night/80 via-transparent to-transparent" />
            <span className="absolute bottom-4 start-4 end-4 flex items-center justify-between">
              <span className="rounded-full bg-white/15 px-3 py-1.5 text-[11px] font-extrabold backdrop-blur-md">Senin kitlen</span>
              <span className="flex gap-1.5">
                {(["instagram", "tiktok", "youtube", "x"] as const).map((p) => (
                  <span key={p} className="grid size-7 place-items-center rounded-full bg-white text-ink">
                    <SocialIcon platform={p} className="size-3.5" />
                  </span>
                ))}
              </span>
            </span>
          </div>
        </div>

        <ol className="space-y-3">
          {points.map((p, i) => (
            <li key={p.t} className="flex gap-4 rounded-2xl bg-white/[0.06] p-4 ring-1 ring-white/10 transition hover:bg-white/[0.09]">
              <StepNo n={i + 1} />
              <div>
                <p className="flex items-center gap-2 text-[15px] font-extrabold">
                  <p.i className="size-4 text-brand-400" /> {p.t}
                </p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-white/70">{p.d}</p>
              </div>
            </li>
          ))}
          <li>
            <Link href="/register?intent=creator" className="mt-2 inline-flex h-12 items-center gap-2 rounded-full bg-gradient-to-r from-brand-500 to-[#d4007c] px-7 text-sm font-extrabold text-white shadow-[0_14px_30px_-10px_rgba(236,0,136,0.7)] hover:brightness-110">
              Creator olarak başvur <ArrowRight className="rtl:-scale-x-100 size-4" />
            </Link>
          </li>
        </ol>

        {/* Creator Studio görünümü */}
        <div className="rounded-[26px] bg-white p-4 text-ink shadow-[0_40px_80px_-30px_rgba(0,0,0,0.6)]" role="img" aria-label="Creator Studio görünümü">
          <div aria-hidden>
            <div className="mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2 text-[12px] font-extrabold">
                <LogoMark className="h-5" /> Creator Studio
              </span>
              <span className="size-6 overflow-hidden rounded-full">
                <CreatorPhoto src={hero?.avatarUrl} name="Creator" rounded="rounded-full" showMonogram={false} />
              </span>
            </div>
            <div className="mb-3 flex gap-1.5 text-[9px] font-bold">
              {["Kişilik", "Bilgi", "Sınırlar", "Ses"].map((t, i) => (
                <span key={t} className={cn("rounded-full px-2.5 py-1", i === 0 ? "bg-brand-500 text-white" : "bg-soft text-muted-strong")}>
                  {t}
                </span>
              ))}
            </div>
            <div className="space-y-2.5 rounded-2xl bg-soft p-3">
              {[
                { t: "Samimiyet", v: 82 },
                { t: "Mizah", v: 64 },
                { t: "Enerji", v: 71 },
                { t: "Resmiyet", v: 28 },
              ].map((s) => (
                <div key={s.t}>
                  <p className="mb-1 text-[9px] font-bold text-ink-soft">{s.t}</p>
                  <span className="block h-1.5 rounded-full bg-white">
                    <span className="block h-full rounded-full bg-gradient-to-r from-brand-500 to-[#8b3dff]" style={{ width: `${s.v}%` }} />
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-2xl bg-soft p-3">
                <p className="text-[9px] font-extrabold">İçerik erişimi</p>
                {["Genel", "Abonelere özel", "Tekil satış"].map((t, i) => (
                  <p key={t} className="mt-1.5 flex items-center justify-between text-[8.5px] text-ink-soft">
                    {t}
                    <span className={cn("flex h-3 w-5 items-center rounded-full px-0.5", i < 2 ? "justify-end bg-brand-500" : "bg-line")}>
                      <span className="size-2 rounded-full bg-white" />
                    </span>
                  </p>
                ))}
              </div>
              <div className="rounded-2xl bg-soft p-3">
                <p className="text-[9px] font-extrabold">Gelir akışları</p>
                <div className="mt-2 flex h-[54px] items-end gap-1" aria-hidden>
                  {[34, 48, 40, 62, 55, 78, 70, 92].map((h, i) => (
                    <span key={i} className="flex-1 rounded-t bg-gradient-to-t from-brand-500 to-[#ff69b8]" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-2xl bg-gradient-to-r from-brand-50 to-[#f3ebff] px-3 py-2.5">
              <Eye className="size-4 text-brand-500" />
              <span className="text-[9px] font-bold text-ink-soft">Her yanıt &quot;AI İkizi&quot; etiketiyle gösterilir; dilediğin an duraklatabilirsin.</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── 06 · Gelir modeli ──────────────────────────────────── */
export function RevenueSection({ creatorPercent }: { creatorPercent: number }) {
  const streams = [
    { i: Crown, t: "Abonelikler", d: "Temel, Premium ve VIP üyeliklerle düzenli aylık gelir.", chips: ["Temel", "Premium", "VIP"] },
    { i: MessageCircle, t: "Mesaj başına ödeme", d: "Kredilerle esnek, kullandıkça öde sohbetler.", chips: ["Kredi paketleri", "Günlük ücretsiz hak"] },
    { i: Lock, t: "Premium içerik", d: "Fotoğraf, video, koleksiyon ve rehberlerin tekil satışı.", chips: ["Tekil satış", "Abonelere özel"] },
    { i: Mic, t: "Sesli ve görüntülü", d: "Creator'ın açtığı, dakika bazlı sesli ve görüntülü AI ikizi görüşmeleri.", chips: ["Sesli görüşme", "Görüntülü görüşme"] },
    { i: Gift, t: "Hediye ve özel deneyim", d: "Hediyeler, bahşişler ve kişiye özel içerik talepleri.", chips: ["Hediye", "Bahşiş", "Özel talep"] },
  ];
  const deg = Math.round((creatorPercent / 100) * 360);
  return (
    <section className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <SectionHead n="06" eyebrow="Gelir modeli" title="Birden fazla gelir akışı," accent="tek bir platformda." text="Creator'lar, hayranlar ve platform için değer üreten çeşitlendirilmiş bir model: her kazanç kalemi şeffaf biçimde creator panelinde görünür." align="split" />
      <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {streams.map((s, i) => (
            <li key={s.t} className="flex flex-col rounded-[22px] border border-line bg-white p-5 transition hover:border-brand-200 hover:shadow-[0_24px_50px_-30px_rgba(236,0,136,0.5)]">
              <div className="flex items-center gap-2.5">
                <StepNo n={i + 1} className="size-8 text-xs" />
                <s.i className="size-5 text-brand-500" />
              </div>
              <h3 className="mt-4 text-[15px] font-extrabold text-ink">{s.t}</h3>
              <p className="mt-1.5 flex-1 text-[12px] leading-relaxed text-muted-strong">{s.d}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {s.chips.map((c) => (
                  <span key={c} className="rounded-full bg-brand-50 px-2.5 py-1 text-[10px] font-bold text-brand-700">
                    {c}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>
        <div className="flex flex-col justify-between rounded-[22px] bg-gradient-to-br from-[#2b0f2f] via-[#5b1044] to-[#8d1666] p-6 text-white">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/60">Gelir paylaşımı</p>
            <div className="mt-5 flex items-center gap-5">
              <div className="relative grid size-[116px] shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(#ff69b8 0deg ${deg}deg, rgba(255,255,255,0.18) ${deg}deg 360deg)` }} aria-hidden>
                <span className="grid size-[84px] place-items-center rounded-full bg-[#3d0f37] text-center">
                  <span className="font-display text-[26px] font-extrabold leading-none">%{creatorPercent}</span>
                </span>
              </div>
              <p className="text-[13px] leading-relaxed text-white/85">
                Net gelirin <strong className="text-white">%{creatorPercent}&apos;i creator&apos;a</strong>, kalan kısmı platform geliştirme, altyapı, ödeme işlemleri ve güvenliğe ayrılır.
              </p>
            </div>
          </div>
          <ul className="mt-6 space-y-2.5">
            {[
              { i: Scale, t: "Şeffaf ve adil hesaplama" },
              { i: Wallet, t: "Hak edişler panelde anlık" },
              { i: ShieldCheck, t: "Güvenli ödeme altyapısı" },
            ].map((b) => (
              <li key={b.t} className="flex items-center gap-2.5 text-[13px] font-bold">
                <b.i className="size-4 text-[#ff69b8]" /> {b.t}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ─── 07 · Karşılaştırma ─────────────────────────────────── */
type Mark = "yes" | "no" | "partial";
const COMPARE: { feature: string; icon: typeof Users; heyfans: string; cols: [Mark, string][] }[] = [
  { feature: "Gerçek, doğrulanmış creator'lar", icon: UserCheck, heyfans: "Kimliği doğrulanmış gerçek creator'lar", cols: [["yes", "Gerçek creator'lar"], ["no", "Kurgusal karakterler"], ["yes", "Gerçek kişiler"]] },
  { feature: "Creator'ın yetkili AI ikizi", icon: Sparkles, heyfans: "Creator'ın açık izniyle, onaylı ikiz", cols: [["no", "Yok"], ["partial", "Kurgusal AI karakterleri"], ["no", "Yok"]] },
  { feature: "Etkileşimli sohbet", icon: MessageCircle, heyfans: "Kişisel, 7/24, çok yönlü sohbet", cols: [["partial", "Mesajlaşmayla sınırlı"], ["yes", "AI sohbet"], ["partial", "Tek yönlü içerik"]] },
  { feature: "Premium ve özel deneyimler", icon: Crown, heyfans: "Abonelik, tekil içerik, özel talep", cols: [["yes", "Abonelik ve tekil satış"], ["partial", "Sınırlı"], ["partial", "Sınırlı seçenek"]] },
  { feature: "Çoklu gelir modeli", icon: Wallet, heyfans: "Creator ve platform için çoklu akış", cols: [["partial", "Çoğunlukla abonelik"], ["partial", "Abonelik"], ["partial", "Marka iş birlikleri"]] },
  { feature: "Creator kontrolü ve güvenlik", icon: ShieldCheck, heyfans: "AI davranışı, içerik ve fiyat üzerinde tam kontrol", cols: [["partial", "Kısmi kontrol"], ["no", "Creator kontrolü yok"], ["partial", "Kısmi kontrol"]] },
  { feature: "Mevcut sosyal kitleyi taşıma", icon: Users, heyfans: "Instagram, TikTok, YouTube, X kitlesi", cols: [["partial", "Kısmen"], ["no", "Yok"], ["yes", "Kendi platformunda"]] },
];
const COLS = ["Geleneksel creator platformları", "AI arkadaş uygulamaları", "Sosyal medya"];

function MarkIcon({ m }: { m: Mark }) {
  if (m === "yes")
    return (
      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-success-soft text-success">
        <Check className="size-3" strokeWidth={3.5} />
      </span>
    );
  if (m === "no")
    return (
      <span className="grid size-5 shrink-0 place-items-center rounded-full bg-danger-soft text-danger">
        <X className="size-3" strokeWidth={3.5} />
      </span>
    );
  return (
    <span className="grid size-5 shrink-0 place-items-center rounded-full bg-warning-soft text-warning">
      <Minus className="size-3" strokeWidth={3.5} />
    </span>
  );
}

export function CompareSection({ people }: { people: Person[] }) {
  return (
    <section className="bg-[linear-gradient(180deg,#ffffff_0%,#fff5fa_100%)] py-16 lg:py-20">
      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8">
        <SectionHead n="07" eyebrow="Neden HEYFANS" title="Gerçek creator'lar, yetkili AI ikizleri" accent="ve tamamen etkileşimli deneyimler." text="Creator ekonomisinin ve yapay zekânın en iyi yanlarını; gerçek creator'lara, özgün deneyimlere ve tam kontrole odaklanarak bir araya getiriyoruz." align="split" />
        <div className="overflow-x-auto rounded-[24px] border border-line bg-white shadow-[0_30px_60px_-40px_rgba(43,10,40,0.35)]">
          <table className="w-full min-w-[860px] border-collapse text-start">
            <caption className="sr-only">HEYFANS ve diğer platform türlerinin karşılaştırması</caption>
            <thead>
              <tr className="text-[12px]">
                <th scope="col" className="w-[22%] p-4 font-extrabold text-muted">
                  Özellik
                </th>
                <th scope="col" className="w-[24%] bg-gradient-to-b from-brand-50 to-white p-4">
                  <span className="flex items-center gap-2 font-display text-[15px] font-extrabold text-brand-600">
                    <LogoMark className="h-6" /> HEYFANS
                  </span>
                </th>
                {COLS.map((c) => (
                  <th key={c} scope="col" className="p-4 text-[12px] font-extrabold text-ink-soft">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPARE.map((r) => (
                <tr key={r.feature} className="border-t border-line text-[12px]">
                  <th scope="row" className="p-4 font-extrabold text-ink">
                    <span className="flex items-center gap-2.5">
                      <r.icon className="size-4 shrink-0 text-brand-500" /> {r.feature}
                    </span>
                  </th>
                  <td className="bg-brand-50/50 p-4">
                    <span className="flex items-center gap-2 font-bold text-ink">
                      <MarkIcon m="yes" /> {r.heyfans}
                    </span>
                  </td>
                  {r.cols.map(([m, t], i) => (
                    <td key={i} className="p-4 text-muted-strong">
                      <span className="flex items-center gap-2">
                        <MarkIcon m={m} /> {t}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { t: "Gerçek insanlar.", a: "Gerçek bağlantı.", d: "Hayranlar tanıdıkları ve sevdikleri creator'ların AI ikizleriyle etkileşir.", img: pick(people, 0) },
            { t: "Gerçekten etkileşimli.", a: "Gerçekten kişisel.", d: "Metin, ses ve görsellerle sürükleyici, kişisel sohbetler.", img: pick(people, 6) },
            { t: "İçerikten fazlası.", a: "Özgün deneyimler.", d: "Kişisel sohbetlerden özel isteklere kadar benzersiz anlar.", img: pick(people, 8) },
            { t: "Kazanmanın", a: "daha çok yolu.", d: "Çoklu gelir modeli creator'lar için daha sürdürülebilir bir büyüme sunar.", img: pick(people, 3) },
            { t: "Tam creator", a: "kontrolü.", d: "Kişilik, içerik, sınırlar ve fiyatlar creator'ın elindedir.", img: pick(people, 5) },
          ].map((c) => (
            <li key={c.t} className="overflow-hidden rounded-[22px] bg-white ring-1 ring-line">
              <div className="h-28 overflow-hidden" aria-hidden>
                <CreatorPhoto src={c.img?.coverUrl ?? c.img?.avatarUrl} name="HEYFANS" rounded="rounded-none" showMonogram={false} />
              </div>
              <div className="p-4">
                <p className="font-display text-[16px] font-extrabold leading-tight tracking-tight text-ink">
                  {c.t} <span className="text-brand-500">{c.a}</span>
                </p>
                <p className="mt-1.5 text-[12px] leading-relaxed text-muted-strong">{c.d}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ─── 08 · Güven ve güvenlik ─────────────────────────────── */
export function TrustSection() {
  const pillars = [
    { i: BadgeCheck, t: "Doğrulanmış creator'lar", d: "Resmî AI ikizini yalnız doğrulanmış creator'lar oluşturabilir.", items: ["Kimlik doğrulama", "Sosyal hesap sahipliği", "18+ yaş şartı", "Resmî AI ikizi yetkisi"] },
    { i: Sparkles, t: "Açık AI bildirimi", d: "Hayranlar her zaman bir AI ikiziyle konuştuğunu bilir.", items: ["Her yanıtta AI etiketi", "Sohbet başında bilgilendirme", "İnsan olduğunu iddia etmez", "Şeffaf deneyim"] },
    { i: SlidersHorizontal, t: "Creator rızası ve kontrolü", d: "AI ikizinin neyi yapıp neyi yapamayacağına creator karar verir.", items: ["Ayrıntılı izin ayarları", "İçerik ve konu sınırları", "İkizi dilediğinde duraklatma", "Benzerlik üzerinde tam kontrol"] },
    { i: Eye, t: "İçerik moderasyonu", d: "Otomatik güvenlik filtreleri ve insan incelemesi birlikte çalışır.", items: ["Otomatik güvenlik taraması", "İnsan incelemesi ve itiraz", "Politika uygulaması", "Kriz anında yönlendirme"] },
    { i: Lock, t: "Hayran gizliliği ve güvenliği", d: "Kişisel veriler ve sohbetler korunur.", items: ["Şifreli bağlantı (HTTPS)", "Hassas verilerde şifreleme", "Kişisel veriler satılmaz", "Güvenli ödeme altyapısı"] },
    { i: Scale, t: "Hukuki ve etik uyum", d: "Yerel mevzuata ve etik yapay zekâ ilkelerine bağlıyız.", items: ["18+ erişim kısıtlaması", "KVKK ve GDPR ilkeleri", "Etik yapay zekâ kuralları", "Creator fikri hakları"] },
  ];
  return (
    <section className="mx-auto max-w-[1440px] px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <SectionHead n="08" eyebrow="Güven ve güvenlik" title="Gerçek creator'lar. Gerçek rıza." accent="Gerçek kontrol." text="HEYFANS; güven, rıza ve şeffaflık üzerine kurulu. Creator'ları, hayranları ve platformun uzun vadeli geleceğini korur." align="split" />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {pillars.map((p, i) => (
          <li key={p.t} className="flex flex-col rounded-[22px] border border-line bg-white p-5">
            <div className="flex items-center gap-2.5">
              <StepNo n={i + 1} className="size-8 text-xs" />
              <span className="grid size-9 place-items-center rounded-xl bg-brand-50 text-brand-500">
                <p.i className="size-[18px]" />
              </span>
            </div>
            <h3 className="mt-4 text-[15px] font-extrabold text-ink">{p.t}</h3>
            <p className="mt-1.5 text-[12px] leading-relaxed text-muted-strong">{p.d}</p>
            <ul className="mt-4 space-y-1.5 border-t border-line pt-3.5">
              {p.items.map((it) => (
                <li key={it} className="flex items-start gap-2 text-[11.5px] text-ink-soft">
                  <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded bg-brand-500 text-white">
                    <Check className="size-2.5" strokeWidth={3.5} />
                  </span>
                  {it}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
      <div className="mt-6 grid overflow-hidden rounded-[24px] border border-line bg-white lg:grid-cols-[1.1fr_2fr]">
        <div className="relative flex items-center gap-4 bg-gradient-to-r from-brand-500 to-[#a1007c] px-6 py-6 text-white [clip-path:polygon(0_0,94%_0,100%_50%,94%_100%,0_100%)] lg:pe-14">
          <ShieldCheck className="size-10 shrink-0" />
          <div>
            <p className="font-display text-[20px] font-extrabold">Taahhüdümüz</p>
            <p className="text-[13px] text-white/85">Creator&apos;lar ve hayranlar için bugün ve yarın güvenli, etik ve şeffaf bir platform.</p>
          </div>
        </div>
        <ul className="grid grid-cols-2 gap-4 px-6 py-5 sm:grid-cols-5">
          {[
            { i: Users, t: "Creator'ları korumak" },
            { i: Heart, t: "Hayranlara saygı" },
            { i: Lock, t: "Şeffaflık" },
            { i: ShieldCheck, t: "Güvenli topluluk" },
            { i: Globe2, t: "Uzun vadeli güven" },
          ].map((c) => (
            <li key={c.t} className="flex items-center gap-2 text-[12px] font-extrabold text-ink">
              <c.i className="size-6 shrink-0 text-brand-500" /> {c.t}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ─── 09 · Kapanış çağrısı ───────────────────────────────── */
export function FinalCta({ people, title, text }: { people: Person[]; title: string; text?: string | null }) {
  return (
    <section className="mx-auto max-w-[1440px] px-4 pb-16 sm:px-6 lg:px-8">
      <div className="relative overflow-hidden rounded-[32px] bg-gradient-to-br from-[#2b0f2f] via-[#6b0f52] to-brand-500 px-6 py-12 text-white sm:px-12 lg:py-16">
        <div aria-hidden className="pointer-events-none absolute -end-24 -top-24 size-[380px] rounded-full bg-[#ff69b8]/30 blur-[100px]" />
        <div className="relative grid items-center gap-10 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <h2 className="font-display text-[34px] font-extrabold leading-[1.02] tracking-[-0.045em] sm:text-[48px]">{title}</h2>
            {text && <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-white/80">{text}</p>}
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/register" className="inline-flex h-[52px] items-center gap-2 rounded-full bg-white px-7 text-sm font-extrabold text-brand-600 shadow-lg hover:bg-brand-50">
                Hayran olarak katıl <ArrowRight className="rtl:-scale-x-100 size-4" />
              </Link>
              <Link href="/register?intent=creator" className="inline-flex h-[52px] items-center gap-2 rounded-full border border-white/40 px-7 text-sm font-extrabold text-white hover:bg-white/10">
                <Crown className="size-4" /> Creator olarak başvur
              </Link>
            </div>
          </div>
          <div className="relative hidden h-[260px] lg:block" aria-hidden>
            {[0, 1, 2, 3].map((i) => {
              const p = pick(people, i + 2);
              const pos = ["start-[4%] top-[10%] rotate-[-8deg]", "start-[28%] top-0 rotate-[4deg] z-10", "start-[54%] top-[14%] rotate-[-3deg]", "start-[76%] top-[4%] rotate-[7deg]"][i];
              return (
                <div key={i} className={cn("absolute h-[200px] w-[150px] overflow-hidden rounded-[22px] border-4 border-white/80 shadow-2xl", pos)}>
                  <CreatorPhoto src={p?.avatarUrl ?? p?.coverUrl} name={p?.displayName ?? "Creator"} rounded="rounded-none" showMonogram={false} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─── Yardımcılar ────────────────────────────────────────── */
export const heroIcons = {
  users: <Users />,
  chat: <MessageCircle />,
  creators: <Star />,
  grid: <BrainCircuit />,
  device: <MonitorSmartphone />,
};
export const compactStat = (n: number) => `${formatCompact(n)}+`;
