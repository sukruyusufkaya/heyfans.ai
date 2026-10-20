"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import { ChevronDown, SlidersHorizontal, X } from "lucide-react";
import { CategoryIcon } from "@/components/creator/category-icon";
import { useT } from "@/i18n/client";
import { m } from "@/i18n/m";
import { cn } from "@/lib/utils";
import { exploreHref, type FilterValues } from "./explore-url";

const PRICES = [
  { value: "all", label: m("Tümü") },
  { value: "free", label: m("Ücretsiz") },
  { value: "0-100", label: m("0 - 100 TL") },
  { value: "100-300", label: m("100 - 300 TL") },
  { value: "300+", label: m("300 TL+") },
];

const rowClass = "flex cursor-pointer items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-xs text-ink-soft hover:bg-brand-50";

/**
 * Keşfet filtre paneli. Tüm durum URL'de: her değişiklikte yeni sorgu dizesine gidilir
 * (JavaScript yoksa form düz GET olarak gönderilir). Mobilde açılır panel, masaüstünde yapışkan kenar çubuğu.
 */
export function ExploreFilters({ categories, values, activeCount }: { categories: { slug: string; name: string; icon: string }[]; values: FilterValues; activeCount: number }) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const panelId = useId();

  // URL (ör. "Tümünü Temizle", geri tuşu) değişince yerel durumu sunucudan gelen değerlerle eşitle
  const serverKey = JSON.stringify(values);
  const [prevKey, setPrevKey] = useState(serverKey);
  const [s, setS] = useState(values);
  if (prevKey !== serverKey) {
    setPrevKey(serverKey);
    setS(values);
  }

  function update(patch: Partial<FilterValues>) {
    const next = { ...s, ...patch };
    setS(next);
    start(() => router.push(exploreHref(next), { scroll: false }));
  }

  return (
    <aside aria-label={t("Filtreler")} className="lg:sticky lg:top-24 lg:self-start">
      <button
        type="button"
        className="hf-card flex w-full items-center justify-between gap-3 px-4 py-3.5 text-sm font-extrabold lg:hidden"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="flex items-center gap-2">
          <SlidersHorizontal className="size-4 text-brand-500" aria-hidden /> {t("Filtreler")}
          {activeCount > 0 && <span className="grid size-5 place-items-center rounded-full bg-brand-500 text-[10px] font-black text-white">{activeCount}</span>}
        </span>
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      <form id={panelId} action="/explore" method="get" aria-busy={pending} className={cn("hf-card mt-3 p-4 lg:mt-0", open ? "block" : "hidden", "lg:block", pending && "opacity-80")}>
        <div className="mb-3 flex items-center justify-between">
          <p className="flex items-center gap-2 text-[15px] font-extrabold">
            <SlidersHorizontal className="size-4 text-brand-500" aria-hidden /> {t("Filtreler")}
          </p>
          {activeCount > 0 && (
            <Link href="/explore" className="inline-flex items-center gap-1 text-[11px] font-extrabold text-brand-500 hover:text-brand-600">
              <X className="size-3" aria-hidden /> {t("Tümünü Temizle")}
            </Link>
          )}
        </div>
        {s.q && <input type="hidden" name="q" value={s.q} />}
        {s.sort !== "popular" && <input type="hidden" name="sort" value={s.sort} />}

        <fieldset className="border-t border-line-soft pt-3">
          <legend className="mb-2 text-xs font-black text-ink">{t("Kategoriler")}</legend>
          <ul className="grid max-h-64 gap-0.5 overflow-y-auto pe-1 scrollbar-thin">
            {categories.map((c) => (
              <li key={c.slug}>
                <label className={rowClass}>
                  <input
                    type="checkbox"
                    name="c"
                    value={c.slug}
                    checked={s.categories.includes(c.slug)}
                    onChange={(e) => update({ categories: e.target.checked ? [...s.categories, c.slug] : s.categories.filter((x) => x !== c.slug) })}
                    className="size-4 shrink-0 accent-[#ec0088]"
                  />
                  <CategoryIcon name={c.icon} className="size-3.5 text-brand-500" />
                  {c.name}
                </label>
              </li>
            ))}
          </ul>
        </fieldset>

        <fieldset className="mt-3 border-t border-line-soft pt-3">
          <legend className="mb-2 text-xs font-black text-ink">{t("Abonelik Fiyatı")}</legend>
          <ul className="grid gap-0.5">
            {PRICES.map((p) => (
              <li key={p.value}>
                <label className={rowClass}>
                  <input type="radio" name="price" value={p.value} checked={s.price === p.value} onChange={() => update({ price: p.value })} className="size-4 shrink-0 accent-[#ec0088]" />
                  {t(p.label)}
                </label>
              </li>
            ))}
          </ul>
        </fieldset>

        <fieldset className="mt-3 border-t border-line-soft pt-3">
          <legend className="mb-2 text-xs font-black text-ink">{t("Durum")}</legend>
          <ul className="grid gap-0.5">
            <li>
              <label className={rowClass}>
                <input type="checkbox" name="online" value="1" checked={s.online} onChange={(e) => update({ online: e.target.checked })} className="size-4 shrink-0 accent-[#ec0088]" />
                <span className="size-2 rounded-full bg-success" aria-hidden /> {t("Şu anda çevrimiçi")}
              </label>
            </li>
            <li>
              <label className={rowClass}>
                <input type="checkbox" name="verified" value="1" checked={s.verified} onChange={(e) => update({ verified: e.target.checked })} className="size-4 shrink-0 accent-[#ec0088]" />
                <span className="size-2 rounded-full bg-brand-500" aria-hidden /> {t("Sadece doğrulanmış")}
              </label>
            </li>
          </ul>
        </fieldset>

        {/* JavaScript yoksa uygulama düğmesi; varsa değişiklikler anında uygulanır */}
        <noscript>
          <button type="submit" className="mt-4 h-10 w-full rounded-full bg-brand-500 text-xs font-extrabold text-white">
            {t("Filtreleri Uygula")}
          </button>
        </noscript>
      </form>
    </aside>
  );
}
