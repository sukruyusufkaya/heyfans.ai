import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

/** Destek/yasal sayfalarının ortak pembe başlığı (referans 66–74: eyebrow + iki tonlu başlık + açıklama). */
export function SupportHero({
  eyebrow,
  title,
  highlight,
  description,
  icon,
  children,
  className,
}: {
  eyebrow: string;
  title: string;
  highlight?: string;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("hf-gradient-hero relative overflow-hidden border-b border-[#fbe3f1]", className)}>
      <div aria-hidden className="pointer-events-none absolute -end-24 -top-44 size-[460px] rounded-full border-[60px] border-[#fbe3f1]/60" />
      <div className="relative mx-auto flex max-w-[1440px] items-center justify-between gap-8 px-4 py-9 sm:px-6 lg:px-8 lg:py-12">
        <div className="min-w-0 max-w-3xl animate-fade-up">
          <p className="eyebrow mb-3">{eyebrow}</p>
          <h1 className="font-display text-[32px] font-extrabold leading-[1.05] tracking-[-0.045em] text-ink sm:text-[44px]">
            {title}
            {highlight && <> <span className="text-brand-500">{highlight}</span></>}
          </h1>
          {description && <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-strong sm:text-[15px]">{description}</p>}
          {children && <div className="mt-6">{children}</div>}
        </div>
        {icon && (
          <span aria-hidden className="hidden size-24 shrink-0 place-items-center rounded-[28px] bg-white/70 text-brand-500 shadow-[var(--shadow-pink)] backdrop-blur md:grid [&_svg]:size-11">
            {icon}
          </span>
        )}
      </div>
    </section>
  );
}

export function Breadcrumbs({ items }: { items: { label: string; href?: string }[] }) {
  return (
    <nav aria-label="Sayfa yolu" className="mb-5 text-[11px] text-muted">
      <ol className="flex flex-wrap items-center gap-1.5">
        <li>
          <Link href="/" className="inline-flex items-center gap-1 hover:text-brand-600">
            <Home className="size-3" aria-hidden /> Ana Sayfa
          </Link>
        </li>
        {items.map((it, i) => (
          <li key={it.label} className="flex items-center gap-1.5">
            <ChevronRight className="rtl:-scale-x-100 size-3" aria-hidden />
            {it.href && i < items.length - 1 ? (
              <Link href={it.href} className="hover:text-brand-600">
                {it.label}
              </Link>
            ) : (
              <span aria-current="page" className="font-bold text-brand-600">
                {it.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function PageBody({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mx-auto max-w-[1440px] px-4 py-8 sm:px-6 lg:px-8 lg:py-10", className)}>{children}</div>;
}

export function InfoNotice({ children, tone = "pink", className }: { children: React.ReactNode; tone?: "pink" | "warn"; className?: string }) {
  return (
    <p
      role="note"
      className={cn(
        "rounded-xl border px-4 py-3 text-xs leading-relaxed",
        tone === "pink" ? "border-brand-200 bg-brand-50 text-brand-700" : "border-[#f9d9aa] bg-[#fff7e9] text-[#9a4f00]",
        className,
      )}
    >
      {children}
    </p>
  );
}
