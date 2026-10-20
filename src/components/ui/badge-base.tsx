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
