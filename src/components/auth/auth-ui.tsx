import * as React from "react";
import Link from "next/link";
import { AlertCircle, ArrowRight, CheckCircle2, Info } from "lucide-react";
import { Button, buttonVariants, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Pembe küçük harf üstlük + büyük başlık (vurgulu kelime fuşya). */
export function AuthHeading({
  eyebrow,
  title,
  accent,
  description,
  center = false,
  as: Tag = "h1",
  className,
}: {
  eyebrow?: string;
  title: string;
  accent?: string;
  description?: React.ReactNode;
  center?: boolean;
  as?: "h1" | "h2";
  className?: string;
}) {
  return (
    <div className={cn(center && "text-center", className)}>
      {eyebrow && <p className="text-[11px] font-black uppercase tracking-[0.18em] text-brand-500">{eyebrow}</p>}
      <Tag className={cn("font-display text-[32px] font-extrabold leading-[1.06] tracking-[-0.035em] [word-spacing:0.07em] text-ink sm:text-[38px] lg:text-[40px]", eyebrow && "mt-2.5")}>
        {title}
        {accent && (
          <>
            {" "}
            <span className="text-brand-500">{accent}</span>
          </>
        )}
      </Tag>
      {description && <p className={cn("mt-3 text-[15px] leading-relaxed text-muted-strong", center && "mx-auto max-w-[360px]")}>{description}</p>}
    </div>
  );
}

/** Pembe yuvarlak köşeli simge kutusu (şifre / doğrulama başlıklarının üstünde). */
export function IconBadge({ children, badge, className }: { children: React.ReactNode; badge?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("relative mx-auto mb-5 grid size-[76px] place-items-center rounded-[22px] bg-brand-100 text-brand-500 [&>svg]:size-8", className)}>
      {children}
      {badge && <span className="absolute -bottom-1 -right-1 grid size-6 place-items-center rounded-full border-2 border-white bg-success text-white [&_svg]:size-3.5">{badge}</span>}
    </div>
  );
}

const ALERT_STYLE = {
  danger: { cls: "border-danger/25 bg-danger-soft text-danger", Icon: AlertCircle, role: "alert" as const },
  success: { cls: "border-success/25 bg-success-soft text-success", Icon: CheckCircle2, role: "status" as const },
  info: { cls: "border-brand-200 bg-brand-50 text-brand-700", Icon: Info, role: "status" as const },
  warn: { cls: "border-warning/25 bg-warning-soft text-warning", Icon: AlertCircle, role: "status" as const },
};

export function FormAlert({ tone = "danger", children, className, id }: { tone?: keyof typeof ALERT_STYLE; children: React.ReactNode; className?: string; id?: string }) {
  const { cls, Icon, role } = ALERT_STYLE[tone];
  return (
    <div id={id} role={role} className={cn("flex items-start gap-2.5 rounded-xl border px-3.5 py-3 text-[13px] font-semibold leading-snug", cls, className)}>
      <Icon className="mt-px size-4 shrink-0" aria-hidden />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** Tam genişlik pembe birincil düğme (54px, gölge, sağ ok). `outline`: ikincil, çerçeveli görünüm. */
export function PrimaryButton({ children, arrow = true, outline = false, className, ...props }: ButtonProps & { arrow?: boolean; outline?: boolean }) {
  return (
    <Button
      {...props}
      variant={outline ? "outline" : "primary"}
      className={cn("h-[54px] w-full rounded-[10px] text-[14px] font-extrabold", outline ? "shadow-none" : "bg-gradient-to-r from-brand-500 to-brand-600", className)}
    >
      {children}
      {arrow && !props.loading && <ArrowRight className="size-[18px]" aria-hidden />}
    </Button>
  );
}

/** Düğme görünümlü bağlantı (düğme içine bağlantı koymamak için). */
export function PrimaryLink({ href, children, arrow = true, outline = false, className }: { href: string; children: React.ReactNode; arrow?: boolean; outline?: boolean; className?: string }) {
  return (
    <Link
      href={href}
      className={cn(buttonVariants({ variant: outline ? "outline" : "primary" }), "h-[54px] w-full rounded-[10px] text-[14px] font-extrabold", outline ? "shadow-none" : "bg-gradient-to-r from-brand-500 to-brand-600", className)}
    >
      {children}
      {arrow && <ArrowRight className="size-[18px]" aria-hidden />}
    </Link>
  );
}

export function TextDivider({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 text-xs text-muted" role="separator">
      <span className="h-px flex-1 bg-line" aria-hidden />
      <span className="shrink-0">{children}</span>
      <span className="h-px flex-1 bg-line" aria-hidden />
    </div>
  );
}

/** Etiket (13px) + alan + hata/ipucu; hata `id="<htmlFor>-error"` ile alana bağlanır (aria-describedby). */
export function AuthField({
  label,
  htmlFor,
  error,
  hint,
  right,
  children,
  className,
}: {
  label: React.ReactNode;
  htmlFor: string;
  error?: string | null;
  hint?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <div className="mb-2 flex items-center justify-between gap-3">
        <label htmlFor={htmlFor} className="text-[13px] font-extrabold text-ink">
          {label}
        </label>
        {right}
      </div>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} role="alert" className="mt-1.5 text-xs font-semibold text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${htmlFor}-hint`} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Pembe bağlantı (form altı kısa bağlantılar). */
export const linkCls = "font-extrabold text-brand-500 hover:text-brand-600 hover:underline underline-offset-4";
