"use client";
import { AreaTrend, type Point } from "@/components/charts/charts";
import { formatCompact } from "@/lib/utils";

/** Sunucu bileşeninden fonksiyon prop'u geçilemediği için biçimleyiciyi istemci tarafında sabitleyen sarmalayıcı. */
export function TrendChart({ data, height = 190, seriesLabel = "Mesaj" }: { data: Point[]; height?: number; seriesLabel?: string }) {
  return <AreaTrend data={data} height={height} format={(v) => formatCompact(v)} seriesLabel={seriesLabel} />;
}
