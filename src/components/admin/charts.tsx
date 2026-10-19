"use client";
/** Sunucu bileşenlerinden fonksiyon geçirilemediği için biçimlendirmeli grafik sarmalayıcıları. */
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AreaTrend, Bars, type Point } from "@/components/charts/charts";
import { formatCompact, formatMoney, formatNumber } from "@/lib/utils";

const tooltipStyle = {
  contentStyle: { borderRadius: 12, border: "1px solid #eee8f0", boxShadow: "0 8px 24px rgba(25,16,34,.08)", fontSize: 11 },
  labelStyle: { fontWeight: 800, color: "#19111d" },
};

function formatCompactMoney(minor: number) {
  return `₺${formatCompact(minor / 100)}`;
}

/** `value` kuruş cinsindendir. Eksen kompakt (₺12 B), ipucu kutusu tam tutarı gösterir. */
export function MoneyBars({ data, height = 200, label = "Brüt hacim" }: { data: Point[]; height?: number; label?: string }) {
  return (
    <div style={{ height }} className="w-full" role="img" aria-label={`${label} çubuk grafiği`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#f3eef4" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9b929f" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "#9b929f" }} axisLine={false} tickLine={false} tickFormatter={formatCompactMoney} width={52} />
          <Tooltip {...tooltipStyle} cursor={{ fill: "#fff0f9" }} formatter={(v) => [formatMoney(Number(v)), label]} />
          <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={28}>
            {data.map((_, i) => (
              <Cell key={i} fill={i === data.length - 1 ? "#ec0088" : "#f9a8d4"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CountBars({ data, height = 200, label = "Adet" }: { data: Point[]; height?: number; label?: string }) {
  return <Bars data={data} height={height} label={label} format={(v) => formatNumber(v)} />;
}

export function CountArea({ data, height = 220, label = "Adet", label2 }: { data: Point[]; height?: number; label?: string; label2?: string }) {
  return <AreaTrend data={data} height={height} seriesLabel={label} series2Label={label2} format={(v) => formatCompact(v)} />;
}
