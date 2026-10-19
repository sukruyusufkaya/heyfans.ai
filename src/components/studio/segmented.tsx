"use client";
import { cn } from "@/lib/utils";

/** Hap biçimli tekli seçim (radiogroup). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  disabled,
  className,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("flex flex-wrap gap-2", className)}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            disabled={disabled}
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-full px-3.5 py-2 text-[11px] font-extrabold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
              on ? "bg-brand-500 text-white shadow-[var(--shadow-pink)]" : "bg-soft text-muted-strong hover:text-ink",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
