import * as React from "react";
import Link from "next/link";
import Form from "next/form";
import { AlertTriangle, Info, Search, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/form-controls";
import { Progress, PageHeader } from "@/components/ui/display";
import { cn } from "@/lib/utils";
import type { Tone } from "./labels";

/** Sorgu dizgisi kurar; boş / null değerleri atlar. */
export function href(base: string, params: Record<string, string | number | boolean | null | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v === null || v === undefined || v === "" || v === false) continue;
    sp.set(k, String(v));
  }
  const qs = sp.toString();
  return qs ? `${base}?${qs}` : base;
}

/** Her admin sayfasının ortak iskeleti: üst başlık + içerik. */
export function AdminPage({
  title,
  description,
  actions,
  children,
  eyebrow = "PLATFORM YÖNETİMİ",
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  eyebrow?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-[1480px]">
      <PageHeader eyebrow={eyebrow} title={title} description={description} actions={actions} />
      <div className="grid gap-5">{children}</div>
    </div>
  );
}

export function KpiGrid({ children, cols = 4 }: { children: React.ReactNode; cols?: 3 | 4 | 5 }) {
  return <div className={cn("grid gap-3.5 sm:grid-cols-2", cols === 4 && "xl:grid-cols-4", cols === 3 && "xl:grid-cols-3", cols === 5 && "xl:grid-cols-5")}>{children}</div>;
}

/** Liste + sağ detay paneli yerleşimi (mobilde üst üste). */
export function SplitLayout({ main, panel }: { main: React.ReactNode; panel?: React.ReactNode }) {
  return (
    <div className={cn("grid items-start gap-5", panel && "xl:grid-cols-[minmax(0,1fr)_380px]")}>
      <div className="min-w-0">{main}</div>
      {panel && <aside className="min-w-0 xl:sticky xl:top-24">{panel}</aside>}
    </div>
  );
}

export function StatusPill({ tone = "gray", children, size = "md", className }: { tone?: Tone; children: React.ReactNode; size?: "sm" | "md" | "lg"; className?: string }) {
  return (
    <Badge tone={tone} size={size} className={className}>
      {children}
    </Badge>
  );
}

export interface TabItem {
  key: string;
  label: string;
  count?: number | null;
  href: string;
}
/** URL tabanlı hap sekmeleri (JS gerektirmez). */
export function TabLinks({ tabs, active, label = "Sekmeler", className }: { tabs: TabItem[]; active: string; label?: string; className?: string }) {
  return (
    <nav aria-label={label} className={cn("no-scrollbar -mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1", className)}>
      {tabs.map((t) => {
        const on = t.key === active;
        return (
          <Link
            key={t.key}
            href={t.href}
            scroll={false}
            aria-current={on ? "page" : undefined}
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-[10px] px-3.5 py-2.5 text-[11px] font-extrabold transition-colors",
              on ? "bg-brand-500 text-white" : "bg-soft text-muted-strong hover:text-ink",
            )}
          >
            {t.label}
            {t.count !== undefined && t.count !== null && <span className={cn("rounded-full px-1.5 text-[9px]", on ? "bg-white/25" : "bg-white text-muted-strong")}>{t.count}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

export interface FilterSelect {
  name: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
}
/** GET tabanlı arama / filtre çubuğu. Diğer parametreler gizli alanlarla korunur. */
export function FilterForm({
  action,
  q,
  qName = "q",
  placeholder = "Ara...",
  selects = [],
  hidden = {},
  clearHref,
}: {
  action: string;
  q?: string;
  qName?: string;
  placeholder?: string;
  selects?: FilterSelect[];
  hidden?: Record<string, string | null | undefined>;
  clearHref?: string;
}) {
  const active = Boolean(q) || selects.some((s) => s.value && s.value !== "all");
  return (
    <Form action={action} role="search" className="mb-4 flex flex-wrap items-end gap-2.5">
      {Object.entries(hidden).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      <div className="min-w-[220px] flex-1">
        <label htmlFor={`f-${qName}`} className="sr-only">
          {placeholder}
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            id={`f-${qName}`}
            name={qName}
            defaultValue={q ?? ""}
            placeholder={placeholder}
            maxLength={100}
            className="h-10 w-full rounded-[10px] border border-line bg-white pl-10 pr-3 text-[12px] text-ink placeholder:text-[#b2a6b3] focus:border-brand-300 focus:outline-none focus:ring-4 focus:ring-brand-100"
          />
        </div>
      </div>
      {selects.map((s) => (
        <div key={s.name}>
          <label htmlFor={`f-${s.name}`} className="sr-only">
            {s.label}
          </label>
          <NativeSelect id={`f-${s.name}`} name={s.name} defaultValue={s.value} className="h-10 min-w-[150px] text-[12px]" aria-label={s.label}>
            {s.options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </NativeSelect>
        </div>
      ))}
      <Button type="submit" size="md" variant="secondary">
        Filtrele
      </Button>
      {active && clearHref && (
        <Link href={clearHref} className="text-[11px] font-extrabold text-brand-500 hover:underline">
          Temizle
        </Link>
      )}
    </Form>
  );
}

export function DetailRow({ label, children, className }: { label: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between gap-3 border-b border-line-soft py-2.5 text-xs last:border-0", className)}>
      <span className="text-muted">{label}</span>
      <span className="min-w-0 text-right font-bold text-ink">{children}</span>
    </div>
  );
}

export function ScoreBar({ label, value, hint, tone = "pink" }: { label: string; value: number | null; hint?: React.ReactNode; tone?: "pink" | "green" | "violet" | "orange" | "teal" }) {
  return (
    <div className="mb-3.5 last:mb-0">
      <div className="mb-1.5 flex items-center justify-between gap-3 text-[11px]">
        <b className="text-ink">{label}</b>
        <span className="text-muted">
          {hint} <b className="text-ink">{value === null ? "—" : `%${Math.round(value)}`}</b>
        </span>
      </div>
      <Progress value={value ?? 0} tone={tone} label={label} />
    </div>
  );
}

const NOTICE_TONES = {
  info: "border-[#e3d4f7] bg-violet-soft text-[#4b21a8]",
  warn: "border-[#f9d9aa] bg-[#fff7e9] text-[#8a4a00]",
  danger: "border-[#f6c7cb] bg-danger-soft text-[#a1262c]",
  neutral: "border-line bg-soft text-muted-strong",
};
export function Notice({ tone = "info", icon, children, className, role }: { tone?: keyof typeof NOTICE_TONES; icon?: React.ReactNode; children: React.ReactNode; className?: string; role?: "alert" | "status" }) {
  const Default = tone === "danger" ? ShieldAlert : tone === "warn" ? AlertTriangle : Info;
  return (
    <div role={role} className={cn("flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-[11px] font-semibold leading-relaxed", NOTICE_TONES[tone], className)}>
      <span className="mt-0.5 shrink-0 [&_svg]:size-4">{icon ?? <Default />}</span>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** Ana sayfadaki "Yetkiniz yok" yönlendirmesi için. */
export function DeniedNotice() {
  return (
    <Notice tone="danger" role="alert">
      Bu bölüme erişim yetkiniz yok. Rolünüzün izinleri dışındaki sayfalar yönetim menüsünde gösterilmez.
    </Notice>
  );
}

export function Timeline({ items }: { items: { title: React.ReactNode; meta?: React.ReactNode; tone?: "pink" | "green" | "gray" | "danger" }[] }) {
  if (!items.length) return <p className="text-[11px] text-muted">Henüz kayıt yok.</p>;
  const dots = { pink: "bg-brand-500", green: "bg-success", gray: "bg-[#c9c1cc]", danger: "bg-danger" };
  return (
    <ol className="grid gap-3">
      {items.map((it, i) => (
        <li key={i} className="flex gap-3">
          <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", dots[it.tone ?? "pink"])} aria-hidden />
          <div className="min-w-0 text-xs">
            <div className="font-extrabold text-ink">{it.title}</div>
            {it.meta && <div className="mt-0.5 text-[11px] leading-relaxed text-muted">{it.meta}</div>}
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Tablo altı kayıt sayacı. */
export function ResultCount({ page, pageSize, total, noun = "kayıt" }: { page: number; pageSize: number; total: number; noun?: string }) {
  if (!total) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  return (
    <p className="mt-3 text-center text-[11px] text-muted">
      {from}–{to} / {total.toLocaleString("tr-TR")} {noun} gösteriliyor
    </p>
  );
}

/** Küçük meta satırı (etiket: değer). */
export function MiniStat({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl bg-soft px-3 py-2.5", className)}>
      <p className="text-[10px] font-bold text-muted">{label}</p>
      <p className="mt-0.5 text-sm font-black text-ink">{value}</p>
    </div>
  );
}
