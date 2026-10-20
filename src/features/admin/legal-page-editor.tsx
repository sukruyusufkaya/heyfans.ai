"use client";
import { useId, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Notice } from "@/components/admin/notice";
import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/form-controls";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/overlays";
import { useT } from "@/i18n/client";
import { m } from "@/i18n/m";
import { saveCmsPageAction } from "./content-actions";

export interface EditablePage {
  id: string;
  slug: string;
  kind: string;
  title: string;
  summary: string;
  sections: { id: string; heading: string; body: string }[];
  status: "draft" | "published";
  legalReview: "not_required" | "draft_requires_legal_review" | "approved";
  version: number;
  effectiveOn: string;
}

const REVIEW_OPTIONS = [
  { value: "not_required", label: m("Hukuki inceleme gerekmiyor") },
  { value: "draft_requires_legal_review", label: m("Taslak — hukuki inceleme gerekli") },
  { value: "approved", label: m("Hukuken onaylı (yalnız Süper Yönetici)") },
] as const;

/** Sabit/hukuki sayfa düzenleyici: bölüm ekle-düzenle-sil-sırala, sürüm artışı ve hukuki onay durumu. */
export function LegalPageEditor({ page, isSuper, trigger }: { page: EditablePage; isSuper: boolean; trigger: ReactNode }) {
  const t = useT();
  const uid = useId();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [title, setTitle] = useState(page.title);
  const [summary, setSummary] = useState(page.summary);
  const [sections, setSections] = useState(page.sections);
  const [status, setStatus] = useState(page.status);
  // Süper Yönetici olmayan kullanıcı onaylı metni düzenlerse onay zaten düşer; form bunu baştan yansıtır.
  const initialReview = page.legalReview === "approved" && !isSuper ? "draft_requires_legal_review" : page.legalReview;
  const [review, setReview] = useState(initialReview);
  const [effectiveOn, setEffectiveOn] = useState(page.effectiveOn);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  function reset() {
    setTitle(page.title);
    setSummary(page.summary);
    setSections(page.sections);
    setStatus(page.status);
    setReview(initialReview);
    setEffectiveOn(page.effectiveOn);
    setReason("");
    setError(null);
    setFieldErrors({});
  }

  const move = (i: number, d: -1 | 1) =>
    setSections((s) => {
      const j = i + d;
      if (j < 0 || j >= s.length) return s;
      const next = [...s];
      [next[i], next[j]] = [next[j]!, next[i]!];
      return next;
    });
  const update = (i: number, patch: Partial<{ heading: string; body: string }>) => setSections((s) => s.map((x, k) => (k === i ? { ...x, ...patch } : x)));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    start(async () => {
      const res = await saveCmsPageAction({ id: page.id, title, summary, sections: sections.map((s) => ({ id: s.id || undefined, heading: s.heading, body: s.body })), status, legalReview: review, effectiveOn, reason });
      if (res.ok) {
        toast.success(res.message ?? t("Sayfa kaydedildi."));
        if (res.data.legalReview !== review) toast.warning(t("Hukuki onay, içerik değiştiği için 'inceleme gerekli' durumuna alındı."));
        setOpen(false);
        router.refresh();
      } else {
        setError(res.error);
        setFieldErrors(res.fieldErrors ?? {});
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) reset();
      }}
    >
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent size="xl" title={t("{title} — düzenle", { title: page.title })} description={t("Sayfa: /{slug} · mevcut sürüm {version}. Her kayıt sürüm numarasını artırır.", { slug: page.slug, version: page.version })}>
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <Notice tone="neutral">{t("İçerik Türkçe kaynak metindir; diğer dillerde çevirisi varsa o gösterilir, değiştirilen metin çevrilene kadar Türkçe görünür.")}</Notice>
          {page.kind === "legal" && (
            <Notice tone="warn">
              {t("Hukuki metinler yayından önce bir avukat tarafından incelenmelidir. Hukuken onaylı bir metin Süper Yönetici dışında değiştirilirse onay durumu otomatik olarak \"inceleme gerekli\"ye döner.")}
            </Notice>
          )}
          <Field label={t("Başlık")} htmlFor={`${uid}-title`} required error={fieldErrors.title}>
            <Input id={`${uid}-title`} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} disabled={pending} />
          </Field>
          <Field label={t("Özet")} htmlFor={`${uid}-summary`} error={fieldErrors.summary}>
            <Textarea id={`${uid}-summary`} value={summary} onChange={(e) => setSummary(e.target.value)} rows={2} maxLength={600} disabled={pending} />
          </Field>

          <fieldset className="grid gap-3">
            <legend className="mb-1 text-[11px] font-extrabold text-ink-soft">{t("Bölümler ({count})", { count: sections.length })}</legend>
            {sections.map((s, i) => (
              <div key={s.id || i} className="rounded-xl border border-line bg-soft/50 p-3.5">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-[11px] font-black text-muted">{t("Bölüm {n}", { n: i + 1 })}</span>
                  <div className="flex items-center gap-1">
                    <Button type="button" size="icon-sm" variant="ghost" onClick={() => move(i, -1)} disabled={i === 0 || pending} aria-label={t("Bölüm {n} yukarı taşı", { n: i + 1 })}>
                      <ArrowUp />
                    </Button>
                    <Button type="button" size="icon-sm" variant="ghost" onClick={() => move(i, 1)} disabled={i === sections.length - 1 || pending} aria-label={t("Bölüm {n} aşağı taşı", { n: i + 1 })}>
                      <ArrowDown />
                    </Button>
                    <Button type="button" size="icon-sm" variant="ghost" onClick={() => setSections((x) => x.filter((_, k) => k !== i))} disabled={sections.length <= 1 || pending} aria-label={t("Bölüm {n} sil", { n: i + 1 })} className="text-danger">
                      <Trash2 />
                    </Button>
                  </div>
                </div>
                <Field label={t("Bölüm başlığı")} htmlFor={`${uid}-h-${i}`} error={fieldErrors[`sections.${i}.heading`]}>
                  <Input id={`${uid}-h-${i}`} value={s.heading} onChange={(e) => update(i, { heading: e.target.value })} maxLength={200} disabled={pending} />
                </Field>
                <Field label={t("Bölüm metni")} htmlFor={`${uid}-b-${i}`} className="mt-2.5" error={fieldErrors[`sections.${i}.body`]}>
                  <Textarea id={`${uid}-b-${i}`} value={s.body} onChange={(e) => update(i, { body: e.target.value })} rows={6} maxLength={20000} disabled={pending} />
                </Field>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" className="justify-self-start" onClick={() => setSections((s) => [...s, { id: "", heading: "", body: "" }])} disabled={pending || sections.length >= 60}>
              <Plus /> {t("Bölüm ekle")}
            </Button>
            {fieldErrors.sections && (
              <p role="alert" className="text-[11px] font-semibold text-danger">
                {fieldErrors.sections[0]}
              </p>
            )}
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-3">
            <Field label={t("Yayın durumu")} htmlFor={`${uid}-status`}>
              <NativeSelect id={`${uid}-status`} value={status} onChange={(e) => setStatus(e.target.value as "draft" | "published")} disabled={pending}>
                <option value="draft">{t("Taslak")}</option>
                <option value="published">{t("Yayında")}</option>
              </NativeSelect>
            </Field>
            <Field label={t("Hukuki inceleme")} htmlFor={`${uid}-review`} hint={!isSuper ? t("Onay durumunu yalnız Süper Yönetici verebilir.") : undefined}>
              <NativeSelect id={`${uid}-review`} value={review} onChange={(e) => setReview(e.target.value as typeof review)} disabled={pending}>
                {REVIEW_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value} disabled={o.value === "approved" && !isSuper}>
                    {t(o.label)}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label={t("Yürürlük tarihi")} htmlFor={`${uid}-eff`} error={fieldErrors.effectiveOn}>
              <Input id={`${uid}-eff`} type="date" value={effectiveOn} onChange={(e) => setEffectiveOn(e.target.value)} disabled={pending} />
            </Field>
          </div>
          <Field label={t("Değişiklik notu")} htmlFor={`${uid}-reason`} required error={fieldErrors.reason} hint={t("En az 5 karakter. Denetim kaydına yazılır.")}>
            <Textarea id={`${uid}-reason`} value={reason} onChange={(e) => setReason(e.target.value)} rows={2} maxLength={1000} placeholder={t("Ne değişti ve neden?")} disabled={pending} />
          </Field>
          {error && (
            <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-xs font-bold text-danger">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2.5">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
              {t("Vazgeç")}
            </Button>
            <Button type="submit" loading={pending} disabled={reason.trim().length < 5}>
              {t("Kaydet (sürüm {version})", { version: page.version + 1 })}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
