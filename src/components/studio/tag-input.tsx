"use client";
import { useId, useState } from "react";
import { X } from "lucide-react";
import { inputBase } from "@/components/ui/form-controls";
import { useLocale, useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

/** Etiket girişi: Enter veya virgül ile ekler, Backspace son etiketi siler. */
export function TagInput({
  value,
  onChange,
  placeholder,
  max = 20,
  maxLength = 60,
  id,
  label,
  disabled,
  className,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  max?: number;
  maxLength?: number;
  id?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
}) {
  const t = useT();
  const locale = useLocale();
  const auto = useId();
  const inputId = id ?? auto;
  const [draft, setDraft] = useState("");

  function commit(raw: string) {
    const parts = raw
      .split(",")
      .map((s) => s.trim().slice(0, maxLength))
      .filter(Boolean);
    if (!parts.length) return;
    const next = [...value];
    for (const p of parts) if (next.length < max && !next.some((x) => x.toLocaleLowerCase(locale) === p.toLocaleLowerCase(locale))) next.push(p);
    onChange(next);
    setDraft("");
  }

  return (
    <div className={cn(inputBase, "flex min-h-11 flex-wrap items-center gap-1.5 px-2.5 py-2", disabled && "bg-soft", className)}>
      {value.map((tag) => (
        <span key={tag} className="inline-flex max-w-full items-center gap-1 rounded-full bg-brand-100 py-1 ps-2.5 pe-1.5 text-[11px] font-bold text-brand-600">
          <span className="truncate">{tag}</span>
          {!disabled && (
            <button type="button" onClick={() => onChange(value.filter((x) => x !== tag))} className="grid size-4 place-items-center rounded-full hover:bg-brand-200" aria-label={t("{tag} etiketini kaldır", { tag })}>
              <X className="size-3" />
            </button>
          )}
        </span>
      ))}
      <input
        id={inputId}
        aria-label={label}
        value={draft}
        disabled={disabled || value.length >= max}
        placeholder={value.length >= max ? t("En fazla {max} öğe", { max }) : value.length ? "" : (placeholder ?? t("Yazıp Enter'a bas"))}
        maxLength={maxLength}
        onChange={(e) => {
          if (e.target.value.includes(",")) commit(e.target.value);
          else setDraft(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit(draft);
          } else if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
        }}
        onBlur={() => commit(draft)}
        className="min-w-[8ch] flex-1 bg-transparent py-1 text-[13px] outline-none placeholder:text-[#b2a6b3]"
      />
    </div>
  );
}
