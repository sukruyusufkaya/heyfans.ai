"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, FileText, Send, XCircle } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/fan/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/display";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/form-controls";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/overlays";
import { createRequestAction, fanRequestAction } from "@/features/fan/actions";
import { CUSTOM_REQUEST_LABELS } from "@/lib/state-machines";
import { cn, formatDate, formatDateTime, formatNumber } from "@/lib/utils";
import type { FollowedCreatorOption, RequestView } from "@/services/fan/experiences";

export const REQUEST_TYPE_LABELS: Record<RequestView["type"], string> = {
  photo: "Özel Görsel",
  video: "Özel Video",
  audio: "Sesli Mesaj",
  message: "Özel Senaryo / Mesaj",
  other: "Diğer",
};

const STATUS_TONE: Record<RequestView["status"], "gray" | "warn" | "violet" | "teal" | "green" | "danger"> = {
  draft: "gray",
  pending: "warn",
  in_review: "warn",
  approved: "teal",
  processing: "violet",
  completed: "green",
  rejected: "danger",
  canceled: "gray",
};

/* ─── Yeni talep penceresi ─────────────────────────────────── */
export function NewRequestDialog({
  creators,
  balance,
  defaultType = "video",
  trigger,
}: {
  creators: FollowedCreatorOption[];
  balance: number;
  defaultType?: RequestView["type"];
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState<"draft" | "submit" | null>(null);
  const [errors, setErrors] = React.useState<Record<string, string[]>>({});
  const open1 = creators.filter((c) => c.acceptsRequests);
  const [username, setUsername] = React.useState(open1[0]?.username ?? "");
  const [type, setType] = React.useState<RequestView["type"]>(defaultType);
  const [title, setTitle] = React.useState("");
  const [details, setDetails] = React.useState("");
  const [price, setPrice] = React.useState("50");
  const [dueAt, setDueAt] = React.useState("");
  const id = React.useId();

  async function save(submit: boolean) {
    setBusy(submit ? "submit" : "draft");
    setErrors({});
    const credits = Number(price);
    const res = await createRequestAction({ username, type, title, details, priceCredits: Number.isFinite(credits) ? Math.floor(credits) : 0, dueAt: dueAt || null, submit });
    setBusy(null);
    if (!res.ok) {
      if (res.fieldErrors) setErrors(res.fieldErrors);
      toast.error(res.error);
      return;
    }
    toast.success(res.message ?? "Talep oluşturuldu.");
    setOpen(false);
    setTitle("");
    setDetails("");
    router.refresh();
  }

  const tooExpensive = Number(price) > balance;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!busy) {
          setOpen(v);
          if (v) setType(defaultType);
        }
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent title="Yeni Deneyim Oluştur" description="Nasıl bir deneyim istediğini anlat. Talebin içerik üreticisinin izinleri ve platform kuralları çerçevesinde değerlendirilir." size="lg">
        {open1.length === 0 ? (
          <div className="rounded-xl bg-soft p-5 text-center text-xs leading-relaxed text-muted-strong">
            {creators.length === 0 ? "Özel talep gönderebilmek için önce bir içerik üreticisini takip etmelisin." : "Takip ettiğin içerik üreticileri şu anda özel talep kabul etmiyor."}
            <div className="mt-3">
              <Link href="/explore" className="font-extrabold text-brand-600 hover:underline">
                İçerik üreticilerini keşfet
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="İçerik üreticisi" htmlFor={`${id}-c`} error={errors.username} required>
                <NativeSelect id={`${id}-c`} value={username} onChange={(e) => setUsername(e.target.value)}>
                  {creators.map((c) => (
                    <option key={c.username} value={c.username} disabled={!c.acceptsRequests}>
                      {c.displayName}
                      {c.acceptsRequests ? "" : " (talep kabul etmiyor)"}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
              <Field label="Deneyim türü" htmlFor={`${id}-t`} error={errors.type} required>
                <NativeSelect id={`${id}-t`} value={type} onChange={(e) => setType(e.target.value as RequestView["type"])}>
                  {Object.entries(REQUEST_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </NativeSelect>
              </Field>
            </div>
            <Field label="Başlık" htmlFor={`${id}-title`} error={errors.title} required>
              <Input id={`${id}-title`} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Ör. Doğum günü için kısa video mesajı" />
            </Field>
            <Field label="Deneyimini anlat" htmlFor={`${id}-d`} error={errors.details} required hint="İçerik üreticisine iletilecek kısa ve net talep.">
              <Textarea id={`${id}-d`} value={details} onChange={(e) => setDetails(e.target.value)} maxLength={3000} placeholder="Ne istediğini, kime hitap edileceğini ve varsa tonunu yaz." />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Teklif edilen kredi" htmlFor={`${id}-p`} error={errors.priceCredits} required hint={`Bakiyen: ${formatNumber(balance)} kredi · en az 10`}>
                <Input id={`${id}-p`} type="number" inputMode="numeric" min={10} step={1} value={price} onChange={(e) => setPrice(e.target.value)} aria-invalid={tooExpensive || undefined} />
              </Field>
              <Field label="İstenen teslim tarihi (isteğe bağlı)" htmlFor={`${id}-due`} error={errors.dueAt}>
                <Input id={`${id}-due`} type="date" value={dueAt} min={new Date().toISOString().slice(0, 10)} onChange={(e) => setDueAt(e.target.value)} />
              </Field>
            </div>
            {tooExpensive && (
              <p role="alert" className="text-[11px] font-semibold text-danger">
                Bakiyen bu teklif için yeterli değil. <Link href="/app/wallet" className="underline">Kredi yükle</Link>
              </p>
            )}
            <p className="rounded-xl bg-brand-50 px-3.5 py-3 text-[11px] leading-relaxed text-muted-strong">
              “Talebi gönder”de teklif ettiğin kredi <b>bloke edilir</b>. Talep reddedilir veya iptal edilirse kredi tamamen iade edilir; tamamlanınca içerik üreticisine aktarılır. “Taslak” kredi harcamaz.
            </p>
            <div className="flex flex-wrap justify-end gap-2.5">
              <Button variant="secondary" onClick={() => save(false)} loading={busy === "draft"} disabled={busy !== null}>
                Taslak olarak kaydet
              </Button>
              <Button onClick={() => save(true)} loading={busy === "submit"} disabled={busy !== null || tooExpensive}>
                <Send /> Talebi gönder
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ─── Talep satırı + ayrıntı penceresi ─────────────────────── */
export function RequestRow({ r }: { r: RequestView }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  async function act(action: "submit" | "cancel") {
    setBusy(true);
    const res = await fanRequestAction({ id: r.id, action });
    setBusy(false);
    if (!res.ok) {
      toast.error(res.error);
      return false;
    }
    toast.success(res.message ?? "Talep güncellendi.");
    router.refresh();
    return true;
  }

  const canCancel = r.status === "draft" || r.status === "pending" || r.status === "approved";
  const holdsCredits = r.status !== "draft";

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-line-soft bg-[#fcfafd] p-4 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-3.5">
        <Avatar src={r.creator?.avatarUrl ?? null} name={r.creator?.displayName ?? "?"} size={46} />
        <div className="min-w-0">
          <p className="truncate text-[13px] font-extrabold">{r.title}</p>
          <p className="mt-0.5 truncate text-[11px] text-muted">
            {r.creator?.displayName ?? "İçerik üreticisi"} · {REQUEST_TYPE_LABELS[r.type]} · {formatNumber(r.priceCredits)} kredi
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:justify-end">
        <Badge tone={STATUS_TONE[r.status]} size="md" dot>
          {CUSTOM_REQUEST_LABELS[r.status]}
        </Badge>
        <span className="text-[10px] text-muted">{formatDate(r.updatedAt)}</span>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="secondary" size="sm" shape="pill">
              Detaylar
            </Button>
          </DialogTrigger>
          <DialogContent title={r.title} description={`${r.creator?.displayName ?? "İçerik üreticisi"} · ${REQUEST_TYPE_LABELS[r.type]}`} size="lg">
            <div className="grid gap-5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={STATUS_TONE[r.status]} size="lg" dot>
                  {CUSTOM_REQUEST_LABELS[r.status]}
                </Badge>
                <Badge tone="pink" size="lg">{formatNumber(r.priceCredits)} kredi</Badge>
                {r.dueAt && <Badge tone="gray" size="lg">İstenen teslim: {formatDate(r.dueAt)}</Badge>}
                {r.refunded && <Badge tone="violet" size="lg">Kredi iade edildi</Badge>}
              </div>
              <section>
                <h3 className="mb-1.5 text-[11px] font-black uppercase tracking-wider text-muted">Talebin</h3>
                <p className="whitespace-pre-wrap rounded-xl bg-soft p-3.5 text-xs leading-relaxed text-ink-soft">{r.details}</p>
              </section>
              {r.creatorNote && (
                <section>
                  <h3 className="mb-1.5 text-[11px] font-black uppercase tracking-wider text-muted">İçerik üreticisinin notu</h3>
                  <p className="whitespace-pre-wrap rounded-xl bg-brand-50 p-3.5 text-xs leading-relaxed text-ink-soft">{r.creatorNote}</p>
                </section>
              )}
              <section>
                <h3 className="mb-2 text-[11px] font-black uppercase tracking-wider text-muted">Süreç</h3>
                <ol className="grid gap-0">
                  {r.history.map((h, i) => (
                    <li key={i} className="relative flex gap-3 pb-3.5 last:pb-0">
                      <span className="relative flex flex-col items-center">
                        <span className={cn("mt-1 size-2.5 rounded-full", i === r.history.length - 1 ? "bg-brand-500 ring-4 ring-brand-100" : "bg-[#d9cfdc]")} aria-hidden />
                        {i < r.history.length - 1 && <span className="mt-1 w-px flex-1 bg-line" aria-hidden />}
                      </span>
                      <div>
                        <p className="text-xs font-extrabold">{CUSTOM_REQUEST_LABELS[h.to] ?? h.to}</p>
                        <p className="text-[10px] text-muted">
                          {formatDateTime(h.at)}
                          {h.note ? ` · ${h.note}` : ""}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
              {r.deliverables.length > 0 && (
                <section>
                  <h3 className="mb-2 text-[11px] font-black uppercase tracking-wider text-muted">Teslim edilen dosyalar</h3>
                  <ul className="grid gap-2">
                    {r.deliverables.map((d) => (
                      <li key={d.id}>
                        <a href={d.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl border border-line p-3 text-xs font-extrabold text-brand-600 hover:bg-brand-50">
                          <FileText className="size-4" aria-hidden /> <span className="min-w-0 flex-1 truncate">{d.name}</span> <Download className="size-4" aria-hidden />
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {r.status === "completed" && r.deliverables.length === 0 && <p className="rounded-xl bg-soft p-3 text-xs text-muted">Bu talep dosya içermeyen bir teslim (ör. mesaj) ile tamamlandı.</p>}
              <div className="flex flex-wrap justify-end gap-2.5 border-t border-line-soft pt-4">
                {r.status === "draft" && (
                  <Button onClick={async () => (await act("submit")) && setOpen(false)} loading={busy}>
                    <Send /> Talebi gönder ({formatNumber(r.priceCredits)} kredi bloke edilir)
                  </Button>
                )}
                {canCancel && (
                  <ConfirmDialog
                    title="Talebi iptal et"
                    description={holdsCredits ? "Talebin iptal edilir ve bloke edilen kredin tamamen iade edilir." : "Taslak talep iptal edilir."}
                    confirmLabel="Talebi iptal et"
                    tone="danger"
                    onConfirm={async () => {
                      const ok = await act("cancel");
                      if (ok) setOpen(false);
                      return ok;
                    }}
                    trigger={
                      <Button variant="danger-soft" disabled={busy}>
                        <XCircle /> Talebi iptal et
                      </Button>
                    }
                  />
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </li>
  );
}
