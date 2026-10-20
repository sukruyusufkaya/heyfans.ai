import * as React from "react";
import { AlertTriangle, Info, ShieldCheck, TriangleAlert } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** Studio sayfaları için ortak üst başlık eyebrow'u. */
export const STUDIO_EYEBROW = "HEYFANS / CREATOR STUDIO"; // i18n-ignore (marka adı; tüm dillerde aynı)

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

/** Küçük etiket-değer çifti. */
export function Fact({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-[10px] font-bold text-muted">{label}</p>
      <p className="mt-0.5 truncate text-[13px] font-extrabold text-ink">{value}</p>
    </div>
  );
}

export { CheckItem, Meter, TwinStatusBadge } from "./studio-ui-client";
