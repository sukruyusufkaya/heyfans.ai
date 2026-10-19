import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const badgeVariants = cva(
  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-extrabold [&_svg]:size-3",
  {
    variants: {
      tone: {
        pink: "bg-brand-100 text-brand-600",
        solid: "bg-brand-500 text-white",
        green: "bg-success-soft text-success",
        warn: "bg-warning-soft text-warning",
        danger: "bg-danger-soft text-danger",
        violet: "bg-violet-soft text-violet",
        teal: "bg-teal-soft text-teal",
        gray: "bg-soft text-muted-strong",
        dark: "bg-ink text-white",
        white: "bg-white/90 text-ink backdrop-blur",
        outline: "border border-line bg-white text-muted-strong",
      },
      size: {
        sm: "px-2 py-1 text-[9px]",
        md: "px-2.5 py-1.5 text-[10px]",
        lg: "px-3 py-2 text-[11px]",
      },
    },
    defaultVariants: { tone: "pink", size: "md" },
  },
);

export function Badge({
  className,
  tone,
  size,
  dot,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants> & { dot?: boolean }) {
  return (
    <span className={cn(badgeVariants({ tone, size }), className)} {...props}>
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden />}
      {props.children}
    </span>
  );
}

/** "AI İkizi" etiketi — AI yanıtları/profilleri asla gerçek creator gibi görünmesin diye her yerde zorunlu. */
export function AiTwinLabel({ className, size = "sm" }: { className?: string; size?: "sm" | "md" }) {
  return (
    <Badge tone="violet" size={size} className={cn("uppercase tracking-wider", className)} title="Bu yanıtlar yapay zekâ tarafından üretilir">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden>
        <path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z" />
      </svg>
      AI İkizi
    </Badge>
  );
}

/** Platformun kurgusal örnek profilleri (gerçek kişi değil; satın alma kapalı). */
export function SampleProfileLabel({ className, size = "sm", tone = "warn" }: { className?: string; size?: "sm" | "md"; tone?: "warn" | "white" }) {
  return (
    <Badge tone={tone} size={size} className={cn("uppercase tracking-wider", className)} title="Platformun kurgusal örnek profili; gerçek bir kişi değildir ve satın alma kapalıdır">
      Örnek profil
    </Badge>
  );
}

export function OnlineDot({ online, className }: { online: boolean; className?: string }) {
  return (
    <span
      className={cn("inline-block size-2 rounded-full", online ? "bg-success" : "bg-muted/50", className)}
      aria-label={online ? "Çevrimiçi" : "Çevrimdışı"}
    />
  );
}
