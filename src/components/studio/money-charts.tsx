"use client";
import { Bars, type Point } from "@/components/charts/charts";
import { useFormatters, useT } from "@/i18n/client";

/** Kuruş cinsinden değerleri ₺ olarak biçimleyen çubuk grafik (sunucu sayfalarından fonksiyon prop'u geçirilemediği için istemci sarmalayıcı). */
export function MoneyBars({ data, height = 220, label }: { data: Point[]; height?: number; label?: string }) {
  const t = useT();
  const { formatMoney } = useFormatters();
  return <Bars data={data} height={height} label={label ?? t("Tutar")} format={(v) => formatMoney(v, "TRY", { decimals: false })} />;
}
