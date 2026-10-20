"use client";
import { useState } from "react";
import { Check, Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useT } from "@/i18n/client";
import type { FormState } from "./actions";

export function fieldError(state: FormState, key: string) {
  return state && !state.ok ? state.fieldErrors?.[key]?.[0] : undefined;
}

/** Bot tuzağı: görünmez, klavye ile erişilemez; gerçek kullanıcılar doldurmaz. */
export function Honeypot() {
  const t = useT();
  return (
    <div aria-hidden className="absolute -start-[9999px] top-0 h-0 w-0 overflow-hidden">
      <label>
        {t("Web sitesi (boş bırakın)")}
        <input name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
      </label>
    </div>
  );
}

export function FormError({ state }: { state: FormState }) {
  if (!state || state.ok) return null;
  return (
    <p role="alert" className="rounded-xl border border-danger/30 bg-danger-soft px-4 py-3 text-xs font-semibold text-danger">
      {state.error}
    </p>
  );
}

export function SubmitButton({ pending, children, className }: { pending: boolean; children: React.ReactNode; className?: string }) {
  return (
    <Button type="submit" shape="pill" size="lg" disabled={pending} className={className} aria-busy={pending}>
      {pending && <Loader2 className="animate-spin" aria-hidden />}
      {children}
    </Button>
  );
}

/** Başarı durumu: referans numarasını büyük gösterir, kopyalama + yeni form seçeneği sunar. */
export function SuccessPanel({ title, children, reference, referenceLabel, onReset, resetLabel }: { title: string; children?: React.ReactNode; reference: string; referenceLabel: string; onReset: () => void; resetLabel?: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  return (
    <div role="status" aria-live="polite" className="rounded-2xl border border-success/25 bg-success-soft p-6 text-center">
      <span className="mx-auto grid size-12 place-items-center rounded-full bg-success text-white">
        <Check className="size-6" aria-hidden />
      </span>
      <h3 className="mt-4 text-lg font-extrabold text-ink">{title}</h3>
      <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-muted-strong">{referenceLabel}</p>
      <div className="mt-1.5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 shadow-sm">
        <code className="font-mono text-lg font-black tracking-wider text-brand-600">{reference}</code>
        <button
          type="button"
          aria-label={t("Numarayı kopyala")}
          className="grid size-8 place-items-center rounded-lg text-muted hover:bg-soft hover:text-ink"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(reference);
              setCopied(true);
              setTimeout(() => setCopied(false), 1800);
            } catch {
              /* pano erişimi yok */
            }
          }}
        >
          {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
        </button>
      </div>
      {children && <div className="mx-auto mt-4 max-w-md text-xs leading-relaxed text-muted-strong">{children}</div>}
      <Button type="button" variant="secondary" shape="pill" size="md" className="mt-5" onClick={onReset}>
        {resetLabel ?? t("Yeni bir form doldur")}
      </Button>
    </div>
  );
}
