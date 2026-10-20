"use client";
import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/display";
import { useFormatters, useT } from "@/i18n/client";
import { TWIN_STATUS_LABELS } from "@/lib/state-machines";
import type { TwinStatus } from "@/models/ai";
import { cn } from "@/lib/utils";

/*
 * studio-ui.tsx içindeki metin taşıyan parçalar. Hem sunucu hem istemci dosyalarından kullanıldığı için
 * (kanca gerektiren çeviri) küçük istemci bileşenleri olarak ayrıldı; studio-ui.tsx bunları yeniden dışa aktarır.
 */

const TWIN_TONES: Record<TwinStatus, React.ComponentProps<typeof Badge>["tone"]> = {
  live: "green",
  paused: "warn",
  pending_review: "violet",
  approved: "teal",
  draft: "gray",
  rejected: "danger",
  revoked: "danger",
};
export function TwinStatusBadge({ status, size }: { status: TwinStatus; size?: "sm" | "md" | "lg" }) {
  const t = useT();
  return (
    <Badge tone={TWIN_TONES[status]} size={size} dot>
      {t(TWIN_STATUS_LABELS[status])}
    </Badge>
  );
}

/** Yüzdelik çubuk; değer yoksa dürüstçe "Henüz test edilmedi". */
export function Meter({ label, value, tone = "pink" }: { label: string; value: number | null | undefined; tone?: "pink" | "green" | "violet" | "teal" | "orange" }) {
  const t = useT();
  const { formatPercent } = useFormatters();
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-[11px]">
        <span className="font-semibold text-ink-soft">{label}</span>
        <b className="font-extrabold text-ink">{value == null ? <span className="font-semibold text-muted">{t("Henüz test edilmedi")}</span> : formatPercent(value * 100)}</b>
      </div>
      <Progress value={value ?? 0} tone={tone} label={label} className={value == null ? "opacity-40" : undefined} />
    </div>
  );
}

/** Tek satır "adım" göstergesi (checklist öğesi). */
export function CheckItem({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  const t = useT();
  return (
    <li className="flex items-start gap-2 text-[12px]">
      <span className={cn("mt-0.5 grid size-4 shrink-0 place-items-center rounded-full text-[9px] font-black", ok ? "bg-success text-white" : "bg-line text-muted")} aria-hidden>
        {ok ? "✓" : "•"}
      </span>
      <span className={ok ? "text-ink-soft" : "text-muted"}>
        {children}
        <span className="sr-only"> {ok ? t("(tamamlandı)") : t("(eksik)")}</span>
      </span>
    </li>
  );
}
