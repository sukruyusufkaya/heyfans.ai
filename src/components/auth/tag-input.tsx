"use client";
import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { inputBase } from "@/components/ui/form-controls";

/** Enter veya virgülle etiket ekleyen alan (konu listeleri için). Etiketler silinebilir; klavye ile kullanılabilir. */
export function TagInput({
  id,
  value,
  onChange,
  max = 12,
  placeholder,
  tone = "pink",
  describedBy,
}: {
  id: string;
  value: string[];
  onChange: (v: string[]) => void;
  max?: number;
  placeholder?: string;
  tone?: "pink" | "danger";
  describedBy?: string;
}) {
  const [draft, setDraft] = React.useState("");

  function commit(raw: string) {
    const parts = raw
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p.length >= 2)
      .map((p) => p.slice(0, 40));
    if (!parts.length) {
      setDraft("");
      return;
    }
    const next = [...value];
    for (const p of parts) if (next.length < max && !next.some((n) => n.toLocaleLowerCase("tr-TR") === p.toLocaleLowerCase("tr-TR"))) next.push(p);
    onChange(next);
    setDraft("");
  }

  return (
    <div>
      <input
        id={id}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            commit(draft);
          } else if (e.key === "Backspace" && !draft && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
        onBlur={() => commit(draft)}
        disabled={value.length >= max}
        placeholder={value.length >= max ? `En fazla ${max} konu` : placeholder}
        aria-describedby={describedBy}
        className={cn(inputBase, "h-11")}
      />
      {value.length > 0 && (
        <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Eklenen konular">
          {value.map((t) => (
            <li key={t} className={cn("inline-flex items-center gap-1 rounded-full py-1 ps-3 pe-1.5 text-[11px] font-extrabold", tone === "pink" ? "bg-brand-100 text-brand-600" : "bg-danger-soft text-danger")}>
              {t}
              <button type="button" onClick={() => onChange(value.filter((v) => v !== t))} aria-label={`${t} konusunu kaldır`} className="grid size-5 place-items-center rounded-full hover:bg-white/70">
                <X className="size-3" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
