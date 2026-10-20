"use client";
import * as React from "react";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, NativeSelect, Textarea } from "@/components/ui/form-controls";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/overlays";
import { reportAction } from "@/features/social/actions";
import { useT } from "@/i18n/client";
import { m } from "@/i18n/m";

export const REPORT_REASON_LABELS: Record<string, string> = {
  ai_misbehavior: m("AI yanıtı uygunsuz / yanlış"),
  harassment: m("Taciz veya zorbalık"),
  sexual_content: m("Cinsel içerik"),
  minor_safety: m("Çocuk güvenliği"),
  hate: m("Nefret söylemi"),
  self_harm: m("Kendine zarar"),
  impersonation: m("Kimliğe bürünme"),
  privacy: m("Gizlilik ihlali"),
  copyright: m("Telif hakkı"),
  spam: m("Spam"),
  other: m("Diğer"),
};

/** İçerik / mesaj bildirme penceresi (reportAction → moderasyon vakası). Tetikleyici dışarıdan verilir. */
export function ReportDialog({
  targetType,
  targetId,
  trigger,
  title,
  reasons = ["ai_misbehavior", "harassment", "sexual_content", "minor_safety", "hate", "self_harm", "spam", "other"],
}: {
  targetType: "content" | "message" | "profile" | "twin";
  targetId: string;
  trigger: React.ReactNode;
  title?: string;
  reasons?: string[];
}) {
  const t = useT();
  const [open, setOpen] = React.useState(false);
  const [reason, setReason] = React.useState(reasons[0]!);
  const [details, setDetails] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const idBase = React.useId();

  async function submit() {
    setBusy(true);
    const res = await reportAction({ targetType, targetId, reason, details: details.trim() || undefined });
    setBusy(false);
    if (res.ok) {
      toast.success(res.message ?? t("Bildirimin alındı."));
      setOpen(false);
      setDetails("");
    } else toast.error(res.error);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title={title ?? t("Bildir")} description={t("Bildirimin moderasyon ekibimize iletilir. Yanlış bildirimlerden kaçınmanı rica ederiz.")} size="sm">
        <div className="grid gap-4">
          <Field label={t("Neden bildiriyorsun?")} htmlFor={`${idBase}-reason`}>
            <NativeSelect id={`${idBase}-reason`} value={reason} onChange={(e) => setReason(e.target.value)}>
              {reasons.map((r) => (
                <option key={r} value={r}>
                  {t(REPORT_REASON_LABELS[r] ?? r)}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label={t("Ayrıntılar (isteğe bağlı)")} htmlFor={`${idBase}-details`}>
            <Textarea id={`${idBase}-details`} value={details} onChange={(e) => setDetails(e.target.value)} maxLength={1000} placeholder={t("Neyin yanlış olduğunu kısaca anlat.")} />
          </Field>
        </div>
        <div className="mt-5 flex justify-end gap-2.5">
          <DialogClose asChild>
            <Button variant="secondary" disabled={busy}>
              {t("Vazgeç")}
            </Button>
          </DialogClose>
          <Button variant="danger" onClick={submit} loading={busy}>
            <Flag /> {t("Bildir")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
