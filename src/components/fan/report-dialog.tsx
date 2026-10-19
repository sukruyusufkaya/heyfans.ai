"use client";
import * as React from "react";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, NativeSelect, Textarea } from "@/components/ui/form-controls";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "@/components/ui/overlays";
import { reportAction } from "@/features/social/actions";

export const REPORT_REASON_LABELS: Record<string, string> = {
  ai_misbehavior: "AI yanıtı uygunsuz / yanlış",
  harassment: "Taciz veya zorbalık",
  sexual_content: "Cinsel içerik",
  minor_safety: "Çocuk güvenliği",
  hate: "Nefret söylemi",
  self_harm: "Kendine zarar",
  impersonation: "Kimliğe bürünme",
  privacy: "Gizlilik ihlali",
  copyright: "Telif hakkı",
  spam: "Spam",
  other: "Diğer",
};

/** İçerik / mesaj bildirme penceresi (reportAction → moderasyon vakası). Tetikleyici dışarıdan verilir. */
export function ReportDialog({
  targetType,
  targetId,
  trigger,
  title = "Bildir",
  reasons = ["ai_misbehavior", "harassment", "sexual_content", "minor_safety", "hate", "self_harm", "spam", "other"],
}: {
  targetType: "content" | "message" | "profile" | "twin";
  targetId: string;
  trigger: React.ReactNode;
  title?: string;
  reasons?: string[];
}) {
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
      toast.success(res.message ?? "Bildirimin alındı.");
      setOpen(false);
      setDetails("");
    } else toast.error(res.error);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title={title} description="Bildirimin moderasyon ekibimize iletilir. Yanlış bildirimlerden kaçınmanı rica ederiz." size="sm">
        <div className="grid gap-4">
          <Field label="Neden bildiriyorsun?" htmlFor={`${idBase}-reason`}>
            <NativeSelect id={`${idBase}-reason`} value={reason} onChange={(e) => setReason(e.target.value)}>
              {reasons.map((r) => (
                <option key={r} value={r}>
                  {REPORT_REASON_LABELS[r] ?? r}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field label="Ayrıntılar (isteğe bağlı)" htmlFor={`${idBase}-details`}>
            <Textarea id={`${idBase}-details`} value={details} onChange={(e) => setDetails(e.target.value)} maxLength={1000} placeholder="Neyin yanlış olduğunu kısaca anlat." />
          </Field>
        </div>
        <div className="mt-5 flex justify-end gap-2.5">
          <DialogClose asChild>
            <Button variant="secondary" disabled={busy}>
              Vazgeç
            </Button>
          </DialogClose>
          <Button variant="danger" onClick={submit} loading={busy}>
            <Flag /> Bildir
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
