"use client";
import { AreaTrend, type Point } from "@/components/charts/charts";
import { useFormatters, useT } from "@/i18n/client";

/** Sunucu bileşeninden fonksiyon prop'u geçilemediği için biçimleyiciyi istemci tarafında sabitleyen sarmalayıcı. */
export function TrendChart({ data, height = 190, seriesLabel }: { data: Point[]; height?: number; seriesLabel?: string }) {
  const t = useT();
  const { formatCompact } = useFormatters();
  return <AreaTrend data={data} height={height} format={(v) => formatCompact(v)} seriesLabel={seriesLabel ?? t("Mesaj")} />;
}
