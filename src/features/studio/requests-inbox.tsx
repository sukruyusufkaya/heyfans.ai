"use client";
import { useState } from "react";
import { Check, ChevronRight, Download, Inbox, Play, Search, X } from "lucide-react";
import { Avatar } from "@/components/ui/display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/display";
import { Field, Textarea } from "@/components/ui/form-controls";
import { Dialog, DialogContent } from "@/components/ui/overlays";
import { MediaUploader, type UploadedFile } from "@/components/studio/media-uploader";
import { Notice } from "@/components/studio/studio-ui";
import { useRun } from "@/components/studio/use-run";
import { useFormatters, useT } from "@/i18n/client";
import { m } from "@/i18n/m";
import { cn } from "@/lib/utils";
import { requestActionAction } from "./business-actions";

export interface RequestItem {
  id: string;
  title: string;
  details: string;
  type: string;
  status: string;
  priceCredits: number;
  dueAt: string | null;
  createdAt: string;
  creatorNote: string | null;
  fan: { name: string; image: string | null };
  deliverables: { assetId: string; name: string; kind: string; url: string }[];
  history: { to: string; at: string; note?: string }[];
}

const STATUS: Record<string, { label: string; tone: "warn" | "violet" | "teal" | "pink" | "green" | "danger" | "gray" }> = {
  pending: { label: m("Yeni"), tone: "warn" },
  in_review: { label: m("İnceleniyor"), tone: "violet" },
  approved: { label: m("Onaylandı"), tone: "teal" },
  processing: { label: m("İşleniyor"), tone: "pink" },
  completed: { label: m("Tamamlandı"), tone: "green" },
  rejected: { label: m("Reddedildi"), tone: "danger" },
  canceled: { label: m("İptal edildi"), tone: "gray" },
};
const TYPE: Record<string, string> = { photo: m("Fotoğraf"), video: m("Video"), audio: m("Ses"), message: m("Mesaj"), other: m("Diğer") };

type Act = "review" | "approve" | "reject" | "start" | "complete";

export function RequestsInbox({ items, creditValueMinor }: { items: RequestItem[]; creditValueMinor: number }) {
  const t = useT();
  const { formatRelative, formatNumber } = useFormatters();
  const [openId, setOpenId] = useState<string | null>(null);
  const current = items.find((i) => i.id === openId) ?? null;

  if (!items.length) {
    return (
      <Card>
        <EmptyState icon={<Inbox />} title={t("Bu durumda talep yok")} description={t("Hayranların “Özel Deneyimler” üzerinden sana kişiye özel talepler gönderdiğinde burada listelenir.")} />
      </Card>
    );
  }
  return (
    <>
      <Card padded={false}>
        <ul>
          {items.map((r) => {
            const st = STATUS[r.status] ? { label: t(STATUS[r.status]!.label), tone: STATUS[r.status]!.tone } : { label: r.status, tone: "gray" as const };
            return (
              <li key={r.id} className="border-b border-line-soft last:border-0">
                <button type="button" onClick={() => setOpenId(r.id)} className="flex w-full items-center gap-3.5 p-4 text-start transition-colors hover:bg-brand-50/50 focus-visible:bg-brand-50/50">
                  <Avatar src={r.fan.image} name={r.fan.name} size={44} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-extrabold text-ink">{r.title}</span>
                    <span className="block truncate text-[11px] text-muted">
                      {r.fan.name} · {formatRelative(r.createdAt)}
                    </span>
                  </span>
                  <span className="hidden shrink-0 sm:block">
                    <Badge tone="pink" size="sm">
                      {TYPE[r.type] ? t(TYPE[r.type]!) : r.type}
                    </Badge>
                  </span>
                  <span className="shrink-0 text-end">
                    <span className="block text-[13px] font-black">{t("{count, number} kredi", { count: r.priceCredits })}</span>
                    <Badge tone={st.tone} size="sm" className="mt-1">
                      {st.label}
                    </Badge>
                  </span>
                  <ChevronRight className="rtl:-scale-x-100 size-4 shrink-0 text-muted/60" aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
        <p className="p-4 text-[10px] text-muted">{t("Talep içeriği, creator onayı ve platform kurallarına tabidir. 1 kredi ≈ {value} ₺ (hak ediş hesabında).", { value: formatNumber(creditValueMinor / 100) })}</p>
      </Card>
      <RequestDrawer key={current?.id ?? "none"} request={current} onClose={() => setOpenId(null)} />
    </>
  );
}

function RequestDrawer({ request: r, onClose }: { request: RequestItem | null; onClose: () => void }) {
  const t = useT();
  const { formatDateTime } = useFormatters();
  const statusLabel = (s: string) => (STATUS[s] ? t(STATUS[s]!.label) : s);
  const typeLabel = (s: string) => (TYPE[s] ? t(TYPE[s]!) : s);
  const { run, pending } = useRun();
  const [note, setNote] = useState("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [mode, setMode] = useState<"reject" | "complete" | null>(null);

  async function act(action: Act, extra?: { note?: string; deliverableAssetIds?: string[] }) {
    if (!r) return;
    const ok = await run(() => requestActionAction({ id: r.id, action, ...extra }));
    if (ok) {
      setMode(null);
      setNote("");
      setFiles([]);
      if (action === "reject" || action === "complete") onClose();
    }
  }

  const st = r ? { label: statusLabel(r.status), tone: STATUS[r.status]?.tone ?? ("gray" as const) } : null;
  return (
    <Dialog open={r !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        title={r ? t("Talep · {title}", { title: r.title }) : t("Talep")}
        description={r ? t("{name} · {date}", { name: r.fan.name, date: formatDateTime(r.createdAt) }) : undefined}
        className="left-auto right-0 top-0 h-dvh max-h-dvh w-full max-w-[480px] translate-x-0 translate-y-0 rounded-none border-y-0 border-e-0 sm:rounded-s-2xl"
      >
        {r && st && (
          <div className="grid gap-5">
            <div className="flex items-center gap-3">
              <Avatar src={r.fan.image} name={r.fan.name} size={48} />
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-extrabold">{r.fan.name}</p>
                <p className="text-[11px] text-muted">{t("Hayran · {type} talebi", { type: typeLabel(r.type) })}</p>
              </div>
              <Badge tone={st.tone}>{st.label}</Badge>
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-extrabold text-ink-soft">{t("Talep açıklaması")}</p>
              <p className="whitespace-pre-wrap rounded-2xl bg-brand-50 p-4 text-[12.5px] leading-relaxed text-ink-soft">{r.details}</p>
            </div>
            <dl className="grid gap-2 border-y border-line-soft py-3 text-[12px]">
              {[
                [t("İstenen içerik türü"), typeLabel(r.type)],
                [t("Fiyat"), t("{count, number} kredi", { count: r.priceCredits })],
                [t("Teslim tarihi"), r.dueAt ? formatDateTime(r.dueAt) : t("Belirtilmedi")],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3">
                  <dt className="text-muted-strong">{k}</dt>
                  <dd className="font-extrabold">{v}</dd>
                </div>
              ))}
            </dl>

            {r.creatorNote && (
              <Notice title={t("Notun")}>
                {r.creatorNote}
              </Notice>
            )}
            {r.deliverables.length > 0 && (
              <div>
                <p className="mb-1.5 text-[11px] font-extrabold text-ink-soft">{t("Teslim edilen dosyalar")}</p>
                <ul className="grid gap-2">
                  {r.deliverables.map((d) => (
                    <li key={d.assetId}>
                      <a href={d.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 rounded-xl border border-line p-2.5 text-[12px] font-bold hover:bg-soft">
                        <Download className="size-4 text-brand-500" aria-hidden /> <span className="truncate">{d.name}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div>
              <p className="mb-2 text-[11px] font-extrabold text-ink-soft">{t("Durum geçmişi")}</p>
              <ol className="grid gap-1.5 text-[11px] text-muted-strong">
                {r.history.map((h, i) => (
                  <li key={i} className="flex justify-between gap-3">
                    <span>{statusLabel(h.to)}{h.note ? ` — ${h.note}` : ""}</span>
                    <span className="shrink-0 text-muted">{formatDateTime(h.at)}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Eylemler */}
            {mode === null && (
              <div className="flex flex-wrap gap-2.5">
                {r.status === "pending" && (
                  <Button variant="secondary" size="sm" loading={pending} onClick={() => act("review")}>
                    <Search /> {t("İncelemeye al")}
                  </Button>
                )}
                {(r.status === "pending" || r.status === "in_review") && (
                  <>
                    <Button size="sm" loading={pending} onClick={() => act("approve")}>
                      <Check /> {t("Talebi onayla")}
                    </Button>
                    <Button variant="danger-soft" size="sm" onClick={() => setMode("reject")}>
                      <X /> {t("Reddet")}
                    </Button>
                  </>
                )}
                {r.status === "approved" && (
                  <Button size="sm" loading={pending} onClick={() => act("start")}>
                    <Play /> {t("İşleme al")}
                  </Button>
                )}
                {r.status === "processing" && (
                  <Button size="sm" onClick={() => setMode("complete")}>
                    <Check /> {t("Tamamla ve teslim et")}
                  </Button>
                )}
              </div>
            )}
            {mode === "reject" && (
              <div className="grid gap-3 rounded-2xl border border-[#f6c9cd] bg-danger-soft/50 p-4">
                <p className="text-[12px] font-bold text-[#b3252b]">{t("Talebi reddedersen hayranın harcadığı kredi iade edilir.")}</p>
                <Field label={t("Hayrana gösterilecek not (isteğe bağlı)")} htmlFor="rq-note">
                  <Textarea id="rq-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} className="min-h-20" />
                </Field>
                <div className="flex gap-2.5">
                  <Button variant="danger" size="sm" loading={pending} onClick={() => act("reject", { note: note || undefined })}>
                    {t("Reddet ve iade et")}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setMode(null)}>
                    {t("Vazgeç")}
                  </Button>
                </div>
              </div>
            )}
            {mode === "complete" && (
              <div className="grid gap-3 rounded-2xl border border-line p-4">
                {r.type !== "message" ? (
                  <MediaUploader purpose="deliverable" max={10} value={files} onChange={setFiles} accept="image/*,video/*,audio/*" label={t("Teslim dosyalarını yükle")} hint={t("{type} teslimi için en az bir dosya gerekir", { type: TYPE[r.type] ? t(TYPE[r.type]!) : t("Dosya") })} compact />
                ) : (
                  <p className="text-[11px] text-muted">{t("Mesaj talepleri için dosya gerekmez; yanıtını aşağıdaki nota yaz.")}</p>
                )}
                <Field label={r.type === "message" ? t("Yanıt mesajın") : t("Teslim notu (isteğe bağlı)")} htmlFor="rq-done">
                  <Textarea id="rq-done" value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} className="min-h-20" />
                </Field>
                <p className="text-[10px] text-muted">{t("Tamamladığında kazancın (platform ve ödeme kesintileri sonrası creator payın) hak ediş defterine yazılır.")}</p>
                <div className="flex gap-2.5">
                  <Button size="sm" loading={pending} disabled={(r.type !== "message" && files.length === 0) || (r.type === "message" && !note.trim())} onClick={() => act("complete", { note: note || undefined, deliverableAssetIds: files.map((f) => f.assetId) })}>
                    <Check /> {t("Teslim et")}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => setMode(null)}>
                    {t("Vazgeç")}
                  </Button>
                </div>
              </div>
            )}
            <p className={cn("text-[10px] text-muted", mode && "hidden")}>{t("Uygunsuz talepleri reddedebilir, izin verdiğin içerik türlerini “Sınırlar ve İzinler” sayfasından değiştirebilirsin.")}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
