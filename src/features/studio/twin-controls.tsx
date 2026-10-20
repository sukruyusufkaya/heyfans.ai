"use client";
import { useState } from "react";
import { Pause, Play, Rocket, RotateCcw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea, Field } from "@/components/ui/form-controls";
import { ConfirmDialog } from "@/components/studio/confirm-dialog";
import { Notice } from "@/components/studio/studio-ui";
import { useRun } from "@/components/studio/use-run";
import type { TwinStatus } from "@/models/ai";
import { pauseTwinAction, publishTwinAction, reopenTwinAction, submitTwinReviewAction } from "./twin-actions";

/** Durum makinesine uygun yayın/kontrol düğmeleri (taslak → inceleme → onay → yayın ↔ duraklat). */
export function TwinControls({
  status,
  creatorApproved,
  hasPersonaConsent,
  reviewNote,
}: {
  status: TwinStatus;
  creatorApproved: boolean;
  hasPersonaConsent: boolean;
  reviewNote?: string | null;
}) {
  const { run, pending } = useRun();
  const [summary, setSummary] = useState("");

  const submit = (label: string, primary = true) => (
    <ConfirmDialog
      title="İncelemeye gönder"
      description="Güncel taslağın bir sürüm olarak moderasyon ekibine gönderilir. Yayındaki sürüm, inceleme sürerken değişmez."
      confirmLabel="Gönder"
      onConfirm={() => run(() => submitTwinReviewAction({ summary: summary || undefined }), { onOk: () => setSummary("") })}
      disabled={!hasPersonaConsent}
      trigger={
        <Button variant={primary ? "primary" : "outline"} size="sm" disabled={!hasPersonaConsent}>
          <Send className="rtl:-scale-x-100" /> {label}
        </Button>
      }
    >
      <Field label="Değişiklik özeti (isteğe bağlı)" htmlFor="twin-summary" hint="İnceleyen kişiye neyi değiştirdiğini kısaca anlat.">
        <Textarea id="twin-summary" value={summary} onChange={(e) => setSummary(e.target.value)} maxLength={500} placeholder="Örn. Karşılama mesajını ve konuşma tarzını güncelledim." />
      </Field>
    </ConfirmDialog>
  );

  return (
    <div className="grid gap-3">
      {!hasPersonaConsent && status !== "revoked" && <Notice tone="warn" title="AI ikizi açık rızası gerekli">İncelemeye göndermek ve yayına almak için aşağıdaki “AI ikizi kişiliği” iznini vermelisin.</Notice>}
      {!creatorApproved && <Notice tone="info" title="Creator onayı bekleniyor">Hesabın onaylanana kadar AI ikizin yayına alınamaz; taslağını hazırlamaya devam edebilirsin.</Notice>}
      {reviewNote && (status === "rejected" || status === "approved") && (
        <Notice tone={status === "rejected" ? "danger" : "safe"} title="İnceleme notu">
          {reviewNote}
        </Notice>
      )}

      <div className="flex flex-wrap gap-2.5">
        {(status === "draft" || status === "rejected") && submit(status === "rejected" ? "Düzeltip tekrar gönder" : "İncelemeye gönder")}
        {status === "pending_review" && (
          <>
            <p className="self-center text-[12px] font-semibold text-violet">Sürümün inceleniyor. Sonuç bildirim olarak gelir.</p>
            {submit("Güncel taslağı gönder", false)}
          </>
        )}
        {status === "approved" && (
          <>
            <Button size="sm" loading={pending} disabled={!creatorApproved} onClick={() => run(() => publishTwinAction())}>
              <Rocket /> Yayına al
            </Button>
            {submit("Değişikliklerle yeniden gönder", false)}
          </>
        )}
        {status === "live" && (
          <>
            <Button variant="secondary" size="sm" loading={pending} onClick={() => run(() => pauseTwinAction())}>
              <Pause /> Duraklat
            </Button>
            {submit("Yeni sürüm gönder", false)}
          </>
        )}
        {status === "paused" && (
          <>
            <Button size="sm" loading={pending} disabled={!creatorApproved || !hasPersonaConsent} onClick={() => run(() => publishTwinAction())}>
              <Play /> Devam ettir
            </Button>
            {submit("Yeni sürüm gönder", false)}
          </>
        )}
        {status === "revoked" && (
          <Button size="sm" loading={pending} disabled={!hasPersonaConsent} onClick={() => run(() => reopenTwinAction())}>
            <RotateCcw /> Yeniden taslağa al
          </Button>
        )}
      </div>
      {status === "revoked" && !hasPersonaConsent && <p className="text-[11px] text-muted">Yeniden başlamak için önce “AI ikizi kişiliği” iznini yeniden vermelisin.</p>}
    </div>
  );
}
