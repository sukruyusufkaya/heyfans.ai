"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, FileText, Globe, HelpCircle, Loader2, MoreHorizontal, Plus, RefreshCw, Trash2, Type } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { DataTable, EmptyState, Td, Th } from "@/components/ui/display";
import { Field, Input, Switch, Textarea } from "@/components/ui/form-controls";
import { Dialog, DialogContent, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/overlays";
import { ConfirmDialog } from "@/components/studio/confirm-dialog";
import { MediaUploader, type UploadedFile } from "@/components/studio/media-uploader";
import { Notice } from "@/components/studio/studio-ui";
import { useRun } from "@/components/studio/use-run";
import { useFormatters, useT } from "@/i18n/client";
import { m } from "@/i18n/m";
import { cn } from "@/lib/utils";
import { addKnowledgeAction, deleteKnowledgeAction, reindexKnowledgeAction, setKnowledgeApprovedAction } from "./knowledge-actions";

export interface KnowledgeRow {
  id: string;
  type: "text" | "file" | "url" | "faq";
  title: string;
  status: string;
  approved: boolean;
  chunkCount: number;
  url: string | null;
  fileName: string | null;
  error: string | null;
  createdAt: string | Date;
}

const TYPE_LABEL = { text: m("Metin"), faq: m("SSS"), url: m("Bağlantı"), file: m("Belge") } as const;
const TYPE_ICON = { text: Type, faq: HelpCircle, url: Globe, file: FileText } as const;
const PROCESSING = ["uploaded", "validating", "extracting", "chunking", "embedding"];
const STATUS: Record<string, { label: string; tone: "green" | "warn" | "danger" | "gray" | "violet" }> = {
  uploaded: { label: m("Sırada"), tone: "warn" },
  validating: { label: m("Doğrulanıyor"), tone: "warn" },
  extracting: { label: m("Metin çıkarılıyor"), tone: "warn" },
  chunking: { label: m("Parçalanıyor"), tone: "warn" },
  embedding: { label: m("İndeksleniyor"), tone: "warn" },
  indexed: { label: m("Hazır"), tone: "green" },
  failed: { label: m("Başarısız"), tone: "danger" },
  disabled: { label: m("Devre dışı"), tone: "gray" },
};
const FILTERS = [
  { key: "all", label: m("Tüm kaynaklar") },
  { key: "file", label: m("Belgeler") },
  { key: "text", label: m("Metinler") },
  { key: "faq", label: m("SSS") },
  { key: "url", label: m("Bağlantılar") },
] as const;

export function KnowledgeManager({ sources, enabled, aiAvailable }: { sources: KnowledgeRow[]; enabled: boolean; aiAvailable: boolean }) {
  const t = useT();
  const { formatDate, formatNumber } = useFormatters();
  const router = useRouter();
  const { run, pending } = useRun();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");
  const [open, setOpen] = useState(false);
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>({});
  const [url, setUrl] = useState("");
  const [del, setDel] = useState<KnowledgeRow | null>(null);
  const processing = sources.filter((s) => PROCESSING.includes(s.status)).length;

  // İşlem sürerken durumu düzenli yenile (indeksleme arka planda ilerler).
  useEffect(() => {
    if (!processing) return;
    const timer = setInterval(() => router.refresh(), 3000);
    return () => clearInterval(timer);
  }, [processing, router]);

  const rows = sources.filter((s) => filter === "all" || s.type === filter);

  async function addUrl() {
    const host = (() => {
      try {
        return new URL(url).hostname;
      } catch {
        return t("Bağlantı");
      }
    })();
    const ok = await run(() => addKnowledgeAction({ type: "url", title: host, url }));
    if (ok) setUrl("");
  }

  async function addUploaded(files: UploadedFile[]) {
    const f = files[0];
    if (!f) return;
    await run(() => addKnowledgeAction({ type: "file", title: f.name.replace(/\.[^.]+$/, "").slice(0, 190) || t("Belge"), assetId: f.assetId }));
  }

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
      <Card>
        <CardHeader
          title={t("Bilgi Kaynaklarım")}
          hint={t("AI ikizinin yanıtlarında kullanılmasına izin verdiğin bilgiler.")}
          action={
            <Button size="sm" onClick={() => setOpen(true)} disabled={!enabled}>
              <Plus /> {t("Yeni kaynak ekle")}
            </Button>
          }
        />
        <div className="mb-3 flex flex-wrap gap-2" role="tablist" aria-label={t("Kaynak türü")}>
          {FILTERS.map((f) => (
            <button
              key={f.key}
              role="tab"
              aria-selected={filter === f.key}
              onClick={() => setFilter(f.key)}
              className={cn("rounded-full px-3.5 py-1.5 text-[11px] font-extrabold transition-colors", filter === f.key ? "bg-brand-500 text-white" : "bg-soft text-muted-strong hover:text-ink")}
            >
              {t(f.label)}
            </button>
          ))}
        </div>
        {rows.length ? (
          <DataTable>
            <thead>
              <tr>
                <Th>{t("Kaynak adı")}</Th>
                <Th>{t("Tür")}</Th>
                <Th>{t("Eklenme")}</Th>
                <Th>{t("Durum")}</Th>
                <Th className="text-end">{t("Parça")}</Th>
                <Th>{t("Kullan")}</Th>
                <Th className="relative">
                  <span className="sr-only">{t("İşlemler")}</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const Icon = TYPE_ICON[s.type];
                const st = STATUS[s.status] ? { label: t(STATUS[s.status]!.label), tone: STATUS[s.status]!.tone } : { label: s.status, tone: "gray" as const };
                const approved = optimistic[s.id] ?? s.approved;
                const busy = PROCESSING.includes(s.status);
                return (
                  <tr key={s.id}>
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-100 text-brand-500">
                          <Icon className="size-4" aria-hidden />
                        </span>
                        <div className="min-w-0">
                          <p className="max-w-[240px] truncate font-extrabold text-ink">{s.title}</p>
                          {(s.fileName || s.url) && <p className="max-w-[240px] truncate text-[10px] text-muted">{s.fileName ?? s.url}</p>}
                          {s.status === "failed" && s.error && <p className="max-w-[240px] truncate text-[10px] text-danger" title={t(s.error)}>{t(s.error)}</p>}
                        </div>
                      </div>
                    </Td>
                    <Td>{t(TYPE_LABEL[s.type])}</Td>
                    <Td className="whitespace-nowrap">{formatDate(s.createdAt)}</Td>
                    <Td>
                      <Badge tone={st.tone} size="sm">
                        {busy && <Loader2 className="animate-spin" aria-hidden />}
                        {st.label}
                      </Badge>
                    </Td>
                    <Td className="text-end tabular-nums">{s.status === "indexed" ? formatNumber(s.chunkCount) : "—"}</Td>
                    <Td>
                      <Switch
                        checked={approved}
                        disabled={s.status !== "indexed" || pending}
                        aria-label={t("{title} yanıtlarda kullanılsın", { title: s.title })}
                        onCheckedChange={async (v) => {
                          setOptimistic((o) => ({ ...o, [s.id]: v }));
                          const ok = await run(() => setKnowledgeApprovedAction({ id: s.id, approved: v }));
                          if (!ok) setOptimistic((o) => ({ ...o, [s.id]: !v }));
                        }}
                      />
                    </Td>
                    <Td>
                      <DropdownMenu>
                        <DropdownMenuTrigger className="grid size-8 place-items-center rounded-full hover:bg-soft" aria-label={t("{title} işlemleri", { title: s.title })}>
                          <MoreHorizontal className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem disabled={busy} onSelect={() => void run(() => reindexKnowledgeAction({ id: s.id }))}>
                            <RefreshCw /> {t("Yeniden indeksle")}
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => setDel(s)} className="text-danger data-[highlighted]:bg-danger-soft data-[highlighted]:text-danger">
                            <Trash2 /> {t("Sil")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </DataTable>
        ) : (
          <EmptyState compact title={t(sources.length ? "Bu türde kaynak yok" : "Henüz bilgi kaynağı eklemedin")} description={t("Biyografi, SSS ya da tanıtım metinlerini ekleyerek ikizinin doğru ve tutarlı yanıt vermesini sağla.")} />
        )}
        {processing > 0 && (
          <p className="mt-3 flex items-center gap-2 text-[11px] text-muted" role="status">
            <Loader2 className="size-3.5 animate-spin" aria-hidden /> {t("{count} kaynak işleniyor; durum otomatik güncellenir.", { count: processing })}
          </p>
        )}
        {!aiAvailable && <Notice tone="warn" className="mt-3" title={t("İndeksleme beklemede")}>{t("Kaynakların kaydedildi; AI yanıtları açıldığında otomatik olarak indekslenir.")}</Notice>}
      </Card>

      <div className="grid content-start gap-5">
        <Card>
          <CardHeader title={t("Yeni bilgi yükle")} hint={t("PDF, metin (.txt, .md) veya CSV dosyaları. Yalnız paylaşım iznin olan bilgileri ekle.")} />
          <MediaUploader purpose="knowledge" value={[]} onChange={addUploaded} accept=".pdf,.txt,.md,.csv,application/pdf,text/plain,text/markdown,text/csv" label={t("Dosya seç veya buraya sürükle")} hint={t("En fazla 20 MB")} disabled={!enabled || pending} />
          <div className="mt-5 border-t border-line-soft pt-4">
            <Field label={t("Web bağlantısından bilgi ekle")} htmlFor="kb-url" hint={t("Yalnız https bağlantıları; sayfanın metni okunur.")}>
              <Input id="kb-url" type="url" inputMode="url" placeholder={t("https://ornek.com/hakkimda")} value={url} onChange={(e) => setUrl(e.target.value)} disabled={!enabled} />
            </Field>
            <Button variant="outline" size="sm" className="mt-3" onClick={addUrl} disabled={!enabled || !/^https:\/\/.{3,}/.test(url)} loading={pending}>
              <Eye /> {t("Bağlantıyı ekle")}
            </Button>
          </div>
        </Card>
      </div>

      <AddSourceDialog open={open} onOpenChange={setOpen} />
      <ConfirmDialog
        open={del !== null}
        onOpenChange={(o) => !o && setDel(null)}
        tone="danger"
        title={t("Kaynağı sil")}
        description={del ? t("“{title}” ve tüm indekslenmiş parçaları kalıcı olarak silinir. İkizin artık bu bilgiyi kullanamaz.", { title: del.title }) : undefined}
        confirmLabel={t("Sil")}
        onConfirm={() => (del ? run(() => deleteKnowledgeAction({ id: del.id })) : false)}
      />
    </div>
  );
}

function AddSourceDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const t = useT();
  const { run, pending, fieldErrors } = useRun();
  const [tab, setTab] = useState("text");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const reset = () => {
    setTitle("");
    setText("");
    setUrl("");
    setFiles([]);
  };

  async function submit() {
    const input = tab === "url" ? { type: "url", title, url } : tab === "file" ? { type: "file", title, assetId: files[0]?.assetId } : { type: tab, title, text };
    const ok = await run(() => addKnowledgeAction(input));
    if (ok) {
      reset();
      onOpenChange(false);
    }
  }

  const ready = title.trim().length >= 2 && (tab === "url" ? /^https:\/\//.test(url) : tab === "file" ? files.length > 0 : text.trim().length >= 20);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={t("Yeni kaynak ekle")} description={t("Kaynak eklendiğinde otomatik olarak metne çevrilir, parçalanır ve indekslenir.")} size="lg">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="text">{t("Metin")}</TabsTrigger>
            <TabsTrigger value="faq">{t("SSS")}</TabsTrigger>
            <TabsTrigger value="url">{t("Bağlantı")}</TabsTrigger>
            <TabsTrigger value="file">{t("Dosya")}</TabsTrigger>
          </TabsList>
          <div className="grid gap-4">
            <Field label={t("Başlık")} htmlFor="ks-title" required error={fieldErrors["title"]}>
              <Input id="ks-title" value={title} maxLength={200} onChange={(e) => setTitle(e.target.value)} placeholder={t("Örn. Hakkımda ve biyografi")} />
            </Field>
            <TabsContent value="text">
              <Field label={t("Metin")} htmlFor="ks-text" required hint={t("En az 20 karakter. İkizin yalnız burada yazılanlara dayanarak kişisel bilgi verir.")} error={fieldErrors["text"]}>
                <Textarea id="ks-text" value={text} onChange={(e) => setText(e.target.value)} className="min-h-40" maxLength={100000} />
              </Field>
            </TabsContent>
            <TabsContent value="faq">
              <Field label={t("Soru–cevaplar")} htmlFor="ks-faq" required hint={t("Her soruyu ve cevabını ayrı satırlara yaz.\nÖrn: Soru: Hangi şehirde yaşıyorsun?\nCevap: İstanbul.")} error={fieldErrors["text"]}>
                <Textarea id="ks-faq" value={text} onChange={(e) => setText(e.target.value)} className="min-h-40" maxLength={50000} />
              </Field>
            </TabsContent>
            <TabsContent value="url">
              <Field label={t("Web adresi")} htmlFor="ks-url" required hint={t("Yalnız https bağlantıları.")} error={fieldErrors["url"]}>
                <Input id="ks-url" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" /* i18n-ignore */ />
              </Field>
            </TabsContent>
            <TabsContent value="file">
              <MediaUploader purpose="knowledge" value={files} onChange={setFiles} accept=".pdf,.txt,.md,.csv,application/pdf,text/plain,text/markdown,text/csv" label={t("Dosya seç veya sürükle")} hint={t("PDF, TXT, MD, CSV · en fazla 20 MB")} />
            </TabsContent>
          </div>
        </Tabs>
        <div className="mt-5 flex justify-end gap-2.5">
          <Button variant="secondary" size="sm" onClick={() => onOpenChange(false)}>
            {t("Vazgeç")}
          </Button>
          <Button size="sm" onClick={submit} loading={pending} disabled={!ready}>
            {t("Kaynağı ekle")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
