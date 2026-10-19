"use client";
import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface WizardStep {
  key: string;
  label: string;
}

/** Hayran karşılama: numaralı daireler + etiket + bağlayıcı çizgiler. */
export function CircleStepper({ steps, current, done }: { steps: readonly WizardStep[]; current: number; done: number }) {
  return (
    <ol className="flex items-start" aria-label="Karşılama adımları">
      {steps.map((s, i) => {
        const active = i === current;
        const complete = i < done && !active;
        return (
          <React.Fragment key={s.key}>
            <li className="flex shrink-0 flex-col items-center gap-1.5" aria-current={active ? "step" : undefined}>
              <span
                className={cn(
                  "grid size-8 place-items-center rounded-full text-xs font-extrabold",
                  active ? "bg-brand-500 text-white shadow-[var(--shadow-pink)]" : complete ? "bg-brand-100 text-brand-600" : "bg-soft text-muted",
                )}
              >
                {complete ? <Check className="size-4" strokeWidth={3} aria-hidden /> : i + 1}
              </span>
              <span className={cn("text-[11px] font-bold", active ? "text-brand-500" : "text-muted")}>
                {s.label}
                <span className="sr-only">{active ? " (geçerli adım)" : complete ? " (tamamlandı)" : ""}</span>
              </span>
            </li>
            {i < steps.length - 1 && <span className="mt-4 h-px min-w-3 flex-1 bg-line" aria-hidden />}
          </React.Fragment>
        );
      })}
    </ol>
  );
}

/** İçerik üreticisi karşılama: hap şeklinde adımlar; tamamlanmış/ulaşılabilir adımlara geri dönülebilir. */
export function PillStepper({
  steps,
  current,
  done,
  reachable,
  onSelect,
}: {
  steps: readonly WizardStep[];
  current: number;
  done: number[];
  reachable: number;
  onSelect: (index: number) => void;
}) {
  const listRef = React.useRef<HTMLOListElement>(null);
  // Dar ekranda yatay kaydırılan adım şeridinde geçerli adımı görünür tut (yalnız şerit içinde kaydırır).
  React.useEffect(() => {
    const list = listRef.current;
    const active = list?.querySelector<HTMLElement>('[aria-current="step"]');
    if (!list || !active) return;
    list.scrollTo({ left: active.offsetLeft - (list.clientWidth - active.offsetWidth) / 2, behavior: "smooth" });
  }, [current]);
  return (
    <ol ref={listRef} className="relative flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar sm:gap-0" aria-label="Başvuru adımları">
      {steps.map((s, i) => {
        const active = i === current;
        const complete = done.includes(i) && !active;
        const enabled = i <= reachable;
        return (
          <React.Fragment key={s.key}>
            <li className="shrink-0">
              <button
                type="button"
                onClick={() => enabled && onSelect(i)}
                disabled={!enabled}
                aria-current={active ? "step" : undefined}
                className={cn(
                  "inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 text-xs font-extrabold transition-colors sm:px-4",
                  active ? "bg-brand-500 text-white shadow-[var(--shadow-pink)]" : complete ? "bg-brand-100 text-brand-600 hover:bg-brand-150" : enabled ? "bg-soft text-ink-soft hover:bg-brand-50" : "bg-soft text-muted",
                  !enabled && "cursor-not-allowed",
                )}
              >
                {complete ? <Check className="size-3.5" strokeWidth={3} aria-hidden /> : <span>{i + 1}</span>}
                {s.label}
                <span className="sr-only">{active ? " (geçerli adım)" : complete ? " (tamamlandı)" : ""}</span>
              </button>
            </li>
            {i < steps.length - 1 && <span className="mx-1 hidden h-px min-w-4 flex-1 bg-line sm:block" aria-hidden />}
          </React.Fragment>
        );
      })}
    </ol>
  );
}

/** Adım başlığına odak taşır (ekran okuyucu + klavye için); adım değişince çalışır. */
export function useStepFocus(step: unknown) {
  const ref = React.useRef<HTMLHeadingElement>(null);
  const first = React.useRef(true);
  React.useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    ref.current?.focus();
  }, [step]);
  return ref;
}
