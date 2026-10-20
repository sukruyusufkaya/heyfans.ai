import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-extrabold transition-all duration-150 disabled:pointer-events-none disabled:opacity-55 [&_svg]:size-4 [&_svg]:shrink-0 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500",
  {
    variants: {
      variant: {
        primary: "bg-brand-500 text-white shadow-[var(--shadow-pink)] hover:bg-brand-600",
        outline: "border border-brand-300 bg-white text-brand-600 hover:bg-brand-50",
        secondary: "border border-line bg-white text-ink-soft hover:border-brand-200 hover:text-ink",
        soft: "bg-brand-100 text-brand-600 hover:bg-brand-150",
        ghost: "text-muted-strong hover:bg-soft hover:text-ink",
        dark: "bg-ink text-white hover:bg-night",
        danger: "bg-danger text-white hover:brightness-95",
        "danger-soft": "bg-danger-soft text-danger hover:brightness-95",
        link: "h-auto px-0 text-brand-500 hover:underline underline-offset-4 shadow-none",
        white: "bg-white text-brand-600 shadow-sm hover:bg-brand-50",
      },
      size: {
        xs: "h-7 rounded-lg px-2.5 text-[10px]",
        sm: "h-9 rounded-[10px] px-3.5 text-[11px]",
        md: "h-10 rounded-[10px] px-4 text-xs",
        lg: "h-12 rounded-xl px-6 text-sm",
        xl: "h-14 rounded-2xl px-8 text-base",
        icon: "size-10 rounded-full p-0",
        "icon-sm": "size-8 rounded-full p-0",
      },
      shape: {
        default: "",
        pill: "rounded-full",
      },
    },
    defaultVariants: { variant: "primary", size: "md", shape: "default" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, shape, asChild = false, loading = false, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot.Root : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size, shape }), className)}
        disabled={asChild ? undefined : disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {asChild ? (
          children
        ) : (
          <>
            {loading && <Loader2 className="animate-spin" aria-hidden />}
            {children}
          </>
        )}
      </Comp>
    );
  },
);
Button.displayName = "Button"; // i18n-ignore
