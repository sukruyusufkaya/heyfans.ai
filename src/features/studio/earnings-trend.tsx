"use client";
import { useState } from "react";
import { AreaTrend, type Point } from "@/components/charts/charts";
import { EmptyState } from "@/components/ui/display";
import { useFormatters, useT } from "@/i18n/client";
import { m } from "@/i18n/m";
import { cn } from "@/lib/utils";

const TABS = [
  { key: "total", label: m("Gelir") },
  { key: "chat", label: m("Sohbet") },
  { key: "subscription", label: m("Abonelik") },
] as const;
type Key = (typeof TABS)[number]["key"];

/** Son 30 günün kazanç serisi (creator payı); sekmeler kaynağa göre filtreler. */
export function EarningsTrend({ series, deltaLabel }: { series: Record<Key, Point[]>; deltaLabel?: React.ReactNode }) {
  const t = useT();
  const { formatMoney, formatCompact } = useFormatters();
  const [tab, setTab] = useState<Key>("total");
  const data = series[tab];
  const sum = data.reduce((a, p) => a + p.value, 0);
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold text-muted">{t("Son 30 gün toplam")}</p>
          <p className="mt-1 flex items-baseline gap-2 text-[28px] font-black tracking-[-0.04em] text-ink">
            {formatMoney(sum)}
            {deltaLabel}
          </p>
        </div>
        <div role="tablist" aria-label={t("Kazanç kaynağı")} className="flex gap-1.5">
          {TABS.map((tb) => (
            <button
              key={tb.key}
              role="tab"
              aria-selected={tab === tb.key}
              onClick={() => setTab(tb.key)}
              className={cn("rounded-full px-3.5 py-1.5 text-[11px] font-extrabold transition-colors", tab === tb.key ? "bg-brand-500 text-white" : "bg-soft text-muted-strong hover:text-ink")}
            >
              {t(tb.label)}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3">
        {sum === 0 ? (
          <EmptyState compact title={t("Bu kaynaktan henüz kazanç yok")} description={t("Hayranların abone oldukça, içerik satın aldıkça veya AI ikizinle sohbet ettikçe burada görünür.")} />
        ) : (
          <AreaTrend data={data} height={230} format={(v) => `₺${formatCompact(v / 100)}`} seriesLabel={t("Kazanç")} />
        )}
      </div>
    </div>
  );
}
