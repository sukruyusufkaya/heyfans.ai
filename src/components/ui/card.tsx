import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, padded = true, ...props }: React.HTMLAttributes<HTMLDivElement> & { padded?: boolean }) {
  return <div className={cn("hf-card min-w-0", padded && "p-5", className)} {...props} />;
}

export function CardHeader({
  title,
  hint,
  action,
  icon,
  className,
  as: Tag = "h2",
}: {
  title: React.ReactNode;
  hint?: React.ReactNode;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
  as?: "h2" | "h3";
}) {
  return (
    <div className={cn("mb-4 flex items-start justify-between gap-3", className)}>
      <div className="flex min-w-0 items-center gap-2.5">
        {icon && <span className="text-brand-500 [&_svg]:size-[18px]">{icon}</span>}
        <div className="min-w-0">
          <Tag className="text-[15px] font-extrabold tracking-[-0.02em] text-ink">{title}</Tag>
          {hint && <p className="mt-1 text-[11px] text-muted">{hint}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function SectionTitle({
  title,
  icon,
  action,
  subtitle,
  className,
}: {
  title: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  subtitle?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        <h2 className="flex items-center gap-2.5 text-xl font-extrabold tracking-[-0.03em] text-ink sm:text-[22px]">
          {icon && <span className="text-brand-500 [&_svg]:size-6">{icon}</span>}
          {title}
        </h2>
        {subtitle && <p className="mt-1 text-xs text-muted">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
