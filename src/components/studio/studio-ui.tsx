import * as React from "react";
import { AlertTriangle, Info, ShieldCheck, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/display";
import { TWIN_STATUS_LABELS } from "@/lib/state-machines";
import type { TwinStatus } from "@/models/ai";
import { cn } from "@/lib/utils";

/** Studio sayfaları için ortak üst başlık eyebrow'u. */
export const STUDIO_EYEBROW = "HEYFANS / CREATOR STUDIO";

const NOTICE_TONES = {
  info: { box: "border-[#e6dcf7] bg-violet-soft/60 text-[#4b2fa0]", icon: Info },
  warn: { box: "border-[#f9d9aa] bg-[#fff7e9] text-[#8a5200]", icon: TriangleAlert },
  danger: { box: "border-[#f6c9cd] bg-danger-soft text-[#b3252b]", icon: AlertTriangle },
  safe: { box: "border-[#c9eedc] bg-success-soft text-[#0a7a56]", icon: ShieldCheck },
};

/** Dürüst durum / uyarı kutusu (yapılandırılmamış sağlayıcılar, gizlilik politikası, vb.). */
export function Notice({
  tone = "info",
  title,
  children,
  action,
  className,
  icon,
}: {
  tone?: keyof typeof NOTICE_TONES;
  title?: React.ReactNode;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}) {
  const t = NOTICE_TONES[tone];
  const Icon = t.icon;
  return (
    <div role={tone === "danger" || tone === "warn" ? "note" : undefined} className={cn("flex gap-3 rounded-2xl border p-4 text-xs leading-relaxed", t.box, className)}>
      <span className="mt-0.5 shrink-0 [&_svg]:size-4">{icon ?? <Icon aria-hidden />}</span>
      <div className="min-w-0 flex-1">
        {title && <p className="mb-0.5 text-[12px] font-extrabold">{title}</p>}
        {children && <div className="opacity-90">{children}</div>}
        {action && <div className="mt-2.5">{action}</div>}
      </div>
    </div>
  );
}

const TWIN_TONES: Record<TwinStatus, React.ComponentProps<typeof Badge>["tone"]> = {
  live: "green",
  paused: "warn",
  pending_review: "violet",
  approved: "teal",
  draft: "gray",
  rejected: "danger",
  revoked: "danger",
};
export function TwinStatusBadge({ status, size }: { status: TwinStatus; size?: "sm" | "md" | "lg" }) {
  return (
    <Badge tone={TWIN_TONES[status]} size={size} dot>
      {TWIN_STATUS_LABELS[status]}
    </Badge>
  );
}

/** Kart + başlık (Studio'da en sık kullanılan blok). */
export function Panel({
  title,
  hint,
  action,
  icon,
  className,
  children,
  id,
}: {
  title: React.ReactNode;
  hint?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
  id?: string;
}) {
  return (
    <Card id={id} className={className}>
      <CardHeader title={title} hint={hint} action={action} icon={icon} />
      {children}
    </Card>
  );
}

/** Başlık + açıklama solda, kontrol (anahtar vb.) sağda. */
export function SettingRow({ title, description, children, className, htmlFor }: { title: React.ReactNode; description?: React.ReactNode; children: React.ReactNode; className?: string; htmlFor?: string }) {
  return (
    <div className={cn("flex items-center justify-between gap-4 border-b border-line-soft py-3.5 last:border-0", className)}>
      <div className="min-w-0">
        <label htmlFor={htmlFor} className="block text-[13px] font-extrabold text-ink">
          {title}
        </label>
        {description && <p className="mt-0.5 text-[11px] leading-relaxed text-muted">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

/** Yüzdelik çubuk; değer yoksa dürüstçe "Henüz test edilmedi". */
export function Meter({ label, value, tone = "pink" }: { label: string; value: number | null | undefined; tone?: "pink" | "green" | "violet" | "teal" | "orange" }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-[11px]">
        <span className="font-semibold text-ink-soft">{label}</span>
        <b className="font-extrabold text-ink">{value == null ? <span className="font-semibold text-muted">Henüz test edilmedi</span> : `%${value}`}</b>
      </div>
      <Progress value={value ?? 0} tone={tone} label={label} className={value == null ? "opacity-40" : undefined} />
    </div>
  );
}

/** Küçük etiket-değer çifti. */
export function Fact({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-[10px] font-bold text-muted">{label}</p>
      <p className="mt-0.5 truncate text-[13px] font-extrabold text-ink">{value}</p>
    </div>
  );
}

/** Tek satır "adım" göstergesi (checklist öğesi). */
export function CheckItem({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-[12px]">
      <span className={cn("mt-0.5 grid size-4 shrink-0 place-items-center rounded-full text-[9px] font-black", ok ? "bg-success text-white" : "bg-line text-muted")} aria-hidden>
        {ok ? "✓" : "•"}
      </span>
      <span className={ok ? "text-ink-soft" : "text-muted"}>
        {children}
        <span className="sr-only">{ok ? " (tamamlandı)" : " (eksik)"}</span>
      </span>
    </li>
  );
}
