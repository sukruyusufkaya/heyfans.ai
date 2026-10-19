"use client";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const PINK = "#ec0088";
export const CHART_COLORS = ["#ec0088", "#773cee", "#13a58d", "#e7a33d", "#ff6abc", "#60a5fa"];

const tooltipStyle = {
  contentStyle: { borderRadius: 12, border: "1px solid #eee8f0", boxShadow: "0 8px 24px rgba(25,16,34,.08)", fontSize: 11 },
  labelStyle: { fontWeight: 800, color: "#19111d" },
};

export interface Point {
  label: string;
  value: number;
  value2?: number;
}

export function AreaTrend({ data, height = 220, format, seriesLabel = "Değer", series2Label }: { data: Point[]; height?: number; format?: (v: number) => string; seriesLabel?: string; series2Label?: string }) {
  return (
    <div style={{ height }} className="w-full" role="img" aria-label={`${seriesLabel} grafiği`}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -14, bottom: 0 }}>
          <defs>
            <linearGradient id="hfArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={PINK} stopOpacity={0.28} />
              <stop offset="100%" stopColor={PINK} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#f3eef4" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9b929f" }} axisLine={false} tickLine={false} minTickGap={16} />
          <YAxis tick={{ fontSize: 10, fill: "#9b929f" }} axisLine={false} tickLine={false} tickFormatter={format} width={56} />
          <Tooltip {...tooltipStyle} formatter={(v) => [format ? format(Number(v)) : String(v), seriesLabel]} />
          <Area type="monotone" dataKey="value" name={seriesLabel} stroke={PINK} strokeWidth={2.4} fill="url(#hfArea)" dot={false} activeDot={{ r: 4 }} />
          {series2Label && <Area type="monotone" dataKey="value2" name={series2Label} stroke="#773cee" strokeWidth={2} fill="transparent" dot={false} />}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Bars({ data, height = 200, format, highlightLast = true, label = "Değer" }: { data: Point[]; height?: number; format?: (v: number) => string; highlightLast?: boolean; label?: string }) {
  return (
    <div style={{ height }} className="w-full" role="img" aria-label={`${label} çubuk grafiği`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, left: -14, bottom: 0 }}>
          <CartesianGrid stroke="#f3eef4" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#9b929f" }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 10, fill: "#9b929f" }} axisLine={false} tickLine={false} tickFormatter={format} width={56} />
          <Tooltip {...tooltipStyle} cursor={{ fill: "#fff0f9" }} formatter={(v) => [format ? format(Number(v)) : String(v), label]} />
          <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={28}>
            {data.map((_, i) => (
              <Cell key={i} fill={highlightLast && i === data.length - 1 ? PINK : "#f9a8d4"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function Donut({ data, height = 180, centerLabel, centerValue }: { data: { name: string; value: number }[]; height?: number; centerLabel?: string; centerValue?: string }) {
  const total = data.reduce((a, d) => a + d.value, 0);
  return (
    <div className="flex items-center gap-5">
      <div style={{ height, width: height }} className="relative shrink-0" role="img" aria-label={`Dağılım: ${data.map((d) => `${d.name} ${total ? Math.round((d.value / total) * 100) : 0}%`).join(", ")}`}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius="66%" outerRadius="96%" paddingAngle={2} stroke="none">
              {data.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-lg font-black tracking-tight">{centerValue ?? "%100"}</p>
            {centerLabel && <p className="text-[9px] text-muted">{centerLabel}</p>}
          </div>
        </div>
      </div>
      <ul className="grid flex-1 gap-2">
        {data.map((d, i) => (
          <li key={d.name} className="flex items-center gap-2 text-[11px]">
            <span className="size-2.5 rounded-full" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} aria-hidden />
            <span className="flex-1 text-muted-strong">{d.name}</span>
            <b className="font-extrabold">{total ? Math.round((d.value / total) * 100) : 0}%</b>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Sparkline({ data, height = 36, width = 110 }: { data: number[]; height?: number; width?: number }) {
  const points = data.map((v, i) => ({ i, v }));
  return (
    <div style={{ height, width }} aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points}>
          <Line type="monotone" dataKey="v" stroke={PINK} strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
