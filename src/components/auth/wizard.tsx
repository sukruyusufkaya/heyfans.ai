"use client";
import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n/client";

export interface WizardStep {
  key: string;
  label: string;
}

/** Hayran karşılama: numaralı daireler + etiket + bağlayıcı çizgiler. */
export function CircleStepper({ steps, current, done }: { steps: readonly WizardStep[]; current: number; done: number }) {
  const t = useT();
  return (
    <ol className="flex items-start" aria-label={t("Karşılama adımları")}>
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
                {t(s.label)}
                {" "}
                <span className="sr-only">{active ? t("(geçerli adım)") : complete ? t("(tamamlandı)") : ""}</span>
              </span>
            </li>
            {i < steps.length - 1 && <span className="mt-4 h-px min-w-3 flex-1 bg-line" aria-hidden />}
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
