"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { FileText, Film, ImageIcon, Mic2, Rocket, Save, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/display";
import { Field, Input, NativeSelect, Switch, Textarea } from "@/components/ui/form-controls";
import { MediaUploader, type UploadedFile } from "@/components/studio/media-uploader";
import { Notice, STUDIO_EYEBROW } from "@/components/studio/studio-ui";
import { TagInput } from "@/components/studio/tag-input";
import { firstError, useRun } from "@/components/studio/use-run";
import { useLocale, useT } from "@/i18n/client";
import { LOCALE_META } from "@/i18n/config";
import { m } from "@/i18n/m";
import { cn } from "@/lib/utils";
import { saveContentAction } from "./content-actions";
import { decimalOf, toLocalInput } from "./format";

type Type = "photo" | "video" | "audio" | "text" | "collection";
type Access = "public" | "followers" | "subscribers" | "purchase";

export interface ContentFormInitial {
  id?: string;
  type: Type;
  title: string;
  caption: string;
  access: Access;
  minPlanTier: "basic" | "premium" | "vip" | null;
  priceMinor: number | null;
  categories: string[];
  tags: string[];
  isAiGenerated: boolean;
  scheduledAt: string | null; // yerel datetime-local biçimi
  media: UploadedFile[];
  preview: UploadedFile | null;
  status?: string;
}

const TYPES: { value: Type; label: string; icon: typeof ImageIcon; accept: string }[] = [
  { value: "photo", label: m("Fotoğraf"), icon: ImageIcon, accept: "image/jpeg,image/png,image/webp" },
  { value: "video", label: m("Video"), icon: Film, accept: "video/mp4,video/webm,video/quicktime" },
  { value: "audio", label: m("Sesli mesaj"), icon: Mic2, accept: "audio/*,.mp3,.wav,.m4a,.ogg" },
  { value: "text", label: m("Metin"), icon: FileText, accept: "" },
];

const toMinor = (s: string, decimal: string) => {
  const group = decimal === "," ? "." : ",";
  const n = Number(s.split(group).join("").replace(decimal, "."));
  return Number.isFinite(n) && s.trim() ? Math.round(n * 100) : null;
};

export function ContentForm({ initial, categories, creatorApproved }: { initial: ContentFormInitial; categories: { slug: string; name: string }[]; creatorApproved: boolean }) {
  const t = useT();
  const locale = useLocale();
  const decimal = decimalOf(LOCALE_META[locale].intl);
  const pricePlaceholder = `79${decimal}90`;
  const router = useRouter();
  const { run, pending, fieldErrors } = useRun();
  const [f, setF] = useState(initial);
  const [priceText, setPriceText] = useState(initial.priceMinor ? String(initial.priceMinor / 100).replace(".", decimal) : "");
  const [scheduleOn, setScheduleOn] = useState(Boolean(initial.scheduledAt));
  const [mountedAt] = useState(() => Date.now());
  const [intent, setIntent] = useState<"draft" | "publish" | null>(null);
  const set = <K extends keyof ContentFormInitial>(k: K, v: ContentFormInitial[K]) => setF((s) => ({ ...s, [k]: v }));
  const typeDef = TYPES.find((ty) => ty.value === f.type);
  const premium = f.access === "subscribers" || f.access === "purchase";
  const scheduledDate = scheduleOn && f.scheduledAt ? new Date(f.scheduledAt) : null;
  const future = Boolean(scheduledDate && scheduledDate.getTime() > mountedAt + 60_000);
  const editing = Boolean(initial.id);
  const needsMedia = f.type !== "text";

  const problems = useMemo(() => {
    const p: string[] = [];
    if (f.title.trim().length < 2) p.push(t("Başlık en az 2 karakter olmalı."));
    if (f.access === "subscribers" && !f.minPlanTier) p.push(t("Abonelere özel içerik için plan seviyesi seç."));
    if (f.access === "purchase" && (toMinor(priceText, decimal) ?? 0) < 100) p.push(t("Tekil satın alma için en az ₺1 fiyat gir."));
    return p;
  }, [f.title, f.access, f.minPlanTier, priceText, decimal, t]);

  async function save(kind: "draft" | "publish") {
    setIntent(kind);
    const asDraft = kind === "draft" || future; // gelecek tarihli yayın taslak + zamanlama olarak saklanır
    const content = {
      type: f.type,
      title: f.title,
      caption: f.caption,
      access: f.access,
      minPlanTier: f.access === "subscribers" ? f.minPlanTier : null,
      priceMinor: f.access === "purchase" ? toMinor(priceText, decimal) : null,
      mediaAssetIds: f.media.map((file) => file.assetId),
      previewAssetId: premium ? f.preview?.assetId ?? null : null,
      categories: f.categories,
      tags: f.tags,
      isAiGenerated: f.isAiGenerated,
      scheduledAt: scheduleOn && f.scheduledAt ? new Date(f.scheduledAt).toISOString() : null,
    };
    const ok = await run(() => saveContentAction({ id: initial.id, intent: asDraft ? "draft" : "publish", content }), {
      success: kind === "publish" && future ? t("Yayın {date} için zamanlandı.", { date: new Intl.DateTimeFormat(LOCALE_META[locale].intl, { dateStyle: "medium", timeStyle: "short" }).format(scheduledDate!) }) : undefined,
      onOk: () => router.push("/studio/content"),
    });
    if (!ok) setIntent(null);
  }

  const publishLabel = future ? t("Zamanla") : creatorApproved ? t("Yayınla") : t("İncelemeye gönder");
  const canSave = problems.length === 0 && !pending;
  const canPublish = canSave && (!needsMedia || f.media.length > 0);

  return (
    <div className="mx-auto max-w-[1280px]">
      <PageHeader
        eyebrow={STUDIO_EYEBROW}
        title={t(editing ? "İçeriği Düzenle" : "İçerik Oluşturma")}
        description={t(editing ? "İçeriğini güncelle; yayındaki içerik kaydedince hemen güncellenir." : "Yeni fotoğraf, video, ses veya metin içeriği oluştur ve paylaş.")}
        actions={
          <Button asChild variant="outline">
            <Link href="/studio/content?status=draft">
              <FileText /> {t("Taslaklarımı görüntüle")}
            </Link>
          </Button>
        }
      />

      <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.1fr)_minmax(0,0.95fr)]">
        {/* İçerik bilgileri */}
        <Card>
          <CardHeader title={t(editing ? "İçerik bilgileri" : "Yeni İçerik Oluştur")} hint={t("İçerik türünü seç, bilgileri doldur.")} />
          <fieldset className="mb-5 min-w-0 border-0 p-0">
            <legend className="mb-2 text-[11px] font-extrabold text-ink-soft">{t("İçerik türü")}</legend>
            <div className="grid grid-cols-2 gap-3">
              {TYPES.map((ty) => {
                const on = f.type === ty.value;
                return (
                  <label key={ty.value} className={cn("flex cursor-pointer flex-col gap-3 rounded-2xl border p-4 transition-colors focus-within:ring-4 focus-within:ring-brand-100", on ? "border-brand-500 bg-brand-50" : "border-line hover:border-brand-200")}>
                    <input type="radio" name="ctype" value={ty.value} checked={on} onChange={() => set("type", ty.value)} className="sr-only" />
                    <span className={cn("grid size-9 place-items-center rounded-xl", on ? "bg-brand-500 text-white" : "bg-brand-100 text-brand-500")}>
                      <ty.icon className="size-[18px]" aria-hidden />
                    </span>
                    <span className="text-[12px] font-extrabold">{t(ty.label)}</span>
                  </label>
                );
              })}
              {f.type === "collection" && (
                <label className="col-span-2 flex items-center gap-2 rounded-2xl border border-brand-500 bg-brand-50 p-3 text-[12px] font-extrabold">
                  <input type="radio" checked readOnly className="sr-only" /> {t("Koleksiyon (mevcut tür korunur)")}
                </label>
              )}
            </div>
          </fieldset>
          <div className="grid gap-4">
            <Field label={t("İçerik başlığı")} htmlFor="c-title" required error={firstError(fieldErrors, "title")}>
              <Input id="c-title" value={f.title} maxLength={140} onChange={(e) => set("title", e.target.value)} placeholder={t("Yeni bir içerik başlığı yaz…")} />
            </Field>
            <Field label={t("Açıklama")} htmlFor="c-cap" hint={t("Hayranlarına bu içeriği kısaca anlat · {count}/4000", { count: f.caption.length })}>
              <Textarea id="c-cap" value={f.caption} maxLength={4000} onChange={(e) => set("caption", e.target.value)} className="min-h-28" />
            </Field>
            <div>
              <p className="mb-2 text-[11px] font-extrabold text-ink-soft">{t("Kategoriler")} <span className="font-medium text-muted">{t("(en fazla 5)")}</span></p>
              <div className="flex flex-wrap gap-2" role="group" aria-label={t("Kategoriler")}>
                {categories.map((c) => {
                  const on = f.categories.includes(c.slug);
                  return (
                    <button
                      key={c.slug}
                      type="button"
                      aria-pressed={on}
                      onClick={() => set("categories", on ? f.categories.filter((x) => x !== c.slug) : f.categories.length < 5 ? [...f.categories, c.slug] : f.categories)}
                      className={cn("rounded-full px-3 py-1.5 text-[11px] font-extrabold transition-colors", on ? "bg-brand-500 text-white" : "bg-soft text-muted-strong hover:text-ink")}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <Field label={t("Etiketler")} htmlFor="c-tags" hint={t("Enter ile ekle · en fazla 15")}>
              <TagInput id="c-tags" value={f.tags} onChange={(v) => set("tags", v)} max={15} maxLength={40} placeholder={t("Örn. seyahat")} />
            </Field>
          </div>
        </Card>

        {/* Medya */}
        <div className="grid content-start gap-5">
          <Card>
            <CardHeader title={t("Medya Yükleme ve Önizleme")} hint={t(needsMedia ? "Yalnız sahibi olduğun veya izin aldığın medyayı yükle." : "Metin içerikler için medya gerekmez.")} />
            {needsMedia ? (
              <>
                <MediaUploader
                  purpose="content"
                  value={f.media}
                  onChange={(v) => set("media", v)}
                  accept={typeDef?.accept}
                  max={f.type === "photo" || f.type === "collection" ? 30 : f.type === "video" || f.type === "audio" ? 5 : 1}
                  label={t("Dosyalarını buraya sürükle ya da seç")}
                  hint={t(f.type === "photo" ? "JPG, PNG, WEBP · en fazla 15 MB" : f.type === "video" ? "MP4, WEBM, MOV · en fazla 500 MB" : "MP3, WAV, M4A · en fazla 50 MB")}
                  disabled={pending}
                />
                {f.media.length === 0 && <p className="mt-3 text-[11px] text-muted">{t("Yayınlamak için en az bir medya dosyası gerekir; taslak olarak medyasız kaydedebilirsin.")}</p>}
              </>
            ) : (
              <p className="rounded-xl bg-soft p-4 text-[12px] text-muted-strong">{t("Bu tür yalnız başlık ve açıklamadan oluşur.")}</p>
            )}
          </Card>
          {premium && (
            <Card>
              <CardHeader title={t("Kilitli içerik önizlemesi")} hint={t("İsteğe bağlı · içerik kilitliyken herkese açık gösterilecek kapak görseli.")} />
              <MediaUploader purpose="content_preview" value={f.preview ? [f.preview] : []} onChange={(v) => set("preview", v[0] ?? null)} accept="image/jpeg,image/png,image/webp" label={t("Önizleme görseli seç")} hint={t("JPG, PNG, WEBP")} compact disabled={pending} />
            </Card>
          )}
        </div>

        {/* Yayın ayarları */}
        <div className="grid content-start gap-5 lg:col-span-2 xl:col-span-1">
          <Card>
            <CardHeader title={t("Yayın ve Erişim Ayarları")} />
            <div className="grid gap-4">
              <Field label={t("Görünürlük")} htmlFor="c-access">
                <NativeSelect id="c-access" value={f.access} onChange={(e) => set("access", e.target.value as Access)}>
                  <option value="public">{t("Herkese açık")}</option>
                  <option value="followers">{t("Takipçilere özel")}</option>
                  <option value="subscribers">{t("Abonelere özel")}</option>
                  <option value="purchase">{t("Tekil satın alma (kilit açma)")}</option>
                </NativeSelect>
              </Field>
              {f.access === "subscribers" && (
                <Field label={t("En düşük plan seviyesi")} htmlFor="c-tier" required error={firstError(fieldErrors, "minPlanTier")}>
                  <NativeSelect id="c-tier" value={f.minPlanTier ?? ""} onChange={(e) => set("minPlanTier", (e.target.value || null) as ContentFormInitial["minPlanTier"])}>
                    <option value="">{t("Seçin")}</option>
                    <option value="basic">{t("Temel ve üzeri")}</option>
                    <option value="premium">{t("Premium ve üzeri")}</option>
                    <option value="vip">{t("Yalnız VIP")}</option>
                  </NativeSelect>
                </Field>
              )}
              {f.access === "purchase" && (
                <Field label={t("Tek seferlik fiyat (₺)")} htmlFor="c-price" required hint={t("KDV dahil · en az ₺1")} error={firstError(fieldErrors, "priceMinor")}>
                  <Input id="c-price" inputMode="decimal" value={priceText} onChange={(e) => setPriceText(e.target.value.replace(/[^\d.,]/g, ""))} placeholder={pricePlaceholder} className="max-w-44" />
                </Field>
              )}
              <div className="border-t border-line-soft">
                <label htmlFor="c-ai" className="flex items-center justify-between gap-4 py-3.5">
                  <span>
                    <span className="block text-[13px] font-extrabold">{t("AI destekli içerik bildirimi")}</span>
                    <span className="block text-[11px] text-muted">{t("AI ile üretilen içerikleri açıkça etiketle.")}</span>
                  </span>
                  <Switch id="c-ai" checked={f.isAiGenerated} onCheckedChange={(v) => set("isAiGenerated", v)} />
                </label>
                <label htmlFor="c-sched" className="flex items-center justify-between gap-4 border-t border-line-soft py-3.5">
                  <span>
                    <span className="block text-[13px] font-extrabold">{t("Zamanlanmış yayın")}</span>
                    <span className="block text-[11px] text-muted">{t("Belirli tarihte yayına alınır.")}</span>
                  </span>
                  <Switch
                    id="c-sched"
                    checked={scheduleOn}
                    onCheckedChange={(v) => {
                      setScheduleOn(v);
                      if (v && !f.scheduledAt) set("scheduledAt", toLocalInput(new Date(Date.now() + 3600_000)));
                    }}
                  />
                </label>
                {scheduleOn && (
                  <Field label={t("Yayın tarihi ve saati")} htmlFor="c-when" hint={t("Tarih gelince içerik yayına alınır (Studio'yu açtığında ya da zamanlayıcı çalıştığında).")}>
                    <Input id="c-when" type="datetime-local" value={f.scheduledAt ?? ""} onChange={(e) => set("scheduledAt", e.target.value)} />
                  </Field>
                )}
              </div>
              {problems.length > 0 && (
                <ul className="grid gap-1 rounded-xl bg-danger-soft p-3 text-[11px] font-semibold text-danger" role="alert">
                  {problems.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              )}
              {!creatorApproved && <Notice tone="info" title={t("İçerikler incelemeden geçer")}>{t("Hesabın onaylanana kadar yayınlamak istediğin içerikler önce moderasyon incelemesine düşer.")}</Notice>}
              <div className="flex flex-wrap gap-2.5">
                <Button onClick={() => save("publish")} disabled={!canPublish} loading={pending && intent === "publish"}>
                  <Rocket /> {publishLabel}
                </Button>
                <Button variant="outline" onClick={() => save("draft")} disabled={!canSave} loading={pending && intent === "draft"}>
                  <Save /> {t("Taslak kaydet")}
                </Button>
              </div>
              {needsMedia && f.media.length === 0 && <p className="text-[10px] text-muted">{t("Yayınla düğmesi, en az bir medya yüklenince etkinleşir.")}</p>}
            </div>
          </Card>
          <Notice tone="safe" icon={<ShieldCheck />} title={t("İçerik hakları ve güvenlik")}>
            {t("Başka kişilerin görüntü ve seslerini kullanırken ilgili izinler ve platform kuralları uygulanır. Yüklenen medya güvenlik taramasından geçer.")}
          </Notice>
        </div>
      </div>
    </div>
  );
}
