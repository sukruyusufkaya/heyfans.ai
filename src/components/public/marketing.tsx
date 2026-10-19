import Link from "next/link";
import { ArrowRight, Heart, Lock, Send, Sparkles, Zap } from "lucide-react";
import { CreatorPhoto } from "@/components/creator/creator-photo";
import { AiTwinLabel } from "@/components/ui/badge";
import { cn, formatCompact } from "@/lib/utils";

/** Pembe degrade hero (tüm public sayfalarda ortak iskelet). */
export function PublicHero({
  badge,
  title,
  description,
  actions,
  stats,
  art,
  note,
  breadcrumb,
  compact,
}: {
  badge?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  stats?: React.ReactNode;
  art?: React.ReactNode;
  note?: string;
  breadcrumb?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <section className="hf-gradient-hero relative overflow-hidden border-b border-[#fbe3f1]">
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-40 size-[520px] rounded-full border-[70px] border-[#fbe3f1]/60" />
      <div className={cn("relative mx-auto grid max-w-[1440px] items-center gap-8 px-4 sm:px-6 lg:grid-cols-[1.05fr_1fr] lg:px-8", compact ? "py-10" : "py-10 lg:py-14")}>
        <div className="animate-fade-up">
          {breadcrumb}
          {badge && (
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-brand-150 bg-white/80 px-3.5 py-1.5 text-[11px] font-bold text-brand-600 shadow-sm">
              <Sparkles className="size-3.5" /> {badge}
            </span>
          )}
          <h1 className="font-display text-[34px] font-extrabold leading-[1.04] tracking-[-0.045em] text-ink sm:text-5xl xl:text-[56px]">{title}</h1>
          {description && <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-ink-soft sm:text-[17px]">{description}</p>}
          {actions && <div className="mt-7 flex flex-wrap gap-3">{actions}</div>}
          {stats && <div className="mt-8">{stats}</div>}
        </div>
        {art && (
          <div className="relative min-h-[260px] lg:min-h-[400px]">
            {note && (
              <p aria-hidden className="absolute -top-2 left-0 z-10 hidden max-w-[180px] -rotate-6 font-script text-2xl leading-tight text-brand-400 lg:block">
                {note} <Heart className="inline size-5" />
              </p>
            )}
            {art}
          </div>
        )}
      </div>
    </section>
  );
}

export function HeroStats({ items }: { items: { icon: React.ReactNode; value: string; label: string }[] }) {
  // Henüz oluşmamış sayılar (0) "0 içerik üreticisi" gibi gösterilmez; hiçbiri yoksa satır hiç çizilmez.
  const shown = items.filter((s) => s.value !== "0");
  if (!shown.length) return null;
  return (
    <div>
      <dl className="flex flex-wrap gap-x-7 gap-y-4">
        {shown.map((s, i) => (
          <div key={s.label} className={cn("flex items-center gap-3", i > 0 && "sm:border-l sm:border-brand-150 sm:pl-7")}>
            <span className="text-brand-500 [&_svg]:size-6">{s.icon}</span>
            <div>
              <dt className="sr-only">{s.label}</dt>
              <dd className="font-display text-xl font-extrabold tracking-tight text-ink">{s.value}</dd>
              <dd className="text-[11px] text-muted-strong">{s.label}</dd>
            </div>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function PrimaryCta({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link href={href} className={cn("inline-flex h-12 items-center gap-2 rounded-full bg-brand-500 px-7 text-sm font-extrabold text-white shadow-[var(--shadow-pink)] transition hover:bg-brand-600", className)}>
      {children} <ArrowRight className="size-4" />
    </Link>
  );
}

export function SecondaryCta({ href, children, icon }: { href: string; children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <Link href={href} className="inline-flex h-12 items-center gap-2.5 rounded-full border border-brand-150 bg-white px-6 text-sm font-extrabold text-brand-600 shadow-sm transition hover:border-brand-300">
      {icon && <span className="grid size-7 place-items-center rounded-full bg-brand-500 text-white [&_svg]:size-3.5">{icon}</span>}
      {children}
    </Link>
  );
}

/** Telefon içinde canlı görünümlü AI ikizi sohbet maketi (gerçek UI bileşenleriyle). */
export function PhoneChatMockup({ creatorName, avatarUrl, lines, className }: { creatorName: string; avatarUrl?: string | null; lines: { from: "ai" | "user"; text: string }[]; className?: string }) {
  return (
    <div className={cn("relative w-[250px] rounded-[38px] border-[7px] border-ink bg-white p-3 shadow-2xl", className)} aria-label="Sohbet ekranı önizlemesi">
      <div className="mx-auto mb-2 h-5 w-24 rounded-full bg-ink" aria-hidden />
      <div className="mb-3 flex items-center gap-2 border-b border-line pb-2.5">
        <div className="size-8 overflow-hidden rounded-full">
          <CreatorPhoto src={avatarUrl} name={creatorName} rounded="rounded-full" showMonogram={false} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[11px] font-extrabold">{creatorName}</p>
          <AiTwinLabel className="mt-0.5 !px-1.5 !py-0.5 !text-[7px]" />
        </div>
        <span className="flex items-center gap-1 text-[8px] font-bold text-success">
          <span className="size-1.5 rounded-full bg-success" /> Çevrimiçi
        </span>
      </div>
      <div className="flex flex-col gap-2">
        {lines.map((l, i) => (
          <p key={i} className={cn("max-w-[85%] rounded-2xl px-3 py-2 text-[10px] leading-snug", l.from === "ai" ? "self-start rounded-bl-sm bg-soft text-ink-soft" : "self-end rounded-br-sm bg-brand-500 text-white")}>
            {l.text}
          </p>
        ))}
        <div className="relative mt-1 grid h-20 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-[#3a2340] to-[#6b2a55] text-white">
          <span className="flex flex-col items-center gap-1 text-[9px] font-bold">
            <Lock className="size-4" /> Özel içeriği görmek için kilidi aç
          </span>
        </div>
      </div>
      <div className="mt-3 flex h-9 items-center gap-2 rounded-full border border-line bg-soft px-3 text-[9px] text-muted">
        Mesajını yaz…
        <span className="ml-auto grid size-6 place-items-center rounded-full bg-brand-500 text-white">
          <Send className="size-3" />
        </span>
      </div>
    </div>
  );
}

/** Eğik "polaroid" fotoğraf yığını. */
export function PolaroidStack({ people, caption }: { people: { name: string; image?: string | null }[]; caption?: string }) {
  const rot = ["rotate-[7deg]", "-rotate-[6deg]", "rotate-[3deg]"];
  return (
    <div className="relative h-full min-h-[300px]">
      {people.slice(0, 3).map((p, i) => (
        <figure
          key={p.name + i}
          className={cn(
            "absolute w-[42%] max-w-[190px] rounded-md bg-white p-2 pb-7 shadow-xl",
            rot[i],
            i === 0 && "right-[4%] top-[2%]",
            i === 1 && "right-[30%] top-[22%]",
            i === 2 && "right-[2%] top-[46%]",
          )}
        >
          <div className="aspect-[4/5] overflow-hidden rounded-sm">
            <CreatorPhoto src={p.image} name={p.name} rounded="rounded-sm" />
          </div>
          <figcaption className="mt-1.5 text-center font-script text-sm text-brand-400">{i === 2 && caption ? caption : p.name}</figcaption>
        </figure>
      ))}
    </div>
  );
}

/** Sayfa altı pembe çağrı bandı ("Şimdi HEYFANS topluluğuna katıl."). */
export function CtaBand({ title, text, href, label, className }: { title: React.ReactNode; text?: string; href: string; label: string; className?: string }) {
  return (
    <section className={cn("mx-auto max-w-[1440px] px-4 sm:px-6 lg:px-8", className)}>
      <div className="relative flex flex-col items-start gap-4 overflow-hidden rounded-2xl bg-gradient-to-r from-brand-500 via-[#f0109a] to-brand-600 px-6 py-6 text-white shadow-[var(--shadow-pink)] sm:flex-row sm:items-center sm:px-8">
        <Zap className="size-8 shrink-0 fill-white/20" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-display text-xl font-extrabold tracking-tight sm:text-2xl">{title}</p>
          {text && <p className="mt-1 text-sm text-white/85">{text}</p>}
        </div>
        <Link href={href} className="inline-flex h-11 shrink-0 items-center gap-2 rounded-full bg-white px-6 text-sm font-extrabold text-brand-600 shadow hover:bg-brand-50">
          {label} <ArrowRight className="size-4" />
        </Link>
      </div>
    </section>
  );
}

export function Section({ children, className, id }: { children: React.ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={cn("mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8", className)}>
      {children}
    </section>
  );
}

export function SeeAll({ href, label = "Tümünü Gör" }: { href: string; label?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-xs font-extrabold text-brand-500 hover:text-brand-600">
      {label} <ArrowRight className="size-3.5" />
    </Link>
  );
}

export const stat = (n: number, suffix = "+") => `${formatCompact(n)}${n > 0 ? suffix : ""}`;
