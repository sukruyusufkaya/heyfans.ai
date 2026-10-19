import * as React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Inbox, TrendingDown, TrendingUp } from "lucide-react";
import { cn, initials } from "@/lib/utils";

/* ─── Avatar ─────────────────────────────────────────────── */
const AVATAR_GRADIENTS = [
  "from-[#ff6abc] to-[#ec0088]",
  "from-[#a78bfa] to-[#773cee]",
  "from-[#fbbf24] to-[#f97316]",
  "from-[#34d399] to-[#13a58d]",
  "from-[#60a5fa] to-[#6366f1]",
  "from-[#f472b6] to-[#be185d]",
];

export function Avatar({
  src,
  name,
  size = 40,
  className,
  online,
  ring = true,
}: {
  src?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
  online?: boolean;
  ring?: boolean;
}) {
  const g = AVATAR_GRADIENTS[(name?.charCodeAt(0) ?? 0) % AVATAR_GRADIENTS.length];
  return (
    <span className={cn("relative inline-flex shrink-0", className)} style={{ width: size, height: size }}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={name ?? ""}
          width={size}
          height={size}
          loading="lazy"
          className={cn("size-full rounded-full object-cover", ring && "border-2 border-white shadow-[0_1px_6px_rgb(0_0_0/0.12)]")}
        />
      ) : (
        <span
          aria-label={name ?? undefined}
          className={cn(
            "grid size-full place-items-center rounded-full bg-gradient-to-br font-extrabold text-white",
            g,
            ring && "border-2 border-white shadow-[0_1px_6px_rgb(0_0_0/0.12)]",
          )}
          style={{ fontSize: Math.max(10, size * 0.36) }}
        >
          {initials(name)}
        </span>
      )}
      {online !== undefined && (
        <span
          className={cn("absolute bottom-0 right-0 rounded-full border-2 border-white", online ? "bg-success" : "bg-[#c9c1cc]")}
          style={{ width: Math.max(8, size * 0.24), height: Math.max(8, size * 0.24) }}
          aria-label={online ? "Çevrimiçi" : "Çevrimdışı"}
        />
      )}
    </span>
  );
}

/* ─── Progress ───────────────────────────────────────────── */
export function Progress({ value, className, tone = "pink", label }: { value: number; className?: string; tone?: "pink" | "green" | "violet" | "orange" | "teal"; label?: string }) {
  const colors = { pink: "from-brand-400 to-brand-500", green: "from-[#34d399] to-success", violet: "from-[#a78bfa] to-violet", orange: "from-[#fcd34d] to-orange", teal: "from-[#5eead4] to-teal" };
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-[#f3eaf2]", className)} role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={cn("h-full rounded-full bg-gradient-to-r transition-[width] duration-500", colors[tone])} style={{ width: `${v}%` }} />
    </div>
  );
}

/* ─── Skeleton ───────────────────────────────────────────── */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-[#f3eef4]", className)} aria-hidden />;
}

/* ─── Empty state ────────────────────────────────────────── */
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  compact,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center", compact ? "px-4 py-8" : "px-6 py-14", className)}>
      <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-brand-100 text-brand-500 [&_svg]:size-6">{icon ?? <Inbox />}</div>
      <p className="text-sm font-extrabold text-ink">{title}</p>
      {description && <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/* ─── KPI / Stat card (referans .kpi) ─────────────────────── */
const KPI_TONES = {
  pink: "bg-brand-100 text-brand-500",
  violet: "bg-violet-soft text-violet",
  teal: "bg-teal-soft text-teal",
  orange: "bg-orange-soft text-orange",
  green: "bg-success-soft text-success",
};
export function StatCard({
  label,
  value,
  icon,
  tone = "pink",
  delta,
  foot,
  className,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  tone?: keyof typeof KPI_TONES;
  delta?: { value: string; direction: "up" | "down" | "flat" } | null;
  foot?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("hf-card flex min-w-0 items-center gap-3.5 p-4", className)}>
      {icon && <span className={cn("grid size-11 shrink-0 place-items-center rounded-[13px] [&_svg]:size-5", KPI_TONES[tone])}>{icon}</span>}
      <div className="min-w-0">
        <p className="truncate text-[10px] font-bold text-muted">{label}</p>
        <p className="mt-1 truncate text-[22px] font-black tracking-[-0.03em] text-ink">{value}</p>
        {(delta || foot) && (
          <p className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-muted">
            {delta && delta.direction !== "flat" && (
              <span className={cn("inline-flex items-center gap-0.5 font-extrabold", delta.direction === "up" ? "text-success" : "text-danger")}>
                {delta.direction === "up" ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                {delta.value}
              </span>
            )}
            {foot}
          </p>
        )}
      </div>
    </div>
  );
}

/* ─── Page header (eyebrow + başlık + açıklama + eylemler) ── */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="text-[26px] font-black leading-[1.08] tracking-[-0.035em] text-ink sm:text-[30px]">{title}</h1>
        {description && <p className="mt-2 text-xs text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  );
}

/* ─── Pagination (URL tabanlı) ───────────────────────────── */
export function Pagination({ page, pageCount, hrefFor, className }: { page: number; pageCount: number; hrefFor: (p: number) => string; className?: string }) {
  if (pageCount <= 1) return null;
  const pages: number[] = [];
  for (let p = Math.max(1, page - 2); p <= Math.min(pageCount, page + 2); p++) pages.push(p);
  const item = "grid h-8 min-w-8 place-items-center rounded-lg px-2 text-[11px] font-extrabold";
  return (
    <nav aria-label="Sayfalama" className={cn("flex items-center justify-center gap-1.5", className)}>
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={cn(item, "text-muted-strong hover:bg-soft")} aria-label="Önceki sayfa">
          <ChevronLeft className="size-4" />
        </Link>
      ) : (
        <span className={cn(item, "text-muted/40")} aria-hidden>
          <ChevronLeft className="size-4" />
        </span>
      )}
      {pages.map((p) => (
        <Link key={p} href={hrefFor(p)} aria-current={p === page ? "page" : undefined} className={cn(item, p === page ? "bg-brand-500 text-white" : "text-muted-strong hover:bg-soft")}>
          {p}
        </Link>
      ))}
      {page < pageCount ? (
        <Link href={hrefFor(page + 1)} className={cn(item, "text-muted-strong hover:bg-soft")} aria-label="Sonraki sayfa">
          <ChevronRight className="size-4" />
        </Link>
      ) : (
        <span className={cn(item, "text-muted/40")} aria-hidden>
          <ChevronRight className="size-4" />
        </span>
      )}
    </nav>
  );
}

/* ─── Tablo (mobilde yatay kaydırma) ─────────────────────── */
export function DataTable({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("-mx-1 overflow-x-auto px-1 scrollbar-thin", className)}>
      <table className="w-full min-w-[640px] border-collapse text-left text-xs">{children}</table>
    </div>
  );
}
export function Th({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn("relative border-b border-line px-3 py-2.5 text-[10px] font-black uppercase tracking-wider text-muted", className)} {...props} />;
}
export function Td({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("border-b border-line-soft px-3 py-3 align-middle text-ink-soft", className)} {...props} />;
}
