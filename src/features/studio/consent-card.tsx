"use client";
import { useState } from "react";
import { BadgeCheck, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form-controls";
import { ConfirmDialog } from "@/components/studio/confirm-dialog";
import { useRun } from "@/components/studio/use-run";
import { cn, formatDate } from "@/lib/utils";
import type { ConsentKind } from "@/models/creator";
import { grantConsentAction, revokeConsentAction } from "./twin-actions";

/** Tek bir açık rıza: metin, durum, verme/geri çekme. Geri çekme etkisini açıkça belirtir. */
export function ConsentCard({
  kind,
  title,
  text,
  granted,
  grantedAt,
  locked,
  lockedReason,
  revokeWarning,
  strongRevoke,
  className,
}: {
  kind: ConsentKind;
  title: string;
  text: string;
  granted: boolean;
  grantedAt?: Date | string | null;
  locked?: boolean;
  lockedReason?: string;
  revokeWarning: string;
  /** true ise geri çekme, "GERİ ÇEK" yazılarak doğrulanır. */
  strongRevoke?: boolean;
  className?: string;
}) {
  const { run, pending } = useRun();
  const [typed, setTyped] = useState("");
  return (
    <div className={cn("rounded-2xl border p-4", granted ? "border-[#c9eedc] bg-success-soft/40" : "border-line bg-white", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-[13px] font-extrabold text-ink">
            {granted ? <BadgeCheck className="size-4 text-success" aria-hidden /> : <ShieldAlert className="size-4 text-muted" aria-hidden />}
            {title}
          </p>
          <p className="mt-1.5 text-[11px] leading-relaxed text-muted-strong">{text}</p>
          {granted && grantedAt && <p className="mt-1.5 text-[10px] text-muted">Verildi: {formatDate(grantedAt)}</p>}
        </div>
        <Badge tone={granted ? "green" : "gray"} dot>
          {granted ? "İzin verildi" : "İzin yok"}
        </Badge>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2.5">
        {granted ? (
          <ConfirmDialog
            tone="danger"
            title={`${title} iznini geri çek`}
            description={revokeWarning}
            confirmLabel="İzni geri çek"
            confirmDisabled={strongRevoke ? typed.trim().toLocaleUpperCase("tr-TR") !== "GERİ ÇEK" : false}
            onConfirm={async () => {
              const ok = await run(() => revokeConsentAction({ kind }));
              if (ok) setTyped("");
              return ok;
            }}
            trigger={
              <Button variant="danger-soft" size="sm" loading={pending}>
                İzni geri çek
              </Button>
            }
          >
            {strongRevoke && (
              <div className="rounded-xl border border-[#f6c9cd] bg-danger-soft p-3">
                <p className="mb-2 text-[11px] font-bold text-[#b3252b]">Onaylamak için aşağıya GERİ ÇEK yaz.</p>
                <Input aria-label="Onay metni" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="GERİ ÇEK" autoComplete="off" />
              </div>
            )}
          </ConfirmDialog>
        ) : (
          <ConfirmDialog
            title={`${title} iznini ver`}
            description="Aşağıdaki metni okuyup açık rıza veriyorsun. İznini istediğin an geri çekebilirsin."
            confirmLabel="Okudum, izin veriyorum"
            onConfirm={() => run(() => grantConsentAction({ kind }))}
            disabled={locked}
            trigger={
              <Button size="sm" disabled={locked} loading={pending}>
                İzin ver
              </Button>
            }
          >
            <blockquote className="rounded-xl border-l-4 border-brand-400 bg-brand-50 p-3 text-[12px] leading-relaxed text-ink-soft">{text}</blockquote>
          </ConfirmDialog>
        )}
        {locked && !granted && lockedReason && <p className="text-[11px] font-semibold text-warning">{lockedReason}</p>}
      </div>
    </div>
  );
}
