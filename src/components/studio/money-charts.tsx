"use client";
import { Bars, type Point } from "@/components/charts/charts";
import { formatMoney } from "@/lib/utils";

/** Kuruş cinsinden değerleri ₺ olarak biçimleyen çubuk grafik (sunucu sayfalarından fonksiyon prop'u geçirilemediği için istemci sarmalayıcı). */
export function MoneyBars({ data, height = 220, label = "Tutar" }: { data: Point[]; height?: number; label?: string }) {
  return <Bars data={data} height={height} label={label} format={(v) => formatMoney(v, "TRY", { decimals: false })} />;
}
