import Link from "next/link";
import { cn } from "@/lib/utils";

export interface LinkTabItem {
  href: string;
  label: React.ReactNode;
  active: boolean;
  count?: number | null;
}

/** Adres (searchParams) tabanlı hap sekmeler — sunucuda render edilir, JS gerektirmez. */
export function LinkTabs({ items, label, className }: { items: LinkTabItem[]; label: string; className?: string }) {
  return (
    <nav aria-label={label} className={cn("no-scrollbar flex items-center gap-2 overflow-x-auto", className)}>
      {items.map((t, i) => (
        <Link
          key={i}
          href={t.href}
          scroll={false}
          aria-current={t.active ? "page" : undefined}
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[10px] px-3.5 py-2.5 text-[11px] font-extrabold transition-colors",
            t.active ? "bg-brand-500 text-white" : "bg-soft text-muted-strong hover:text-ink",
          )}
        >
          {t.label}
          {t.count != null && (
            <span className={cn("rounded-full px-1.5 py-px text-[9px]", t.active ? "bg-white/25 text-white" : "bg-white text-muted-strong")}>{t.count}</span>
          )}
        </Link>
      ))}
    </nav>
  );
}

/** Aynı sayfada sorgu parametrelerini koruyarak adres üretir (boş/varsayılan değerler atılır). */
export function buildHref(path: string, params: Record<string, string | number | null | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v != null && v !== "") sp.set(k, String(v));
  const qs = sp.toString();
  return qs ? `${path}?${qs}` : path;
}

/** Next.js searchParams (string | string[] | undefined) → ilk değerli düz nesne (Zod'a verilmeden önce). */
export function flattenSearchParams(sp: Record<string, string | string[] | undefined>): Record<string, string | undefined> {
  return Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
}
